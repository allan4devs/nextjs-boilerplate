# Correo saliente — sender propio (Nodemailer / SMTP)

Xtreme envía todos sus correos desde `lib/helpers/email.ts`. El envío está detrás
de un **flag** (`EMAIL_PROVIDER`) para poder cambiar de proveedor sin tocar código:

| `EMAIL_PROVIDER` | Qué usa | Uso |
| --- | --- | --- |
| `smtp` (por defecto) | **Nodemailer contra tu servidor SMTP** | Producción |
| `resend` | API de Resend | Fallback opcional |

> Producción usa **solo el sender propio** (`EMAIL_PROVIDER=smtp`). Resend queda
> como red de seguridad: si algún día hace falta, se cambia el flag a `resend` y
> se vuelve a desplegar, sin tocar código.

Nada sale si `EMAIL_SENDING_ENABLED` no está en `true`. Es un interruptor de
seguridad aparte de las credenciales.

---

## 1. Variables de entorno

```bash
# Interruptor maestro. Sin esto en "true" NO se envía nada.
EMAIL_SENDING_ENABLED=true

# Sender propio (Nodemailer). "resend" solo como fallback.
EMAIL_PROVIDER=smtp

# Remitente visible. Debe usar el dominio verificado xtremecr.com.
SMTP_FROM=Xtreme Gym <hola@xtremecr.com>

# Servidor SMTP de tu proveedor (SES, Zoho, Mailgun, tu propio server, etc.).
SMTP_HOST=email-smtp.us-east-1.amazonaws.com   # ejemplo (Amazon SES)
SMTP_PORT=587                                  # 587 STARTTLS · 465 TLS implícito
SMTP_SECURE=                                   # vacío/false en 587 · true en 465
SMTP_USER=<usuario-smtp>
SMTP_PASSWORD=<password-o-token-smtp>

# Solo si EMAIL_PROVIDER=resend:
RESEND_API_KEY=re_xxx
```

**Sobre `SMTP_SECURE`:** dejalo **vacío** y el código decide por el puerto (465 →
TLS implícito; cualquier otro → STARTTLS). Ponelo en `true` solo si usás 465 con un
proveedor que exige TLS desde el saludo.

**Elegir proveedor SMTP:** cualquiera sirve mientras deje mandar desde
`@xtremecr.com`. Opciones comunes:

- **Amazon SES** — barato a volumen. Host `email-smtp.<region>.amazonaws.com`,
  puerto 587, credenciales SMTP propias (no las de la cuenta AWS).
- **Zoho Mail / Google Workspace** — si ya tenés el buzón `hola@xtremecr.com`.
- **Mailgun / Postmark / Brevo** — enfocados en correo transaccional.

---

## 2. Registros DNS para autenticar xtremecr.com

Para que Gmail/Outlook acepten el correo (y no lo manden a spam) el dominio
`xtremecr.com` tiene que autorizar a tu proveedor SMTP con **SPF**, **DKIM** y
**DMARC**. Los valores exactos los da el panel de tu proveedor; acá va el patrón.
Se agregan en el DNS de `xtremecr.com` (donde compraste/administrás el dominio).

### SPF — autoriza al proveedor a enviar por vos (registro TXT)
```
Tipo:   TXT
Host:   @            (o "xtremecr.com")
Valor:  v=spf1 include:<dominio-spf-del-proveedor> ~all
```
Ejemplo SES: `v=spf1 include:amazonses.com ~all`. Si ya tenés un TXT de SPF,
**no crees otro**: agregá el `include:` dentro del que ya existe (solo puede haber
un registro SPF por dominio).

### DKIM — firma criptográfica (normalmente **CNAME**)
La mayoría de los proveedores modernos dan **3 registros CNAME** que apuntan a sus
servidores de firmas. Este es el "algo con CNAME" que mencionabas:
```
Tipo:   CNAME
Host:   <selector1>._domainkey        (ej. abc123._domainkey)
Valor:  <selector1>.dkim.<proveedor>.com
                (se repite con selector2 y selector3)
```
- En algunos DNS el Host se pone completo (`abc._domainkey.xtremecr.com`), en
  otros solo la parte relativa (`abc._domainkey`). Copiá tal cual lo pida el panel.
- **No** le pongas "proxy"/naranja si usás Cloudflare: el CNAME de DKIM debe estar
  **DNS only** (gris).
- Algunos proveedores (SES modo Easy DKIM) dan CNAME; otros dan un TXT largo.
  Cualquiera de los dos funciona; seguí el que muestre el panel.

### DMARC — política de qué hacer con lo que no pasa (registro TXT)
```
Tipo:   TXT
Host:   _dmarc                (queda _dmarc.xtremecr.com)
Valor:  v=DMARC1; p=none; rua=mailto:aallanrd@gmail.com
```
Empezá con `p=none` (solo reporta, no bloquea). Cuando SPF y DKIM estén verdes por
unos días, subí a `p=quarantine` y luego `p=reject`.

### Verificar
```bash
nslookup -type=txt xtremecr.com          # SPF
nslookup -type=txt _dmarc.xtremecr.com   # DMARC
nslookup -type=cname <selector>._domainkey.xtremecr.com   # DKIM
```
El DNS puede tardar de minutos a 24–48 h en propagar. El proveedor marca el
dominio como "Verified" cuando detecta los registros.

---

## 3. Configurar Producción en Vercel

El proyecto ya está enlazado (`vercel` CLI, proyecto `xtreme`). Cargá las variables
al entorno **production** (te pedirá pegar cada valor):

```bash
vercel env add EMAIL_SENDING_ENABLED production   # → true
vercel env add EMAIL_PROVIDER production           # → smtp
vercel env add SMTP_HOST production
vercel env add SMTP_PORT production                # → 587
vercel env add SMTP_SECURE production              # → (vacío) o false
vercel env add SMTP_USER production
vercel env add SMTP_PASSWORD production
# SMTP_FROM ya existe en Vercel; si cambia el remitente:
#   vercel env rm SMTP_FROM production && vercel env add SMTP_FROM production
```

Aplicá los mismos valores a **preview** si querés probar en ramas
(`... production` → `... preview`). Después redeployá para que tomen efecto:

```bash
vercel --prod
```

Verificá el estado del correo sin exponer secretos:

```bash
curl https://www.xtremecr.com/api/health    # { ..., "email": true } cuando está OK
```

> `RESEND_API_KEY` puede quedarse en Vercel: con `EMAIL_PROVIDER=smtp` no se usa.
> Solo se activa si algún día ponés `EMAIL_PROVIDER=resend`.
