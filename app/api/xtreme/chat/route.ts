import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  ChatError,
  appendChatMessage,
  findSessionById,
  getMessagesSince,
  guestTokenMatches,
  setChatSessionStatus,
  startChatSession,
  toMessageView,
  toSessionView,
  updateVisitorProfile,
} from "@/lib/xtreme/chat";

export const dynamic = "force-dynamic";

function guestTokenFrom(req: NextRequest, body?: { guestToken?: string }) {
  return (
    body?.guestToken?.trim() ||
    req.headers.get("x-xtreme-chat-token")?.trim() ||
    req.nextUrl.searchParams.get("guestToken")?.trim() ||
    ""
  );
}

/** GET — poll de mensajes del visitante: ?sessionId=&afterSeq=&guestToken= */
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim() || "";
    const afterSeq = Math.max(0, Number(req.nextUrl.searchParams.get("afterSeq") || 0) || 0);
    const guestToken = guestTokenFrom(req);

    if (!sessionId) {
      return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
    }
    if (!guestToken) {
      return NextResponse.json({ error: "Falta token de chat." }, { status: 401 });
    }

    const db = await getDb();
    const session = await findSessionById(db, sessionId);
    if (!session || !guestTokenMatches(session, guestToken)) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }

    const { session: current, messages } = await getMessagesSince(
      db,
      sessionId,
      afterSeq,
      "visitor",
    );

    return NextResponse.json({
      session: current ? toSessionView(current) : toSessionView(session),
      messages: messages.map(toMessageView),
    });
  } catch (err) {
    console.error("[chat GET]", err);
    return NextResponse.json({ error: "No se pudo cargar el chat." }, { status: 500 });
  }
}

/** POST — start | send | close (visitante) */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      sessionId?: string;
      guestToken?: string;
      body?: string;
      visitorName?: string;
      visitorPhone?: string;
    };
    const action = String(body.action ?? "send").trim();
    const db = await getDb();

    if (action === "start") {
      const { session, message, guestToken } = await startChatSession(db, {
        body: body.body ?? "",
        visitorName: body.visitorName,
        visitorPhone: body.visitorPhone,
      });
      return NextResponse.json({
        session: toSessionView(session),
        messages: [toMessageView(message)],
        guestToken,
      });
    }

    const sessionId = String(body.sessionId ?? "").trim();
    const guestToken = guestTokenFrom(req, body);
    if (!sessionId || !guestToken) {
      return NextResponse.json({ error: "Falta sesión o token de chat." }, { status: 400 });
    }

    const session = await findSessionById(db, sessionId);
    if (!session || !guestTokenMatches(session, guestToken)) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }

    if (action === "close") {
      const closed = await setChatSessionStatus(db, sessionId, "closed", "visitor");
      return NextResponse.json({
        session: closed ? toSessionView(closed) : toSessionView({ ...session, status: "closed" }),
        messages: [],
      });
    }

    if (action === "send") {
      if (body.visitorName || body.visitorPhone) {
        await updateVisitorProfile(db, sessionId, {
          visitorName: body.visitorName,
          visitorPhone: body.visitorPhone,
        });
        if (body.visitorName) session.visitorName = String(body.visitorName);
      }

      const result = await appendChatMessage(db, {
        session,
        role: "visitor",
        body: body.body ?? "",
      });
      return NextResponse.json({
        session: toSessionView(result.session),
        messages: [toMessageView(result.message)],
      });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[chat POST]", err);
    return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
  }
}
