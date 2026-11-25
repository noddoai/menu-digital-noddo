# Índice de Archivos y Responsabilidades (`file-index.md`)

Guía rápida para desarrolladores y agentes de IA sobre **qué contiene cada archivo del repositorio** y **dónde ir según la tarea**.  
> **Regla obligatoria (`AGENTS.md`):** cada vez que se cree, mueva, elimine o cambie el propósito de un archivo, actualizar este índice en el mismo cambio.

---

## 1. Backend (`server/`) y Base de Datos (`db/`)

| Archivo | Qué contiene / Responsabilidad |
| :--- | :--- |
| `server/server.js` | Servidor Express (`/api/v1/...`), autenticación JWT (`authenticateToken`), conexión PostgreSQL (`pg`), fallback `memoryDb` y montaje de estáticos de `app/` (`/shared`, `/assets`, `/admin`, `/`). |
| `db/schema.sql` | DDL PostgreSQL local (`tenants`, `users`, `menus`, `categories`, `items`, `ingredients`, `item_ingredients`, `promotions`, `qr_codes`). |
| `db/seed.sql` | Datos semilla iniciales para PostgreSQL local. |
| `db/supabase_schema.sql` | DDL adaptado a Supabase Cloud. |
| `db/supabase_seed.sql` | Datos semilla adaptados a Supabase Cloud. |

---

## 2. Documentación (`docs/`)

| Archivo | Qué contiene / Responsabilidad |
| :--- | :--- |
| `AGENTS.md` | Reglas de oro obligatorias, stack oficial y guía rápida para agentes de IA. |
| `docs/architecture/folder-structure.md` | Mapa de carpetas, principio de aislamiento `menu/` vs `admin/`, contratos `/api/v1/...` y convenciones. |
| `docs/architecture/file-index.md` | Este inventario archivo por archivo. |

---

## 3. Frontend Compartido (`app/shared/`)

| Archivo | Qué contiene / Responsabilidad |
| :--- | :--- |
| `app/shared/services/api-client.js` | Cliente HTTP centralizado (`apiRequest`, `apiClient`, `ApiError`, `getAuthToken`). Normaliza URL `/api/v1`, headers `Content-Type` + `Authorization: Bearer`, timeout y errores. |
| `app/shared/db.js` | SDK cliente actual: estado en `localStorage` para modo offline/demo y sincronización hacia la API usando `apiRequest`. |
| `app/shared/menuData.js` | Perfiles demo (`BUSINESS_PROFILES`) y catálogo inicial (`MENU_ITEMS`). Importado también por `server/server.js` para `memoryDb`. |
| `app/shared/utils/asset-url.js` | Helper `resolveAssetUrl(url)` para normalizar rutas de imágenes locales (`/assets/...`). |
| `app/shared/utils/formatters.js` | Helper `formatPrice(amount, symbol)` para formateo de moneda (`$` y `€`). |
| `app/shared/styles/tokens.css` | Design tokens (`:root`, `[data-theme-mode]`, `[data-theme]`) y `@import` de Google Fonts. |
| `app/shared/styles/base.css` | Reset CSS global, `body`, `.modal-backdrop` / `.sheet-backdrop` y `.toast-notification`. |

---

## 4. Menú Digital para Comensales (`app/menu/`)
*Aislado del panel admin: ningún archivo aquí puede importar o enlazar recursos de `app/admin/`.*

| Archivo | Qué contiene / Responsabilidad |
| :--- | :--- |
| `app/menu/index.html` | Portal selector de demostraciones y redirección por `?tenant=...`. |
| `app/menu/restaurant.html` | Carta digital comensal (perfil Restaurante / Dark). |
| `app/menu/cafe.html` | Carta digital comensal (perfil Cafetería / Light). |
| `app/menu/passport.html` | Carta digital comensal (perfil Le Pass'Port Nice). |
| `app/menu/app.js` | Orquestador del menú: carga branding desde `/api/v1/public/menus/:slug`, aplica tema/colores, filtros dietéticos, búsqueda y coordina los componentes. |
| `app/menu/components/dish-media.js` | Helpers `getDishImageUrl` y `dishHasMedia` para resolver fotos/videos de platos. |
| `app/menu/components/promo-banner.js` | Carrusel de banners promocionales (autoplay, flechas y dots). |
| `app/menu/components/featured-carousel.js` | Carrusel horizontal *"Los Más Elegidos"*. |
| `app/menu/components/categories-nav.js` | Barra sticky de categorías y scroll-spy al desplazarse por la carta. |
| `app/menu/components/dish-card.js` | Renderizado de tarjetas de platos en modo visual (`createVisualCard`) y compacto (`createCompactCard`). |
| `app/menu/components/dish-detail-sheet.js` | Modal bottom-sheet de detalle, gesto swipe-to-close y visor WebAR 3D. |
| `app/menu/styles/portal.css` | Estilos exclusivos de `app/menu/index.html`. |
| `app/menu/styles/menu.css` | Estilos exclusivos del menú comensal, cards, carruseles y bottom-sheet. |

---

## 5. Panel de Administración (`app/admin/`)

| Archivo | Qué contiene / Responsabilidad |
| :--- | :--- |
| `app/admin/index.html` | Layout general del panel: login, topbar, KPIs, nav de pestañas, slots de montaje y modales globales. |
| `app/admin/admin.js` | Orquestador del panel: carga parciales HTML (`loadAdminPartials`), gestiona login, menú de usuario, cambio de comercio, RBAC, toast e inicializa pestañas. |
| `app/admin/styles/admin.css` | Estilos exclusivos del panel admin (login, layout, formularios, modales, QR, swatches). |
| `app/admin/components/image-dropzone.js` | Componente reutilizable `setupDropzone` para subida de imágenes por drag & drop o selector. |
| `app/admin/components/phone-preview/phone-preview.html` | Markup del marco iPhone de vista previa en tiempo real. |
| `app/admin/components/phone-preview/phone-preview.js` | Lógica de `reloadPhonePreview` y `setupPhonePreview` sobre el `<iframe>`. |
| `app/admin/tabs/catalog/catalog-tab.html` | Markup de la pestaña *Catálogo & Precios*. |
| `app/admin/tabs/catalog/catalog-tab.js` | Tabla de platos, edición de precio inline, filtros, aumento masivo (%) y modal editor de platos/ingredientes/variantes/combos. |
| `app/admin/tabs/stock/stock-tab.html` | Markup de la pestaña *Disponibles*. |
| `app/admin/tabs/stock/stock-tab.js` | Buscador y grilla de pausa rápida de stock agrupada por categoría. |
| `app/admin/tabs/banners/banners-tab.html` | Markup de la pestaña *Banners Promocionales*. |
| `app/admin/tabs/banners/banners-tab.js` | Listado, toggles, eliminación y modal cropper en canvas de banners. |
| `app/admin/tabs/qr/qr-tab.html` | Markup de la pestaña *Código QR*. |
| `app/admin/tabs/qr/qr-tab.js` | Generación de QR, copia de enlace y descarga PNG/SVG. |
| `app/admin/tabs/settings/settings-tab.html` | Markup contenedor de *Configuración* (nav de subpestañas y slots). |
| `app/admin/tabs/settings/settings-tab.js` | Orquestador de las 4 subpestañas de configuración. |
| `app/admin/tabs/settings/general/general-subtab.html` | Markup de subpestaña *Generales*. |
| `app/admin/tabs/settings/general/general-subtab.js` | Formulario de nombre, eslogan, logo y estado online de la carta. |
| `app/admin/tabs/settings/menu-style/menu-style-subtab.html` | Markup de subpestaña *Configuración del Menú*. |
| `app/admin/tabs/settings/menu-style/menu-style-subtab.js` | Selector de paleta de 20 colores, tema claro/oscuro, tiempo de preparación y moneda. |
| `app/admin/tabs/settings/categories/categories-subtab.html` | Markup de subpestaña *Categorías*. |
| `app/admin/tabs/settings/categories/categories-subtab.js` | Alta, listado y eliminación de categorías del comercio. |
| `app/admin/tabs/settings/staff/staff-subtab.html` | Markup de subpestaña *Personal & Accesos*. |
| `app/admin/tabs/settings/staff/staff-subtab.js` | Alta/baja de empleados, roles y modal de revelación de contraseña. |
