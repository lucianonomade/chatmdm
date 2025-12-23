
-- Drop the existing SELECT policy that exposes all customers
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON public.customers;

-- Create new SELECT policy: admins/managers see all, sellers see only their customers
CREATE POLICY "Users can view customers in their tenant"
ON public.customers
FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (
    -- Admins and managers can see all customers
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    -- Sellers can see customers they created
    OR created_by = auth.uid()
    -- Sellers can see customers from their own service orders
    OR seller_can_view_customer(id)
  )
);
