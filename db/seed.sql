-- =============================================================================
-- DATOS DE PRUEBA Y SEMILLA (SEED DATA) PARA SAAS MULTITENANT
-- Archivo: db/seed.sql
-- Contiene 2 locales de demostración: Gourmet Bistro & Grill (restaurant) y Maison Cafe & Bakery (bakery_cafe)
-- =============================================================================

-- 1. INSERTAR TENANTS (Locales Gastronómicos)
INSERT INTO tenants (id, name, slug, tagline, hero_badge, currency_symbol, accent_color, plan_tier)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Gourmet Bistro & Grill', 'gourmet-bistro', 'Cocina Fresca, Natural & Sabores de Estación', 'RESTAURANTE FRESCO 2026', '$', '#207567', 'pro'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Maison Cafe & Bakery', 'maison-cafe', 'Café de Especialidad, Brunchs & Pastelería Fresca', 'BEST BRUNCH 2026', '$', '#7c4a27', 'pro')
ON CONFLICT (slug) DO NOTHING;

-- 2. INSERTAR USUARIOS (Credenciales de administración: hash de password 'admin123')
INSERT INTO users (tenant_id, email, password_hash, full_name, role)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@gourmetbistro.com', '$2a$10$wT0fK5GqBw5r1hD/X8Zf0e2Vj5C7m0N1P2Q3R4S5T6U7V8W9X0Y1Z', 'Chef Principal Bistro', 'owner'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'admin@maisoncafe.com', '$2a$10$wT0fK5GqBw5r1hD/X8Zf0e2Vj5C7m0N1P2Q3R4S5T6U7V8W9X0Y1Z', 'Gerente Maison Cafe', 'owner')
ON CONFLICT (email) DO NOTHING;

-- 3. INSERTAR MENÚS
INSERT INTO menus (id, tenant_id, name, slug, description, display_order)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Carta Principal', 'carta-principal', 'Menú diario de almuerzos y cenas', 1),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Carta Cafetería & Brunch', 'carta-cafeteria', 'Cafés de especialidad y productos horneados', 1)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- 4. INSERTAR CATEGORÍAS
INSERT INTO categories (id, tenant_id, menu_id, name, slug, icon, display_order)
VALUES
  -- Gourmet Bistro Categories
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Entradas & Ensaladas', 'entradas', 'salad', 1),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Platos Principales', 'principales', 'flame', 2),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Postres del Día', 'postres', 'cake', 3),
  -- Maison Cafe Categories
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Pancakes & Tartas', 'pasteleria', 'cake', 1),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Café & Bebidas', 'cafe_especialidad', 'coffee', 2),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Brunch & Toast', 'brunch', 'sandwich', 3)
ON CONFLICT (menu_id, slug) DO NOTHING;

-- 5. INSERTAR ITEMS (PLATOS)
INSERT INTO items (id, tenant_id, category_id, name, price, formatted_price_override, short_description, full_story, is_available, is_chef_special, is_featured, prep_time, rating, hero_image_url, dietary_flags)
VALUES
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    'Salmón a la Manteca de Limón',
    25000.00,
    '$ 25.00',
    'Filete de salmón fresco a la plancha con salsa emulsionada de limón, espárragos verdes y hierbas aromáticas.',
    'Preparado al momento con salmón fresco de pesca sustentable.',
    TRUE, TRUE, TRUE, '20 min', 4.80, 'assets/images/fresh_salmon.png',
    '{"isGlutenFree": true, "isVegan": false, "isVegetarian": false, "containsDairy": true, "containsNuts": false}'::jsonb
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    'Pollo a las Finas Hierbas con Patatas',
    29000.00,
    '$ 29.00',
    'Pechuga marinada en romero y tomillo fresco, servida con patatas rústicas doradas.',
    'Pollo de granja marinado durante 12 horas en aceites botánicos.',
    TRUE, TRUE, TRUE, '30 min', 4.60, 'assets/images/herb_chicken.png',
    '{"isGlutenFree": true, "isVegan": false, "isVegetarian": false, "containsDairy": false, "containsNuts": false}'::jsonb
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'Pancakes Dulces con Arándanos & Naranja',
    25000.00,
    '$ 25.00',
    'Torre de pancakes esponjosos servidos con rodajas de naranja, arándanos frescos y miel.',
    'Esponjosos por dentro con aroma natural de vainilla Bourbon.',
    TRUE, TRUE, TRUE, '20 min', 4.80, 'assets/images/berry_pancakes.png',
    '{"isGlutenFree": false, "isVegan": false, "isVegetarian": true, "containsDairy": true, "containsNuts": false}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 6. INSERTAR BANNERS PROMOCIONALES
INSERT INTO promotions (tenant_id, title, subtitle, image_url, button_text, target_item_id, is_active)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Prueba Nuestro Salmón a la Limonada',
    'Filete de salmón fresco a la plancha con vegetales de estación y salsa cítrica de la casa.',
    'assets/images/fresh_salmon.png',
    'Ver Plato Especial',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51',
    TRUE
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Desayunos & Pancakes Especiales',
    'Pancakes esponjosos servidos con arándanos frescos, miel de azahar y crema batida.',
    'assets/images/berry_pancakes.png',
    'Ver Desayunos',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    TRUE
  );

-- 7. INSERTAR CONFIGURACIÓN DE QR
INSERT INTO qr_codes (tenant_id, target_url, fg_color, bg_color, size_px)
VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'https://miapp.com/menu/gourmet-bistro', '#207567', '#FFFFFF', 1024),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'https://miapp.com/menu/maison-cafe', '#7c4a27', '#FFFFFF', 1024)
ON CONFLICT (tenant_id) DO NOTHING;
