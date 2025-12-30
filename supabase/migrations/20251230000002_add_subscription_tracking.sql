-- Add subscription tracking columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone;

-- Create index for faster queries on subscription expiration
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_expires 
ON public.tenants(subscription_expires_at) 
WHERE subscription_expires_at IS NOT NULL;

-- Add tenant_payments table (if not exists)
CREATE TABLE IF NOT EXISTS public.tenant_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  abacate_billing_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on tenant_payments
ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

-- Only admins can view payments
DROP POLICY IF EXISTS "Only admins can view tenant payments" ON public.tenant_payments;
CREATE POLICY "Only admins can view tenant payments"
ON public.tenant_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  )
);
