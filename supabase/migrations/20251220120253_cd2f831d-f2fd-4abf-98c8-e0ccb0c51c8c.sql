-- ==============================================
-- PARTE 3: Atualizar políticas RLS para multi-tenancy
-- ==============================================

-- ========== CATEGORIES ==========
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;

CREATE POLICY "Users can view categories in their tenant"
ON public.categories FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create categories in their tenant"
ON public.categories FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update categories in their tenant"
ON public.categories FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete categories in their tenant"
ON public.categories FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- ========== COMPANY_SETTINGS ==========
DROP POLICY IF EXISTS "Admins and managers can update settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins and managers can view settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.company_settings;

CREATE POLICY "Users can view settings in their tenant"
ON public.company_settings FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins and managers can update settings in their tenant"
ON public.company_settings FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can insert settings in their tenant"
ON public.company_settings FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========== CUSTOMERS ==========
DROP POLICY IF EXISTS "Admin and managers can create customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and managers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and managers can view all customers" ON public.customers;
DROP POLICY IF EXISTS "Sellers can view customers from their orders" ON public.customers;
DROP POLICY IF EXISTS "Sellers can view customers they created" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers they created or admins/managers can" ON public.customers;

CREATE POLICY "Users can view customers in their tenant"
ON public.customers FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create customers in their tenant"
ON public.customers FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins and managers can update customers in their tenant"
ON public.customers FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR created_by = auth.uid())
);

CREATE POLICY "Admins and managers can delete customers in their tenant"
ON public.customers FOR DELETE
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR created_by = auth.uid())
);

-- ========== EXPENSES ==========
DROP POLICY IF EXISTS "Admins and managers can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins and managers can view expenses" ON public.expenses;

CREATE POLICY "Admins and managers can view expenses in their tenant"
ON public.expenses FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can manage expenses in their tenant"
ON public.expenses FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- ========== FIXED_EXPENSES ==========
DROP POLICY IF EXISTS "Admins and managers can manage fixed expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Admins and managers can view fixed expenses" ON public.fixed_expenses;

CREATE POLICY "Admins and managers can view fixed expenses in their tenant"
ON public.fixed_expenses FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can manage fixed expenses in their tenant"
ON public.fixed_expenses FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- ========== NOTIFICATIONS ==========
DROP POLICY IF EXISTS "Admin managers or self can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;

CREATE POLICY "Users can view notifications in their tenant"
ON public.notifications FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Users can create notifications in their tenant"
ON public.notifications FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update own notifications in their tenant"
ON public.notifications FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can delete own notifications in their tenant"
ON public.notifications FOR DELETE
USING (
  tenant_id = get_user_tenant_id() AND 
  (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
);

-- ========== PRODUCTS ==========
DROP POLICY IF EXISTS "Admins and managers can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins and managers can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins and managers can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;

CREATE POLICY "Users can view products in their tenant"
ON public.products FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins and managers can insert products in their tenant"
ON public.products FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can update products in their tenant"
ON public.products FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can delete products in their tenant"
ON public.products FOR DELETE
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);