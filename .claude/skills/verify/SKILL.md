---
name: verify
description: Verificar cambios en este repo antes de dar algo por terminado (type-check, build, y cómo probar cada superficie de la app en el navegador).
---

# Verificación del proyecto

No hay tests. La verificación es en capas — correr las que apliquen al cambio:

## 1. Type-check (siempre)

```bash
npx tsc --noEmit
```

Si aparecen errores en `.next/types/validator.ts` sobre rutas inexistentes, es caché vieja: `rm -rf .next` y repetir.

## 2. Build (cambios en rutas, imports o config)

```bash
npm run build
```

Debe listar todas las rutas al final sin errores.

## 3. Probar en el navegador (cambios de UI o de flujo)

**El agente NO levanta el servidor.** Pedirle al usuario que corra `npm run dev` (http://localhost:3000) y decirle qué probar. Superficies:

| Ruta | Qué es | Necesita |
|---|---|---|
| `/` y páginas del sitio | Marketing público | nada |
| `/app` | Member OS (app de socios) | Mongo + cédula de prueba |
| `/app/comunidad` | Liga y referidos | Mongo |
| `/recepcion` | Panel de recepción (check-in) | Mongo |
| `/admin` | Panel admin | Mongo + `XTREME_ADMIN_CODE` |
| `/ingreso` | Pantalla de ingreso (kiosco) | Mongo |

El Member OS pide cédula (mínimo 6 dígitos) y luego PIN. Si no hay datos, `/api/xtreme/seed` puede sembrar datos de prueba (revisar el handler antes de usarlo).

Endpoints rápidos sin UI: `GET /api/health` (no toca Mongo), `GET /api/xtreme/status` (ocupación, requiere Mongo).

## 4. Encoding (si se editaron textos en español)

Los textos usan acentos y emoji: revisar que el archivo quede en UTF-8 y que no aparezcan caracteres corruptos (`Ã©`, `â€¦`) en el diff antes de commitear.
