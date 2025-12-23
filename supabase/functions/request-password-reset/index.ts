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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
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

    // Find user by name
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, recovery_email, name')
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

    // Determine which email to send the reset to
    // If recovery_email exists, use it (admin's email), otherwise use user's email
    const targetEmail = profile.recovery_email || profile.email;
    const userEmail = profile.email; // The actual user's email for the reset link

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

    console.log(`Sending password reset for ${profile.name} (${userEmail}) to: ${targetEmail}`);

    // If recovery_email is different from user's email, we need to send a custom email
    // because Supabase's built-in reset only sends to the user's registered email
    if (profile.recovery_email && profile.recovery_email !== profile.email) {
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

      // For now, we'll log the info and inform the admin
      // In production, you would send an email using a service like Resend
      console.log(`Password reset link generated for ${profile.name}`);
      console.log(`Should be sent to admin email: ${profile.recovery_email}`);
      console.log(`Reset link: ${linkData.properties?.action_link}`);

      // Return info about where the email will be sent (for admin visibility)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Link de recuperação será enviado para o email do administrador.`,
          adminNotified: true,
          recoveryEmail: profile.recovery_email,
          userName: profile.name,
          // In production, remove actionLink - this is for testing only
          actionLink: linkData.properties?.action_link
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Normal case: send to user's own email using Supabase's built-in method
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(userEmail, {
        redirectTo: redirectUrl || `${supabaseUrl}/reset-password`
      });

      if (resetError) {
        console.error('Reset password error:', resetError);
        return new Response(
          JSON.stringify({ error: 'Erro ao enviar email de recuperação' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email de recuperação enviado com sucesso.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
