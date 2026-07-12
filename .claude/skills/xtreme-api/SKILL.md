---
name: xtreme-api
description: Crear o modificar endpoints /api/xtreme/* y lógica de backend (MongoDB, gamificación, sesiones, correos, push, PayPal). Usar antes de tocar app/api/xtreme o lib/.
---

# API Xtreme — backend

Route handlers en `app/api/xtreme/<recurso>/route.ts`; lógica compartida en `lib/xtreme/` y `lib/helpers/`. No hay ORM: driver oficial de MongoDB.

## Patrones

1. **Conexión**: `const db = await getDb();` de `@/lib/helpers/mongodb` (cliente cacheado en `globalThis`, seguro en serverless).
2. **Colecciones**: los nombres viven SOLO en `lib/xtreme/shared.ts` (`MEMBERS_COLLECTION`, etc., prefijo `xtreme_gym_`). Nunca escribir el string a mano; si hay colección nueva, agregarla ahí.
3. **Identidad del socio**: se busca por `normalizedName` (nombre `.toUpperCase()` normalizado) o por `cedula` (solo dígitos). Ver helpers en `shared.ts`.
4. **Respuestas de error**: `NextResponse.json({ error: "mensaje en español" }, { status: 4xx })`. El cliente (`readJson` del Member OS) muestra ese `error` tal cual al socio.
5. **Respuestas de socio**: los endpoints que mutan al socio devuelven la forma `MembersResponse` (`{ member, leaderboard, nextBestAction? }`) usando `buildMemberView` de `lib/xtreme/gamification.ts`, para que el cliente re-renderice todo con una sola respuesta.
6. **Sesiones server-side**: `lib/xtreme/session.ts` — cookie HttpOnly `xtreme_member_session`, token opaco, solo hash en Mongo.
7. **Auditoría**: acciones sensibles (admin/recepción) registran en `lib/xtreme/audit.ts`.

## Subsistemas

- **Gamificación** (`lib/xtreme/gamification.ts`): XP, niveles, rachas, badges, freezes. Las constantes exportadas se importan también en el cliente — no romper esa frontera (nada de Mongo en ese módulo… los cálculos puros van ahí, el I/O en `shared.ts`/routes).
- **Lifecycle** (`lib/xtreme/lifecycle.ts` + `/api/xtreme/jobs/lifecycle`): job diario de correos/push (cron Vercel, `vercel.json`). Autenticación: Bearer `CRON_SECRET`. Idempotencia con llaves de entrega en Mongo — cualquier envío nuevo debe registrar su llave para no duplicar en reintentos.
- **Correo**: `lib/helpers/email.ts` (Resend, `RESEND_API_KEY`, `SMTP_FROM`). **Push**: `lib/helpers/push.ts` (web-push, llaves VAPID). **Pagos**: `lib/helpers/paypal.ts` + `lib/constants/paypal.ts` (modo sandbox/producción por env).
- **Admin**: `/api/xtreme/admin*` protegido con `XTREME_ADMIN_CODE` / `XTREME_SUPER_ADMIN_CODE`.

## Verificar

`npx tsc --noEmit`. **No levantar el dev server**: para probar un endpoint en vivo, pedirle al usuario que corra `npm run dev` y entonces `curl http://localhost:3000/api/xtreme/status` (requiere `MONGODB_URI` en `.env.local`). `GET /api/health` no toca Mongo.
