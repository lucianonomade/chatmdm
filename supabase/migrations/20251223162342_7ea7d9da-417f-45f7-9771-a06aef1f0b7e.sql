-- Add recovery_email column to profiles table
-- This stores the admin's email for password recovery purposes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS recovery_email text;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.profiles.recovery_email IS 'Email do admin/owner para recuperação de senha. Usado quando vendedores/gerentes esquecem a senha.';