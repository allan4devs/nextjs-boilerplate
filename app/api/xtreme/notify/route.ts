import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { emailEnabled, sendCustomReminderEmail } from "@/lib/helpers/email";
import {
  MEMBERS_COLLECTION,
  type MemberDoc,
  normalizeKey,
  normalizeName,
  resolveAdminRole,
} from "@/lib/xtreme/shared";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";

export const dynamic = "force-dynamic";

/** Envia al socio su recordatorio elegido por correo (session propia o admin). */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const message = String(body.message ?? "").trim().slice(0, 200);
    const adminRole = resolveAdminRole(req.headers.get("x-xtreme-admin") ?? "");

    if (!message) {
      return NextResponse.json({ error: "Faltan datos del recordatorio." }, { status: 400 });
    }

    if (!emailEnabled()) {
      return NextResponse.json(
        { error: "El envio de correos no esta configurado todavia." },
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
      .findOne({ normalizedName: memberKey }, { projection: { email: 1, memberName: 1 } });

    if (!member) {
      return NextResponse.json({ error: "Socio no encontrado." }, { status: 404 });
    }
    if (!member.email) {
      return NextResponse.json(
        { error: "Agregue su correo en el perfil para recibir avisos." },
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
        { error: result.error || "No se pudo enviar el correo." },
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
