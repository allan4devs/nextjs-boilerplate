This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Xtreme Gym lifecycle job

Phase 4 email and push triggers run daily through `GET /api/xtreme/jobs/lifecycle`. Configure `CRON_SECRET`, `RESEND_API_KEY`, `SMTP_FROM`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (for example `mailto:admin@example.com`) in the deployment environment. Generate the VAPID pair with `npx web-push generate-vapid-keys`.

`vercel.json` schedules the job at `00:00 UTC` (6:00 PM in Costa Rica). Vercel sends `CRON_SECRET` as a Bearer token automatically. MongoDB delivery keys prevent retries from sending duplicate messages.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Producción (Xtreme Gym)

### Env vars en Vercel (requeridas)

| Variable | Notas |
|----------|--------|
| `MONGODB_URI` / `MONGODB_DB` | Base de datos |
| `XTREME_ADMIN_CODE` / `XTREME_SUPER_ADMIN_CODE` | Códigos largos y aleatorios; sin defaults en prod |
| `CRON_SECRET` | Auth del job lifecycle (Bearer) |
| `RESEND_API_KEY` / `SMTP_FROM` | Correos (registro, PIN, recibos, lifecycle) |
| `NEXT_PUBLIC_APP_URL` | URL canónica HTTPS |
| `PAYPAL_MODE=live` | + `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `NEXT_PUBLIC_PAYPAL_CLIENT_ID` |

Opcional: VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) para push.

### Producto: primer día gratis

- Marketing y `/primer-dia` registran por **correo** (magic link), no por PayPal.
- Alta self-serve (registro o app) otorga **un día gratis** (`free-first-day`), no un mes de plan.
- Planes de pago viven en `/precios#inscripcion` (PayPal). Seed/reset **deshabilitados** en producción.

### Smoke checklist

1. `npx tsc --noEmit` y `npm run build`
2. `GET /api/health` → `ok: true` y checks de db/admin/cron/email/paypal
3. `/primer-dia` → correo → confirmar → app + PIN → membresía “Primer día gratis”
4. Check-in en `/ingreso` exige PIN; recepción usa código admin
5. PayPal sandbox: capture otorga el plan de la orden creada (no se puede “upgradear” el `optionId` en el cliente)
6. No usar Seed/Reset en la base live
