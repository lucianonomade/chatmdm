
-- Drop the existing SELECT policy that exposes all suppliers
DROP POLICY IF EXISTS "Users can view suppliers in their tenant" ON public.suppliers;

-- Create new SELECT policy: only admins and managers can view suppliers
CREATE POLICY "Admins and managers can view suppliers in their tenant"
ON public.suppliers
FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);
