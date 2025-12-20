-- ==============================================
-- PARTE 4: Continuar atualizando políticas RLS
-- ==============================================

-- ========== SERVICE_ORDERS ==========
DROP POLICY IF EXISTS "Admins can delete orders" ON public.service_orders;
DROP POLICY IF EXISTS "Only users with roles can create orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can update own orders or all if admin/manager" ON public.service_orders;
DROP POLICY IF EXISTS "Users can view own orders or all if admin/manager" ON public.service_orders;

CREATE POLICY "Users can view orders in their tenant"
ON public.service_orders FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Users can create orders in their tenant"
ON public.service_orders FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'seller'::app_role))
);

CREATE POLICY "Users can update orders in their tenant"
ON public.service_orders FOR UPDATE
USING (
  tenant_id = get_user_tenant_id() AND 
  (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can delete orders in their tenant"
ON public.service_orders FOR DELETE
USING (
  tenant_id = get_user_tenant_id() AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========== STOCK_MOVEMENTS ==========
DROP POLICY IF EXISTS "Admins and managers can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins and managers can view stock movements" ON public.stock_movements;

CREATE POLICY "Admins and managers can view stock movements in their tenant"
ON public.stock_movements FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins and managers can insert stock movements in their tenant"
ON public.stock_movements FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- ========== SUBCATEGORIES ==========
DROP POLICY IF EXISTS "Authenticated users can create subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can delete subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can update subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can view subcategories" ON public.subcategories;

CREATE POLICY "Users can view subcategories in their tenant"
ON public.subcategories FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create subcategories in their tenant"
ON public.subcategories FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update subcategories in their tenant"
ON public.subcategories FOR UPDATE
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete subcategories in their tenant"
ON public.subcategories FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- ========== SUPPLIERS ==========
DROP POLICY IF EXISTS "Admins and managers can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;

CREATE POLICY "Users can view suppliers in their tenant"
ON public.suppliers FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins and managers can manage suppliers in their tenant"
ON public.suppliers FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- ========== USER_ROLES ==========
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role or admins view all" ON public.user_roles;

CREATE POLICY "Users can view roles in their tenant"
ON public.user_roles FOR SELECT
USING (
  tenant_id = get_user_tenant_id() AND 
  (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Admins can manage roles in their tenant"
ON public.user_roles FOR ALL
USING (
  tenant_id = get_user_tenant_id() AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- ==============================================
-- PARTE 5: Atualizar funções auxiliares para considerar tenant
-- ==============================================

-- Atualizar função update_product_stock para incluir tenant_id
CREATE OR REPLACE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity integer, p_type text, p_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_stock integer;
  v_new_stock integer;
  v_tenant_id uuid;
BEGIN
  -- Authorization check - only admins and managers can update stock
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins and managers can update stock';
  END IF;

  -- Get current stock and tenant_id
  SELECT stock, tenant_id INTO v_previous_stock, v_tenant_id 
  FROM products 
  WHERE id = p_product_id AND tenant_id = get_user_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Product not found or access denied';
  END IF;
  
  -- Calculate new stock
  IF p_type = 'in' THEN
    v_new_stock := v_previous_stock + p_quantity;
  ELSIF p_type = 'out' THEN
    v_new_stock := v_previous_stock - p_quantity;
  ELSE -- adjustment
    v_new_stock := p_quantity;
  END IF;
  
  -- Update product stock
  UPDATE products SET stock = v_new_stock, updated_at = now() 
  WHERE id = p_product_id AND tenant_id = get_user_tenant_id();
  
  -- Log movement with tenant_id
  INSERT INTO stock_movements (product_id, quantity, type, reason, previous_stock, new_stock, created_by, tenant_id)
  VALUES (p_product_id, p_quantity, p_type, p_reason, v_previous_stock, v_new_stock, auth.uid(), v_tenant_id);
END;
$$;

-- Atualizar função seller_can_view_customer para considerar tenant
CREATE OR REPLACE FUNCTION public.seller_can_view_customer(_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE seller_id = auth.uid()
    AND customer_id = _customer_id
    AND tenant_id = get_user_tenant_id()
  )
$$;