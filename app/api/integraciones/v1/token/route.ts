import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { createMemberSession, attachSessionCookie } from "@/lib/xtreme/session";
import { cedulaDigits, matchCedula, MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";
import { normalizeMemberKey, normalizeMemberName, normalizeMemberEmail } from "@/lib/xtreme/members/normalizers";
import { createFreeFirstDayMembership } from "@/lib/xtreme/members/membership";

export const dynamic = "force-dynamic";

const TOKEN_COLLECTION = "xtreme_gym_partner_sso_tokens";
const TOKEN_TTL_MS = 60_000;

type PartnerTokenDoc = {
  tokenHash: string;
  memberKey: string;
  memberName: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(`partner-sso|${token}`).digest("hex");
}

function sameSecret(actual: string, expected: string) {
  if (!actual || !expected) return false;
  const a = createHash("sha256").update(actual).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message, details: [] } }, { status });
}

export async function POST(req: NextRequest) {
  const expectedCode = process.env.XTREME_KINESIA_INTEGRATION_CODE?.trim() ?? "";
  let body: { cedula?: unknown; nombre?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(422, "HTTP_422", "Datos inválidos.");
  }

  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (!sameSecret(bearer, expectedCode)) {
    return errorResponse(401, "HTTP_401", "Código de integración inválido.");
  }

  const cedula = cedulaDigits(body.cedula);
  if (cedula.length < 9 || cedula.length > 12) {
    return errorResponse(422, "HTTP_422", "La cédula debe tener entre 9 y 12 números.");
  }

  const db = await getDb();
  const incomingName = normalizeMemberName(body.nombre);
  const incomingEmail = normalizeMemberEmail(body.email);
  const members = await db.collection<MemberDoc>(MEMBERS_COLLECTION).find({}).project({ memberName: 1, normalizedName: 1, cedula: 1, email: 1 }).toArray();
  const member = members.find((candidate) => matchCedula(candidate.cedula, cedula))
    ?? (incomingName ? members.find((candidate) => candidate.normalizedName === normalizeMemberKey(incomingName)) : undefined);
  const now = new Date();
  const memberKey = member?.normalizedName || normalizeMemberKey(incomingName);
  const memberName = incomingName || member?.memberName || "Socio Xtreme";
  if (!memberKey) return errorResponse(422, "HTTP_422", "El nombre del socio es requerido para crear el perfil.");
  await db.collection<MemberDoc>(MEMBERS_COLLECTION).updateOne(
    { normalizedName: memberKey },
    {
      $set: {
        normalizedName: memberKey,
        memberName,
        cedula,
        ...(incomingEmail ? { email: incomingEmail } : {}),
        updatedAt: now,
      },
      $setOnInsert: {
        membership: createFreeFirstDayMembership(now.toISOString().slice(0, 10)),
        workouts: [],
        bodyMetrics: [],
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const token = randomBytes(32).toString("base64url");
  await db.collection<PartnerTokenDoc>(TOKEN_COLLECTION).insertOne({
    tokenHash: hashToken(token),
    memberKey,
    memberName,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
    usedAt: null,
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin).replace(/\/$/, "");
  return NextResponse.json({
    token,
    expiraEn: 60,
    url: `${appUrl}/app/sso?t=${encodeURIComponent(token)}`,
  });
}

export async function PUT(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(422, "HTTP_422", "Token inválido.");
  }
  const token = String(body.token ?? "").trim();
  if (!token) return errorResponse(422, "HTTP_422", "Token inválido.");

  const db = await getDb();
  const result = await db.collection<PartnerTokenDoc>(TOKEN_COLLECTION).findOneAndUpdate(
    { tokenHash: hashToken(token), expiresAt: { $gt: new Date() }, usedAt: null },
    { $set: { usedAt: new Date() } },
    { returnDocument: "before" },
  );
  const grant = result;
  if (!grant) return errorResponse(401, "TOKEN_INVALID", "El enlace venció o ya fue utilizado.");

  const session = await createMemberSession(db, { memberKey: grant.memberKey, memberName: grant.memberName, userAgent: req.headers.get("user-agent") ?? undefined });
  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, session.token, session.expiresAt);
  return response;
}
