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
        const abacateApiKey = Deno.env.get('ABACATE_PAY_API_KEY');

        if (!abacateApiKey) {
            throw new Error('ABACATE_PAY_API_KEY not set');
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Get the calling user from JWT
        const authHeader = req.headers.get('Authorization')!;
        console.log('Auth Header present:', !!authHeader);
        const token = authHeader.replace('Bearer ', '');

        const { data: { user: callingUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !callingUser) {
            console.error('Auth verification failed:', userError);
            return new Response(JSON.stringify({ error: 'Não autorizado', details: userError?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get user's profile and tenant
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('tenant_id, email, name')
            .eq('id', callingUser.id)
            .single();

        if (!profile?.tenant_id) {
            return new Response(JSON.stringify({ error: 'Tenant não encontrado' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get company settings for taxId and phone
        const { data: settings } = await supabaseAdmin
            .from('company_settings')
            .select('cnpj, phone')
            .eq('tenant_id', profile.tenant_id)
            .maybeSingle();

        const { amount, description, customer } = await req.json();

        if (!amount || amount <= 0) {
            return new Response(JSON.stringify({ error: 'Valor inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (!customer || !customer.name || !customer.email || !customer.taxId) {
            return new Response(JSON.stringify({ error: 'Dados do cliente incompletos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 1. Create PIX QR Code via Abacate Pay
        console.log('Creating PIX QR Code in Abacate Pay for:', customer.email);
        const response = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${abacateApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount, // amount in cents
                expiresIn: 3600, // 1 hour expiration
                description: description || 'Assinatura Sistema PDV',
                customer: {
                    name: customer.name,
                    email: customer.email,
                    taxId: customer.taxId.replace(/\D/g, ''), // CPF or CNPJ numeric only
                    cellphone: customer.cellphone ? customer.cellphone.replace(/\D/g, '') : ''
                },
                metadata: {
                    externalId: profile.tenant_id
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Abacate API Error:', data);
            throw new Error(data.message || 'Erro ao gerar PIX no Abacate Pay');
        }

        // According to docs, the response is { data: { id, brCode, brCodeBase64, ... } }
        const pixData = data.data;

        // 2. Save payment record
        await supabaseAdmin
            .from('tenant_payments')
            .insert({
                tenant_id: profile.tenant_id,
                abacate_billing_id: pixData.id,
                status: 'PENDING',
                amount: amount,
                description: description || 'Assinatura Sistema PDV',
                checkout_url: '', // API docs don't show a checkout URL for direct PIX
                pix_code: pixData.brCode,
                pix_qr_code: pixData.brCodeBase64
            });

        return new Response(
            JSON.stringify({
                qrCode: pixData.brCodeBase64, // The base64 image
                copyPaste: pixData.brCode,     // The copy-paste string
                id: pixData.id
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Edge Function Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
