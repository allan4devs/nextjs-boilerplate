const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailResult = { ok: boolean; skipped?: boolean; error?: string };

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.SMTP_FROM?.trim());
}

function reservationCc() {
  const cc = process.env.RESERVATION_CC?.trim();
  return cc ? [cc] : undefined;
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
      return { ok: false, error: `Resend ${response.status}` };
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

export async function sendWelcomeEmail(args: {
  to: string;
  memberName: string;
  accessCode: string;
}) {
  return sendEmail({
    to: args.to,
    subject: "Bienvenido a Xtreme Gym — su perfil quedo listo",
    html: layout(
      `Bienvenido, ${escapeHtml(args.memberName)}`,
      `<p style="font-size:14px;line-height:1.6;">Su perfil de socio quedo creado. Con este codigo puede hacer check-in en recepcion o en la pantalla de ingreso:</p>
      <div style="background:#0b0b0b;color:#d8ff3e;text-align:center;padding:16px;font-size:26px;font-weight:900;letter-spacing:6px;margin:16px 0;">${escapeHtml(args.accessCode)}</div>
      <p style="font-size:14px;line-height:1.6;">En la app puede reservar clases, marcar entrenos, cuidar su racha y seguir su progreso corporal. Proteja su perfil con un PIN de 4 digitos.</p>`,
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
