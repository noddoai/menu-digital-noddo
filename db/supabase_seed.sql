-- =============================================================================
-- SCRIPT DE MIGRACIÓN Y SEMILLA (SEED) PARA SUPABASE
-- Archivo: db/supabase_seed.sql
-- =============================================================================
-- INSTRUCCIONES:
-- 1. Crea primero los usuarios administradores en Supabase Auth Dashboard o via SDK:
--    - admin@gourmetbistro.com -> Guarda su USER_ID de Supabase
--    - admin@maisoncafe.com    -> Guarda su USER_ID de Supabase
-- 2. Reemplaza los marcadores <USER_ID_GOURMET> y <USER_ID_MAISON> abajo con los UUIDs reales obtenidos.

-- 1. RESTAURANTES (RESTAURANTS)
INSERT INTO public.restaurants (id, user_id, name, slug, tagline, hero_badge, accent_color, currency_symbol, is_active)
VALUES 
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    '<USER_ID_GOURMET>'::uuid, 
    'Gourmet Bistro & Grill', 
    'gourmet-bistro', 
    'Cocina Fresca, Natural & Sabores de Estación', 
    'RESTAURANTE FRESCO 2026', 
    '#207567', 
    '$', 
    TRUE
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 
    '<USER_ID_MAISON>'::uuid, 
    'Maison Cafe & Bakery', 
    'maison-cafe', 
    'Café de Especialidad, Brunchs & Pastelería Fresca', 
    'BEST BRUNCH 2026', 
    '#7c4a27', 
    '$', 
    TRUE
  )
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  accent_color = EXCLUDED.accent_color;

-- 2. CATEGORÍAS (CATEGORIES)
INSERT INTO public.categories (id, restaurant_id, name, slug, icon, display_order, is_active)
VALUES
  -- Gourmet Bistro
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Entradas & Ensaladas', 'entradas', 'salad', 1, TRUE),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Platos Principales', 'principales', 'flame', 2, TRUE),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Coctelería & Vinos', 'cocteleria', 'glass-water', 3, TRUE),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Postres del Día', 'postres', 'cake', 4, TRUE),
  -- Maison Cafe
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Pancakes & Tartas', 'pasteleria', 'cake', 1, TRUE),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Café & Bebidas', 'cafe_especialidad', 'coffee', 2, TRUE),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a47', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Brunch & Toast', 'brunch', 'sandwich', 3, TRUE)
ON CONFLICT (restaurant_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- 3. PLATOS E ÍTEMS (MENU_ITEMS)
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, price, short_description, full_story, is_available, is_chef_special, is_featured, prep_time, rating, image_url, dietary_flags)
VALUES
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    'Salmón a la Manteca de Limón',
    25000.00,
    'Filete de salmón fresco a la plancha con salsa emulsionada de limón, espárragos verdes y hierbas aromáticas.',
    'Preparado al momento con salmón fresco de pesca sustentable.',
    TRUE, TRUE, TRUE, '20 min', 4.80, 'assets/images/fresh_salmon.png',
    '{"isGlutenFree": true, "isVegan": false, "isVegetarian": false, "containsDairy": true, "containsNuts": false}'::jsonb
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
    'Ojo de Bife Wagyu al Romero',
    34000.00,
    'Corte de res Wagyu 400g madurado 21 días, servido con patatas rústicas y manteca de ajo asado.',
    'Selección especial con marmoleado superior.',
    TRUE, TRUE, TRUE, '25 min', 4.90, 'assets/images/herb_chicken.png',
    '{"isGlutenFree": true, "isVegan": false, "isVegetarian": false, "containsDairy": true, "containsNuts": false}'::jsonb
  ),
  (
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45',
    'Pancakes Dulces con Arándanos & Naranja',
    25000.00,
    'Torre de pancakes esponjosos servidos con rodajas de naranja, arándanos frescos, miel pura y crema.',
    'Esponjosos por dentro con aroma natural de vainilla Bourbon.',
    TRUE, TRUE, TRUE, '20 min', 4.80, 'assets/images/berry_pancakes.png',
    '{"isGlutenFree": false, "isVegan": false, "isVegetarian": true, "containsDairy": true, "containsNuts": false}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  short_description = EXCLUDED.short_description;

-- 4. BANNERS PROMOCIONALES (PROMOTIONS)
INSERT INTO public.promotions (restaurant_id, title, subtitle, badge, image_url, button_text, target_item_id, is_active)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Salmón a la Manteca de Limón & Espárragos',
    'Corte magro de pesca sustentable a la plancha con aliño de eneldo fresco.',
    'RECOMENDACIÓN DEL CHEF',
    'assets/images/fresh_salmon.png',
    'Probar Plato',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51',
    TRUE
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Pancakes Dulces con Arándanos & Naranja',
    'Pancakes esponjosos servidos con miel de azahar y crema batida.',
    'BRUNCH SPECIAL',
    'assets/images/berry_pancakes.png',
    'Pedir Brunch',
    'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53',
    TRUE
  );
