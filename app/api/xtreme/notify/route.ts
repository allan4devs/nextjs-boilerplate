import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { emailEnabled, sendCustomReminderEmail } from "@/lib/helpers/email";
import { MEMBERS_COLLECTION, type MemberDoc, normalizeKey, normalizeName } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

/** Envia al socio su recordatorio elegido por correo. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const memberName = normalizeName(body.memberName);
    const message = String(body.message ?? "").trim().slice(0, 200);

    if (!memberName || !message) {
      return NextResponse.json({ error: "Faltan datos del recordatorio." }, { status: 400 });
    }

    if (!emailEnabled()) {
      return NextResponse.json(
        { error: "El envio de correos no esta configurado todavia." },
        { status: 503 },
      );
    }

    const db = await getDb();
    const member = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .findOne({ normalizedName: normalizeKey(memberName) }, { projection: { email: 1, memberName: 1 } });

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
      memberName: member.memberName || memberName,
      message,
    });

    if (!result.ok) {
      return NextResponse.json({ error: "No se pudo enviar el correo." }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sentTo: member.email });
  } catch (err) {
    console.error("XTREME NOTIFY POST", err);
    return NextResponse.json({ error: "No se pudo enviar el aviso." }, { status: 500 });
  }
}
