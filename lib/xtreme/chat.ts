/**
 * Chat live visita ↔ recepción. Mongo es la fuente de verdad;
 * el cliente hace poll corto (≈1.5s) para sensación en vivo.
 */
import { createHash, randomBytes } from "crypto";
import type { Db } from "mongodb";
import {
  CHAT_MESSAGES_COLLECTION,
  CHAT_SESSIONS_COLLECTION,
} from "./shared";

export const CHAT_BODY_MAX = 1000;
export const CHAT_NAME_MAX = 80;
export const CHAT_PHONE_MAX = 24;
export const CHAT_RATE_WINDOW_MS = 60_000;
export const CHAT_RATE_MAX = 20;
export const CHAT_PREVIEW_MAX = 120;
export const CHAT_MESSAGES_POLL_LIMIT = 50;
export const CHAT_INBOX_LIMIT = 80;

export type ChatRole = "visitor" | "staff";
export type ChatSessionStatus = "open" | "closed";

export type ChatSessionDoc = {
  id: string;
  guestTokenHash: string;
  visitorName: string;
  visitorPhone?: string;
  /** Socio autenticado en Member OS (normalizedName). */
  memberKey?: string;
  source?: "member_app" | "site";
  status: ChatSessionStatus;
  lastMessageAt: Date;
  lastMessagePreview: string;
  lastMessageRole: ChatRole;
  unreadByStaff: number;
  unreadByVisitor: number;
  messageCount: number;
  seq: number;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  closedBy?: "staff" | "visitor" | "system";
};

export type ChatMessageDoc = {
  id: string;
  sessionId: string;
  seq: number;
  role: ChatRole;
  body: string;
  staffLabel?: string;
  createdAt: Date;
};

/** Forma serializable para el cliente (fechas ISO). */
export type ChatSessionView = {
  id: string;
  visitorName: string;
  visitorPhone?: string;
  memberKey?: string;
  source?: "member_app" | "site";
  status: ChatSessionStatus;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: ChatRole;
  unreadByStaff: number;
  unreadByVisitor: number;
  messageCount: number;
  seq: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: "staff" | "visitor" | "system";
};

export type ChatMessageView = {
  id: string;
  sessionId: string;
  seq: number;
  role: ChatRole;
  body: string;
  staffLabel?: string;
  createdAt: string;
};

export function hashGuestToken(token: string) {
  return createHash("sha256").update(`chat-guest|${token}|v1`).digest("hex");
}

export function newGuestToken() {
  return randomBytes(24).toString("base64url");
}

export function newChatId(prefix: "s" | "m") {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export function sanitizeChatBody(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\0/g, "")
    .trim()
    .slice(0, CHAT_BODY_MAX);
}

export function sanitizeVisitorName(raw: unknown): string {
  const name = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHAT_NAME_MAX);
  return name || "Visitante";
}

export function sanitizeVisitorPhone(raw: unknown): string | undefined {
  const phone = String(raw ?? "")
    .replace(/[^\d+]/g, "")
    .slice(0, CHAT_PHONE_MAX);
  return phone || undefined;
}

export function toSessionView(doc: ChatSessionDoc): ChatSessionView {
  return {
    id: doc.id,
    visitorName: doc.visitorName,
    visitorPhone: doc.visitorPhone,
    memberKey: doc.memberKey,
    source: doc.source,
    status: doc.status,
    lastMessageAt: toIso(doc.lastMessageAt),
    lastMessagePreview: doc.lastMessagePreview,
    lastMessageRole: doc.lastMessageRole,
    unreadByStaff: doc.unreadByStaff,
    unreadByVisitor: doc.unreadByVisitor,
    messageCount: doc.messageCount,
    seq: doc.seq,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    closedAt: doc.closedAt ? toIso(doc.closedAt) : undefined,
    closedBy: doc.closedBy,
  };
}

export function toMessageView(doc: ChatMessageDoc): ChatMessageView {
  return {
    id: doc.id,
    sessionId: doc.sessionId,
    seq: doc.seq,
    role: doc.role,
    body: doc.body,
    staffLabel: doc.staffLabel,
    createdAt: toIso(doc.createdAt),
  };
}

function toIso(value: Date | string) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function previewOf(body: string) {
  if (body.length <= CHAT_PREVIEW_MAX) return body;
  return `${body.slice(0, CHAT_PREVIEW_MAX - 1)}…`;
}

export async function findSessionById(db: Db, sessionId: string): Promise<ChatSessionDoc | null> {
  const doc = await db
    .collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION)
    .findOne({ id: sessionId });
  return doc as ChatSessionDoc | null;
}

export function guestTokenMatches(session: ChatSessionDoc, guestToken: string) {
  if (!guestToken) return false;
  return session.guestTokenHash === hashGuestToken(guestToken);
}

export async function assertRateLimit(db: Db, sessionId: string): Promise<string | null> {
  const since = new Date(Date.now() - CHAT_RATE_WINDOW_MS);
  const count = await db.collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION).countDocuments({
    sessionId,
    createdAt: { $gte: since },
  });
  if (count >= CHAT_RATE_MAX) {
    return "Demasiados mensajes. Esperá un momento e intentá de nuevo.";
  }
  return null;
}

export async function startChatSession(
  db: Db,
  args: {
    body: string;
    visitorName?: string;
    visitorPhone?: string;
    memberKey?: string;
    source?: "member_app" | "site";
  },
): Promise<{ session: ChatSessionDoc; message: ChatMessageDoc; guestToken: string }> {
  const body = sanitizeChatBody(args.body);
  if (!body) throw new ChatError("Escribí un mensaje para empezar.", 400);

  const guestToken = newGuestToken();
  const now = new Date();
  const sessionId = newChatId("s");
  const messageId = newChatId("m");
  const visitorName = sanitizeVisitorName(args.visitorName);
  const visitorPhone = sanitizeVisitorPhone(args.visitorPhone);

  const message: ChatMessageDoc = {
    id: messageId,
    sessionId,
    seq: 1,
    role: "visitor",
    body,
    createdAt: now,
  };

  const session: ChatSessionDoc = {
    id: sessionId,
    guestTokenHash: hashGuestToken(guestToken),
    visitorName,
    visitorPhone,
    ...(args.memberKey ? { memberKey: args.memberKey } : {}),
    source: args.source ?? (args.memberKey ? "member_app" : "site"),
    status: "open",
    lastMessageAt: now,
    lastMessagePreview: previewOf(body),
    lastMessageRole: "visitor",
    unreadByStaff: 1,
    unreadByVisitor: 0,
    messageCount: 1,
    seq: 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION).insertOne(session);
  await db.collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION).insertOne(message);

  return { session, message, guestToken };
}

export async function appendChatMessage(
  db: Db,
  args: {
    session: ChatSessionDoc;
    role: ChatRole;
    body: string;
    staffLabel?: string;
  },
): Promise<{ session: ChatSessionDoc; message: ChatMessageDoc }> {
  const body = sanitizeChatBody(args.body);
  if (!body) throw new ChatError("El mensaje no puede ir vacío.", 400);
  if (args.session.status === "closed") {
    throw new ChatError("Esta conversación ya está cerrada.", 409);
  }

  const rateError = await assertRateLimit(db, args.session.id);
  if (rateError) throw new ChatError(rateError, 429);

  const now = new Date();
  const nextSeq = args.session.seq + 1;
  const message: ChatMessageDoc = {
    id: newChatId("m"),
    sessionId: args.session.id,
    seq: nextSeq,
    role: args.role,
    body,
    staffLabel: args.role === "staff" ? args.staffLabel || "Recepción" : undefined,
    createdAt: now,
  };

  // Visitante escribe → sube unread staff y limpia los propios; staff al revés.
  // $set y $inc van sobre campos distintos (válido en Mongo).
  const $set: Record<string, unknown> = {
    lastMessageAt: now,
    lastMessagePreview: previewOf(body),
    lastMessageRole: args.role,
    updatedAt: now,
  };
  const $inc: Record<string, number> = {
    seq: 1,
    messageCount: 1,
  };
  if (args.role === "visitor") {
    $set.unreadByVisitor = 0;
    $inc.unreadByStaff = 1;
  } else {
    $set.unreadByStaff = 0;
    $inc.unreadByVisitor = 1;
  }

  const updated = await db.collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION).findOneAndUpdate(
    { id: args.session.id, status: "open", seq: args.session.seq },
    { $set, $inc },
    { returnDocument: "after" },
  );

  const sessionAfter = unwrapFindOne(updated) as ChatSessionDoc | null;

  if (!sessionAfter) {
    const fresh = await findSessionById(db, args.session.id);
    if (!fresh || fresh.status === "closed") {
      throw new ChatError("Esta conversación ya está cerrada.", 409);
    }
    return appendChatMessage(db, { ...args, session: fresh });
  }

  await db.collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION).insertOne(message);
  return { session: sessionAfter, message };
}

function unwrapFindOne<T>(result: T | { value?: T | null } | null): T | null {
  if (!result) return null;
  if (typeof result === "object" && result !== null && "value" in result && !("seq" in result)) {
    return (result as { value?: T | null }).value ?? null;
  }
  return result as T;
}

export async function getMessagesSince(
  db: Db,
  sessionId: string,
  afterSeq: number,
  markRead?: "staff" | "visitor",
): Promise<{ session: ChatSessionDoc | null; messages: ChatMessageDoc[] }> {
  const session = await findSessionById(db, sessionId);
  if (!session) return { session: null, messages: [] };

  const messages = (await db
    .collection<ChatMessageDoc>(CHAT_MESSAGES_COLLECTION)
    .find({ sessionId, seq: { $gt: afterSeq } })
    .sort({ seq: 1 })
    .limit(CHAT_MESSAGES_POLL_LIMIT)
    .toArray()) as ChatMessageDoc[];

  if (markRead === "staff" && session.unreadByStaff > 0) {
    await db.collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION).updateOne(
      { id: sessionId },
      { $set: { unreadByStaff: 0, updatedAt: new Date() } },
    );
    session.unreadByStaff = 0;
  }
  if (markRead === "visitor" && session.unreadByVisitor > 0) {
    await db.collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION).updateOne(
      { id: sessionId },
      { $set: { unreadByVisitor: 0, updatedAt: new Date() } },
    );
    session.unreadByVisitor = 0;
  }

  return { session, messages };
}

export async function listChatInbox(
  db: Db,
  status: ChatSessionStatus | "all" = "open",
): Promise<ChatSessionDoc[]> {
  const filter = status === "all" ? {} : { status };
  return (await db
    .collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION)
    .find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(CHAT_INBOX_LIMIT)
    .toArray()) as ChatSessionDoc[];
}

export async function setChatSessionStatus(
  db: Db,
  sessionId: string,
  status: ChatSessionStatus,
  closedBy?: "staff" | "visitor" | "system",
): Promise<ChatSessionDoc | null> {
  const now = new Date();
  const $set: Partial<ChatSessionDoc> = {
    status,
    updatedAt: now,
  };
  if (status === "closed") {
    $set.closedAt = now;
    $set.closedBy = closedBy ?? "staff";
  } else {
    $set.closedAt = undefined;
    $set.closedBy = undefined;
  }

  const result = await db.collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION).findOneAndUpdate(
    { id: sessionId },
    status === "open"
      ? { $set: { status: "open", updatedAt: now }, $unset: { closedAt: "", closedBy: "" } }
      : { $set },
    { returnDocument: "after" },
  );

  return unwrapFindOne(result) as ChatSessionDoc | null;
}

export async function updateVisitorProfile(
  db: Db,
  sessionId: string,
  args: { visitorName?: string; visitorPhone?: string; memberKey?: string },
) {
  const $set: Partial<ChatSessionDoc> = { updatedAt: new Date() };
  if (args.visitorName !== undefined) $set.visitorName = sanitizeVisitorName(args.visitorName);
  if (args.visitorPhone !== undefined) $set.visitorPhone = sanitizeVisitorPhone(args.visitorPhone);
  if (args.memberKey) {
    $set.memberKey = args.memberKey;
    $set.source = "member_app";
  }
  await db.collection<ChatSessionDoc>(CHAT_SESSIONS_COLLECTION).updateOne({ id: sessionId }, { $set });
}

export class ChatError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ChatError";
    this.status = status;
  }
}
