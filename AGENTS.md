# Contexto y Reglas del Proyecto para Agentes de IA (AGENTS.md)

Este documento es la referencia principal para cualquier desarrollador o agente de IA que trabaje en este repositorio. Léelo completo antes de proponer o editar código.

---

## 1. Visión General del Proyecto
**Noddo** es una plataforma SaaS B2B Multitenant para la gestión de menús digitales interactivos y panel de control gastronómico para restaurantes, bares y cafeterías.

### Stack Técnico Oficial
- **Backend (`server/`)**: Node.js + Express (`"type": "module"`), API REST JSON pura bajo `/api/v1/...`, PostgreSQL con fallback en memoria.
- **Frontend (`app/`)**: **HTML5 + CSS3 modular + JavaScript Vanilla con ES Modules nativos (`<script type="module">`)**. **Sin React, sin Vite, sin Tailwind ni bundlers.**
- **Base de datos (`db/`)**: PostgreSQL / Supabase (DDL + seeds SQL).
- **Landing (`landing/`)**: Sitio comercial estático desplegado en Netlify.

---

## 2. Estructura de Carpetas

El frontend en `app/` está separado por dominio en **`shared/`**, **`menu/`** y **`admin/`** para que quien abre el menú comensal nunca descargue CSS ni JS del panel de administración (y para permitir desplegarlos en hosts separados a futuro):

```text
menu-digital-noddo/
├── AGENTS.md                  # Reglas obligatorias del repo para IA y equipo
├── README.md                  # Onboarding e instalación local
├── netlify.toml               # Despliegue de Netlify (publica landing/)
├── package.json               # Scripts y dependencias del backend (Express + pg)
├── db/                        # DDL PostgreSQL y seeds (schema.sql, seed.sql)
├── docs/                      # Documentación arquitectónica, contratos API y specs
│   └── architecture/
│       └── folder-structure.md # Mapa detallado, endpoints y roadmap
├── landing/                   # ⚠️ Web comercial estática en Netlify (NO tocar sin requerimiento)
├── server/                    # Backend API REST puro (/api/v1/...) + estáticos de app/
│   └── server.js
└── app/                       # Frontend Vanilla (HTML + CSS modular + ES Modules)
    ├── assets/                # Imágenes y recursos locales compartidos (/assets/...)
    ├── shared/                # Código y estilos comunes (/shared/...)
    │   ├── db.js              # SDK cliente actual (API + fallback LocalStorage)
    │   ├── menuData.js        # Perfiles y datos iniciales
    │   ├── services/          # Cliente HTTP centralizado (api-client.js) y servicios
    │   ├── utils/             # Helpers reutilizables (asset-url.js, moneda, DOM)
    │   └── styles/            # tokens.css (variables CSS), base.css (reset, backdrops, toast)
    ├── menu/                  # Exclusivo del menú comensal (servido en /)
    │   ├── index.html         # Portal selector de demostraciones
    │   ├── restaurant.html    # Menú comensal (perfil restaurante)
    │   ├── cafe.html          # Menú comensal (perfil cafetería)
    │   ├── passport.html      # Menú comensal (perfil Nice)
    │   ├── app.js             # Entry point del menú comensal
    │   ├── components/        # Módulos UI del comensal (cards, filtros, modales)
    │   └── styles/            # menu.css, portal.css
    └── admin/                 # Exclusivo del panel de administración (servido en /admin/)
        ├── index.html         # Layout general liviano del panel (slots de pestañas y preview)
        ├── admin.js           # Entry point y orquestador de parciales del admin
        ├── tabs/              # Cada pestaña en su carpeta (.html + .js)
        │   ├── catalog/       # catalog-tab.html + catalog-tab.js
        │   ├── stock/         # stock-tab.html + stock-tab.js
        │   ├── banners/       # banners-tab.html + banners-tab.js
        │   ├── qr/            # qr-tab.html + qr-tab.js
        │   └── settings/      # settings-tab.html/.js + subcarpetas (general/, menu-style/, categories/, staff/)
        ├── components/        # Componentes UI exclusivos del admin (ej. phone-preview/)
        └── styles/            # admin.css (modularizable en layout.css, forms.css, etc.)
```

> Ver el detalle completo de responsabilidades y endpoints en `docs/architecture/folder-structure.md`.

---

## 3. Reglas de Oro (Constraints)

1. **No tocar `landing/`**: La landing comercial vive aislada y se despliega independientemente en Netlify. No modificar sus archivos salvo pedido explícito del usuario.
2. **Aislamiento estricto `menu/` vs `admin/`**:
   - Los HTML y módulos de `menu/` **nunca** deben importar JS ni CSS de `admin/` (el comensal no debe descargar ni ver código del panel en DevTools → Sources).
   - Todo recurso común va en `app/shared/`.
3. **Frontend Vanilla puro (sin frameworks ni build step)**: Todo el frontend en `app/` usa HTML, CSS y JavaScript Vanilla con **ES Modules nativos** (`import` / `export` con extensión `.js` explícita). **Prohibido** instalar o introducir React, Vite, Tailwind CSS u otros frameworks/bundlers.
4. **Backend Desacoplado**: `server/` debe ser una API REST JSON pura (`/api/v1/...`). No acoplar lógica de presentación ni generar HTML desde el backend (salvo servir los estáticos de `app/`).
5. **Llamados HTTP centralizados**: Toda petición a `/api/v1/...` debe pasar por un helper HTTP centralizado en `app/shared/services/` (que normalice método, ruta base, headers `Content-Type` / `Authorization`, parseo JSON y errores), evitando `fetch()` sueltos repetidos en vistas o pestañas.
6. **Modularización progresiva y legible**:
   - Dividir código nuevo o refactorizado por dominio en módulos chicos (`app/admin/tabs/`, `app/menu/components/`, `app/shared/services/`, `app/shared/utils/`) y estilos enlazados con `<link rel="stylesheet">`.
   - Mantener estilos basados en Variables CSS (`app/shared/styles/tokens.css`) para colores, tipografías y modos claro/oscuro por tenant.
7. **Normas de Naming**:
   - Carpetas, archivos nuevos (JS/CSS) y endpoints REST: `kebab-case` (ej: `api-client.js`, `catalog-tab.js`, `tokens.css`, `menu-items`). *(Conservar nombres heredados como `menuData.js` salvo refactor completo).*
   - Funciones, métodos y variables JS: `camelCase` (ej: `apiRequest`, `fetchMenuBySlug`, `isAvailable`).
   - Clases JS (si aplica): `PascalCase`.
   - Constantes globales: `UPPER_SNAKE_CASE` (`API_BASE_URL`, `BUSINESS_PROFILES`).
   - Booleanos: prefijos declarativos (`isAvailable`, `hasStock`, `isLoading`).
   - SQL: `snake_case` y plural para tablas (`tenants`, `items`), `_id` para Foreign Keys (`tenant_id`).
8. **Cambios grandes documentados primero**: Antes de una refactorización grande o feature nueva compleja, documentar el plan y los archivos afectados en `docs/specs/` o `docs/architecture/`.
9. **Verificación mínima tras editar**: Confirmar que el servidor (`npm run dev` / `node server/server.js`) arranca sin errores y que los imports ES Modules (`.js`) y hojas CSS resuelven sin errores en consola.
10. **Mantener actualizado `docs/architecture/file-index.md`**: Cada vez que se cree, mueva, elimine o cambie la responsabilidad de un archivo, actualizar su entrada en `docs/architecture/file-index.md`.

---

## 4. Guía rápida para trabajar con agentes en este repo
Cuando pidas una tarea a un agente, indicale:
- En qué dominio trabaja: `app/menu/`, `app/admin/`, `app/shared/` o `server/server.js`.
- Que respete `AGENTS.md`, `docs/architecture/folder-structure.md` y `docs/architecture/file-index.md`.
- Que mantenga módulos chicos en JS Vanilla (ES Modules) y CSS organizado, sin mezclar código de `admin/` en `menu/` ni agregar dependencias externas innecesarias.
