# TIEMPO LIBRE 360

Plataforma web para intercambiar conocimientos usando **créditos de tiempo**: 1 minuto de enseñanza = 1 crédito. Incluye catálogo de habilidades, solicitudes e intercambios, verificación de habilidades con video y certificado, chat privado para acordar clases particulares (pago directo entre usuarios, fuera de la plataforma) y un buzón de sugerencias, quejas y reportes con panel de administración.

## Arquitectura

```text
Navegador (React 19 + Tailwind CSS v4)
   │  páginas en src/pages/** (diseño original) montadas por rutas en src/routes/*
   │  api() en src/lib/pb.js
   ▼
Función de servidor única tlApi (src/lib/tl-api.functions.ts, validada con zod)
   │  verifica sesión y rol en cada llamada
   ▼
Lógica de negocio src/server/tl/*.server.js
   ▼
Lovable Cloud: PostgreSQL (RLS), Auth (correo/contraseña), Storage privado "evidencias"
```

## Tecnologías reales
- TanStack Start v1 (React 19, SSR, server functions) sobre Vite; TanStack Router (con un adaptador `src/lib/router.jsx` con forma de React Router).
- Tailwind CSS v4 (Flexbox, Grid, utilidades responsive `sm:/md:/lg:`).
- Lovable Cloud (PostgreSQL + políticas RLS, autenticación, almacenamiento privado, tiempo real para el chat).
- zod (validación de entrada del servidor), Leaflet (mapa), Vitest + Testing Library (pruebas).

## Estructura
- `src/pages/public|app|admin` — pantallas públicas, del usuario y de administración.
- `src/components` — componentes reutilizables (PublicLayout, Shell, PrivateChat, PasswordInput, RouteGuards…).
- `src/routes` — rutas (cada una con título y descripción propios para SEO).
- `src/server/tl` — reglas de negocio (créditos, intercambios, verificación, reportes, clases, chat).
- `src/test` — pruebas automáticas.

## Base de datos (tablas principales)
`members` (perfil, 1:1 con el usuario de Auth) · `user_roles` (admin/moderator/user) · `wallets` y `credit_ledger` (saldo y libro de movimientos) · `skills` · `exchanges`, `exchange_events`, `ratings` · `accreditations` (verificación) · `feedback_reports` (sugerencias/quejas/reportes) · `conversations`, `chat_messages`, `private_offers`, `private_bookings` (chat y clases) · `notifications`, `reports`, `community_posts`, `challenges`, `challenge_claims`, `contact_messages`, `contact_replies`, `site_settings`, `audit_log`.

## Seguridad
- Todas las tablas tienen RLS; las privadas (verificaciones, reportes, clases) no son accesibles desde el navegador, solo vía servidor.
- Créditos: solo se mueven con la función `tl_move` de la base de datos; saldos con `CHECK >= 0` y clave única por movimiento (sin duplicados); el libro es inmutable.
- Roles solo en `user_roles`; el rol admin se asigna por función de base de datos tras confirmar el correo.
- Evidencias en bucket privado, servidas con enlaces firmados de corta duración.

## Ejecución local
```sh
bun install
bun run dev      # http://localhost:8080
bunx vitest run  # pruebas
```
Requiere las variables de entorno de Lovable Cloud (`.env` generado). El despliegue se hace con el botón **Publicar** de Lovable.
