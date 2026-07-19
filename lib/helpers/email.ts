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
    | "network";
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
        code: "provider_rejected",
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
  /** Muestra bloque de mapa / ubicación (recomendado en campañas admin). */
  showMap?: boolean;
  /** Texto preheader (bandeja de entrada, no visible en el cuerpo). */
  preheader?: string;
};

function brandLogoUrl() {
  return absoluteAppUrl("/xtreme/logo.webp");
}

function facadeImageUrl() {
  return absoluteAppUrl("/xtreme/fachada-xtreme-gym.webp");
}

/** Mapa estático (OSM) + enlace a Google Maps. Los iframes no funcionan en la mayoría de clientes de correo. */
function staticMapImageUrl(width = 560, height = 220) {
  const { lat, lng } = BUSINESS.geo;
  const w = Math.min(640, Math.max(320, width));
  const h = Math.min(320, Math.max(160, height));
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=${w}x${h}&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
}

function googleMapsDirectionsUrl() {
  const { lat, lng } = BUSINESS.geo;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function emailHeader() {
  const logo = brandLogoUrl();
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0b0b;">
  <tr>
    <td style="padding:20px 24px;vertical-align:middle;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;padding-right:14px;">
            <img src="${escapeHtml(logo)}" width="48" height="48" alt="Xtreme Gym" style="display:block;width:48px;height:48px;border:0;border-radius:4px;background:#111;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;font-size:11px;font-weight:bold;letter-spacing:0.18em;text-transform:uppercase;color:#8a8a84;">Xtreme Gym</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;color:#d8ff3e;line-height:1.1;">Ciudad Quesada</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="height:3px;line-height:3px;font-size:0;background:linear-gradient(90deg,#d8ff3e 0%,#f6c400 55%,#0b0b0b 100%);">&nbsp;</td>
  </tr>
</table>`;
}

function locationMapBlock() {
  const mapSrc = staticMapImageUrl(560, 220);
  const mapsHref = BUSINESS.maps || googleMapsDirectionsUrl();
  const facade = facadeImageUrl();
  const address = BUSINESS.addressDetail || BUSINESS.location;

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px;border:1px solid #e5e5e0;">
  <tr>
    <td style="padding:14px 16px 10px;background:#0b0b0b;">
      <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#d8ff3e;">Encontranos</p>
      <p style="margin:6px 0 0;font-size:14px;font-weight:bold;color:#ffffff;line-height:1.4;">${escapeHtml(address)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#b0b0a8;">${escapeHtml(BUSINESS.location)} · Costa Rica</p>
    </td>
  </tr>
  <tr>
    <td style="padding:0;line-height:0;font-size:0;background:#eee;">
      <a href="${escapeHtml(mapsHref)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;">
        <img src="${escapeHtml(mapSrc)}" width="560" alt="Mapa de Xtreme Gym en ${escapeHtml(BUSINESS.location)}" style="display:block;width:100%;max-width:560px;height:auto;border:0;" />
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0;line-height:0;font-size:0;">
      <a href="${escapeHtml(mapsHref)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;">
        <img src="${escapeHtml(facade)}" width="560" alt="Fachada de Xtreme Gym" style="display:block;width:100%;max-width:560px;height:auto;border:0;max-height:160px;object-fit:cover;" />
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 16px;background:#fafaf8;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;">
            <a href="${escapeHtml(mapsHref)}" style="display:inline-block;background:#0b0b0b;color:#d8ff3e;padding:11px 16px;text-decoration:none;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;">Abrir en Google Maps</a>
          </td>
          <td style="vertical-align:middle;text-align:right;">
            <a href="https://wa.me/${escapeHtml(BUSINESS.whatsapp)}" style="font-size:12px;font-weight:bold;color:#333;text-decoration:none;">WhatsApp ${escapeHtml(BUSINESS.phone)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function emailFooterLinks() {
  return `
<p style="margin:0 0 10px;font-size:13px;font-weight:bold;color:#111;">Xtreme Gym · ${escapeHtml(BUSINESS.location)}</p>
<p style="margin:0;font-size:12px;line-height:1.9;color:#555;">
  <a href="${escapeHtml(BUSINESS.maps)}" style="color:#111;font-weight:bold;text-decoration:none;">Cómo llegar</a>
  &nbsp;·&nbsp;
  <a href="https://wa.me/${escapeHtml(BUSINESS.whatsapp)}" style="color:#111;font-weight:bold;text-decoration:none;">WhatsApp ${escapeHtml(BUSINESS.phone)}</a>
  &nbsp;·&nbsp;
  <a href="${escapeHtml(BUSINESS.social.instagram)}" style="color:#111;font-weight:bold;text-decoration:none;">Instagram</a>
  &nbsp;·&nbsp;
  <a href="${escapeHtml(absoluteAppUrl("/contacto"))}" style="color:#111;font-weight:bold;text-decoration:none;">Contacto</a>
  &nbsp;·&nbsp;
  <a href="${escapeHtml(absoluteAppUrl("/ayuda"))}" style="color:#111;font-weight:bold;text-decoration:none;">Ayuda</a>
</p>`;
}

function layout(title: string, bodyHtml: string, opts: LayoutOptions = {}) {
  const showMap = opts.showMap === true;
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f2;">${escapeHtml(opts.preheader)}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ecece8;font-family:Arial,Helvetica,sans-serif;color:#111;-webkit-text-size-adjust:100%;">
    ${preheader}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ecece8;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e0e0da;">
            <tr>
              <td>
                ${emailHeader()}
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 8px;">
                <h1 style="margin:0 0 18px;font-size:22px;line-height:1.25;font-weight:900;text-transform:uppercase;letter-spacing:0.02em;color:#0b0b0b;">${title}</h1>
                ${bodyHtml}
                ${showMap ? locationMapBlock() : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px;">
                <div style="margin-top:8px;padding-top:18px;border-top:1px solid #e5e5e0;">
                  ${emailFooterLinks()}
                  ${PREFERENCES_BLOCK}
                </div>
              </td>
            </tr>
          </table>
          <p style="color:#8a8a84;font-size:12px;margin:16px 8px 0;line-height:1.5;text-align:center;">
            Xtreme Gym · Ciudad Quesada · Siempre serás bienvenido/a.<br />
            Este correo se generó automáticamente.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function p(html: string) {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#222;">${html}</p>`;
}

function muted(html: string) {
  return `<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#6b6b66;">${html}</p>`;
}

function ctaButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 0 4px;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</a>`;
}

function secondaryButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 8px 4px 0;background:#f6c400;color:#0b0b0b;padding:12px 18px;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;">${escapeHtml(label)}</a>`;
}

function codeBox(value: string, opts?: { large?: boolean }) {
  const size = opts?.large ? 34 : 28;
  const spacing = opts?.large ? 10 : 6;
  return `<div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:20px 16px;font-size:${size}px;font-weight:900;letter-spacing:${spacing}px;margin:12px 0 16px;font-family:Consolas,'Courier New',monospace;">${escapeHtml(value)}</div>`;
}

function infoCard(html: string) {
  return `<div style="border-left:4px solid #d8ff3e;background:#f7f9ec;padding:14px 16px;font-size:13px;line-height:1.65;margin:0 0 16px;color:#222;">${html}</div>`;
}

function steps(items: string[]) {
  const rows = items
    .map(
      (item, index) => `<tr>
      <td style="padding:6px 12px 6px 0;vertical-align:top;width:32px;">
        <span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#0b0b0b;color:#d8ff3e;font-weight:900;font-size:13px;">${index + 1}</span>
      </td>
      <td style="padding:6px 0;font-size:14px;line-height:1.6;color:#222;">${item}</td>
    </tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;margin:4px 0 16px;width:100%;">${rows}</table>`;
}

function linkFallback(href: string) {
  return muted(
    `Si el botón no abre, copiá este enlace:<br><span style="word-break:break-all;color:#333;">${escapeHtml(href)}</span>`,
  );
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#6b6b66;font-size:14px;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:bold;color:#111;">${value}</td>
  </tr>`;
}

function detailsTable(rowsHtml: string) {
  return `<table style="border-collapse:collapse;margin:4px 0 16px;">${rowsHtml}</table>`;
}

function helpFooter() {
  return muted(
    `¿Dudas? WhatsApp <a href="https://wa.me/${escapeHtml(BUSINESS.whatsapp)}" style="color:#555;font-weight:bold;">${escapeHtml(BUSINESS.phone)}</a> o recepción en ${escapeHtml(BUSINESS.location)}.`,
  );
}

/** Correo con link magico para confirmar la cuenta antes de completar el perfil. */
export async function sendRegistrationConfirmEmail(args: {
  to: string;
  token: string;
  expiresMinutes: number;
  baseUrl?: string;
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

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: "Confirmá tu correo y activá tu acceso — Xtreme Gym",
    text: [
      "¡Pura vida! Gracias por registrarte en Xtreme Gym.",
      "",
      "Para activar tu acceso (todo en un solo paso):",
      "1) Abrí el enlace y confirmá este correo",
      "2) Completá nombre, teléfono y cédula",
      "3) Creá tu PIN de 4 dígitos en la misma pantalla",
      "",
      `Enlace (vence en ${expiresLabel}):`,
      href,
      "",
      "Después entrás a la app con cédula + PIN.",
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      "Confirmá tu correo",
      [
        p("¡Pura vida! Gracias por registrarte en <strong>Xtreme Gym</strong>."),
        p("Con este enlace activás tu acceso completo: correo, perfil y PIN, en un solo paso."),
        infoCard(
          "<strong>Qué vas a hacer</strong><br>Confirmar este correo, completar tus datos y crear tu PIN de 4 dígitos. Después entrás a la app con cédula + PIN.",
        ),
        steps([
          "Tocá el botón y abrí el formulario seguro.",
          "Completá <strong>nombre</strong>, <strong>teléfono</strong> y <strong>cédula</strong>.",
          "Creá tu <strong>PIN de 4 dígitos</strong> en la misma pantalla.",
        ]),
        ctaButton("Completar registro y crear PIN", href),
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
          "Con el enlace confirmás este correo, dejás listos tus datos y creás tu PIN — todo junto. Después entrás con cédula + PIN.",
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
    subject: `Pago recibido · completá tu perfil — Xtreme Gym`,
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
}) {
  const appUrl = absoluteAppUrl("/app");
  const cedulaLine = args.cedula
    ? `Ingresá tu cédula <strong>${escapeHtml(args.cedula)}</strong>.`
    : "Ingresá la cédula con la que te registraste.";

  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: `¡Listo, ${args.memberName}! Tu perfil en Xtreme Gym`,
    text: [
      `¡Pura vida, ${args.memberName}!`,
      "",
      "Tu perfil de socio quedó activo y tu PIN ya está creado.",
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
          "En la app podés <strong>reservar clases</strong>, <strong>marcar entrenos</strong>, cuidar tu <strong>racha</strong> y seguir tu <strong>progreso</strong>.",
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
    subject: `Recibo Xtreme Gym — ${args.optionLabel}`,
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
    subject: `Reserva confirmada — ${args.trainingName} (${args.trainingDate})`,
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
          subject: "PIN creado — ya podés entrar a tu app · Xtreme Gym",
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
    subject: expired ? "Xtreme Gym — membresía vencida" : "Xtreme Gym — tu membresía vence pronto",
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

/** Aviso transaccional: un administrador activó acceso para el socio. */
export async function sendAdminGrantedPlanEmail(args: {
  to: string;
  memberName: string;
  plan: string;
  endsOn: string;
}) {
  const appUrl = absoluteAppUrl("/app");
  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: `Tu plan ${args.plan} ya está activo — Xtreme Gym`,
    text: [
      `Hola ${args.memberName}.`,
      "",
      `El equipo de Xtreme Gym activó tu plan ${args.plan}.`,
      `Acceso hasta: ${args.endsOn}`,
      "",
      "Entrá a la app con tu cédula y PIN para reservar, marcar entrenos y usar tu carné digital.",
      `App: ${appUrl}`,
      `WhatsApp: ${BUSINESS.phone}`,
    ].join("\n"),
    html: layout(
      "Tu plan ya está activo",
      [
        p(
          `Hola <strong>${escapeHtml(args.memberName)}</strong>. El equipo de Xtreme Gym activó tu acceso.`,
        ),
        detailsTable(
          row("Plan", escapeHtml(args.plan)) + row("Acceso hasta", escapeHtml(args.endsOn)),
        ),
        p("Ya podés entrar a la app, usar tu carné digital, reservar clases y seguir tu progreso."),
        steps([
          "Abrí la app con el botón de abajo.",
          "Ingresá con tu <strong>cédula</strong> y tu <strong>PIN</strong>.",
          "Si todavía no tenés PIN, pedí el código a este correo desde la app.",
        ]),
        ctaButton("Abrir mi app", appUrl),
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
  const paragraphs = args.message
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#222;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  // Soporta rutas internas y rutas con query (?token=) del magic link de activación.
  const rawPath = String(args.ctaPath || "/app").trim();
  const safePath =
    rawPath.startsWith("/") && !rawPath.startsWith("//") ? rawPath : "/app";
  const primaryHref = absoluteAppUrl(safePath);
  const button = args.ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">
        <tr>
          <td style="background:#0b0b0b;">
            <a href="${escapeHtml(primaryHref)}" style="display:inline-block;padding:14px 22px;color:#d8ff3e;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(args.ctaLabel)}</a>
          </td>
        </tr>
      </table>`
    : "";

  const returnActions = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;border:1px solid #e5e5e0;background:#fafaf8;">
  <tr>
    <td style="padding:16px 18px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b66;">Accesos rápidos</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:0 0 10px;">
            <a href="${escapeHtml(absoluteAppUrl("/app"))}" style="font-size:14px;font-weight:bold;color:#0b0b0b;text-decoration:none;">→ Entrar a mi cuenta</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 10px;">
            <a href="${escapeHtml(absoluteAppUrl("/precios#inscripcion"))}" style="font-size:14px;font-weight:bold;color:#0b0b0b;text-decoration:none;">→ Ver planes e inscribirme</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 10px;">
            <a href="${escapeHtml(absoluteAppUrl("/primer-dia#registro"))}" style="font-size:14px;font-weight:bold;color:#0b0b0b;text-decoration:none;">→ Primer día / registro</a>
          </td>
        </tr>
        <tr>
          <td>
            <a href="${escapeHtml(BUSINESS.maps)}" style="font-size:14px;font-weight:bold;color:#0b0b0b;text-decoration:none;">→ Cómo llegar al gym</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const preheader =
    args.message.replace(/\s+/g, " ").trim().slice(0, 110) ||
    "Mensaje de Xtreme Gym · Ciudad Quesada";

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
      `Ubicación: ${BUSINESS.addressDetail || BUSINESS.location}`,
      `Mapa: ${BUSINESS.maps}`,
      `WhatsApp: ${BUSINESS.phone}`,
      `App: ${absoluteAppUrl("/app")}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: layout(escapeHtml(args.title), `${paragraphs}${button}${returnActions}`, {
      showMap: true,
      preheader,
    }),
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
    subject: "Volvé a Xtreme — lo importante es retomar",
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
    subject: `Tu mes en Xtreme — ${args.workouts} entrenos 💪`,
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
    subject: `Nueva baja de correo y motivo — Xtreme Gym`,
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
