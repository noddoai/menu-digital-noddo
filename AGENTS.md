# Contexto y Reglas del Proyecto para Agentes de IA (AGENTS.md)

Este documento define la arquitectura, normas y restricciones clave para cualquier desarrollador o agente de inteligencia artificial que trabaje en este repositorio.

---

## 1. Visión General del Proyecto
**Noddo** es una plataforma SaaS B2B Multitenant para la gestión de menús digitales interactivos y panel de control gastronómico para restaurantes, bares y cafeterías.

---

## 2. Estructura de Carpetas
```text
menu-digital-noddo/
├── AGENTS.md                  # Reglas del repo para IA y equipo
├── README.md                  # Onboarding rápido
├── netlify.toml               # Configuración de despliegue de Netlify para la landing
├── package.json               # Scripts y dependencias del backend
├── db/                        # DDL de PostgreSQL, seeds y esquemas de base de datos
├── docs/                      # Documentación arquitectónica, specs (SDD) y contratos API
├── landing/                   # ⚠️ Web comercial estática desplegada en Netlify (NO tocar sin requerimiento)
├── server/                    # Backend API REST (Node.js + Express)
└── app/                       # Frontend actual de la aplicación (en proceso de migración a React)
```

---

## 3. Reglas de Oro (Constraints)
1. **No tocar `landing/`**: La landing page comercial vive aislada y se despliega independientemente en Netlify. No modificar sus archivos a menos que el usuario lo pida explícitamente.
2. **Backend Desacoplado**: El backend en `server/` debe ser una API REST pura que entregue y reciba JSON (`/api/v1/...`). No acoplar lógica de presentación HTML al backend.
3. **Migración a React**: El frontend en `app/` está en fase de transición hacia React + Vite. Al implementar nuevas vistas en React, encapsularlas en componentes declarativos y reutilizables.
4. **Normas de Naming**:
   - Carpetas y endpoints: `kebab-case` (ej: `menu-items`, `auth-middleware`).
   - Componentes React: `PascalCase` (ej: `DishCard.jsx`, `MenuNav.jsx`).
   - Funciones, hooks y variables: `camelCase` (ej: `useMenu`, `fetchMenuItems`, `isAvailable`).
   - Base de datos SQL: `snake_case` y plural para tablas (`tenants`, `items`), `_id` para Foreign Keys (`tenant_id`).
   - Booleanos: prefijos declarativos (`isAvailable`, `hasStock`, `isLoading`).
5. **Spec-Driven Development (SDD)**: Cada cambio arquitectónico o feature grande debe contar con una especificación en `docs/specs/` antes de su implementación masiva.
