# Arquitectura y Estructura del Proyecto (Noddo)

Este documento detalla la organización de carpetas del repositorio, la justificación de diseño y los estándares de desarrollo que rigen el proyecto.

---

## 1. Mapa de la Estructura

```text
menu-digital-noddo/
│
├── AGENTS.md                          # Directivas y contexto de alto nivel para asistentes de IA
├── README.md                          # Instrucciones para clonar, instalar y levantar el entorno local
├── netlify.toml                       # Configuración de Netlify: publica la carpeta /landing
├── package.json                       # Configuración y dependencias raíz (Node / Express)
│
├── docs/                              # Documentación del sistema (Metodología SDD)
│   ├── architecture/
│   │   └── folder-structure.md        # Este documento
│   ├── specs/                         # Especificaciones funcionales y técnicas (PRDs)
│   └── adr/                           # Architecture Decision Records (registros de decisiones tomadas)
│
├── server/                            # Backend API REST
│   └── server.js                      # Servidor Express, endpoints REST (/api/v1), conexión Postgres y fallbacks
│
├── app/                               # Frontend de la aplicación (en transición hacia React)
│   ├── assets/                        # Imágenes de catálogo, fotos de platos y logos
│   ├── index.html                     # Portal selector de demostración / punto de entrada
│   ├── restaurant.html                # Menú digital comensal (Dark Mode - Bistro & Grill)
│   ├── cafe.html                      # Menú digital comensal (Warm Bright - Cafetería & Bakery)
│   ├── passport.html                  # Menú digital comensal (Nice Cuisine)
│   ├── admin.html                     # Panel de control y administración de locales
│   ├── app.js                         # Lógica interactiva del menú comensal (filtros, carruseles, bottom sheets)
│   ├── admin.js                       # Lógica interactiva del panel de administración
│   ├── db.js                          # SDK cliente frontend con sincronización API y fallback LocalStorage
│   ├── menuData.js                    # Mock data inicial y perfiles de comercio
│   └── styles.css                     # Hojas de estilo globales
│
├── db/                                # Base de Datos Relacional
│   ├── schema.sql                     # DDL de PostgreSQL (tenants, users, menus, items, etc.)
│   ├── seed.sql                       # Datos semilla de demostración
│   ├── supabase_schema.sql            # Esquema optimizado para Supabase Cloud
│   └── supabase_seed.sql
│
└── landing/                           # Landing comercial de captación B2B
    ├── assets/                        # Recursos visuales propios de la landing
    └── index.html                     # Sitio comercial estático desplegado en Netlify
```

---

## 2. Justificación de la Separación de Áreas

1. **`landing/` (Comercial y Marketing)**:
   - Sitio 100% estático orientado a conversión de leads y ventas.
   - Vive en su propia carpeta porque se despliega de forma independiente en Netlify sin build step y no debe interferir con la lógica de la aplicación de restaurantes.
2. **`server/` (Backend / API REST)**:
   - Contiene la lógica del servidor Node.js y Express.
   - Entrega exclusivamente datos estructurados en JSON (`/api/v1/auth`, `/api/v1/public/menus/:slug`, `/api/v1/admin/items`, `/api/v1/public/leads`).
   - Sirve provisionalmente los estáticos de `app/` durante el desarrollo local.
3. **`app/` (Frontend Comensal y Admin)**:
   - Concentra todo el código cliente.
   - Actualmente implementado en HTML5/CSS3/ES Modules.
   - Está preparado para alojar la migración progresiva a React (Vite).
4. **`db/` (Persistencia)**:
   - Mantiene los scripts SQL separados del código de aplicación, facilitando su ejecución en Supabase, Neon o PostgreSQL local.

---

## 3. Normas de Naming (Estándares de la Industria)

| Elemento | Convención | Ejemplos |
| :--- | :--- | :--- |
| **Directorios y rutas** | `kebab-case` | `menu-items/`, `dietary-filters/` |
| **Componentes React** | `PascalCase` | `DishCard.jsx`, `FeaturedCarousel.jsx` |
| **Hooks y Utilidades** | `camelCase` (hooks con prefijo `use`) | `useMenu.js`, `formatCurrency.js` |
| **Funciones y variables** | `camelCase` | `getAvailableDishes()`, `tenantSlug` |
| **Variables booleanas** | Prefijos de estado | `isAvailable`, `hasStock`, `isLoading` |
| **Constantes globales** | `UPPER_SNAKE_CASE` | `JWT_SECRET`, `MAX_FILE_SIZE` |
| **Base de datos (SQL)** | `snake_case` y plural | Tablas: `tenants`, `items`<br>Campos: `created_at`, `tenant_id` |
| **Endpoints REST** | `kebab-case` y sustantivos plurales | `GET /api/v1/menu-items`<br>`PATCH /api/v1/items/:id/toggle-stock` |

---

## 4. Próximos Pasos (Roadmap de Migración a React)

1. Crear especificación de la aplicación cliente en `docs/specs/01-client-menu-react.md`.
2. Inicializar la configuración de React (Vite + Tailwind CSS) en `app/`.
3. Modularizar el backend en `server/src/modules/` (features: `auth`, `menus`, `items`, `leads`).
