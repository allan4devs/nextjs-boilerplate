import { absoluteAppUrl, absoluteRequestUrl } from "@/lib/constants/app-url";
import { BUSINESS } from "@/lib/constants/business";
import { getDb } from "@/lib/helpers/mongodb";
import { emailPreferencesToken } from "@/lib/xtreme/email-preferences-token";
import { EMAIL_SUPPRESSIONS_COLLECTION } from "@/lib/xtreme/shared/config";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const PREFERENCES_BLOCK = "__XTREME_EMAIL_PREFERENCES__";

export type SendEmailResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * Interruptor de seguridad de salida. Tener credenciales configuradas no basta:
 * los correos solo salen cuando se habilitan de forma deliberada.
 */
export function emailEnabled() {
  return Boolean(
    process.env.EMAIL_SENDING_ENABLED?.trim().toLowerCase() === "true" &&
      process.env.RESEND_API_KEY?.trim() &&
      process.env.SMTP_FROM?.trim(),
  );
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
  cc?: string[];
  optional?: boolean;
  managePreferences?: boolean;
  idempotencyKey?: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const to = (Array.isArray(args.to) ? args.to : [args.to]).map((t) => t.trim()).filter(Boolean);

  if (!emailEnabled() || !apiKey || !from || !to.length) {
    return { ok: false, skipped: true };
  }

  try {
    if (args.optional) {
      const db = await getDb();
      const suppressed = await db
        .collection(EMAIL_SUPPRESSIONS_COLLECTION)
        .countDocuments({ email: { $in: to } }, { limit: 1 });
      if (suppressed) return { ok: false, skipped: true };
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
      ? '<p style="margin:14px 0 0;color:#8a8a84;font-size:12px;line-height:1.6;">Si prefieres no recibir recordatorios o novedades, <a href="' +
        escapeHtml(preferencesUrl) +
        '" style="color:#555;text-decoration:underline;">administra tus correos o desuscribete aqui</a>. Los recibos y avisos de seguridad seguiran disponibles.</p>'
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
      return { ok: false, error: resendError(response.status, detail) };
    }

    return { ok: true };
  } catch (err) {
    console.error("EMAIL SEND ERROR", err);
    return { ok: false, error: err instanceof Error ? err.message : "network" };
  }
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
      <div style="background:#0b0b0b;color:#d8ff3e;padding:18px 24px;font-size:20px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">
        Xtreme Gym
      </div>
      <div style="background:#ffffff;border:1px solid #e5e5e0;border-top:none;padding:24px;">
        <h1 style="margin:0 0 16px;font-size:20px;text-transform:uppercase;">${title}</h1>
        ${bodyHtml}
        <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e5e5e0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:bold;">Encuentranos en ${escapeHtml(BUSINESS.location)}</p>
          <p style="margin:0;font-size:12px;line-height:1.8;">
            <a href="${escapeHtml(BUSINESS.maps)}" style="color:#111;font-weight:bold;">Como llegar en Maps</a>
            &nbsp;·&nbsp;
            <a href="https://wa.me/${escapeHtml(BUSINESS.whatsapp)}" style="color:#111;font-weight:bold;">WhatsApp ${escapeHtml(BUSINESS.phone)}</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(BUSINESS.social.instagram)}" style="color:#111;font-weight:bold;">Instagram</a>
            &nbsp;·&nbsp;
            <a href="${escapeHtml(absoluteAppUrl("/contacto"))}" style="color:#111;font-weight:bold;">Contacto y horarios</a>
          </p>
          ${PREFERENCES_BLOCK}
        </div>
      </div>
      <p style="color:#8a8a84;font-size:12px;margin-top:14px;">
        Xtreme Gym · Ciudad Quesada · Siempre seras bienvenido. Este correo se genero automaticamente.
      </p>
    </div>
  </body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#6b6b66;font-size:14px;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:bold;">${value}</td>
  </tr>`;
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
  return sendEmail({
    to: args.to,
    subject: "Completá tu acceso a la app — Xtreme Gym",
    html: layout(
      "Confirmá tu correo y entrá a la app",
      `<p style="font-size:14px;line-height:1.6;">Gracias por registrarte en Xtreme Gym. Confirmá tu correo para continuar y completar tu perfil (nombre, cédula y teléfono):</p>
      <p style="margin:12px 0 0;font-size:12px;font-weight:bold;color:#555;">Destino seguro: www.xtremecr.com</p>
      <a href="${escapeHtml(href)}" style="display:inline-block;margin:16px 0;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;">Completar mi perfil y entrar a la app</a>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">Si el botón no funciona, copiá este enlace:<br><span style="word-break:break-all;">${escapeHtml(href)}</span></p>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">El enlace vence en ${args.expiresMinutes} minutos. Si no fuiste vos, ignorá este correo.</p>`,
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
  const who = args.source === "admin" ? "Xtreme Gym" : "Recepción de Xtreme Gym";
  const hello = args.memberName
    ? `Hola ${escapeHtml(args.memberName)}. `
    : "";
  const bound = Boolean(args.memberName);
  return sendEmail({
    to: args.to,
    subject: bound
      ? "Confirmá tu correo en la app de Xtreme Gym"
      : "Te invitaron a la app de Xtreme Gym",
    html: layout(
      bound ? "Confirmá tu acceso a Xtreme Gym" : "Tu invitación a Xtreme Gym",
      `<p style="font-size:14px;line-height:1.6;">${hello}${escapeHtml(who)} te invitó a ${
        bound ? "confirmar tu correo y activar tu acceso" : "crear tu acceso personal"
      } a la app.</p>
      <p style="font-size:14px;line-height:1.6;">Desde ahí podés completar tu perfil, conocer los planes y, cuando tengás una membresía activa, administrar tus entrenos y reservas.</p>
      <div style="border-left:4px solid #d8ff3e;background:#f7f9ec;padding:12px 16px;font-size:13px;line-height:1.6;margin:16px 0;"><strong>Importante:</strong> esta invitación ${
        bound ? "verifica tu correo y une la cuenta a tu ficha" : "crea tu cuenta"
      }, pero no activa un plan ni incluye el primer día gratis.</div>
      <p style="margin:12px 0 0;font-size:12px;font-weight:bold;color:#555;">Destino seguro: www.xtremecr.com</p>
      <a href="${escapeHtml(href)}" style="display:inline-block;margin:16px 0;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;">${
        bound ? "Confirmar correo y entrar a la app" : "Aceptar invitación y crear mi cuenta"
      }</a>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">Este enlace es personal, se usa una sola vez y vence en ${args.expiresHours} horas. Si no solicitaste esta invitación, podés ignorar el correo.</p>`,
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
  const body =
    '<p style="font-size:14px;line-height:1.6;">Hola ' +
    escapeHtml(args.memberName) +
    ". Recibimos tu pago de <strong>" +
    escapeHtml(args.optionLabel) +
    "</strong> y conservamos el correo confirmado durante el pago para proteger tu acceso.</p>" +
    '<p style="font-size:14px;line-height:1.6;">Ahora completá tu perfil de socio. La cédula se solicita solamente dentro del enlace seguro; nunca la pedimos en el correo ni antes de pagar.</p>' +
    '<p style="margin:12px 0 0;font-size:12px;font-weight:bold;color:#555;">Destino seguro: www.xtremecr.com</p>' +
    '<a href="' +
    escapeHtml(href) +
    '" style="display:inline-block;margin:16px 0;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;">Completar mi perfil y entrar a la app</a>' +
    '<p style="font-size:13px;line-height:1.6;color:#6b6b66;">Este enlace es personal, se usa una sola vez y vence en ' +
    args.expiresHours +
    " horas. No lo compartás. Si no reconocés el pago, escribinos de inmediato.</p>";
  return sendEmail({
    to: args.to,
    subject: "Completá tu acceso a la app — Xtreme Gym",
    html: layout("Tu pago ya está ligado a este correo", body),
  });
}

export async function sendWelcomeEmail(args: {
  to: string;
  memberName: string;
  accessCode: string;
  cedula?: string;
}) {
  const step = (n: number, html: string) =>
    `<tr>
      <td style="padding:6px 12px 6px 0;vertical-align:top;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#0b0b0b;color:#d8ff3e;font-weight:900;font-size:13px;">${n}</span></td>
      <td style="padding:6px 0;font-size:14px;line-height:1.6;">${html}</td>
    </tr>`;
  return sendEmail({
    to: args.to,
    subject: "Bienvenido a Xtreme Gym — tu perfil quedó listo",
    html: layout(
      `Bienvenido, ${escapeHtml(args.memberName)}`,
      `<p style="font-size:14px;line-height:1.6;">Tu perfil de socio quedó creado. Con este código podés hacer check-in en recepción o en la pantalla de ingreso:</p>
      <div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:16px;font-size:26px;font-weight:900;letter-spacing:6px;margin:16px 0;">${escapeHtml(args.accessCode)}</div>
      <p style="font-size:14px;line-height:1.6;font-weight:bold;text-transform:uppercase;">Cómo entrar a tu app de socio</p>
      <table style="border-collapse:collapse;margin:4px 0 8px;">
        ${step(1, `Abrí la app con el botón de abajo (guardala en tu pantalla de inicio para tenerla a mano).`)}
        ${step(2, args.cedula ? `Digitá tu cédula <strong>${escapeHtml(args.cedula)}</strong> para entrar a tu perfil.` : `Digitá tu cédula para entrar a tu perfil.`)}
        ${step(3, `Creá tu PIN de 4 dígitos la primera vez; con él protegés tu perfil.`)}
      </table>
      ${appButton("Entrar a mi app")}
      <p style="font-size:14px;line-height:1.6;margin-top:16px;">En la app podés reservar clases, marcar entrenos, cuidar tu racha y seguir tu progreso corporal. ¡Pura vida y nos vemos en el gym!</p>`,
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
    sinpe: "SINPE Movil",
    other: "Otro",
  };
  return sendEmail({
    to: args.to,
    cc: reservationCc(),
    subject: `Recibo Xtreme Gym — ${args.optionLabel}`,
    html: layout(
      "Recibo de pago",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.customerName)}, gracias por tu pago. Este es tu comprobante:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Concepto", escapeHtml(args.optionLabel))}
        ${row("Monto", `CRC ${args.amountCrc.toLocaleString("es-CR")}${args.amountUsd ? ` (USD ${args.amountUsd.toFixed(2)})` : ""}`)}
        ${row("Metodo", escapeHtml(methodLabel[args.method] ?? args.method))}
        ${row("Fecha", escapeHtml(args.date))}
        ${args.reference ? row("Referencia", escapeHtml(args.reference)) : ""}
        ${args.nextBillingDate ? row("Membresia activa hasta", escapeHtml(args.nextBillingDate)) : ""}
      </table>
      <p style="font-size:14px;line-height:1.6;">Cualquier consulta, con gusto en recepcion.</p>`,
    ),
  });
}

export async function sendReservationEmail(args: {
  to: string;
  memberName: string;
  trainingName: string;
  trainingDate: string;
}) {
  return sendEmail({
    to: args.to,
    cc: reservationCc(),
    subject: `Reserva confirmada — ${args.trainingName} (${args.trainingDate})`,
    html: layout(
      "Reserva confirmada",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}, tu cupo quedó reservado:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Clase", escapeHtml(args.trainingName))}
        ${row("Fecha", escapeHtml(args.trainingDate))}
      </table>
      <p style="font-size:14px;line-height:1.6;">Llegá 5 minutos antes. Si no podés asistir, cancelá desde la app para liberar el cupo.</p>`,
    ),
  });
}

export async function sendPinChangedEmail(args: {
  to: string;
  memberName: string;
  kind: "set" | "changed" | "recovered";
}) {
  const detail =
    args.kind === "set"
      ? "Se creó un PIN para tu perfil."
      : args.kind === "changed"
        ? "Tu PIN fue cambiado."
        : "Tu PIN fue restablecido usando tu contacto de recuperación.";
  return sendEmail({
    to: args.to,
    subject: "Aviso de seguridad — PIN de tu perfil Xtreme",
    html: layout(
      "Aviso de seguridad",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. ${detail}</p>
      <p style="font-size:14px;line-height:1.6;">Si no hiciste este cambio, avisá de inmediato en recepción para bloquear el perfil.</p>`,
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
  const href = absoluteAppUrl(path);
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:12px;background:#0b0b0b;color:#d8ff3e;padding:12px 18px;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;">${escapeHtml(label)}</a>`;
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
  return sendEmail({
    to: args.to,
    managePreferences: false,
    subject: `Tu plan ${args.plan} ya está activo — Xtreme Gym`,
    html: layout(
      "Tu acceso está activo",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. El equipo de Xtreme Gym activó para vos el plan <strong>${escapeHtml(args.plan)}</strong>.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Plan", escapeHtml(args.plan))}
        ${row("Acceso hasta", escapeHtml(args.endsOn))}
      </table>
      <p style="font-size:14px;line-height:1.6;">Ya podés entrar a la app, usar tu carné digital, reservar y seguir tu progreso.</p>
      ${appButton("Abrir mi app")}`,
    ),
  });
}

/** Plantilla segura para campañas creadas desde Admin OS. */
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
    .map((paragraph) => `<p style="font-size:14px;line-height:1.7;">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const safePath = args.ctaPath?.startsWith("/") ? args.ctaPath : "/app";
  const button = args.ctaLabel
    ? `<a href="${escapeHtml(absoluteAppUrl(safePath))}" style="display:inline-block;margin:16px 0;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;">${escapeHtml(args.ctaLabel)}</a>`
    : "";
  return sendEmail({
    to: args.to,
    optional: true,
    idempotencyKey: args.idempotencyKey,
    subject: args.subject,
    html: layout(escapeHtml(args.title), `${paragraphs}${button}`),
  });
}

/** Recordatorio 48 h: empezó el primer día gratis pero no completó el perfil. */
export async function sendFreeDayPendingReminderEmail(args: {
  to: string;
  confirmUrl: string;
  expiresHours: number;
}) {
  const restartUrl = absoluteAppUrl("/primer-dia#registro");
  return sendEmail({
    to: args.to,
    optional: true,
    subject: "Todavía podés activar tu primer día gratis — Xtreme Gym",
    html: layout(
      "Tu acceso sigue esperándote",
      `<p style="font-size:14px;line-height:1.6;">Hace un par de días pediste tu <strong>primer día gratis</strong> en Xtreme Gym, pero todavía no completás el perfil para entrar a la app.</p>
      <p style="font-size:14px;line-height:1.6;">Te enviamos un enlace nuevo para confirmar tu correo, agregar tu cédula y crear tu PIN. Después podés reservar, marcar entrenos y usar tu carné digital.</p>
      <div style="border-left:4px solid #d8ff3e;background:#f7f9ec;padding:12px 16px;font-size:13px;line-height:1.6;margin:16px 0;"><strong>Sin tarjeta:</strong> este paso solo activa tu día de prueba. Pagás cuando quieras continuar.</div>
      <a href="${escapeHtml(args.confirmUrl)}" style="display:inline-block;margin:16px 0;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;">Completar mi perfil y entrar a la app</a>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">El enlace vence en ${args.expiresHours} horas. Si preferís empezar de nuevo, <a href="${escapeHtml(restartUrl)}" style="color:#555;text-decoration:underline;">registrate otra vez acá</a>.</p>`,
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
    subject: "¿Seguimos entrenando? Tu app de socio te espera — Xtreme Gym",
    html: layout(
      "Tu próximo paso en Xtreme",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. Hace un par de días activaste tu acceso con el <strong>primer día gratis</strong> y ya podés usar la app de socios.</p>
      <p style="font-size:14px;line-height:1.6;">Si te gustó el ambiente, elegí semana, quincena o mes y seguí con rachas, reservas y seguimiento de progreso. El mensual es el que más conviene por día.</p>
      <a href="${escapeHtml(args.appUrl)}" style="display:inline-block;margin:16px 8px 0 0;background:#0b0b0b;color:#d8ff3e;padding:12px 18px;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;">Entrar a mi app</a>
      <a href="${escapeHtml(args.pricesUrl)}" style="display:inline-block;margin:16px 0 0;background:#f6c400;color:#0b0b0b;padding:12px 18px;text-decoration:none;font-size:13px;font-weight:900;text-transform:uppercase;">Ver planes e inscribirme</a>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;margin-top:16px;">¿Tenés dudas? Escribinos por WhatsApp o vení a recepción en Ciudad Quesada. Pura vida.</p>`,
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

/** Codigo de un solo uso para recuperar el PIN (Fase 3). */
export async function sendPinRecoveryOtpEmail(args: {
  to: string;
  memberName: string;
  code: string;
  expiresMinutes: number;
}) {
  return sendEmail({
    to: args.to,
    subject: "Código para recuperar tu PIN — Xtreme Gym",
    html: layout(
      "Recuperar PIN",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. Usá este código para restablecer tu PIN de 4 dígitos:</p>
      <div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:16px;font-size:28px;font-weight:900;letter-spacing:8px;margin:16px 0;">${escapeHtml(args.code)}</div>
      <p style="font-size:14px;line-height:1.6;">Vence en ${args.expiresMinutes} minutos. Si no lo pediste, ignorá este correo y avisá en recepción.</p>`,
    ),
  });
}

/** Notificacion al admin cuando se registra un nuevo socio con primer dia gratis. */
export function adminNotificationAddress() {
  return process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "aallanrd@gmail.com";
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
