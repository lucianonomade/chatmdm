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

    // Check if calling user is admin and get their tenant_id
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
        JSON.stringify({ error: 'Apenas administradores podem cadastrar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin's tenant_id and email from profile
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id, email')
      .eq('id', callingUser.id)
      .single();

    const adminTenantId = adminProfile?.tenant_id;
    const adminEmail = adminProfile?.email || callingUser.email;

    // Get request body
    const { email, password, name, role } = await req.json();

    // Validate inputs
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, senha e nome são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role - only manager or seller allowed
    const validRoles = ['manager', 'seller'];
    const userRole = role && validRoles.includes(role) ? role : 'seller';

    // Admin cannot be created through this endpoint
    if (role === 'admin') {
      return new Response(
        JSON.stringify({ error: 'Não é possível criar administradores por este método' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating user: ${email} with role: ${userRole}`);

    console.log(`Admin tenant_id: ${adminTenantId}`);

    // Create the user using admin API with tenant_id in metadata
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { 
        name,
        tenant_id: adminTenantId // Pass tenant_id to be used by trigger
      }
    });

    if (createError) {
      console.error('Create user error:', createError);
      
      // Handle specific errors
      if (createError.message.includes('already been registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile for the new user with admin's email as recovery_email
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        name: name,
        email: email,
        tenant_id: adminTenantId,
        trial_started_at: new Date().toISOString(),
        trial_expired: false,
        recovery_email: adminEmail // Admin's email for password recovery
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Create profile error:', profileError);
    }

    console.log(`User ${email} created with recovery_email: ${adminEmail}`);

    // Create or update user role
    const { error: createRoleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUser.user.id,
        role: userRole,
        tenant_id: adminTenantId
      }, { onConflict: 'user_id' });
    
    if (createRoleError) {
      console.error('Create role error:', createRoleError);
    }

    console.log(`User created successfully: ${newUser.user.id} with profile and role`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email,
          name 
        } 
      }),
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
