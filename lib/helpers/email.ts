import { absoluteAppUrl, absoluteRequestUrl } from "@/lib/constants/app-url";
import { BUSINESS } from "@/lib/constants/business";
import { getDb } from "@/lib/helpers/mongodb";
import { emailPreferencesToken } from "@/lib/xtreme/email-preferences-token";
import { EMAIL_SUPPRESSIONS_COLLECTION } from "@/lib/xtreme/shared/config";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const PREFERENCES_BLOCK = "__XTREME_EMAIL_PREFERENCES__";

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  code?:
    | "configuration"
    | "invalid_recipient"
    | "suppressed"
    | "provider_rejected"
    | "rate_limit"
    | "network";
  /** HTTP status del proveedor (útil para reintentos 429). */
  status?: number;
};

/** Diagnóstico seguro: informa nombres de variables, nunca sus valores. */
export function emailConfigurationError() {
  const issues: string[] = [];
  if (process.env.EMAIL_SENDING_ENABLED?.trim().toLowerCase() !== "true") {
    issues.push("EMAIL_SENDING_ENABLED no está en true");
  }
  if (!process.env.RESEND_API_KEY?.trim()) issues.push("falta RESEND_API_KEY");
  if (!process.env.SMTP_FROM?.trim()) issues.push("falta SMTP_FROM");
  return issues.length
    ? `Configuración de correo incompleta en el servidor: ${issues.join(", ")}. Corregí las variables del entorno Production y volvé a desplegar.`
    : null;
}

/**
 * Interruptor de seguridad de salida. Tener credenciales configuradas no basta:
 * los correos solo salen cuando se habilitan de forma deliberada.
 */
export function emailEnabled() {
  return emailConfigurationError() === null;
}

function reservationCc() {
  const cc = process.env.RESERVATION_CC?.trim();
  return cc ? [cc] : undefined;
}

function resendError(status: number, detail: string) {
  let message = "";
  try {
    const parsed = JSON.parse(detail) as { message?: unknown };
    if (typeof parsed.message === "string") message = parsed.message;
  } catch {
    message = detail;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("only send testing emails to your own email address")) {
    return "Resend está en modo de prueba y solo permite enviar al correo asociado con esa cuenta.";
  }
  if (normalized.includes("domain is not verified")) {
    return "El dominio del remitente no está verificado en Resend.";
  }
  if (status === 401) return "La API key de Resend no es válida.";
  if (status === 403) return "Resend rechazó el envío por permisos o configuración del remitente.";
  if (status === 429) return "Resend limitó el envío (rate limit). Reintentamos en el próximo lote.";

  const safeMessage = message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[correo]")
    .trim()
    .slice(0, 180);
  return safeMessage ? `Resend ${status}: ${safeMessage}` : `Resend rechazó el envío (HTTP ${status}).`;
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Envia un correo via Resend usando SMTP_FROM como remitente.
 * Nunca lanza: las rutas no deben fallar porque el correo falle.
 */
export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  /** Texto plano: mejora entrega y lectura del código OTP en clientes simples. */
  text?: string;
  cc?: string[];
  optional?: boolean;
  managePreferences?: boolean;
  idempotencyKey?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const to = (Array.isArray(args.to) ? args.to : [args.to]).map((t) => t.trim()).filter(Boolean);
  const configurationError = emailConfigurationError();

  if (configurationError || !apiKey || !from) {
    console.error("EMAIL SEND SKIPPED", configurationError);
    return { ok: false, skipped: true, code: "configuration", error: configurationError || "Configuración de correo incompleta." };
  }
  if (!to.length) {
    return {
      ok: false,
      skipped: true,
      code: "invalid_recipient",
      error: "No hay un correo destinatario válido para realizar el envío.",
    };
  }

  try {
    if (args.optional) {
      const db = await getDb();
      const suppressed = await db
        .collection(EMAIL_SUPPRESSIONS_COLLECTION)
        .countDocuments({ email: { $in: to } }, { limit: 1 });
      if (suppressed) {
        return {
          ok: false,
          skipped: true,
          code: "suppressed",
          error: "El destinatario desactivó los correos opcionales; el envío fue omitido.",
        };
      }
    }

    const preferencesEnabled = args.managePreferences !== false;
    const token = preferencesEnabled ? emailPreferencesToken(to[0]) : "";
    const preferencesUrl = token
      ? absoluteAppUrl("/correo/preferencias?token=" + encodeURIComponent(token))
      : "";
    const oneClickUrl = token
      ? absoluteAppUrl("/api/xtreme/email-preferences?token=" + encodeURIComponent(token))
      : "";
    const preferencesHtml = preferencesUrl
      ? '<p style="margin:14px 0 0;color:#8a8a84;font-size:12px;line-height:1.6;">Para administrar recordatorios o novedades, <a href="' +
        escapeHtml(preferencesUrl) +
        '" style="color:#555;text-decoration:underline;">tocá acá</a>. Los recibos y avisos de la cuenta siguen disponibles.</p>'
      : "";
    const html = args.html.replace(PREFERENCES_BLOCK, preferencesHtml);

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(args.idempotencyKey ? { "Idempotency-Key": args.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from,
        to,
        subject: args.subject,
        html,
        ...(args.text?.trim() ? { text: args.text.trim() } : {}),
        ...(args.cc?.length ? { cc: args.cc } : {}),
        ...(oneClickUrl
          ? {
              headers: {
                "List-Unsubscribe": "<" + oneClickUrl + ">",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("EMAIL SEND FAILED", response.status, detail.slice(0, 300));
      return {
        ok: false,
        status: response.status,
        code: response.status === 429 ? "rate_limit" : "provider_rejected",
        error: resendError(response.status, detail),
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("EMAIL SEND ERROR", err);
    const detail = err instanceof Error ? err.message.trim().slice(0, 160) : "error de red desconocido";
    return {
      ok: false,
      code: "network",
      error: `No se pudo conectar con Resend: ${detail}. Revisá la red del deployment e intentá de nuevo.`,
    };
  }
}

type LayoutOptions = {
  /** Muestra bloque de ubicación / contacto (campañas y avisos de visita). */
  showMap?: boolean;
  /** Texto preheader (bandeja de entrada, no visible en el cuerpo). */
  preheader?: string;
};

function brandLogoUrl() {
  return absoluteAppUrl("/xtreme/logo.webp");
}

function googleMapsDirectionsUrl() {
  const { lat, lng } = BUSINESS.geo;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function mapsHref() {
  return BUSINESS.maps || googleMapsDirectionsUrl();
}

function whatsappHref() {
  return `https://wa.me/${BUSINESS.whatsapp}`;
}

/**
 * Header limpio: solo logo propio (host del sitio) + marca.
 * Sin hero photos ni mapas externos (se rompen o se ven mal en Gmail/Outlook).
 */
function emailHeader() {
  const logo = brandLogoUrl();
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0b0b;">
  <tr>
    <td style="padding:22px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;width:56px;">
            <img src="${escapeHtml(logo)}" width="44" height="44" alt="Xtreme Gym" style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;background:#141414;" />
          </td>
          <td style="vertical-align:middle;padding-left:12px;">
            <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#8a8a84;font-family:Arial,Helvetica,sans-serif;">Xtreme Gym</p>
            <p style="margin:5px 0 0;font-size:17px;font-weight:900;letter-spacing:0.03em;text-transform:uppercase;color:#d8ff3e;line-height:1.15;font-family:Arial,Helvetica,sans-serif;">Ciudad Quesada</p>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#6b6b66;font-family:Arial,Helvetica,sans-serif;">San Carlos, CR</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height:4px;line-height:4px;font-size:0;background:#d8ff3e;">&nbsp;</td>
  </tr>
</table>`;
}

/**
 * Ubicación y contacto sin imágenes externas.
 * Botones claros a Maps y WhatsApp (lo que sí funciona en todos los clientes).
 */
function locationContactBlock() {
  const address = BUSINESS.addressDetail || BUSINESS.location;
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 4px;border:1px solid #e8e8e2;background:#fafaf8;">
  <tr>
    <td style="padding:18px 18px 8px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#6b6b66;font-family:Arial,Helvetica,sans-serif;">Ubicación</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#0b0b0b;line-height:1.45;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(address)}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(BUSINESS.location)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 18px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0 8px 0 0;">
            <a href="${escapeHtml(mapsHref())}" style="display:inline-block;background:#0b0b0b;color:#d8ff3e;padding:12px 16px;text-decoration:none;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;font-family:Arial,Helvetica,sans-serif;">Cómo llegar →</a>
          </td>
          <td>
            <a href="${escapeHtml(whatsappHref())}" style="display:inline-block;background:#f0f0ea;color:#0b0b0b;padding:12px 16px;text-decoration:none;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;font-family:Arial,Helvetica,sans-serif;">WhatsApp ${escapeHtml(BUSINESS.phone)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Footer de contacto profesional: dirección, WhatsApp, redes y ayuda. */
function emailFooterLinks() {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:0 0 14px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;color:#8a8a84;font-family:Arial,Helvetica,sans-serif;">Contacto</p>
      <p style="margin:0;font-size:14px;font-weight:700;color:#0b0b0b;font-family:Arial,Helvetica,sans-serif;">Xtreme Gym</p>
      <p style="margin:6px 0 0;font-size:13px;line-height:1.55;color:#444;font-family:Arial,Helvetica,sans-serif;">
        ${escapeHtml(BUSINESS.addressDetail || BUSINESS.location)}<br />
        ${escapeHtml(BUSINESS.location)}
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 12px;">
      <p style="margin:0;font-size:13px;line-height:1.85;font-family:Arial,Helvetica,sans-serif;">
        <a href="${escapeHtml(whatsappHref())}" style="color:#0b0b0b;font-weight:700;text-decoration:none;">WhatsApp ${escapeHtml(BUSINESS.phone)}</a><br />
        <a href="mailto:${escapeHtml(BUSINESS.email)}" style="color:#0b0b0b;font-weight:700;text-decoration:none;">${escapeHtml(BUSINESS.email)}</a><br />
        <a href="${escapeHtml(mapsHref())}" style="color:#0b0b0b;font-weight:700;text-decoration:none;">Cómo llegar en Maps →</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:12px 0 0;border-top:1px solid #e8e8e2;">
      <p style="margin:0;font-size:12px;line-height:1.8;color:#666;font-family:Arial,Helvetica,sans-serif;">
        <a href="${escapeHtml(BUSINESS.social.instagram)}" style="color:#333;font-weight:700;text-decoration:none;">Instagram</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(BUSINESS.social.facebook)}" style="color:#333;font-weight:700;text-decoration:none;">Facebook</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(absoluteAppUrl("/ayuda"))}" style="color:#333;font-weight:700;text-decoration:none;">Ayuda</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(absoluteAppUrl("/app"))}" style="color:#333;font-weight:700;text-decoration:none;">App socios</a>
      </p>
    </td>
  </tr>
</table>`;
}

function layout(title: string, bodyHtml: string, opts: LayoutOptions = {}) {
  const showMap = opts.showMap === true;
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f2;">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!doctype html>
<html lang="es-CR">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#e8e8e4;font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-text-size-adjust:100%;">
    ${preheader}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8e8e4;">
      <tr>
        <td align="center" style="padding:24px 10px 32px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #ddd9d0;">
            <tr>
              <td>${emailHeader()}</td>
            </tr>
            <tr>
              <td style="padding:28px 28px 12px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:900;color:#0b0b0b;font-family:Arial,Helvetica,sans-serif;">${title}</h1>
                ${bodyHtml}
                ${showMap ? locationContactBlock() : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;">
                <div style="margin-top:4px;padding-top:20px;border-top:1px solid #e8e8e2;">
                  ${emailFooterLinks()}
                  ${PREFERENCES_BLOCK}
                </div>
              </td>
            </tr>
          </table>
          <p style="color:#8a8a84;font-size:11px;margin:14px 12px 0;line-height:1.55;text-align:center;font-family:Arial,Helvetica,sans-serif;">
            Xtreme Gym · Ciudad Quesada, San Carlos<br />
            Correo automático del gym. No respondas a este mensaje.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function p(html: string) {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#222;font-family:Arial,Helvetica,sans-serif;">${html}</p>`;
}

function muted(html: string) {
  return `<p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#6b6b66;font-family:Arial,Helvetica,sans-serif;">${html}</p>`;
}

/** CTA principal: tabla full-width para que se vea en mobile y Outlook. */
function ctaButton(label: string, href: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 10px;">
  <tr>
    <td align="center" style="background:#0b0b0b;">
      <a href="${escapeHtml(href)}" style="display:block;padding:16px 20px;color:#d8ff3e;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;font-family:Arial,Helvetica,sans-serif;text-align:center;">${escapeHtml(label)} →</a>
    </td>
  </tr>
</table>`;
}

function secondaryButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:6px 8px 4px 0;background:#f0f0ea;color:#0b0b0b;padding:11px 16px;text-decoration:none;font-size:12px;font-weight:900;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</a>`;
}

function codeBox(value: string, opts?: { large?: boolean }) {
  const size = opts?.large ? 32 : 26;
  const spacing = opts?.large ? 8 : 5;
  return `<div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:18px 14px;font-size:${size}px;font-weight:900;letter-spacing:${spacing}px;margin:12px 0 14px;font-family:Consolas,'Courier New',monospace;">${escapeHtml(value)}</div>`;
}

function infoCard(html: string) {
  return `<div style="border-left:4px solid #d8ff3e;background:#f6f8ee;padding:12px 14px;font-size:14px;line-height:1.55;margin:0 0 14px;color:#222;font-family:Arial,Helvetica,sans-serif;">${html}</div>`;
}

function steps(items: string[]) {
  const rows = items
    .map(
      (item, index) => `<tr>
      <td style="padding:5px 10px 5px 0;vertical-align:top;width:28px;">
        <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background:#0b0b0b;color:#d8ff3e;font-weight:900;font-size:12px;font-family:Arial,Helvetica,sans-serif;">${index + 1}</span>
      </td>
      <td style="padding:5px 0;font-size:14px;line-height:1.5;color:#222;font-family:Arial,Helvetica,sans-serif;">${item}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" style="border-collapse:collapse;margin:2px 0 14px;width:100%;">${rows}</table>`;
}

/** Caja visible del enlace seguro (cuando el botón no abre). */
function linkFallback(href: string) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 12px;border:1px solid #e0e0da;background:#fafaf8;">
  <tr>
    <td style="padding:12px 14px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b66;font-family:Arial,Helvetica,sans-serif;">Enlace personal</p>
      <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;color:#333;font-family:Consolas,'Courier New',monospace;">
        <a href="${escapeHtml(href)}" style="color:#0b0b0b;font-weight:700;text-decoration:underline;">${escapeHtml(href)}</a>
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#6b6b66;font-family:Arial,Helvetica,sans-serif;">Si el botón no abre, usá este enlace. Es personal y vence en 72 horas.</p>
    </td>
  </tr>
</table>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:5px 12px 5px 0;color:#6b6b66;font-size:13px;white-space:nowrap;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">${label}</td>
    <td style="padding:5px 0;font-size:14px;font-weight:700;color:#111;font-family:Arial,Helvetica,sans-serif;">${value}</td>
  </tr>`;
}

function detailsTable(rowsHtml: string) {
  return `<table role="presentation" style="border-collapse:collapse;margin:2px 0 14px;">${rowsHtml}</table>`;
}

function helpFooter() {
  return muted(
    `¿Dudas? Escribinos por WhatsApp al <a href="${escapeHtml(whatsappHref())}" style="color:#0b0b0b;font-weight:700;">${escapeHtml(BUSINESS.phone)}</a> o pasá por recepción en ${escapeHtml(BUSINESS.location)}.`,
  );
}

/** Correo con link magico para confirmar la cuenta antes de completar el perfil. */
export async function sendRegistrationConfirmEmail(args: {
  to: string;
  token: string;
  expiresMinutes: number;
  baseUrl?: string;
  /** Si la ficha ya tiene plan (admin/Excel/pago), el mail lo aclara. */
  planLabel?: string;
  planEndsOn?: string;
  memberName?: string;
  /** register = alta; email_change = actualizar correo de cuenta ya existente. */
  purpose?: "register" | "email_change";
}) {
  const href = absoluteRequestUrl(
    `/registro/confirmar?token=${encodeURIComponent(args.token)}`,
    args.baseUrl,
  );
  const hours = Math.max(1, Math.round(args.expiresMinutes / 60));
  const expiresLabel =
    args.expiresMinutes >= 60
      ? `${hours} hora${hours === 1 ? "" : "s"}`
      : `${args.expiresMinutes} minutos`;
  const hasPlan = Boolean(args.planLabel && args.planEndsOn);
  const isChange = args.purpose === "email_change";
  const hello = args.memberName?.trim()
    ? `¡Pura vida, ${args.memberName.trim()}!`
    : "¡Pura vida!";

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: isChange
      ? "Confirmá tu correo nuevo - Xtreme Gym"
      : hasPlan
        ? "Confirmá tu correo y creá tu PIN - plan ya activo · Xtreme Gym"
        : "Confirmá tu correo y activá tu acceso - Xtreme Gym",
    text: [
      isChange
        ? `${hello} Pediste actualizar el correo de tu cuenta Xtreme Gym.`
        : `${hello} Gracias por registrarte en Xtreme Gym.`,
      "",
      isChange
        ? "Para guardar este correo en tu ficha:"
        : hasPlan
          ? `Ya tenés plan ${args.planLabel} activo hasta ${args.planEndsOn}. Solo falta confirmar este correo y crear tu PIN.`
          : "Para activar tu acceso (todo en un solo paso):",
      "1) Abrí el enlace y confirmá este correo",
      isChange
        ? "2) Confirmá cédula y tu PIN actual"
        : "2) Completá nombre, teléfono y cédula",
      isChange
        ? "3) Listo: el correo nuevo queda en tu perfil"
        : "3) Creá tu PIN de 4 dígitos en la misma pantalla",
      "",
      `Enlace (vence en ${expiresLabel}):`,
      href,
      "",
      isChange
        ? "Si no pediste este cambio, ignorá el correo."
        : hasPlan
          ? "Tu plan se conserva al registrarte. Después entrás a la app con cédula + PIN."
          : "Después entrás a la app con cédula + PIN.",
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      isChange ? "Confirmá tu correo nuevo" : hasPlan ? "Confirmá correo y creá tu PIN" : "Confirmá tu correo",
      [
        p(
          isChange
            ? `${escapeHtml(hello)} Pediste <strong>actualizar el correo</strong> de tu cuenta en Xtreme Gym.`
            : `${escapeHtml(hello)} Gracias por registrarte en <strong>Xtreme Gym</strong>.`,
        ),
        hasPlan && !isChange
          ? detailsTable(
              row("Plan", escapeHtml(args.planLabel || "")) +
                row("Acceso hasta", escapeHtml(args.planEndsOn || "")),
            )
          : "",
        p(
          isChange
            ? "Con este enlace confirmás que este correo es tuyo. Si ya tenías cuenta, usá cédula + PIN para autorizar el cambio."
            : hasPlan
              ? "Tu plan <strong>ya está en la ficha</strong>. Con este enlace solo confirmás el correo, completás datos y creás el PIN - el plan no se borra."
              : "Con este enlace activás tu acceso completo: correo, perfil y PIN, en un solo paso.",
        ),
        steps(
          isChange
            ? [
                "Tocá el botón y abrí el formulario seguro.",
                "Confirmá <strong>cédula</strong> y tu <strong>PIN</strong> actual.",
                "El correo nuevo queda guardado y verificado.",
              ]
            : [
                "Tocá el botón y abrí el formulario seguro.",
                "Completá <strong>nombre</strong>, <strong>teléfono</strong> y <strong>cédula</strong>.",
                "Creá tu <strong>PIN de 4 dígitos</strong> en la misma pantalla.",
              ],
        ),
        ctaButton(isChange ? "Confirmar correo nuevo" : "Completar registro y crear PIN", href),
        linkFallback(href),
        muted(`Este enlace es personal y vence en <strong>${expiresLabel}</strong>.`),
        helpFooter(),
      ].join(""),
    ),
  });
}

/** Invitación directa de recepción: crea acceso a la app, sin regalar un día ni activar un plan. */
export async function sendReceptionAppInviteEmail(args: {
  to: string;
  token: string;
  expiresHours: number;
  baseUrl?: string;
}) {
  return sendStaffMemberAppInviteEmail({
    ...args,
    memberName: "",
    source: "reception",
  });
}

/**
 * Invitación de staff (recepción o super admin) a un socio existente o correo suelto.
 * No regala plan ni primer día; el enlace confirma el correo y completa la ficha.
 */
export async function sendStaffMemberAppInviteEmail(args: {
  to: string;
  token: string;
  expiresHours: number;
  memberName?: string;
  source?: "reception" | "admin";
  baseUrl?: string;
}) {
  const href = absoluteRequestUrl(
    `/registro/confirmar?token=${encodeURIComponent(args.token)}`,
    args.baseUrl,
  );
  const who = args.source === "admin" ? "el equipo de Xtreme Gym" : "recepción de Xtreme Gym";
  const name = args.memberName?.trim() || "";
  const hello = name ? `Hola ${escapeHtml(name)}. ` : "¡Hola! ";
  const bound = Boolean(name);
  const expiresLabel = `${args.expiresHours} hora${args.expiresHours === 1 ? "" : "s"}`;

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: bound
      ? `${name}, activá tu app de Xtreme Gym`
      : "Tu invitación a la app de Xtreme Gym",
    text: [
      `${name ? `Hola ${name}.` : "¡Hola!"} Te invitó ${who} a la app de socios.`,
      "",
      "Pasos (todo en una pantalla):",
      "1) Abrí el enlace y confirmá este correo",
      "2) Revisá o completá nombre, teléfono y cédula",
      "3) Creá tu PIN de 4 dígitos",
      "",
      `Enlace (vence en ${expiresLabel}):`,
      href,
      "",
      "Después entrás con cédula + PIN: reservas, entrenos y carné digital.",
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      bound ? "Activá tu app de socio" : "Tu invitación a Xtreme Gym",
      [
        p(`${hello}Te invitó <strong>${escapeHtml(who)}</strong> a la app de socios.`),
        p(
          "Con el enlace confirmás este correo, dejás listos tus datos y creás tu PIN - todo junto. Después entrás con cédula + PIN.",
        ),
        infoCard(
          "<strong>En la app vas a poder</strong><br>Reservar clases · Marcar entrenos · Cuidar tu racha · Usar tu carné digital",
        ),
        steps([
          "Abrí el enlace seguro.",
          "Completá o confirmá <strong>nombre</strong>, <strong>teléfono</strong> y <strong>cédula</strong>.",
          "Creá tu <strong>PIN de 4 dígitos</strong> en la misma pantalla.",
        ]),
        ctaButton(bound ? "Activar mi acceso" : "Aceptar invitación", href),
        linkFallback(href),
        muted(`Enlace personal, de un solo uso. Vence en <strong>${expiresLabel}</strong>.`),
        helpFooter(),
      ].join(""),
    ),
  });
}

/** Invitacion posterior a PayPal para completar cedula y activar el ingreso a la app. */
export async function sendPaymentAppInviteEmail(args: {
  to: string;
  token: string;
  memberName: string;
  optionLabel: string;
  expiresHours: number;
  baseUrl?: string;
}) {
  const href = absoluteRequestUrl(
    "/registro/confirmar?token=" + encodeURIComponent(args.token),
    args.baseUrl,
  );
  const expiresLabel = `${args.expiresHours} hora${args.expiresHours === 1 ? "" : "s"}`;

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: `Pago recibido · completá tu perfil - Xtreme Gym`,
    text: [
      `Hola ${args.memberName}.`,
      "",
      `Recibimos tu pago de ${args.optionLabel}.`,
      "Completá tu perfil para entrar a la app de socios:",
      "",
      "1) Confirmá este correo con el enlace",
      "2) Completá cédula y datos del perfil",
      "3) Creá tu PIN de 4 dígitos",
      "",
      `Enlace (vence en ${expiresLabel}):`,
      href,
      "",
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      "Pago recibido · activá tu acceso",
      [
        p(`Hola <strong>${escapeHtml(args.memberName)}</strong>. ¡Gracias por tu pago!`),
        detailsTable(
          row("Concepto", escapeHtml(args.optionLabel)) +
            row("Siguiente paso", "Completar perfil y crear PIN"),
        ),
        p(
          "Tu pago ya está ligado a este correo. Solo falta completar el perfil para usar la app, el carné digital y las reservas.",
        ),
        steps([
          "Tocá el botón y confirmá este correo.",
          "Completá tu <strong>cédula</strong> y datos de contacto.",
          "Creá tu <strong>PIN de 4 dígitos</strong> en la app.",
        ]),
        ctaButton("Completar mi perfil", href),
        linkFallback(href),
        muted(`Enlace personal. Vence en <strong>${expiresLabel}</strong>.`),
        helpFooter(),
      ].join(""),
    ),
  });
}

export async function sendWelcomeEmail(args: {
  to: string;
  memberName: string;
  accessCode: string;
  cedula?: string;
  /** Si el admin/pago ya dejó plan vigente al registrarse. */
  planLabel?: string;
  planEndsOn?: string;
}) {
  const appUrl = absoluteAppUrl("/app");
  const cedulaLine = args.cedula
    ? `Ingresá tu cédula <strong>${escapeHtml(args.cedula)}</strong>.`
    : "Ingresá la cédula con la que te registraste.";
  const hasPlan = Boolean(args.planLabel && args.planEndsOn);
  const planText = hasPlan
    ? `Tu plan ${args.planLabel} está activo hasta ${args.planEndsOn}.`
    : "";

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: hasPlan
      ? `¡Listo, ${args.memberName}! Plan activo y PIN creado - Xtreme Gym`
      : `¡Listo, ${args.memberName}! Tu perfil en Xtreme Gym`,
    text: [
      `¡Pura vida, ${args.memberName}!`,
      "",
      "Tu perfil de socio quedó activo y tu PIN ya está creado.",
      planText,
      "",
      `Código de ingreso en recepción: ${args.accessCode}`,
      args.cedula ? `Cédula: ${args.cedula}` : "",
      "",
      "Cómo entrar a la app:",
      "1) Abrí la app",
      "2) Digita tu cédula",
      "3) Ingresá el PIN que creaste al registrarte",
      "",
      `App: ${appUrl}`,
      "",
      "En la app: reservas, entrenos, racha, progreso y carné digital.",
      "Si olvidás el PIN, pedí un código a este correo desde la app.",
      `WhatsApp: ${BUSINESS.phone}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: layout(
      `¡Pura vida, ${escapeHtml(args.memberName)}!`,
      [
        p(
          "Tu perfil de socio en <strong>Xtreme Gym</strong> quedó listo y tu <strong>PIN ya está creado</strong>. Guardá este correo: tiene tu código de ingreso.",
        ),
        hasPlan
          ? detailsTable(
              row("Plan", escapeHtml(args.planLabel || "")) +
                row("Acceso hasta", escapeHtml(args.planEndsOn || "")),
            )
          : "",
        p("<strong>Tu código de ingreso</strong> (recepción o pantalla de ingreso)"),
        codeBox(args.accessCode),
        infoCard(
          "<strong>Cómo entrar a la app</strong><br>Cédula + el PIN que creaste al registrarte. Si lo olvidás, recuperarlo desde la app con este correo.",
        ),
        steps([
          `Abrí la app: <a href="${escapeHtml(appUrl)}" style="color:#111;font-weight:bold;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a>`,
          cedulaLine,
          "Ingresá tu <strong>PIN de 4 dígitos</strong>.",
        ]),
        ctaButton("Entrar a mi app", appUrl),
        p(
          hasPlan
            ? "Con tu plan activo ya podés <strong>reservar clases</strong>, <strong>marcar entrenos</strong>, cuidar tu <strong>racha</strong> y seguir tu <strong>progreso</strong>."
            : "En la app podés <strong>reservar clases</strong>, <strong>marcar entrenos</strong>, cuidar tu <strong>racha</strong> y seguir tu <strong>progreso</strong>.",
        ),
        helpFooter(),
      ].join(""),
    ),
  });
}

export async function sendPaymentReceiptEmail(args: {
  to: string;
  customerName: string;
  optionLabel: string;
  amountCrc: number;
  amountUsd: number;
  method: string;
  date: string;
  reference?: string | null;
  nextBillingDate?: string;
}) {
  const methodLabel: Record<string, string> = {
    paypal: "En línea",
    cash: "Efectivo",
    transfer: "Transferencia",
    sinpe: "SINPE Móvil",
    other: "Otro",
  };
  const amount = `CRC ${args.amountCrc.toLocaleString("es-CR")}${
    args.amountUsd ? ` · USD ${args.amountUsd.toFixed(2)}` : ""
  }`;
  const appUrl = absoluteAppUrl("/app");

  return sendEmail({
    to: args.to,
    cc: reservationCc(),
    managePreferences: false,
    subject: `Recibo Xtreme Gym - ${args.optionLabel}`,
    text: [
      `Hola ${args.customerName}. Gracias por tu pago en Xtreme Gym.`,
      "",
      `Concepto: ${args.optionLabel}`,
      `Monto: ${amount}`,
      `Método: ${methodLabel[args.method] ?? args.method}`,
      `Fecha: ${args.date}`,
      args.reference ? `Referencia: ${args.reference}` : "",
      args.nextBillingDate ? `Membresía activa hasta: ${args.nextBillingDate}` : "",
      "",
      `App: ${appUrl}`,
      `WhatsApp: ${BUSINESS.phone}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: layout(
      "Recibo de pago",
      [
        p(`Hola <strong>${escapeHtml(args.customerName)}</strong>. Gracias por tu pago. Este es tu comprobante:`),
        detailsTable(
          row("Concepto", escapeHtml(args.optionLabel)) +
            row("Monto", escapeHtml(amount)) +
            row("Método", escapeHtml(methodLabel[args.method] ?? args.method)) +
            row("Fecha", escapeHtml(args.date)) +
            (args.reference ? row("Referencia", escapeHtml(args.reference)) : "") +
            (args.nextBillingDate
              ? row("Membresía activa hasta", escapeHtml(args.nextBillingDate))
              : ""),
        ),
        p("Podés revisar tu plan y tu carné digital en la app."),
        ctaButton("Abrir mi app", appUrl),
        helpFooter(),
      ].join(""),
    ),
  });
}

export async function sendReservationEmail(args: {
  to: string;
  memberName: string;
  trainingName: string;
  trainingDate: string;
}) {
  const appUrl = absoluteAppUrl("/app");
  return sendEmail({
    to: args.to,
    cc: reservationCc(),
    managePreferences: false,
    subject: `Reserva confirmada - ${args.trainingName} (${args.trainingDate})`,
    text: [
      `Hola ${args.memberName}. Tu cupo quedó reservado.`,
      "",
      `Clase: ${args.trainingName}`,
      `Fecha: ${args.trainingDate}`,
      "",
      "Llegá 5 minutos antes. Si no podés ir, cancelá desde la app.",
      `App: ${appUrl}`,
    ].join("\n"),
    html: layout(
      "Reserva confirmada",
      [
        p(`Hola <strong>${escapeHtml(args.memberName)}</strong>. Tu cupo quedó reservado:`),
        detailsTable(
          row("Clase", escapeHtml(args.trainingName)) +
            row("Fecha", escapeHtml(args.trainingDate)),
        ),
        p("Llegá 5 minutos antes. Si no podés asistir, cancelá desde la app para liberar el cupo."),
        ctaButton("Ver mis reservas", appUrl),
        helpFooter(),
      ].join(""),
    ),
  });
}

export async function sendPinChangedEmail(args: {
  to: string;
  memberName: string;
  kind: "set" | "changed" | "recovered";
}) {
  const appUrl = absoluteAppUrl("/app");
  const copy =
    args.kind === "set"
      ? {
          subject: "PIN creado - ya podés entrar a tu app · Xtreme Gym",
          title: "Tu PIN quedó creado",
          lead: "Creaste el PIN de 4 dígitos de tu perfil.",
          next: "A partir de ahora entrás a la app con tu cédula y este PIN.",
        }
      : args.kind === "changed"
        ? {
            subject: "PIN actualizado · Xtreme Gym",
            title: "Tu PIN se actualizó",
            lead: "Cambiaste el PIN de tu perfil.",
            next: "La próxima vez usá el PIN nuevo para entrar.",
          }
        : {
            subject: "PIN restablecido · Xtreme Gym",
            title: "Tu PIN se restableció",
            lead: "Restableciste el PIN de tu perfil con el código del correo.",
            next: "Guardalo en un lugar seguro. Con cédula + PIN entrás a la app.",
          };

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: copy.subject,
    text: [
      `Hola ${args.memberName}.`,
      "",
      copy.lead,
      copy.next,
      "",
      "El PIN es personal. No lo compartas.",
      `App: ${appUrl}`,
      `WhatsApp recepción: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      copy.title,
      [
        p(`Hola <strong>${escapeHtml(args.memberName)}</strong>. ${copy.lead}`),
        p(copy.next),
        infoCard(
          "<strong>Recordá</strong><br>Tu PIN es personal y de 4 dígitos. Si lo olvidás, en la app podés pedir un código a este correo para recuperarlo.",
        ),
        ctaButton("Abrir mi app", appUrl),
        helpFooter(),
      ].join(""),
    ),
  });
}

export async function sendMembershipReminderEmail(args: {
  to: string;
  memberName: string;
  plan: string;
  nextBillingDate: string;
  daysRemaining: number;
}) {
  const expired = args.daysRemaining < 0;
  const headline = expired
    ? `Tu membresía venció el ${args.nextBillingDate}`
    : `Tu membresía vence en ${args.daysRemaining} día${args.daysRemaining === 1 ? "" : "s"}`;
  return sendEmail({
    to: args.to,
    optional: true,
    subject: expired ? "Xtreme Gym - membresía vencida" : "Xtreme Gym - tu membresía vence pronto",
    html: layout(
      "Recordatorio de membresía",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}, ${escapeHtml(headline)}.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Plan", escapeHtml(args.plan))}
        ${row(expired ? "Venció" : "Vence", escapeHtml(args.nextBillingDate))}
      </table>
      <p style="font-size:14px;line-height:1.6;">Podés renovar directamente desde tu app o en recepción. No pierdas tu racha.</p>
      ${appButton("Abrir mi membresía")}`,
    ),
  });
}

export async function sendCustomReminderEmail(args: {
  to: string;
  memberName: string;
  message: string;
}) {
  return sendEmail({
    to: args.to,
    optional: true,
    subject: "Recordatorio Xtreme Gym",
    html: layout(
      "Tu recordatorio",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}:</p>
      <div style="border-left:4px solid #d8ff3e;background:#f7f9ec;padding:12px 16px;font-size:15px;font-weight:bold;margin:12px 0;">
        ${escapeHtml(args.message)}
      </div>
      <p style="font-size:14px;line-height:1.6;">Nos vemos en el gym.</p>`,
    ),
  });
}

function appButton(label: string, path = "/app") {
  return ctaButton(label, absoluteAppUrl(path));
}

export async function sendStreakRiskEmail(args: {
  to: string;
  memberName: string;
  streak: number;
}) {
  return sendEmail({
    optional: true,
    to: args.to,
    subject: `Tu racha de ${args.streak} días sigue viva 🔥`,
    html: layout(
      "Entrená hoy y mantené la racha",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. Llevás <strong>${args.streak} días</strong> construyendo constancia. Un entreno hoy mantiene ese impulso.</p>
      <p style="font-size:14px;line-height:1.6;">No tiene que ser perfecto ni largo. Solo tenés que aparecer.</p>
      ${appButton("Abrir mi app")}`,
    ),
  });
}

export async function sendMilestoneEmail(args: { to: string; memberName: string; streak: number }) {
  return sendEmail({
    optional: true,
    to: args.to,
    subject: `¡${args.streak} días de constancia! 🏆`,
    html: layout(
      "Nuevo hito desbloqueado",
      `<p style="font-size:14px;line-height:1.6;">${escapeHtml(args.memberName)}, llegaste a una racha de <strong>${args.streak} días</strong>.</p>
      <div style="background:#d8ff3e;color:#0b0b0b;padding:20px;text-align:center;font-size:32px;font-weight:900;margin:16px 0;">${args.streak} DÍAS 🔥</div>
      <p style="font-size:14px;line-height:1.6;">Celebralo, compartilo y seguí construyendo.</p>${appButton("Ver mi logro")}`,
    ),
  });
}

/**
 * Aviso: admin activó/extendió plan a un socio que YA tiene correo verificado.
 * hasPin=false → guía a crear PIN por OTP en la app (no magic link de registro).
 */
export async function sendAdminGrantedPlanEmail(args: {
  to: string;
  memberName: string;
  plan: string;
  endsOn: string;
  /** Si false, el socio aún no tiene PIN y debe crearlo en /app. */
  hasPin?: boolean;
  /** true si se sumaron días a un plan que ya estaba vigente. */
  extended?: boolean;
}) {
  const appUrl = absoluteAppUrl("/app");
  const hasPin = args.hasPin !== false;
  const actionLine = args.extended
    ? `El equipo de Xtreme Gym extendió tu plan ${args.plan} (se sumaron los días a tu acceso actual).`
    : `El equipo de Xtreme Gym activó tu plan ${args.plan}.`;
  const pinSteps = hasPin
    ? [
        "Abrí la app con el botón de abajo.",
        "Ingresá con tu <strong>cédula</strong> y tu <strong>PIN</strong>.",
        "Reservá clases, marcá entrenos y usá tu carné digital.",
      ]
    : [
        "Abrí la app con el botón de abajo.",
        "Ingresá tu <strong>cédula</strong>.",
        "Tocá <strong>Enviar código al correo</strong> y creá tu <strong>PIN de 4 dígitos</strong>.",
        "Con cédula + PIN ya podés reservar y entrenar.",
      ];

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: hasPin
      ? `Tu plan ${args.plan} ya está activo - Xtreme Gym`
      : `Tu plan ${args.plan} está activo · creá tu PIN - Xtreme Gym`,
    text: [
      `Hola ${args.memberName}.`,
      "",
      actionLine,
      `Acceso hasta: ${args.endsOn}`,
      "",
      hasPin
        ? "Entrá a la app con tu cédula y PIN para reservar, marcar entrenos y usar tu carné digital."
        : "Tu plan ya vale: solo falta crear tu PIN. Entrá a la app con tu cédula, pedí el código a este correo y elegí un PIN de 4 dígitos.",
      `App: ${appUrl}`,
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      hasPin ? "Tu plan ya está activo" : "Plan activo · creá tu PIN",
      [
        p(
          `Hola <strong>${escapeHtml(args.memberName)}</strong>. ${escapeHtml(actionLine)}`,
        ),
        detailsTable(
          row("Plan", escapeHtml(args.plan)) + row("Acceso hasta", escapeHtml(args.endsOn)),
        ),
        p(
          hasPin
            ? "Ya podés entrar a la app, usar tu carné digital, reservar clases y seguir tu progreso."
            : "El plan ya está en tu ficha. Completá el PIN para entrar a la app y reservar clases.",
        ),
        steps(pinSteps),
        ctaButton(hasPin ? "Abrir mi app" : "Crear mi PIN en la app", appUrl),
        helpFooter(),
      ].join(""),
    ),
  });
}

/**
 * Admin activó plan a socio que aún NO verificó correo / no se registró:
 * magic link para completar ficha + crear PIN, con el plan ya guardado.
 */
export async function sendAdminPlanRegistrationInviteEmail(args: {
  to: string;
  token: string;
  memberName: string;
  plan: string;
  endsOn: string;
  expiresHours: number;
  extended?: boolean;
  baseUrl?: string;
}) {
  const href = absoluteRequestUrl(
    `/registro/confirmar?token=${encodeURIComponent(args.token)}`,
    args.baseUrl,
  );
  const expiresLabel = `${args.expiresHours} hora${args.expiresHours === 1 ? "" : "s"}`;
  const name = args.memberName.trim() || "socio";
  const planLine = args.extended
    ? `Tu plan <strong>${escapeHtml(args.plan)}</strong> ya está activo y se extendió hasta <strong>${escapeHtml(args.endsOn)}</strong>.`
    : `Tu plan <strong>${escapeHtml(args.plan)}</strong> ya está activo hasta <strong>${escapeHtml(args.endsOn)}</strong>.`;

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: `${name}, tu plan está listo · completá tu acceso - Xtreme Gym`,
    text: [
      `Hola ${name}.`,
      "",
      args.extended
        ? `El equipo de Xtreme Gym extendió tu plan ${args.plan} hasta ${args.endsOn}.`
        : `El equipo de Xtreme Gym activó tu plan ${args.plan} hasta ${args.endsOn}.`,
      "",
      "Para usarlo en la app (un solo paso):",
      "1) Abrí el enlace y confirmá este correo",
      "2) Revisá o completá nombre, teléfono y cédula",
      "3) Creá tu PIN de 4 dígitos",
      "",
      `Enlace (vence en ${expiresLabel}):`,
      href,
      "",
      "Tu plan se conserva: no se borra al completar el registro.",
      "Después entrás con cédula + PIN.",
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      "Plan activo · activá tu app",
      [
        p(`Hola <strong>${escapeHtml(name)}</strong>. El equipo de Xtreme Gym dejó listo tu acceso.`),
        detailsTable(
          row("Plan", escapeHtml(args.plan)) + row("Acceso hasta", escapeHtml(args.endsOn)),
        ),
        p(
          `${planLine} Solo falta confirmar este correo, dejar tus datos y crear tu PIN - el plan <strong>no se pierde</strong> al registrarte.`,
        ),
        steps([
          "Abrí el enlace seguro.",
          "Confirmá <strong>nombre</strong>, <strong>teléfono</strong> y <strong>cédula</strong>.",
          "Creá tu <strong>PIN de 4 dígitos</strong> en la misma pantalla.",
        ]),
        ctaButton("Completar registro y crear PIN", href),
        linkFallback(href),
        muted(
          `Enlace personal, de un solo uso. Vence en <strong>${expiresLabel}</strong>. Después entrás con cédula + PIN.`,
        ),
        helpFooter(),
      ].join(""),
    ),
  });
}

/** Plantilla profesional para campañas del Admin OS (logo + mapa + CTAs). */
export async function sendCampaignEmail(args: {
  to: string;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaPath?: string;
  idempotencyKey?: string;
}) {
  // Mensaje: máximo 3 párrafos visibles, sin relleno largo.
  const paragraphs = args.message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#222;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  // Soporta rutas internas y magic links con query (?token=).
  // Nunca manda /registro/confirmar sin token hex de 64 (mismo formato que createRegistrationToken).
  const rawPath = String(args.ctaPath || "/app").trim();
  let safePath =
    rawPath.startsWith("/") && !rawPath.startsWith("//") ? rawPath : "/app";
  if (safePath.startsWith("/registro/confirmar")) {
    const tokenMatch = safePath.match(/[?&]token=([^&#]+)/);
    let tokenOk = false;
    if (tokenMatch?.[1]) {
      try {
        const token = decodeURIComponent(tokenMatch[1]).trim();
        tokenOk = /^[a-f0-9]{64}$/i.test(token);
      } catch {
        tokenOk = false;
      }
    }
    if (!tokenOk) {
      console.error("sendCampaignEmail: CTA registro sin token válido → fallback", safePath);
      safePath = "/primer-dia#registro";
    }
  }
  const primaryHref = absoluteAppUrl(safePath);
  const isSecureLink = /[?&]token=/.test(safePath) || safePath.includes("/registro/");
  const button = args.ctaLabel
    ? ctaButton(args.ctaLabel, primaryHref) +
      (isSecureLink ? linkFallback(primaryHref) : "")
    : "";

  const guideNote = isSecureLink
    ? infoCard(
        "<strong>Cómo activar tu acceso</strong><br>" +
          "1) Tocá el botón negro de abajo<br>" +
          "2) Revisá o completá nombre, cédula y teléfono<br>" +
          "3) Creá tu PIN de 4 dígitos e ingresá a la app",
      )
    : "";

  const preheader =
    args.message.replace(/\s+/g, " ").trim().slice(0, 100) ||
    `${args.ctaLabel || "Xtreme Gym"} · Ciudad Quesada`;

  return sendEmail({
    to: args.to,
    optional: true,
    idempotencyKey: args.idempotencyKey,
    subject: args.subject,
    text: [
      args.title,
      "",
      args.message,
      "",
      args.ctaLabel ? `${args.ctaLabel}: ${primaryHref}` : "",
      "",
      `WhatsApp: ${BUSINESS.phone}`,
      `Ubicación: ${BUSINESS.addressDetail || BUSINESS.location}`,
      `Maps: ${BUSINESS.maps}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: layout(
      escapeHtml(args.title),
      `${paragraphs}${guideNote}${button}`,
      {
        showMap: true,
        preheader,
      },
    ),
  });
}

/** Recordatorio 48 h: empezó el primer día gratis pero no completó el perfil. */
export async function sendFreeDayPendingReminderEmail(args: {
  to: string;
  confirmUrl: string;
  expiresHours: number;
}) {
  const restartUrl = absoluteAppUrl("/primer-dia#registro");
  const expiresLabel = `${args.expiresHours} hora${args.expiresHours === 1 ? "" : "s"}`;

  return sendEmail({
    to: args.to,
    optional: true,
    subject: "Terminá tu registro · primer día gratis en Xtreme",
    text: [
      "Pediste tu primer día gratis en Xtreme Gym.",
      "Te falta un paso: confirmar el correo y completar el perfil.",
      "",
      "1) Confirmá el correo",
      "2) Completá nombre, teléfono y cédula",
      "3) Creá tu PIN en la app",
      "",
      `Enlace (vence en ${expiresLabel}):`,
      args.confirmUrl,
      "",
      `O empezá de nuevo: ${restartUrl}`,
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      "Terminá tu registro",
      [
        p(
          "Pediste tu <strong>primer día gratis</strong> en Xtreme Gym. Te falta un paso para entrar a la app.",
        ),
        infoCard(
          "<strong>Sin tarjeta en este paso</strong><br>Solo activás tu acceso de prueba. Pagás cuando quieras continuar con un plan.",
        ),
        steps([
          "Confirmá este correo con el botón.",
          "Completá <strong>nombre</strong>, <strong>teléfono</strong> y <strong>cédula</strong>.",
          "Creá tu <strong>PIN de 4 dígitos</strong> en la app.",
        ]),
        ctaButton("Completar mi perfil", args.confirmUrl),
        linkFallback(args.confirmUrl),
        muted(
          `El enlace vence en <strong>${expiresLabel}</strong>. También podés <a href="${escapeHtml(restartUrl)}" style="color:#555;text-decoration:underline;">empezar de nuevo acá</a>.`,
        ),
        helpFooter(),
      ].join(""),
    ),
  });
}

/** Recordatorio 48 h: completó el primer día gratis pero no se inscribió a un plan. */
export async function sendFreeDayUpgradeReminderEmail(args: {
  to: string;
  memberName: string;
  appUrl: string;
  pricesUrl: string;
}) {
  return sendEmail({
    to: args.to,
    optional: true,
    subject: "¿Seguimos entrenando? Elegí tu plan en Xtreme",
    text: [
      `Hola ${args.memberName}.`,
      "Ya activaste tu primer día gratis y la app de socios.",
      "Si te gustó el gym, elegí semana, quincena o mes.",
      "",
      `App: ${args.appUrl}`,
      `Planes: ${args.pricesUrl}`,
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      "Tu próximo paso en Xtreme",
      [
        p(
          `Hola <strong>${escapeHtml(args.memberName)}</strong>. Ya tenés la app con el <strong>primer día gratis</strong>.`,
        ),
        p(
          "Si te gustó el ambiente, elegí semana, quincena o mes y seguí con reservas, rachas y progreso. El mensual suele ser el que más rinde por día.",
        ),
        ctaButton("Entrar a mi app", args.appUrl),
        secondaryButton("Ver planes", args.pricesUrl),
        helpFooter(),
      ].join(""),
    ),
  });
}

export async function sendWinBackEmail(args: {
  to: string;
  memberName: string;
  inactiveDays: number;
}) {
  return sendEmail({
    to: args.to,
    optional: true,
    subject: "Volvé a Xtreme - lo importante es retomar",
    html: layout(
      "Tu próximo entreno cuenta",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. Han pasado ${args.inactiveDays} días desde tu último entreno. Eso no borra lo que ya avanzaste.</p>
      <p style="font-size:14px;line-height:1.6;">Volvé con una sesión sencilla. Revisá tu plan y retomá desde donde estás.</p>
      ${appButton("Abrir mi app")}`,
    ),
  });
}

export async function sendMonthlyRecapEmail(args: {
  to: string;
  memberName: string;
  month: string;
  workouts: number;
  minutes: number;
}) {
  return sendEmail({
    optional: true,
    to: args.to,
    subject: `Tu mes en Xtreme - ${args.workouts} entrenos 💪`,
    html: layout(
      "Tu mes en Xtreme",
      `<p style="font-size:14px;line-height:1.6;">${escapeHtml(args.memberName)}, esto fue lo que construiste en ${escapeHtml(args.month)}:</p>
      <div style="display:flex;gap:10px;margin:18px 0;">
        <div style="flex:1;background:#0b0b0b;color:#d8ff3e;padding:16px;text-align:center;"><strong style="font-size:28px;">${args.workouts}</strong><br><span style="font-size:11px;text-transform:uppercase;">entrenos</span></div>
        <div style="flex:1;background:#0b0b0b;color:#d8ff3e;padding:16px;text-align:center;"><strong style="font-size:28px;">${args.minutes}</strong><br><span style="font-size:11px;text-transform:uppercase;">minutos</span></div>
      </div>
      <p style="font-size:14px;line-height:1.6;">Cada sesión cuenta. Compartí tu avance y seguí construyendo el próximo mes.</p>
      ${appButton("Ver mi progreso")}`,
    ),
  });
}

/**
 * Código de un solo uso para crear o recuperar el PIN.
 * Incluye HTML + texto plano para que el código se lea en cualquier cliente.
 */
export async function sendPinRecoveryOtpEmail(args: {
  to: string;
  memberName: string;
  code: string;
  expiresMinutes: number;
  /** pin_setup = primera vez; pin_recovery = olvidó el PIN */
  purpose?: "pin_setup" | "pin_recovery";
}) {
  const code = String(args.code ?? "").replace(/\D/g, "").slice(0, 6);
  const setup = args.purpose === "pin_setup";
  const appUrl = absoluteAppUrl("/app");
  const title = setup ? "Tu código para crear el PIN" : "Tu código para recuperar el PIN";
  const lead = setup
    ? "Pediste un código para <strong>crear</strong> tu PIN de seguridad en la app."
    : "Pediste un código para <strong>recuperar</strong> tu PIN de la app.";
  const action = setup
    ? "Volvé a la app, escribí este código y creá tu PIN de 4 dígitos."
    : "Volvé a la app, escribí este código y elegí un PIN nuevo de 4 dígitos.";
  const spaced = code.split("").join(" ");

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: setup ? `Código para crear tu PIN: ${code}` : `Código para recuperar tu PIN: ${code}`,
    text: [
      `Hola ${args.memberName}.`,
      "",
      setup
        ? "Tu código para crear el PIN de Xtreme Gym:"
        : "Tu código para recuperar el PIN de Xtreme Gym:",
      "",
      `CODIGO: ${code}`,
      "",
      action.replace(/<\/?strong>/g, ""),
      `Vence en ${args.expiresMinutes} minutos.`,
      "",
      "Pasos:",
      "1) Abrí la app",
      "2) Pegá el código de 6 dígitos",
      "3) Creá / confirmá tu PIN de 4 dígitos",
      "",
      `App: ${appUrl}`,
      "No compartas este código. Si no lo pediste, ignorá el correo.",
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      title,
      [
        p(`Hola <strong>${escapeHtml(args.memberName)}</strong>. ${lead}`),
        p("<strong style=\"display:block;margin-bottom:4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#555;\">Tu código de 6 dígitos</strong>"),
        codeBox(spaced, { large: true }),
        `<p style="text-align:center;font-size:20px;font-weight:900;color:#111;margin:0 0 16px;letter-spacing:0.2em;">${escapeHtml(code)}</p>`,
        p(action),
        steps([
          "Abrí la app de Xtreme (mismo celular o navegador donde pediste el código).",
          "Escribí el <strong>código de 6 dígitos</strong> de este correo.",
          setup
            ? "Creá y confirmá tu <strong>PIN de 4 dígitos</strong>."
            : "Elegí y confirmá tu <strong>nuevo PIN de 4 dígitos</strong>.",
        ]),
        infoCard(
          `<strong>Vence en ${args.expiresMinutes} minutos</strong><br>Un solo uso. No lo reenvíes ni lo compartas. Si no pediste este código, podés ignorar el correo.`,
        ),
        ctaButton("Abrir la app", appUrl),
        helpFooter(),
      ].join(""),
    ),
  });
}

/** Notificacion al admin cuando se registra un nuevo socio con primer dia gratis. */
export function adminNotificationAddress() {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "aallanrd@gmail.com";
}

export async function sendAdminEmailOptOutNotification(args: {
  email: string;
  reason: string;
  reasonLabel: string;
  feedback?: string;
}) {
  return sendEmail({
    to: adminNotificationAddress(),
    managePreferences: false,
    subject: `Nueva baja de correo y motivo - Xtreme Gym`,
    html: layout(
      "Preferencia de contacto recibida",
      `<p style="font-size:14px;line-height:1.7;">Una persona desactivó los correos opcionales y compartió el motivo. La respuesta también quedó disponible en el Centro de correos de Super Admin.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Correo", escapeHtml(args.email))}
        ${row("Motivo", escapeHtml(args.reasonLabel))}
        ${args.feedback ? row("Comentario", escapeHtml(args.feedback)) : ""}
      </table>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">No se le enviarán más campañas ni recordatorios opcionales. Los avisos transaccionales y de seguridad permanecen disponibles.</p>`,
    ),
  });
}

export async function sendAdminOperationalAlert(args: {
  severity: "warning" | "critical";
  title: string;
  detail: string;
  context?: Record<string, string | number | boolean | null | undefined>;
}) {
  const contextRows = Object.entries(args.context ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => row(escapeHtml(label), escapeHtml(value)))
    .join("");
  return sendEmail({
    to: adminNotificationAddress(),
    managePreferences: false,
    subject: `${args.severity === "critical" ? "URGENTE" : "Alerta"}: ${args.title}`,
    html: layout(
      args.severity === "critical" ? "Incidente crítico" : "Alerta operativa",
      `<p style="font-size:16px;font-weight:900;line-height:1.5;">${escapeHtml(args.title)}</p>
      <p style="font-size:14px;line-height:1.7;">${escapeHtml(args.detail)}</p>
      ${contextRows ? `<table style="border-collapse:collapse;margin:12px 0;">${contextRows}</table>` : ""}
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">El incidente también quedó guardado en el panel Admin de Xtreme Gym.</p>`,
    ),
  });
}

export async function sendAdminDailySummary(args: {
  date: string;
  members: number;
  activeMemberships: number;
  expiringMemberships: number;
  expiredMemberships: number;
  payments: number;
  revenueCrc: number;
  checkins: number;
  notificationsSent: number;
  notificationsFailed: number;
  pendingInvites: number;
  abandonedPayPalOrders: number;
  openAlerts: number;
  freeDayNudgesSent?: number;
}) {
  const needsAttention = args.notificationsFailed + args.abandonedPayPalOrders + args.openAlerts > 0;
  return sendEmail({
    to: adminNotificationAddress(),
    managePreferences: false,
    subject: `${needsAttention ? "Revisar" : "Todo bien"} · Resumen Xtreme ${args.date}`,
    html: layout(
      "Resumen operativo diario",
      `<p style="font-size:14px;line-height:1.6;">Estado automático de Xtreme Gym para ${escapeHtml(args.date)}.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Socios", String(args.members))}
        ${row("Membresías", `${args.activeMemberships} activas · ${args.expiringMemberships} por vencer · ${args.expiredMemberships} vencidas`)}
        ${row("Pagos del día", `${args.payments} · CRC ${args.revenueCrc.toLocaleString("es-CR")}`)}
        ${row("Ingresos del día", String(args.checkins))}
        ${row("Avisos automáticos", `${args.notificationsSent} enviados · ${args.notificationsFailed} fallidos`)}
        ${row("Invitaciones pendientes", String(args.pendingInvites))}
        ${row("Órdenes en línea abandonadas", String(args.abandonedPayPalOrders))}
        ${row("Recordatorios primer día (48 h)", String(args.freeDayNudgesSent ?? 0))}
        ${row("Alertas abiertas", String(args.openAlerts))}
      </table>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">Los incidentes y el estado del cron también aparecen en el panel Admin.</p>`,
    ),
  });
}

export async function sendAdminNewMemberNotification(args: {
  memberName: string;
  phone: string;
  email?: string;
  cedula?: string;
}) {
  return sendEmail({
    to: adminNotificationAddress(),
    managePreferences: false,
    subject: `Nuevo socio registrado: ${args.memberName}`,
    html: layout(
      "Nuevo registro con primer día gratis",
      `<p style="font-size:14px;line-height:1.6;">Se ha registrado un nuevo socio en el Member OS aprovechando el primer día gratis:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Nombre", escapeHtml(args.memberName))}
        ${row("Teléfono", escapeHtml(args.phone))}
        ${args.email ? row("Correo", escapeHtml(args.email)) : ""}
        ${args.cedula ? row("Cédula", escapeHtml(args.cedula)) : ""}
      </table>
      <p style="font-size:14px;line-height:1.6;">Este socio se registró automáticamente desde la app y cuenta con un día gratis para entrenar.</p>`,
    ),
  });
}
