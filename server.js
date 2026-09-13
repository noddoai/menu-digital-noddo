/**
 * SERVIDOR BACKEND API REST MULTITENANT (server.js)
 * Plataforma SaaS de Menús Digitales para Restaurantes, Bares y Cafeterías.
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aura_saas_super_secret_key_2026';

// Configuración del Pool de PostgreSQL (Opcional si hay DATABASE_URL)
const { Pool } = pg;
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('.'));

// ==========================================
// MOCK MEMORY DB (Fallback cuando no hay Postgres activo)
// ==========================================
const memoryDb = {
  tenants: [
    { id: 'tenant-rest-01', name: 'Gourmet Bistro & Grill', slug: 'gourmet-bistro', accentColor: '#207567', currencySymbol: '$' },
    { id: 'tenant-cafe-02', name: 'Maison Cafe & Bakery', slug: 'maison-cafe', accentColor: '#7c4a27', currencySymbol: '$' }
  ],
  users: [
    { id: 'u-1', tenantId: 'tenant-rest-01', email: 'admin@gourmetbistro.com', role: 'owner' },
    { id: 'u-2', tenantId: 'tenant-cafe-02', email: 'admin@maisoncafe.com', role: 'owner' }
  ],
  items: [
    {
      id: 'rest-01',
      tenantId: 'tenant-rest-01',
      businessProfile: 'restaurant',
      category: 'principales',
      name: 'Salmón a la Manteca de Limón',
      price: 25000,
      formattedPrice: '$ 25.00',
      shortDescription: 'Filete de salmón fresco a la plancha con salsa emulsionada de limón.',
      isAvailable: true,
      isChefSpecial: true,
      isFeatured: true,
      heroImage: 'assets/images/fresh_salmon.png'
    },
    {
      id: 'cafe-01',
      tenantId: 'tenant-cafe-02',
      businessProfile: 'bakery_cafe',
      category: 'pasteleria',
      name: 'Pancakes Dulces con Arándanos & Naranja',
      price: 25000,
      formattedPrice: '$ 25.00',
      shortDescription: 'Torre de pancakes esponjosos servidos con rodajas de naranja y miel.',
      isAvailable: true,
      isChefSpecial: true,
      isFeatured: true,
      heroImage: 'assets/images/berry_pancakes.png'
    }
  ]
};

// ==========================================
// MIDDLEWARES DE SEGURIDAD Y AUTENTICACIÓN
// ==========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token ausente' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

// ==========================================
// 1. ENDPOINT DE SALUD (HEALTHCHECK)
// ==========================================
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), databaseConnected: !!pool });
});

// ==========================================
// 2. RUTAS DE AUTENTICACIÓN (/api/v1/auth)
// ==========================================
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  // Si hay base de datos relacional conectada
  if (pool) {
    try {
      const dbRes = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
      const dbUser = dbRes.rows[0];

      if (dbUser && bcrypt.compareSync(password, dbUser.password_hash)) {
        const token = jwt.sign(
          { userId: dbUser.id, tenantId: dbUser.tenant_id, role: dbUser.role, email: dbUser.email },
          JWT_SECRET,
          { expiresIn: '8h' }
        );
        return res.json({
          token,
          user: { id: dbUser.id, email: dbUser.email, role: dbUser.role, tenantId: dbUser.tenant_id }
        });
      }
    } catch (err) {
      console.error('Error DB Login:', err);
    }
  }

  // Fallback demo local para prototipado
  if ((email === 'admin@gourmetbistro.com' || email === 'admin') && (password === 'admin123' || password === 'admin')) {
    const mockUser = memoryDb.users[0];
    const token = jwt.sign(
      { userId: mockUser.id, tenantId: mockUser.tenantId, role: mockUser.role, email: mockUser.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({ token, user: mockUser });
  }

  return res.status(401).json({ error: 'Credenciales inválidas' });
});

app.get('/api/v1/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==========================================
// 3. RUTA PÚBLICA PARA COMENSALES (/api/v1/public/menus/:slug)
// Carga ultrarrápida en < 1 segundo
// ==========================================
app.get('/api/v1/public/menus/:slug', async (req, res) => {
  const { slug } = req.params;

  if (pool) {
    try {
      const tenantRes = await pool.query('SELECT * FROM tenants WHERE slug = $1 AND is_active = TRUE', [slug]);
      if (tenantRes.rows.length === 0) {
        return res.status(404).json({ error: 'Local no encontrado' });
      }

      const tenant = tenantRes.rows[0];
      const itemsRes = await pool.query('SELECT * FROM items WHERE tenant_id = $1 AND is_available = TRUE ORDER BY display_order ASC', [tenant.id]);
      const promoRes = await pool.query('SELECT * FROM promotions WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1', [tenant.id]);

      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return res.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          tagline: tenant.tagline,
          heroBadge: tenant.hero_badge,
          currencySymbol: tenant.currency_symbol,
          accentColor: tenant.accent_color
        },
        items: itemsRes.rows,
        promotion: promoRes.rows[0] || null
      });
    } catch (err) {
      console.error('Error cargando menú público DB:', err);
    }
  }

  // Memory fallback
  const tenant = memoryDb.tenants.find(t => t.slug === slug || t.slug.includes(slug)) || memoryDb.tenants[0];
  const items = memoryDb.items.filter(i => i.tenantId === tenant.id || i.businessProfile === (slug.includes('cafe') ? 'bakery_cafe' : 'restaurant'));

  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json({ tenant, items, promotion: null });
});

// ==========================================
// 4. RUTAS PROTEGIDAS DEL PANEL DE CONTROL (/api/v1/admin/*)
// ==========================================
app.get('/api/v1/admin/items', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenantId;

  if (pool) {
    try {
      const itemsRes = await pool.query(
        'SELECT * FROM items WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );
      return res.json({ items: itemsRes.rows });
    } catch (err) {
      console.error('Error DB GET admin items:', err);
    }
  }

  const items = memoryDb.items.filter(i => i.tenantId === tenantId);
  res.json({ items });
});

app.post('/api/v1/admin/items', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenantId;
  const { name, price, shortDescription, categoryId, isAvailable, isChefSpecial, isFeatured, heroImage } = req.body;

  if (pool) {
    try {
      const insertRes = await pool.query(
        `INSERT INTO items (tenant_id, category_id, name, price, short_description, is_available, is_chef_special, is_featured, hero_image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          tenantId,
          categoryId || 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42',
          name || 'Nuevo Plato',
          price || 0,
          shortDescription || '',
          isAvailable !== undefined ? isAvailable : true,
          isChefSpecial || false,
          isFeatured || false,
          heroImage || null
        ]
      );
      return res.status(201).json({ message: 'Plato guardado exitosamente', item: insertRes.rows[0] });
    } catch (err) {
      console.error('Error DB POST admin item:', err);
    }
  }

  const newItem = {
    ...req.body,
    id: req.body.id || `item-${Date.now()}`,
    tenantId
  };
  memoryDb.items.unshift(newItem);
  res.status(201).json({ message: 'Plato guardado exitosamente', item: newItem });
});

app.patch('/api/v1/admin/items/:id/toggle-stock', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  if (pool) {
    try {
      const updateRes = await pool.query(
        'UPDATE items SET is_available = NOT is_available WHERE id = $1 AND tenant_id = $2 RETURNING id, is_available',
        [id, tenantId]
      );
      if (updateRes.rows.length > 0) {
        return res.json({ id: updateRes.rows[0].id, isAvailable: updateRes.rows[0].is_available });
      }
    } catch (err) {
      console.error('Error DB Toggle Stock:', err);
    }
  }

  const item = memoryDb.items.find(i => i.id === id);
  if (item) {
    item.isAvailable = !item.isAvailable;
    return res.json({ id, isAvailable: item.isAvailable });
  }
  res.status(404).json({ error: 'Plato no encontrado' });
});

app.patch('/api/v1/admin/items/:id/toggle-featured', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  if (pool) {
    try {
      const updateRes = await pool.query(
        'UPDATE items SET is_featured = NOT is_featured WHERE id = $1 AND tenant_id = $2 RETURNING id, is_featured',
        [id, tenantId]
      );
      if (updateRes.rows.length > 0) {
        return res.json({ id: updateRes.rows[0].id, isFeatured: updateRes.rows[0].is_featured });
      }
    } catch (err) {
      console.error('Error DB Toggle Featured:', err);
    }
  }

  const item = memoryDb.items.find(i => i.id === id);
  if (item) {
    item.isFeatured = !item.isFeatured;
    return res.json({ id, isFeatured: item.isFeatured });
  }
  res.status(404).json({ error: 'Plato no encontrado' });
});

app.delete('/api/v1/admin/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  if (pool) {
    try {
      await pool.query('DELETE FROM items WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      return res.json({ message: 'Plato eliminado correctamente', id });
    } catch (err) {
      console.error('Error DB DELETE item:', err);
    }
  }

  memoryDb.items = memoryDb.items.filter(i => i.id !== id);
  res.json({ message: 'Plato eliminado correctamente', id });
});

// Generador de QR dinámico
app.get('/api/v1/admin/qr-code', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenantId;
  let tenantSlug = 'gourmet-bistro';

  if (pool) {
    try {
      const tRes = await pool.query('SELECT slug FROM tenants WHERE id = $1', [tenantId]);
      if (tRes.rows.length > 0) tenantSlug = tRes.rows[0].slug;
    } catch (err) {
      console.error('Error DB QR Code:', err);
    }
  } else {
    const tenant = memoryDb.tenants.find(t => t.id === tenantId) || memoryDb.tenants[0];
    if (tenant) tenantSlug = tenant.slug;
  }

  const host = req.headers.host || 'localhost:3000';
  const targetUrl = `http://${host}/index.html?tenant=${tenantSlug}`;

  res.json({
    tenantId,
    targetUrl,
    downloadUrls: {
      svg: `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(targetUrl)}&format=svg`,
      png: `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(targetUrl)}&format=png`
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor API REST Multitenant corriendo en puerto ${PORT}`);
  console.log(`Endpoint de prueba: http://localhost:${PORT}/api/v1/health`);
  console.log(`Menú público: http://localhost:${PORT}/api/v1/public/menus/gourmet-bistro`);
});
