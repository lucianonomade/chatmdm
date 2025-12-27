-- Drop the existing SELECT policy for customers
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON public.customers;

-- Create new policy that allows all users in the tenant to view all customers
CREATE POLICY "Users can view customers in their tenant" 
ON public.customers 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());