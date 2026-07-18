import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  emailConfigurationError,
  emailEnabled,
  sendCustomReminderEmail,
} from "@/lib/helpers/email";
import {
  MEMBERS_COLLECTION,
  type MemberDoc,
  memberEmailIsTrusted,
  normalizeKey,
  normalizeName,
} from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import { resolveStaffSession } from "@/lib/xtreme/staff-session";

export const dynamic = "force-dynamic";

/** Envia al socio su recordatorio elegido por correo (session propia o admin). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const message = String(body.message ?? "").trim().slice(0, 200);
    const staff = await resolveStaffSession(req, "admin");
    const adminRole = staff?.role === "admin" || staff?.role === "super" ? staff.role : null;

    if (!message) {
      return NextResponse.json({ error: "Faltan datos del recordatorio." }, { status: 400 });
    }

    if (!emailEnabled()) {
      return NextResponse.json(
        {
          error: emailConfigurationError() || "El envío de correos no está disponible.",
          emailErrorCode: "configuration",
        },
        { status: 503 },
      );
    }

    let memberKey = "";
    let displayName = "";

    if (adminRole) {
      const memberName = normalizeName(body.memberName);
      if (!memberName) {
        return NextResponse.json({ error: "Nombre del socio requerido." }, { status: 400 });
      }
      memberKey = normalizeKey(memberName);
      displayName = memberName;
    } else {
      const sessionOrErr = await requireMemberSession(req);
      if (!isSession(sessionOrErr)) return sessionOrErr;
      memberKey = sessionOrErr.memberKey;
      displayName = sessionOrErr.memberName;
    }

    const db = await getDb();
    const member = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .findOne(
        { normalizedName: memberKey },
        { projection: { email: 1, emailVerified: 1, memberName: 1 } },
      );

    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    }
    if (!memberEmailIsTrusted(member) || !member.email) {
      return NextResponse.json(
        {
          error:
            "Necesitás un correo verificado en el perfil para recibir avisos. Confirmalo en Perfil o en recepción.",
        },
        { status: 400 },
      );
    }

    const result = await sendCustomReminderEmail({
      to: member.email,
      memberName: member.memberName || displayName,
      message,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || "No se pudo enviar el correo.",
          emailErrorCode: result.code || "unknown",
        },
        { status: 502 },
      );
    }

    const masked = member.email.replace(/(.{2}).+(@.+)/, "$1***$2");
    return NextResponse.json({ ok: true, sentTo: masked });
  } catch (err) {
    console.error("XTREME NOTIFY POST", err);
    return NextResponse.json({ error: "No se pudo enviar el aviso." }, { status: 500 });
  }
}
