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

    // Create regular client to check caller's permissions
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !callingUser) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if calling user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, tenant_id')
      .eq('user_id', callingUser.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem resetar senhas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { userId, newPassword } = await req.json();

    // Validate inputs
    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário e nova senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the target user belongs to the same tenant
    const { data: targetUserRole } = await supabaseAdmin
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (!targetUserRole || targetUserRole.tenant_id !== roleData.tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado ou não pertence à sua empresa' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Resetting password for user: ${userId}`);

    // Reset the password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      console.error('Reset password error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset successfully for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
