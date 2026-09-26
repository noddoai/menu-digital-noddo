-- =============================================================================
-- ESQUEMA COMPLETO Y OPTIMIZADO PARA SUPABASE (POSTGRESQL)
-- Menús Digitales Multitenant B2B
-- Archivo: db/supabase_schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLA: RESTAURANTS (Locales / Comercios)
-- Vinculada al user_id de Supabase Auth (auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    tagline VARCHAR(255),
    hero_badge VARCHAR(100),
    logo_url TEXT,
    accent_color VARCHAR(20) NOT NULL DEFAULT '#207567',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_restaurant_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON public.restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_active_slug ON public.restaurants(slug) WHERE is_active = TRUE;

-- =============================================================================
-- 2. TABLA: CATEGORIES (Categorías del Menú)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'sparkles',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_restaurant_category_slug UNIQUE (restaurant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_restaurant_order ON public.categories(restaurant_id, display_order ASC);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_active ON public.categories(restaurant_id, is_active) WHERE is_active = TRUE;

-- =============================================================================
-- 3. TABLA: MENU_ITEMS (Platos, Bebidas y Productos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    short_description TEXT,
    full_story TEXT,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_chef_special BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    prep_time VARCHAR(30) DEFAULT '15 min',
    rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
    dietary_flags JSONB NOT NULL DEFAULT '{
        "isGlutenFree": false,
        "isVegan": false,
        "isVegetarian": false,
        "containsDairy": false,
        "containsNuts": false
    }'::jsonb,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_cat ON public.menu_items(restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_avail ON public.menu_items(restaurant_id, is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_featured ON public.menu_items(restaurant_id, is_featured) WHERE is_featured = TRUE;

-- =============================================================================
-- 4. TABLA: PROMOTIONS (Banners Promocionales)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    subtitle TEXT,
    badge VARCHAR(50),
    image_url TEXT NOT NULL,
    button_text VARCHAR(50) DEFAULT 'Ver Más',
    target_category_slug VARCHAR(100),
    target_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promotions_restaurant_active ON public.promotions(restaurant_id, is_active);

-- =============================================================================
-- 5. TRIGGER DE ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_restaurants_modtime') THEN
        CREATE TRIGGER trg_update_restaurants_modtime BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_categories_modtime') THEN
        CREATE TRIGGER trg_update_categories_modtime BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_menu_items_modtime') THEN
        CREATE TRIGGER trg_update_menu_items_modtime BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_promotions_modtime') THEN
        CREATE TRIGGER trg_update_promotions_modtime BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================================================
-- 6. SEGURIDAD A NIVEL DE FILAS (ROW LEVEL SECURITY - RLS)
-- =============================================================================

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- 6.1 POLÍTICAS PARA RESTAURANTS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public anonymous read active restaurants') THEN
        CREATE POLICY "Public anonymous read active restaurants" ON public.restaurants FOR SELECT TO anon, authenticated USING (is_active = TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner full management on restaurant') THEN
        CREATE POLICY "Owner full management on restaurant" ON public.restaurants FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- 6.2 POLÍTICAS PARA CATEGORIES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public anonymous read active categories') THEN
        CREATE POLICY "Public anonymous read active categories" ON public.categories FOR SELECT TO anon, authenticated USING (
            is_active = TRUE AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = categories.restaurant_id AND r.is_active = TRUE)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner full management on categories') THEN
        CREATE POLICY "Owner full management on categories" ON public.categories FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = categories.restaurant_id AND r.user_id = auth.uid())
        ) WITH CHECK (
            EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = categories.restaurant_id AND r.user_id = auth.uid())
        );
    END IF;
END $$;

-- 6.3 POLÍTICAS PARA MENU_ITEMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public anonymous read available menu items') THEN
        CREATE POLICY "Public anonymous read available menu items" ON public.menu_items FOR SELECT TO anon, authenticated USING (
            is_available = TRUE AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.is_active = TRUE)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner full management on menu items') THEN
        CREATE POLICY "Owner full management on menu items" ON public.menu_items FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.user_id = auth.uid())
        ) WITH CHECK (
            EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_items.restaurant_id AND r.user_id = auth.uid())
        );
    END IF;
END $$;

-- =============================================================================
-- 7. TRIGGER DE ALTA AUTOMÁTICA DE RESTAURANTE AL REGISTRARSE UN USUARIO (AUTH)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.restaurants (user_id, name, slug)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'Mi Restaurante'),
        COALESCE(
            NEW.raw_user_meta_data->>'restaurant_slug',
            LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g'))
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
    END IF;
END $$;

