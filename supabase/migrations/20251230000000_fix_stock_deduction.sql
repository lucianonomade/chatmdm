-- Allow sellers to update stock via the function (only deduction)
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
  -- Authorization check - ALLOW SELLERS depending on operation
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    (has_role(auth.uid(), 'seller'::app_role) AND p_type = 'out')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Access denied for stock update';
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
  WHERE id = p_product_id AND tenant_id = v_tenant_id;
  
  -- Log movement
  INSERT INTO stock_movements (product_id, quantity, type, reason, previous_stock, new_stock, created_by, tenant_id)
  VALUES (p_product_id, p_quantity, p_type, p_reason, v_previous_stock, v_new_stock, auth.uid(), v_tenant_id);
END;
$$;

-- Create Trigger function with FULL support (Insert, Update, Delete)
CREATE OR REPLACE FUNCTION public.handle_order_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_quantity integer;
BEGIN
  -- search_path is already set in SECURITY DEFINER context if we wanted, 
  -- but let's be explicit with public prefix where needed.

  -- 1. Restore stock from OLD items (on DELETE or UPDATE)
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(OLD.items)
    LOOP
      IF (item->>'productId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
         v_product_id := (item->>'productId')::uuid;
         v_quantity := (item->>'quantity')::integer;
         
         -- Restore stock using the function (bypass role check by calling direct update or internal logic)
         -- Actually, public.update_product_stock has role check for sellers on 'in'.
         -- The trigger runs as SECURITY DEFINER (usually owner/postgres), so role check might pass 
         -- if we handle it correctly, or we just do the update directly here.
         
         UPDATE public.products 
         SET stock = stock + v_quantity, updated_at = now() 
         WHERE id = v_product_id AND tenant_id = OLD.tenant_id;
         
         INSERT INTO public.stock_movements (product_id, quantity, type, reason, previous_stock, new_stock, created_by, tenant_id)
         SELECT v_product_id, v_quantity, 'in', 'Estorno: Pedido #' || OLD.id, stock - v_quantity, stock, auth.uid(), OLD.tenant_id
         FROM public.products WHERE id = v_product_id;
      END IF;
    END LOOP;
  END IF;

  -- 2. Deduct stock from NEW items (on INSERT or UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      IF (item->>'productId') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
         v_product_id := (item->>'productId')::uuid;
         v_quantity := (item->>'quantity')::integer;
         
         UPDATE public.products 
         SET stock = stock - v_quantity, updated_at = now() 
         WHERE id = v_product_id AND tenant_id = NEW.tenant_id;

         INSERT INTO public.stock_movements (product_id, quantity, type, reason, previous_stock, new_stock, created_by, tenant_id)
         SELECT v_product_id, v_quantity, 'out', 'Venda: Pedido #' || NEW.id, stock + v_quantity, stock, auth.uid(), NEW.tenant_id
         FROM public.products WHERE id = v_product_id;
      END IF;
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create Trigger
DROP TRIGGER IF EXISTS on_order_stock_change ON public.service_orders;
CREATE TRIGGER on_order_stock_change
  AFTER INSERT OR UPDATE OR DELETE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_stock_change();
