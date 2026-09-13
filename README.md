# 🍽️ Plataforma SaaS Multitenant de Menú Digital

Plataforma B2B para restaurantes, cafeterías y bares que permite la gestión centralizada de cartas digitales interactivas, personalización de marca, promociones y generación de códigos QR.

---

## 🚀 Características Principales

- **Arquitectura Multitenant NATIVA**: Aislamiento por local (*slug* único en la URL).
- **Backend API REST robusto**: Construido en Node.js + Express con soporte PostgreSQL real y fallback offline.
- **Panel de Administración**: Gestión de catálogo, stock en tiempo real, platos destacados, promociones y branding.
- **Menú Digital PWA para Comensales**: Carga optimizada (< 1 seg), responsive y accesible desde código QR.
- **Base de Datos Relacional PostgreSQL**: Tablas relacionales con UUIDs, JSONB para filtros dietéticos, e índices optimizados.

---

## 🗄️ Estructura de la Base de Datos (`/db`)

- **`db/schema.sql`**: Definición DDL de las 9 tablas relacionales (`tenants`, `users`, `menus`, `categories`, `items`, `ingredients`, `item_ingredients`, `promotions`, `qr_codes`).
- **`db/seed.sql`**: Datos semilla de demostración (comercios preconfigurados y usuarios administradores).

### Diagrama Entidad-Relación
- `tenants` → `users` (Relación 1:N)
- `tenants` → `menus` → `categories` → `items` (Relación 1:N)
- `items` ↔ `ingredients` mediante `item_ingredients` (Relación N:M)

---

## 🛠️ Instalación y Uso Local

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DE_TU_REPOSITY_GITHUB>
   cd "Menu app"
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` basado en `.env.example`:
   ```env
   PORT=3000
   JWT_SECRET=tu_clave_secreta_local
   DATABASE_URL=postgresql://postgres:password@localhost:5432/menu_saas
   ```

4. **Ejecutar en modo desarrollo**:
   ```bash
   npm run dev
   ```

5. **Acceder a la aplicación**:
   - **Panel Admin**: `http://localhost:3000/admin.html` (Credenciales demo: `admin@gourmetbistro.com` / `admin123`)
   - **Menú Comensal**: `http://localhost:3000/index.html?tenant=gourmet-bistro`

---

## ☁️ Guía de Despliegue en la Nube

### 1. Base de Datos PostgreSQL Cloud (Supabase / Neon.tech)
1. Crea un proyecto en [Supabase.com](https://supabase.com) o [Neon.tech](https://neon.tech).
2. Ve a la consola SQL y ejecuta el contenido de `db/schema.sql` y luego `db/seed.sql`.
3. Copia la cadena de conexión (URI PostgreSQL).

### 2. Backend API REST (Render / Railway)
1. Conecta tu repositorio de GitHub en [Render.com](https://render.com) o [Railway.app](https://railway.app).
2. Selecciona un servicio web Node.js.
3. Agrega las variables de entorno:
   - `DATABASE_URL`: Tu URI de PostgreSQL.
   - `JWT_SECRET`: Clave aleatoria segura.
4. Despliega la aplicación.
