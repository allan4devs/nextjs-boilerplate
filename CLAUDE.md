# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

App web de **Xtreme Gym** (Costa Rica): sitio público de marketing + "Member OS" (app de socios estilo videojuego) + panel de recepción + panel admin, todo en un solo proyecto Next.js (App Router) desplegado en Vercel. La UI está en español costarricense (voseo, "pura vida"); mantener ese tono en textos de cara al usuario.

## Comandos

```bash
npm run dev      # servidor de desarrollo (http://localhost:3000)
npm run build    # build de producción (incluye type-check)
npx tsc --noEmit # solo type-check (más rápido que build)
npm run lint     # eslint
```

No hay suite de tests. La verificación estándar es `npx tsc --noEmit` + `npm run build`.

**NO levantar servidores.** Nunca correr `npm run dev`, `npm start`, ni ningún otro comando que deje un servidor corriendo (ni en background). Verificar siempre con `npx tsc --noEmit` + `npm run build`; el usuario levanta el dev server él mismo cuando quiere probar en el navegador. Si un servidor quedó corriendo y estorba: `taskkill /F /IM node.exe` (o por puerto: `Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`).

Si `tsc` reporta errores raros en `.next/types/validator.ts` sobre rutas que ya no existen, es caché obsoleta: borrar `.next` y volver a correr.

## Arquitectura

### Rutas (App Router)

- `app/(site)/…` — todas las páginas: el sitio público (`/`, `/precios`, `/zonas`, `/contacto`, etc.) y también las apps (`/app` Member OS, `/admin`, `/recepcion`, `/ingreso`, `/dzcate`). El route group comparte `app/(site)/layout.tsx`.
- `app/api/xtreme/*` — todos los endpoints. Son route handlers que hablan con MongoDB; no hay ORM.
- `app/(site)/app/page.tsx` solo monta `app/ExtremeGymSite.tsx` (el Member OS).

### Member OS (app de socios)

`app/ExtremeGymSite.tsx` es un orquestador delgado. Toda la lógica vive en `app/components/member/`:

- `useMemberOs.ts` — **hook central**: todo el estado, efectos y acciones (login por cédula, PIN, entrenos, reservas, medidas, perfil). Devuelve el objeto `MemberOs`; cada componente de UI recibe `{ os: MemberOs }` y destructura lo que usa. Para agregar estado/acción nueva: agregarla aquí y al objeto de retorno.
- `constants.ts` — catálogos estáticos (TRAININGS, MACHINE_GUIDE, ROUTINES, TABS, llaves de localStorage) y tipos derivados (`TabId`, `Training`, `MachineGuide`).
- `types.ts` — tipos de dominio (`Member`, `Gamification`, `MembersResponse`, etc.) que espejan las respuestas de `/api/xtreme/*`.
- `utils.ts` — helpers puros (fechas, cédula, `memberCode`, `readJson`).
- `tabs/` — un archivo por tab: `ResumenTab`, `EntrenarTab`, `MaquinasTab`, `ProgresoTab`, `PerfilTab`.
- Shell: `TopHud`, `SideNav`, `BottomDock`, `CedulaLoginGate`, `PinModal`, `OsModals` (todos los `GameModal` del OS).

Flujo de sesión del socio: cédula (lector de barras USB tipo teclado o digitada) → lookup en `/api/xtreme/user?cedula=` → si no existe pide nombre+teléfono para alta → PIN de 4 dígitos (`/api/xtreme/pin`, con recuperación OTP por correo) → sesión en localStorage con TTL de 30 días.

### UI compartida

- `app/components/GameOS.tsx` — design system "de juego" del Member OS: `GamePanel`, `GameButton`, `GameModal`, `GameStat`, `GameHudPill`, etc. Estética: bordes de 3px, sombras duras, lima `#d8ff3e` sobre negro. Usar estos componentes en vez de recrear estilos.
- `app/components/gamification.tsx` — `StreakRing`, `XpBar`, `BadgeGallery`, `CelebrationOverlay`, helpers de badges.
- `app/components/charts.tsx` — charts SVG propios (`LineTrendChart`, `BarTrendChart`) sin librería externa.
- `app/components/OnboardingTour.tsx` — tour de bienvenida; los targets usan atributos `data-tour`.
- `app/lib/site.ts` — datos del negocio (teléfonos, precios, horarios) para el sitio público.

### Backend (lib/)

- `lib/helpers/mongodb.ts` — cliente Mongo cacheado en `globalThis` (con recuperación ante fallos de conexión). `getDb()` es el punto de entrada.
- `lib/xtreme/shared.ts` — nombres de todas las colecciones (`xtreme_gym_*`) y helpers de member key/hash. Los datos del socio se buscan por `normalizedName` (nombre en mayúsculas) o por cédula.
- `lib/xtreme/gamification.ts` — reglas de XP, niveles, rachas, badges, protectores de racha; las constantes (`STREAK_MILESTONES`, `WEEKLY_GOAL_MIN/MAX`) se importan también en el cliente.
- `lib/xtreme/session.ts` — sesiones de servidor con cookie HttpOnly (token opaco, solo el hash va a Mongo).
- `lib/xtreme/lifecycle.ts` + `app/api/xtreme/jobs/lifecycle/route.ts` — job diario de correos/push (cron de Vercel en `vercel.json`, autenticado con `CRON_SECRET` como Bearer). Usa llaves de entrega en Mongo para no duplicar envíos en reintentos.
- `lib/helpers/email.ts` (Resend), `lib/helpers/push.ts` (web-push/VAPID), `lib/helpers/paypal.ts` + `lib/constants/paypal.ts` (checkout de planes).

### Convenciones

- Los route handlers devuelven `{ error: string }` con status apropiado; el cliente los consume con `readJson<T>()` que lanza `Error(data.error)`.
- Alias de imports: `@/*` apunta a la raíz del repo (ej. `@/lib/xtreme/phrases`).
- Tailwind v4 (config vía `@tailwindcss/postcss`, sin `tailwind.config`); estilos globales en `app/globals.css`.
- PWA: `public/sw.js` (service worker) y `app/manifest.ts`; `PwaRuntime.tsx` lo registra.

### Variables de entorno

`MONGODB_URI`/`MONGODB_DB`, `XTREME_ADMIN_CODE`/`XTREME_SUPER_ADMIN_CODE` (acceso al admin), `CRON_SECRET`, `RESEND_API_KEY`, `SMTP_FROM`, `NEXT_PUBLIC_APP_URL`, VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), PayPal (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, y variantes `_SANDBOX`).
