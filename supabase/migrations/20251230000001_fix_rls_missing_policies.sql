-- ==========================================
-- Security Audit & RLS Enforcement
-- ==========================================

-- 1. COMPANY SETTINGS: Enable Seller Read for Commissions
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view company_settings in their tenant" ON public.company_settings;
CREATE POLICY "Users can view company_settings in their tenant"
ON public.company_settings FOR SELECT
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins and managers can manage company_settings" ON public.company_settings;
CREATE POLICY "Admins and managers can manage company_settings"
ON public.company_settings FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- 2. EXPENSES: Comprehensive Tenant Isolation
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for expenses" ON public.expenses;
CREATE POLICY "Tenant isolation for expenses"
ON public.expenses FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- 3. FIXED EXPENSES: Comprehensive Tenant Isolation
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Tenant isolation for fixed_expenses"
ON public.fixed_expenses FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- 4. PRODUCTS: Comprehensive Tenant Isolation
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for products" ON public.products;
CREATE POLICY "Tenant isolation for products"
ON public.products FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- 5. CUSTOMERS: Comprehensive Tenant Isolation
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for customers" ON public.customers;
CREATE POLICY "Tenant isolation for customers"
ON public.customers FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- 6. STOCK MOVEMENTS: Ensure sellers can view (important for POC)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view stock movements in their tenant" ON public.stock_movements;
CREATE POLICY "Users can view stock movements in their tenant"
ON public.stock_movements FOR SELECT
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Only admins/managers can insert movements" ON public.stock_movements;
CREATE POLICY "Only admins/managers can insert movements"
ON public.stock_movements FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);
