-- Drop the existing SELECT policy for customers
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON public.customers;

-- Create new policy that allows viewing "Consumidor" customer by everyone in tenant
CREATE POLICY "Users can view customers in their tenant" 
ON public.customers 
FOR SELECT 
USING (
  (tenant_id = get_user_tenant_id()) AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    (created_by = auth.uid()) OR 
    seller_can_view_customer(id) OR
    name = 'Consumidor'  -- Everyone can see the default customer
  )
);