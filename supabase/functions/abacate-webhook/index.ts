import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const abacateWebHookHash = Deno.env.get('ABACATE_PAY_WEBHOOK_HASH'); // For verification if they provide it

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const payload = await req.json();
        console.log('Abacate Webhook received:', payload);

        const { event, data } = payload;
        // Data contains the billing details: data.id (billingId), data.status, etc.

        if (event === 'billing.paid') {
            const billingId = data.id;
            const amountCents = data.amount;

            // 1. Find the payment record
            const { data: payRecord, error: findError } = await supabaseAdmin
                .from('tenant_payments')
                .select('tenant_id, id')
                .eq('abacate_billing_id', billingId)
                .single();

            if (findError || !payRecord) {
                console.error('Payment record not found for billingId:', billingId);
                return new Response(JSON.stringify({ error: 'Record not found' }), { status: 404 });
            }

            // 2. Update payment status
            await supabaseAdmin
                .from('tenant_payments')
                .update({ status: 'PAID', updated_at: new Date().toISOString() })
                .eq('id', payRecord.id);

            // 3. Extend tenant subscription
            // Logic: Add 30 days to current expiration or from now if already expired
            const { data: tenant } = await supabaseAdmin
                .from('tenants')
                .select('subscription_expires_at')
                .eq('id', payRecord.tenant_id)
                .single();

            let currentExpiresAt = tenant?.subscription_expires_at ? new Date(tenant.subscription_expires_at) : new Date();
            if (currentExpiresAt < new Date()) {
                currentExpiresAt = new Date();
            }

            const newExpiresAt = new Date(currentExpiresAt.getTime() + (30 * 24 * 60 * 60 * 1000));

            await supabaseAdmin
                .from('tenants')
                .update({
                    subscription_status: 'active',
                    subscription_expires_at: newExpiresAt.toISOString()
                })
                .eq('id', payRecord.tenant_id);

            console.log(`Tenant ${payRecord.tenant_id} subscription extended to ${newExpiresAt}`);
        } else if (event === 'billing.expired' || event === 'billing.cancelled') {
            const billingId = data.id;
            await supabaseAdmin
                .from('tenant_payments')
                .update({ status: event === 'billing.expired' ? 'EXPIRED' : 'CANCELLED' })
                .eq('abacate_billing_id', billingId);
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
