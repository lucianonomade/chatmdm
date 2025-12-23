-- Remove a constraint unique global
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Cria nova constraint unique por tenant
ALTER TABLE public.categories ADD CONSTRAINT categories_name_tenant_unique UNIQUE (name, tenant_id);