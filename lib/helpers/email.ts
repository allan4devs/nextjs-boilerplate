import { absoluteAppUrl } from "@/lib/constants/app-url";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailResult = { ok: boolean; skipped?: boolean; error?: string };

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.SMTP_FROM?.trim());
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
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const to = (Array.isArray(args.to) ? args.to : [args.to]).map((t) => t.trim()).filter(Boolean);

  if (!apiKey || !from || !to.length) return { ok: false, skipped: true };

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: args.subject,
        html: args.html,
        ...(args.cc?.length ? { cc: args.cc } : {}),
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
      </div>
      <p style="color:#8a8a84;font-size:12px;margin-top:14px;">
        Xtreme Gym · Ciudad Quesada · Este correo se genero automaticamente, no responda a este mensaje.
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
}) {
  const href = absoluteAppUrl(`/registro/confirmar?token=${encodeURIComponent(args.token)}`);
  return sendEmail({
    to: args.to,
    subject: "Confirma tu cuenta — Xtreme Gym",
    html: layout(
      "Confirma tu correo",
      `<p style="font-size:14px;line-height:1.6;">Gracias por registrarte en Xtreme Gym. Confirma tu correo para continuar y completar tu perfil (nombre, cedula y telefono):</p>
      <a href="${escapeHtml(href)}" style="display:inline-block;margin:16px 0;background:#0b0b0b;color:#d8ff3e;padding:14px 22px;text-decoration:none;font-size:14px;font-weight:900;text-transform:uppercase;">Confirmar mi cuenta</a>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">Si el boton no funciona, copia este enlace:<br><span style="word-break:break-all;">${escapeHtml(href)}</span></p>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;">El enlace vence en ${args.expiresMinutes} minutos. Si no fuiste vos, ignora este correo.</p>`,
    ),
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
    subject: "Bienvenido a Xtreme Gym — su perfil quedo listo",
    html: layout(
      `Bienvenido, ${escapeHtml(args.memberName)}`,
      `<p style="font-size:14px;line-height:1.6;">Su perfil de socio quedo creado. Con este codigo puede hacer check-in en recepcion o en la pantalla de ingreso:</p>
      <div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:16px;font-size:26px;font-weight:900;letter-spacing:6px;margin:16px 0;">${escapeHtml(args.accessCode)}</div>
      <p style="font-size:14px;line-height:1.6;font-weight:bold;text-transform:uppercase;">Como entrar a su app de socio</p>
      <table style="border-collapse:collapse;margin:4px 0 8px;">
        ${step(1, `Abra la app con el boton de abajo (guardela en su pantalla de inicio para tenerla a mano).`)}
        ${step(2, args.cedula ? `Digite su cedula <strong>${escapeHtml(args.cedula)}</strong> para entrar a su perfil.` : `Digite su cedula para entrar a su perfil.`)}
        ${step(3, `Cree su PIN de 4 digitos la primera vez; con el protege su perfil.`)}
      </table>
      ${appButton("Entrar a mi app")}
      <p style="font-size:14px;line-height:1.6;margin-top:16px;">En la app puede reservar clases, marcar entrenos, cuidar su racha y seguir su progreso corporal. ¡Pura vida y nos vemos en el gym!</p>`,
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
    paypal: "PayPal",
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
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.customerName)}, gracias por su pago. Este es su comprobante:</p>
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
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}, su cupo quedo reservado:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Clase", escapeHtml(args.trainingName))}
        ${row("Fecha", escapeHtml(args.trainingDate))}
      </table>
      <p style="font-size:14px;line-height:1.6;">Llegue 5 minutos antes. Si no puede asistir, cancele desde la app para liberar el cupo.</p>`,
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
      ? "Se creo un PIN para su perfil."
      : args.kind === "changed"
        ? "Su PIN fue cambiado."
        : "Su PIN fue restablecido usando su contacto de recuperacion.";
  return sendEmail({
    to: args.to,
    subject: "Aviso de seguridad — PIN de su perfil Xtreme",
    html: layout(
      "Aviso de seguridad",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. ${detail}</p>
      <p style="font-size:14px;line-height:1.6;">Si usted no hizo este cambio, aviselo de inmediato en recepcion para bloquear el perfil.</p>`,
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
    ? `Su membresia vencio el ${args.nextBillingDate}`
    : `Su membresia vence en ${args.daysRemaining} dia${args.daysRemaining === 1 ? "" : "s"}`;
  return sendEmail({
    to: args.to,
    subject: expired ? "Xtreme Gym — membresia vencida" : "Xtreme Gym — su membresia vence pronto",
    html: layout(
      "Recordatorio de membresia",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}, ${escapeHtml(headline)}.</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        ${row("Plan", escapeHtml(args.plan))}
        ${row(expired ? "Vencio" : "Vence", escapeHtml(args.nextBillingDate))}
      </table>
      <p style="font-size:14px;line-height:1.6;">Puede renovar en recepcion o en linea desde la seccion de precios. No pierda su racha.</p>`,
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
    subject: "Recordatorio Xtreme Gym",
    html: layout(
      "Su recordatorio",
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

export async function sendWinBackEmail(args: {
  to: string;
  memberName: string;
  inactiveDays: number;
}) {
  return sendEmail({
    to: args.to,
    subject: "Volvé a Xtreme — lo importante es retomar",
    html: layout(
      "Tu próximo entreno cuenta",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. Han pasado ${args.inactiveDays} días desde tu último entreno. Eso no borra lo que ya avanzaste.</p>
      <p style="font-size:14px;line-height:1.6;">Volvé con una sesión sencilla. Tu regreso arranca gratis: registrate en la app y entrená.</p>
      ${appButton("Reservar mi regreso", "/primer-dia#reservar")}`,
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
    subject: "Codigo para recuperar su PIN — Xtreme Gym",
    html: layout(
      "Recuperar PIN",
      `<p style="font-size:14px;line-height:1.6;">Hola ${escapeHtml(args.memberName)}. Use este codigo para restablecer su PIN de 4 digitos:</p>
      <div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:16px;font-size:28px;font-weight:900;letter-spacing:8px;margin:16px 0;">${escapeHtml(args.code)}</div>
      <p style="font-size:14px;line-height:1.6;">Vence en ${args.expiresMinutes} minutos. Si usted no lo pidio, ignore este correo y avise en recepcion.</p>`,
    ),
  });
}

/** Notificacion al admin cuando se registra un nuevo socio con primer dia gratis. */
export async function sendAdminNewMemberNotification(args: {
  memberName: string;
  phone: string;
  email?: string;
  cedula?: string;
}) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || "aallanrd@gmail.com";

  return sendEmail({
    to: adminEmail,
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
