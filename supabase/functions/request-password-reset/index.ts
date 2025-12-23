import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de email não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get request body
    const { name, redirectUrl } = await req.json();

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Nome é obrigatório e deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset requested for user name: ${name}`);

    // Find user by name and get their tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, tenant_id')
      .ilike('name', name.trim())
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.log(`No user found with name: ${name}`);
      // Return success anyway to prevent user enumeration
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Se o usuário existir, um email de recuperação será enviado.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the tenant owner (admin) email
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('owner_id')
      .eq('id', profile.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant lookup error:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar informações do tenant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the admin's email (tenant owner)
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', tenant.owner_id)
      .single();

    if (adminError || !adminProfile?.email) {
      console.error('Admin lookup error:', adminError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar email do administrador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The reset link is for the user's email, but notification goes to admin
    const userEmail = profile.email;
    const adminEmail = adminProfile.email;

    if (!userEmail) {
      console.error(`No email found for user: ${profile.id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Se o usuário existir, um email de recuperação será enviado.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending password reset for ${profile.name} (${userEmail}) to admin: ${adminEmail}`);

    // Generate a password reset token using admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userEmail,
      options: {
        redirectTo: redirectUrl || `${supabaseUrl}/reset-password`
      }
    });

    if (linkError) {
      console.error('Generate link error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar link de recuperação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetLink = linkData.properties?.action_link;
    console.log(`Password reset link generated for ${profile.name}`);

    // Send email to admin using Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Sistema <onboarding@resend.dev>',
      to: [adminEmail],
      subject: `Recuperação de Senha - ${profile.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Solicitação de Recuperação de Senha</h2>
          <p>O usuário <strong>${profile.name}</strong> solicitou a recuperação de senha.</p>
          <p>Clique no botão abaixo para redefinir a senha:</p>
          <a href="${resetLink}" 
             style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Redefinir Senha
          </a>
          <p style="color: #666; font-size: 14px;">
            Se você não reconhece esta solicitação, ignore este email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Este é um email automático, não responda.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Resend email error:', emailError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao enviar email. Verifique a configuração do Resend.',
          details: emailError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Email sent successfully to ${adminEmail}`, emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Link de recuperação enviado para o email do administrador.`,
        adminNotified: true
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
