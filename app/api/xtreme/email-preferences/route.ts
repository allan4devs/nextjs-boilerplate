import { NextRequest, NextResponse } from "next/server";
import { absoluteAppUrl } from "@/lib/constants/app-url";
import { getDb } from "@/lib/helpers/mongodb";
import { sendAdminEmailOptOutNotification } from "@/lib/helpers/email";
import {
  emailFromPreferencesToken,
  emailPreferencesToken,
} from "@/lib/xtreme/email-preferences-token";
import { recordEvent } from "@/lib/xtreme/events";
import { isSession, requireMemberSession } from "@/lib/xtreme/session";
import {
  MEMBERS_COLLECTION,
  type MemberDoc,
  type NotificationPrefs,
} from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

const SUPPRESSIONS_COLLECTION = "xtreme_gym_email_suppressions";
const ALLOWED_REASONS = new Set([
  "too_many",
  "not_relevant",
  "prefer_app",
  "no_longer_member",
  "price",
  "schedule",
  "moved_away",
  "health",
  "bad_experience",
  "temporary_break",
  "other",
  "one_click",
]);

const REASON_LABELS: Record<string, string> = {
  too_many: "Recibe demasiados correos",
  not_relevant: "El contenido no le resulta relevante",
  prefer_app: "Prefiere revisar todo desde la app",
  no_longer_member: "Ya no entrena en Xtreme Gym",
  price: "El precio no se ajusta a su situación",
  schedule: "Los horarios no le funcionan",
  moved_away: "Se mudó o vive lejos",
  health: "Salud, lesión o condición personal",
  bad_experience: "Tuvo una mala experiencia",
  temporary_break: "Necesita una pausa temporal",
  other: "Otro motivo",
  one_click: "Baja directa desde el correo",
};

const DISABLED_PREFS: NotificationPrefs = {
  streakRisk: false,
  milestones: false,
  renewalReminders: false,
  winBack: false,
  weeklyRecap: false,
};

/** GET - enlace de preferencias para socio autenticado (Member OS). */
export async function GET(req: NextRequest) {
  try {
    const sessionOrErr = await requireMemberSession(req);
    if (!isSession(sessionOrErr)) return sessionOrErr;

    const db = await getDb();
    const member = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .findOne(
        { normalizedName: sessionOrErr.memberKey },
        { projection: { email: 1, memberName: 1 } },
      );

    const email = String(member?.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Agregá tu correo en el perfil para administrar avisos." },
        { status: 400 },
      );
    }

    const token = emailPreferencesToken(email);
    if (!token) {
      return NextResponse.json(
        { error: "Preferencias de correo no disponibles en este momento." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      preferencesUrl: absoluteAppUrl(
        "/correo/preferencias?token=" + encodeURIComponent(token),
      ),
      maskedEmail: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    });
  } catch (error) {
    console.error("XTREME EMAIL PREFERENCES GET", error);
    return NextResponse.json(
      { error: "No se pudo cargar las preferencias." },
      { status: 500 },
    );
  }
}

async function requestData(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const text = await req.text().catch(() => "");
  const params = new URLSearchParams(text);
  return Object.fromEntries(params.entries()) as Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const body = await requestData(req);
    const token = String(req.nextUrl.searchParams.get("token") || body.token || "").trim();
    const email = emailFromPreferencesToken(token);
    if (!email) {
      return NextResponse.json({ error: "El enlace no es valido." }, { status: 400 });
    }

    const requestedReason = String(body.reason || "").trim();
    const reason = ALLOWED_REASONS.has(requestedReason) ? requestedReason : "one_click";
    const feedback = String(body.feedback || "").trim().slice(0, 500);
    const now = new Date();
    const db = await getDb();
    const previousSuppression = await db
      .collection(SUPPRESSIONS_COLLECTION)
      .findOne({ email }, { projection: { reason: 1, feedback: 1 } });

    await Promise.all([
      db.collection(SUPPRESSIONS_COLLECTION).updateOne(
        { email },
        {
          $set: {
            email,
            reason,
            feedback,
            unsubscribedAt: now,
            source: reason === "one_click" ? "email_one_click" : "preferences_page",
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      ),
      db.collection<MemberDoc>(MEMBERS_COLLECTION).updateMany(
        { email },
        {
          $set: {
            notificationPrefs: DISABLED_PREFS,
            emailUnsubscribe: { reason, feedback, at: now },
            updatedAt: now,
          },
        },
      ),
    ]);

    const member = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .findOne({ email }, { projection: { normalizedName: 1 } });
    await recordEvent(db, {
      type: "email_unsubscribed",
      memberId: member?.normalizedName,
      source: "site",
      entity: { type: "email_preference", id: member?.normalizedName || "anonymous" },
      properties: { reason },
    });

    const shouldNotifyAdmin =
      reason !== "one_click" &&
      (!previousSuppression ||
        previousSuppression.reason !== reason ||
        String(previousSuppression.feedback || "") !== feedback);
    if (shouldNotifyAdmin) {
      await sendAdminEmailOptOutNotification({
        email,
        reason,
        reasonLabel: REASON_LABELS[reason] || reason,
        feedback: feedback || undefined,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Ya no recibirás avisos opcionales por correo.",
    });
  } catch (error) {
    console.error("XTREME EMAIL PREFERENCES", error);
    return NextResponse.json(
      { error: "No pudimos guardar la preferencia. Intentá de nuevo." },
      { status: 500 },
    );
  }
}
