-- =============================================================================
-- ESQUEMA DDL POSTGRESQL PARA PLATAFORMA SAAS B2B DE MENÚ DIGITAL MULTITENANT
-- Archivo: db/schema.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA TENANTS (Locales / Comercios)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    tagline VARCHAR(255),
    hero_badge VARCHAR(100),
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
    accent_color VARCHAR(20) NOT NULL DEFAULT '#207567',
    logo_url TEXT,
    plan_tier VARCHAR(20) NOT NULL DEFAULT 'pro' CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active) WHERE is_active = TRUE;

-- 2. TABLA USERS (Usuarios de la Plataforma)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    global_role VARCHAR(30) NOT NULL DEFAULT 'client' CHECK (global_role IN ('superadmin', 'client', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.1 TABLA USER_TENANTS (Asignación Multilocal & Roles Granulares)
CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_tenant UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id);

-- 3. TABLA MENUS (Cartas Principales: Mediodía, Noche, Cafetería, Coctelería)
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_menu_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menus_tenant_active ON menus(tenant_id, is_active);

-- 4. TABLA CATEGORIES (Entradas, Principales, Postres, Bebidas)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'sparkles',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_menu_category_slug UNIQUE (menu_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_menu ON categories(menu_id, display_order);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);

-- 5. TABLA ITEMS (Platos, Bebidas y Productos del Catálogo)
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    formatted_price_override VARCHAR(30),
    short_description TEXT,
    full_story TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    is_chef_special BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    prep_time VARCHAR(30) DEFAULT '15 min',
    rating NUMERIC(3,2) DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
    hero_image_url TEXT,
    video_loop_url TEXT,
    model_3d_url TEXT,
    pairing_suggestion TEXT,
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

CREATE INDEX IF NOT EXISTS idx_items_tenant_category ON items(tenant_id, category_id, is_available);
CREATE INDEX IF NOT EXISTS idx_items_featured ON items(tenant_id, is_featured) WHERE is_featured = TRUE;

-- 6. TABLA INGREDIENTS (Catálogo de Ingredientes y Componentes)
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'leaf',
    description TEXT,
    allergen_warning VARCHAR(150),
    dietary_tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ingredients_tenant ON ingredients(tenant_id);

-- 7. TABLA ITEM_INGREDIENTS (Relación Plato-Ingrediente)
CREATE TABLE IF NOT EXISTS item_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
    display_order INT NOT NULL DEFAULT 0,
    is_optional BOOLEAN NOT NULL DEFAULT FALSE,
    extra_cost DECIMAL(10,2) DEFAULT 0.00 CHECK (extra_cost >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_item_ingredient UNIQUE (item_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_item_ingredients_item ON item_ingredients(item_id, display_order);

-- 8. TABLA PROMOTIONS (Banners Promocionales de Encabezado)
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    button_text VARCHAR(50) DEFAULT 'Ver Plato Especial',
    target_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promotions_tenant_active ON promotions(tenant_id, is_active);

-- 9. TABLA QR_CODES (Configuración de QR por Local)
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    fg_color VARCHAR(20) NOT NULL DEFAULT '#000000',
    bg_color VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
    logo_embed_url TEXT,
    size_px INT NOT NULL DEFAULT 1024,
    download_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA MULTITENANCY NATIVO
-- =============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para los comensales
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_items') THEN
        CREATE POLICY public_read_items ON items FOR SELECT USING (is_available = TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_categories') THEN
        CREATE POLICY public_read_categories ON categories FOR SELECT USING (is_active = TRUE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_promotions') THEN
        CREATE POLICY public_read_promotions ON promotions FOR SELECT USING (is_active = TRUE);
    END IF;
END $$;

-- Función trigger para updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_tenants') THEN
        CREATE TRIGGER trg_update_tenants BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_items') THEN
        CREATE TRIGGER trg_update_items BEFORE UPDATE ON items FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
    END IF;
END $$;
