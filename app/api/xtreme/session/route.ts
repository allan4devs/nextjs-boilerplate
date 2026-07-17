import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  attachSessionCookie,
  clearSessionCookie,
  renewMemberSession,
  resolveMemberSession,
  revokeSessionByToken,
  MEMBER_SESSION_COOKIE,
} from "@/lib/xtreme/session";
import { listActiveEntitlements, ensureLegacyEntitlement } from "@/lib/xtreme/entitlements";
import { MEMBERS_COLLECTION, type MemberDoc } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

/** Current session + active entitlements for the member app shell. */
export async function GET(req: NextRequest) {
  const session = await resolveMemberSession(req, true);
  if (!session) {
    return NextResponse.json({ authenticated: false, member: null, entitlements: [] });
  }

  const db = await getDb();
  const member = await db.collection<MemberDoc>(MEMBERS_COLLECTION).findOne(
    { normalizedName: session.memberKey },
    { projection: { memberName: 1, email: 1, phone: 1, membership: 1 } },
  );
  if (member) await ensureLegacyEntitlement(db, member);
  const entitlements = await listActiveEntitlements(db, session.memberKey);

  const res = NextResponse.json({
    authenticated: true,
    member: {
      memberKey: session.memberKey,
      memberName: session.memberName,
      email: member?.email ?? "",
      phone: member?.phone ?? "",
    },
    entitlements: entitlements.map((e) => ({
      id: e.id,
      kind: e.kind,
      label: e.label,
      offerId: e.offerId,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
      remainingBookings: e.remainingBookings,
      status: e.status,
    })),
  });

  // Renovacion deslizante: mientras el socio siga entrando, la sesion no vence.
  const token = req.cookies.get(MEMBER_SESSION_COOKIE)?.value?.trim() ?? "";
  const renewedUntil = await renewMemberSession(db, session);
  if (renewedUntil && token) attachSessionCookie(res, token, renewedUntil);

  return res;
}

/** Explicit logout — revoke current session token. */
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(MEMBER_SESSION_COOKIE)?.value ?? "";
  const db = await getDb();
  if (token) await revokeSessionByToken(db, token);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}


