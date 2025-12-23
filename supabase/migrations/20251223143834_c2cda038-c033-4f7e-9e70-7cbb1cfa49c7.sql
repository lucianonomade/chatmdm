
-- 1. Restrict company_settings SELECT to admins/managers only
DROP POLICY IF EXISTS "Users can view settings in their tenant" ON public.company_settings;

CREATE POLICY "Admins and managers can view settings in their tenant"
ON public.company_settings
FOR SELECT
USING (
  tenant_id = get_user_tenant_id()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);

-- 2. Update the public branding function to include safe fields for display (receipts, etc)
-- This function is available to all authenticated users but doesn't expose CNPJ or email
CREATE OR REPLACE FUNCTION public.get_public_company_branding()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'name', name,
    'logo_url', logo_url,
    'print_logo_url', print_logo_url,
    'login_header_color', COALESCE(login_header_color, '#ffffff'::text),
    'address', address,
    'phone', phone,
    'phone2', phone2
  )
  FROM public.company_settings
  WHERE tenant_id = get_user_tenant_id()
  LIMIT 1;
$$;

-- 3. FIX CRITICAL: Add tenant isolation to get_email_by_name function
-- This prevents cross-tenant email enumeration attacks
CREATE OR REPLACE FUNCTION public.get_email_by_name(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
  v_tenant_id uuid;
BEGIN
  -- Get caller's tenant_id (returns NULL if not authenticated or no profile)
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
  
  -- Only return email if user is in same tenant
  SELECT email INTO v_email 
  FROM public.profiles
  WHERE LOWER(name) = LOWER(p_name) 
    AND tenant_id = v_tenant_id
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

-- 4. Clean up old conflicting RLS policies that allow cross-tenant access
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view profiles with role check" ON public.profiles;
