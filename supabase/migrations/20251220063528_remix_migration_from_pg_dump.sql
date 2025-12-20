CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'seller'
);


--
-- Name: can_view_customer_doc(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_customer_doc(_customer_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
$$;


--
-- Name: can_view_customer_pii(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_customer_pii() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
$$;


--
-- Name: can_view_payment_details(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_payment_details() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
$$;


--
-- Name: get_email_by_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_email_by_name(p_name text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE LOWER(name) = LOWER(p_name)
  LIMIT 1;
  
  RETURN v_email;
END;
$$;


--
-- Name: get_public_company_branding(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_company_branding() RETURNS json
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT json_build_object(
    'login_header_color', COALESCE(login_header_color, '#ffffff'::text),
    'logo_url', logo_url,
    'name', name
  )
  FROM public.company_settings
  ORDER BY created_at ASC
  LIMIT 1;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), NEW.email);
  
  -- First user becomes admin, others become sellers
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'seller');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: seller_can_view_customer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seller_can_view_customer(_customer_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.service_orders
    WHERE seller_id = auth.uid()
    AND customer_id = _customer_id
  )
$$;


--
-- Name: sync_user_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_user_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles 
  SET email = NEW.email 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


--
-- Name: update_product_stock(uuid, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_product_stock(p_product_id uuid, p_quantity integer, p_type text, p_reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_previous_stock integer;
  v_new_stock integer;
BEGIN
  -- Authorization check - only admins and managers can update stock
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins and managers can update stock';
  END IF;

  -- Get current stock
  SELECT stock INTO v_previous_stock FROM products WHERE id = p_product_id;
  
  -- Calculate new stock
  IF p_type = 'in' THEN
    v_new_stock := v_previous_stock + p_quantity;
  ELSIF p_type = 'out' THEN
    v_new_stock := v_previous_stock - p_quantity;
  ELSE -- adjustment
    v_new_stock := p_quantity;
  END IF;
  
  -- Update product stock
  UPDATE products SET stock = v_new_stock, updated_at = now() WHERE id = p_product_id;
  
  -- Log movement
  INSERT INTO stock_movements (product_id, quantity, type, reason, previous_stock, new_stock, created_by)
  VALUES (p_product_id, p_quantity, p_type, p_reason, v_previous_stock, v_new_stock, auth.uid());
END;
$$;


SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT 'Minha Empresa'::text NOT NULL,
    cnpj text,
    address text,
    phone text,
    email text,
    logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    uses_stock boolean DEFAULT true,
    low_stock_threshold integer DEFAULT 10,
    print_logo_on_receipts boolean DEFAULT true,
    auto_print_on_sale boolean DEFAULT false,
    notify_low_stock boolean DEFAULT true,
    notify_new_sales boolean DEFAULT true,
    notify_pending_payments boolean DEFAULT true,
    notify_order_status boolean DEFAULT true,
    print_logo_url text,
    login_header_color text DEFAULT '#ffffff'::text,
    phone2 text
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    doc text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customers_email_format CHECK (((email IS NULL) OR (email = ''::text) OR (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT customers_name_length CHECK ((length(name) <= 255)),
    CONSTRAINT customers_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT customers_phone_length CHECK (((phone IS NULL) OR (length(phone) <= 20)))
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid,
    supplier_name text,
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    date timestamp with time zone DEFAULT now(),
    category text,
    CONSTRAINT expenses_amount_positive CHECK ((amount >= (0)::numeric)),
    CONSTRAINT expenses_description_not_empty CHECK ((length(TRIM(BOTH FROM description)) > 0))
);


--
-- Name: fixed_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_day integer NOT NULL,
    category text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT fixed_expenses_amount_positive CHECK ((amount >= (0)::numeric)),
    CONSTRAINT fixed_expenses_due_day_valid CHECK (((due_day >= 1) AND (due_day <= 31))),
    CONSTRAINT fixed_expenses_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['low_stock'::text, 'new_sale'::text, 'pending_payment'::text, 'order_status'::text])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    subcategory text,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    type text DEFAULT 'product'::text NOT NULL,
    description text,
    variations jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pricing_mode text DEFAULT 'quantity'::text NOT NULL,
    CONSTRAINT products_name_length CHECK ((length(name) <= 255)),
    CONSTRAINT products_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT products_price_positive CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_non_negative CHECK ((stock >= 0))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    email text
);


--
-- Name: service_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_orders (
    id text NOT NULL,
    customer_id uuid,
    customer_name text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    amount_paid numeric(10,2) DEFAULT 0,
    remaining_amount numeric(10,2) DEFAULT 0,
    payments jsonb DEFAULT '[]'::jsonb,
    deadline timestamp with time zone,
    description text,
    measurements text,
    seller_id uuid,
    seller_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT service_orders_amount_paid_non_negative CHECK (((amount_paid IS NULL) OR (amount_paid >= (0)::numeric))),
    CONSTRAINT service_orders_customer_name_not_empty CHECK ((length(TRIM(BOTH FROM customer_name)) > 0)),
    CONSTRAINT service_orders_total_non_negative CHECK ((total >= (0)::numeric))
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    type text NOT NULL,
    reason text,
    previous_stock integer NOT NULL,
    new_stock integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT stock_movements_type_check CHECK ((type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text])))
);


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT suppliers_name_length CHECK ((length(name) <= 255)),
    CONSTRAINT suppliers_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'seller'::public.app_role NOT NULL
);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fixed_expenses fixed_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_expenses
    ADD CONSTRAINT fixed_expenses_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: service_orders service_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_name_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_name_category_id_key UNIQUE (name, category_id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read);


--
-- Name: idx_profiles_name_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_name_lower ON public.profiles USING btree (lower(name));


--
-- Name: categories categories_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: expenses expenses_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: service_orders service_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: service_orders service_orders_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_orders
    ADD CONSTRAINT service_orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id);


--
-- Name: stock_movements stock_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: stock_movements stock_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customers Admin and managers can create customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and managers can create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: customers Admin and managers can update customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin and managers can update customers" ON public.customers FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: notifications Admin managers or self can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin managers or self can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR (user_id = auth.uid()) OR ((user_id IS NULL) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)))));


--
-- Name: products Admins and managers can delete products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete products" ON public.products FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: products Admins and managers can insert products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: stock_movements Admins and managers can insert stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can insert stock movements" ON public.stock_movements FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: expenses Admins and managers can manage expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage expenses" ON public.expenses TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: fixed_expenses Admins and managers can manage fixed expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage fixed expenses" ON public.fixed_expenses TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: suppliers Admins and managers can manage suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage suppliers" ON public.suppliers TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: products Admins and managers can update products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update products" ON public.products FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: company_settings Admins and managers can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update settings" ON public.company_settings FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: customers Admins and managers can view all customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view all customers" ON public.customers FOR SELECT USING (((auth.uid() IS NOT NULL) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))));


--
-- Name: expenses Admins and managers can view expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view expenses" ON public.expenses FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: fixed_expenses Admins and managers can view fixed expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view fixed expenses" ON public.fixed_expenses FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: company_settings Admins and managers can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view settings" ON public.company_settings FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: stock_movements Admins and managers can view stock movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view stock movements" ON public.stock_movements FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: service_orders Admins can delete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete orders" ON public.service_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_settings Admins can insert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert settings" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Authenticated users can create categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create categories" ON public.categories FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: subcategories Authenticated users can create subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create subcategories" ON public.subcategories FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: categories Authenticated users can delete categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: subcategories Authenticated users can delete subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete subcategories" ON public.subcategories FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: categories Authenticated users can update categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: subcategories Authenticated users can update subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update subcategories" ON public.subcategories FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: categories Authenticated users can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: products Authenticated users can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);


--
-- Name: profiles Authenticated users can view profiles with role check; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view profiles with role check" ON public.profiles FOR SELECT USING (((auth.uid() IS NOT NULL) AND ((id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))));


--
-- Name: subcategories Authenticated users can view subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view subcategories" ON public.subcategories FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: suppliers Authenticated users can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);


--
-- Name: service_orders Only users with roles can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only users with roles can create orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'seller'::public.app_role)) AND ((seller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))));


--
-- Name: customers Sellers can view customers from their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view customers from their orders" ON public.customers FOR SELECT USING (((auth.uid() IS NOT NULL) AND public.seller_can_view_customer(id)));


--
-- Name: customers Sellers can view customers they created; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view customers they created" ON public.customers FOR SELECT USING (((auth.uid() IS NOT NULL) AND (created_by = auth.uid())));


--
-- Name: customers Users can delete customers they created or admins/managers can ; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete customers they created or admins/managers can " ON public.customers FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: service_orders Users can update own orders or all if admin/manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own orders or all if admin/manager" ON public.service_orders FOR UPDATE TO authenticated USING (((seller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: notifications Users can view notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notifications" ON public.notifications FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: service_orders Users can view own orders or all if admin/manager; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own orders or all if admin/manager" ON public.service_orders FOR SELECT TO authenticated USING (((seller_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: user_roles Users can view own role or admins view all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role or admins view all" ON public.user_roles FOR SELECT USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: fixed_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: service_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: subcategories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;