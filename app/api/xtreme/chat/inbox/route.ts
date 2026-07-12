import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import {
  ChatError,
  appendChatMessage,
  findSessionById,
  getMessagesSince,
  listChatInbox,
  setChatSessionStatus,
  toMessageView,
  toSessionView,
  type ChatSessionStatus,
} from "@/lib/xtreme/chat";
import { resolveAdminRole } from "@/lib/xtreme/shared";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function roleFromReq(req: NextRequest) {
  return resolveAdminRole(req.headers.get("x-xtreme-admin") ?? "");
}

/**
 * GET — inbox staff o hilo de una sesión:
 *  - sin sessionId: lista de sesiones
 *  - con sessionId: mensajes (afterSeq) y marca leídos staff
 */
export async function GET(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const db = await getDb();
    const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim() || "";
    const afterSeq = Math.max(0, Number(req.nextUrl.searchParams.get("afterSeq") || 0) || 0);
    const statusParam = (req.nextUrl.searchParams.get("status") || "open").trim() as
      | ChatSessionStatus
      | "all";

    if (sessionId) {
      const session = await findSessionById(db, sessionId);
      if (!session) {
        return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
      }
      const { session: current, messages } = await getMessagesSince(
        db,
        sessionId,
        afterSeq,
        "staff",
      );
      return NextResponse.json({
        session: current ? toSessionView(current) : toSessionView(session),
        messages: messages.map(toMessageView),
      });
    }

    const status = statusParam === "closed" || statusParam === "all" ? statusParam : "open";
    const sessions = await listChatInbox(db, status);
    const openCount = sessions.filter((s) => s.status === "open").length;
    const unreadTotal = sessions.reduce((n, s) => n + (s.unreadByStaff || 0), 0);

    return NextResponse.json({
      sessions: sessions.map(toSessionView),
      openCount,
      unreadTotal,
    });
  } catch (err) {
    console.error("[chat/inbox GET]", err);
    return NextResponse.json({ error: "No se pudo cargar el inbox." }, { status: 500 });
  }
}

/** POST — reply | close | reopen */
export async function POST(req: NextRequest) {
  const role = roleFromReq(req);
  if (!role) return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      sessionId?: string;
      body?: string;
    };
    const action = String(body.action ?? "").trim();
    const sessionId = String(body.sessionId ?? "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
    }

    const db = await getDb();
    const session = await findSessionById(db, sessionId);
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }

    if (action === "close") {
      const closed = await setChatSessionStatus(db, sessionId, "closed", "staff");
      return NextResponse.json({
        session: closed ? toSessionView(closed) : null,
        messages: [],
      });
    }

    if (action === "reopen") {
      const opened = await setChatSessionStatus(db, sessionId, "open");
      return NextResponse.json({
        session: opened ? toSessionView(opened) : null,
        messages: [],
      });
    }

    if (action === "reply") {
      // Si estaba cerrada, reabrir al responder
      let working = session;
      if (session.status === "closed") {
        const reopened = await setChatSessionStatus(db, sessionId, "open");
        if (reopened) working = reopened;
        else working = { ...session, status: "open" };
      }

      const result = await appendChatMessage(db, {
        session: working,
        role: "staff",
        body: body.body ?? "",
        staffLabel: role === "super" ? "Admin" : "Recepción",
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
    console.error("[chat/inbox POST]", err);
    return NextResponse.json({ error: "No se pudo procesar." }, { status: 500 });
  }
}
