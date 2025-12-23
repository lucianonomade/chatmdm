import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting to delete all users...');

    // Get all users
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Erro ao listar usuários', details: listError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} users to delete`);

    const deletedUsers: string[] = [];
    const errors: string[] = [];

    // Delete each user
    for (const user of users) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Error deleting user ${user.email}:`, deleteError);
          errors.push(`${user.email}: ${deleteError.message}`);
        } else {
          console.log(`Deleted user: ${user.email}`);
          deletedUsers.push(user.email || user.id);
        }
      } catch (e: any) {
        console.error(`Exception deleting user ${user.email}:`, e);
        errors.push(`${user.email}: ${e?.message || 'Unknown error'}`);
      }
    }

    // Also clean up any remaining data in public tables
    await supabaseAdmin.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('service_orders').delete().neq('id', '0');
    await supabaseAdmin.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('fixed_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('subcategories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('company_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('user_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Cleanup complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${deletedUsers.length} usuários deletados com sucesso`,
        deletedUsers,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
