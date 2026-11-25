# Arquitectura y Estructura del Proyecto (Noddo)

Este documento detalla la organización del repositorio con **separación estricta por dominio (`shared/`, `menu/`, `admin/`)** en **Vanilla JS (ES Modules) + CSS modularizado**, los endpoints REST disponibles y el plan de evolución.

---

## 1. Mapa Actual de Carpetas

```text
menu-digital-noddo/
│
├── AGENTS.md                          # Reglas obligatorias para desarrolladores y agentes de IA
├── README.md                          # Instrucciones de instalación y arranque local
├── netlify.toml                       # Configuración de Netlify: publica la carpeta /landing
├── package.json                       # Dependencias del backend (Node.js + Express + pg)
│
├── docs/                              # Documentación del proyecto
│   ├── architecture/
│   │   └── folder-structure.md        # Este documento
│   ├── specs/                         # Especificaciones de features o refactors importantes
│   └── adr/                           # Architecture Decision Records (decisiones técnicas)
│
├── server/                            # Backend API REST (Node.js + Express)
│   └── server.js                      # Endpoints REST (/api/v1/...), auth JWT, Postgres y fallback en memoria
│
├── app/                               # Frontend Vanilla (HTML5 + CSS3 modular + ES Modules)
│   ├── assets/                        # Imágenes de catálogo, platos y promos (/assets/...)
│   │
│   ├── shared/                        # Recursos compartidos (/shared/...)
│   │   ├── db.js                      # SDK cliente actual (API + fallback LocalStorage)
│   │   ├── menuData.js                # Datos semilla y perfiles de negocio (importado por server.js)
│   │   ├── services/                  # Cliente HTTP único (api-client.js) y servicios por recurso
│   │   ├── utils/                     # Helpers reutilizables (asset-url.js, moneda, DOM)
│   │   └── styles/
│   │       ├── tokens.css             # Design tokens (:root, temas dark/light/tenant) + Google Fonts
│   │       └── base.css               # Reset, body, .modal-backdrop / .sheet-backdrop y .toast-notification
│   │
│   ├── menu/                          # Frontend exclusivo del Comensal (servido en /, cero Admin)
│   │   ├── index.html                 # Portal selector (carga /shared/styles + /styles/portal.css)
│   │   ├── restaurant.html            # Menú digital comensal (Restaurante / Dark)
│   │   ├── cafe.html                  # Menú digital comensal (Cafetería / Light)
│   │   ├── passport.html              # Menú digital comensal (Le Pass'Port Nice)
│   │   ├── app.js                     # Script principal actual del menú comensal
│   │   ├── components/                # Módulos futuros del comensal (cards, filtros, bottom-sheet)
│   │   └── styles/
│   │       ├── portal.css             # Estilos exclusivos de index.html
│   │       └── menu.css               # Estilos exclusivos del menú comensal y bottom-sheet
│   │
│   └── admin/                         # Frontend exclusivo del Panel Admin (servido en /admin/)
│       ├── index.html                 # Panel de administración (carga /shared/styles + /admin/styles)
│       ├── admin.js                   # Script principal actual del panel admin
│       ├── tabs/                      # Pestañas modulares (catalog-tab.js, stock-tab.js, banners-tab.js, etc.)
│       ├── components/                # Componentes modulares del admin (modals, preview, etc.)
│       └── styles/
│           └── admin.css              # Estilos exclusivos del panel admin (modularizable en sub-hojas)
│
├── db/                                # Base de Datos Relacional (PostgreSQL / Supabase)
│   ├── schema.sql                     # DDL PostgreSQL (tenants, users, menus, items, etc.)
│   ├── seed.sql                       # Datos semilla de demostración
│   ├── supabase_schema.sql            # Esquema adaptado a Supabase
│   └── supabase_seed.sql
│
└── landing/                           # 🌐 Web comercial B2B (Netlify)
    ├── assets/                        # Recursos visuales propios de la landing
    └── index.html                     # Sitio comercial estático (⚠️ NO TOCAR sin pedido explícito)
```

---

## 2. Principio de Aislamiento (`menu/` vs `admin/` vs `shared/`)

1. **Cero descarga cruzada en el navegador**:
   - Al abrir cualquier carta pública (`restaurant.html`, `cafe.html`, `passport.html`), el navegador descarga únicamente `shared/` + `menu/`. Nunca solicita ni expone en DevTools → Sources ningún archivo de `admin/`.
   - Al abrir `admin.html`, se cargan `shared/` + `admin/` (el menú solo aparece dentro del `<iframe>` de vista previa si el dueño está editando).
2. **Preparado para hosts separados a futuro**:
   - Esta separación permite servir `menu` y `admin` en subdominios independientes (`menu.tudominio.com` y `admin.tudominio.com`) en producción manteniendo un único repo.
   - *(Nota técnica para cuando se separen hosts)*: el `<iframe>` de vista previa en `admin/admin.js` hoy usa `iframe.contentWindow.location.reload()` y `shared/db.js` sincroniza vía `localStorage` en mismo origen; en hosts distintos deberá recargarse reasignando `iframe.src` (o `postMessage`) y leer siempre desde `/api/v1/...`.
3. **Respeto a `landing/` y `server/`**:
   - `landing/` vive aislado para Netlify y no se toca.
   - `server/` entrega exclusivamente JSON bajo `/api/v1/...` además de servir estáticos de `app/` en desarrollo local.

---

## 3. Contratos Actuales de la API (`server/server.js`)

Todos los endpoints viven bajo el prefijo `/api/v1`:

- **Salud y Autenticación**
  - `GET /api/v1/health` — Estado del servidor.
  - `POST /api/v1/auth/login` — Login de administrador (devuelve JWT).
  - `GET /api/v1/auth/me` — Datos del usuario autenticado (requiere Bearer JWT).
- **Menú Público (Comensales)**
  - `GET /api/v1/public/menus/:slug` — Devuelve `tenant` (incluyendo `theme`, `themeMode`, `categories`, `accentColor`, `currencySymbol`, `logoUrl`), `items`, `promoBanners` y `promotion`.
  - `POST /api/v1/public/leads` — Registro de leads comerciales.
- **Panel Admin (requieren Bearer JWT salvo sync de tema demo)**
  - `PATCH /api/v1/admin/theme` — Actualiza branding, logo, nombre, acento y tema del comercio.
  - `GET /api/v1/admin/items` — Listado completo de platos del comercio.
  - `POST /api/v1/admin/items` — Crear o actualizar ítem.
  - `PATCH /api/v1/admin/items/:id/toggle-stock` — Activar/pausar disponibilidad.
  - `PATCH /api/v1/admin/items/:id/toggle-featured` — Destacar/quitar destacado.
  - `DELETE /api/v1/admin/items/:id` — Eliminar ítem.
  - `GET /api/v1/admin/qr-code` — Datos para generación de QR del local.
  - `GET /api/v1/admin/leads` — Consulta de leads.

---

## 4. Normas de Naming y Estilo

| Elemento | Convención | Ejemplos |
| :--- | :--- | :--- |
| **Carpetas y archivos nuevos** | `kebab-case` | `api-client.js`, `catalog-tab.js`, `tokens.css` |
| **Funciones, hooks y variables JS** | `camelCase` | `apiRequest()`, `fetchMenuBySlug()`, `tenantSlug` |
| **Variables booleanas** | Prefijos declarativos | `isAvailable`, `hasStock`, `isLoading` |
| **Constantes globales** | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `BUSINESS_PROFILES` |
| **Variables CSS (Design Tokens)** | Prefijo semántico | `--accent-gold`, `--bg-surface`, `--text-main` |
| **Base de datos (SQL)** | `snake_case` y plural | Tablas: `tenants`, `items`; FK: `tenant_id` |
| **Endpoints REST** | `kebab-case` plural | `GET /api/v1/admin/items`, `PATCH /api/v1/admin/items/:id/toggle-stock` |

---

## 5. Plan de Modularización Progresiva en `app/`

1. **Centralizar llamadas HTTP (`app/shared/services/api-client.js`)**
   - Unificar los `fetch()` de `menu/app.js` y `shared/db.js` en una función parametrizada (método, ruta, body, auth JWT, manejo de errores).
2. **Modularizar Panel Admin (`app/admin/tabs/`, `app/admin/components/`, `app/admin/styles/`)**
   - Dividir `admin.js` y `admin.html` por pestañas (Catálogo, Disponibles, Banners, QR, Configuración) y separar `admin.css` si hace falta (`layout.css`, `forms.css`, `modals.css`).
3. **Modularizar Menú Comensal (`app/menu/components/`) y unificar entrada por API**
   - Separar renderizadores (cards, filtros, carrusel, bottom-sheet) y cargar colores, fuentes, moneda, categorías y banners dinámicamente desde `GET /api/v1/public/menus/:slug`.
