-- =========================================
-- Limpeza de políticas RLS antigas sem isolamento de tenant
-- =========================================

-- Remover políticas antigas da tabela categories (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

-- Remover políticas antigas da tabela subcategories (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can create subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can update subcategories" ON public.subcategories;
DROP POLICY IF EXISTS "Authenticated users can delete subcategories" ON public.subcategories;

-- Remover políticas antigas da tabela products (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

-- Remover políticas antigas da tabela suppliers (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON public.suppliers;

-- Remover políticas antigas da tabela profiles (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles with role check" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Remover políticas antigas da tabela customers (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

-- Remover políticas antigas da tabela service_orders (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated users can create service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated users can update service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated users can delete service_orders" ON public.service_orders;

-- Remover políticas antigas da tabela expenses (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can create expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;

-- Remover políticas antigas da tabela fixed_expenses (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view fixed_expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Authenticated users can create fixed_expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Authenticated users can update fixed_expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Authenticated users can delete fixed_expenses" ON public.fixed_expenses;

-- Remover políticas antigas da tabela notifications (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notifications;

-- Remover políticas antigas da tabela stock_movements (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can create stock_movements" ON public.stock_movements;

-- Remover políticas antigas da tabela user_roles (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view own role" ON public.user_roles;

-- Remover políticas antigas da tabela tenants (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view tenants" ON public.tenants;

-- Remover políticas antigas da tabela company_settings (se existirem)
DROP POLICY IF EXISTS "Authenticated users can view company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company_settings" ON public.company_settings;