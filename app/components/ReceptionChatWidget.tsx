"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

const STORAGE_KEY = "xtreme-chat-session";
const POLL_OPEN_MS = 1500;
const POLL_BADGE_MS = 5000;
const HIDDEN_PATHS = ["/recepcion", "/admin", "/ingreso"];

export type MemberChatContext = {
  memberName: string;
  memberPhone?: string;
  normalizedName?: string;
};

type ChatMessage = {
  id: string;
  sessionId: string;
  seq: number;
  role: "visitor" | "staff";
  body: string;
  staffLabel?: string;
  createdAt: string;
};

type ChatSession = {
  id: string;
  visitorName: string;
  visitorPhone?: string;
  status: "open" | "closed";
  unreadByVisitor: number;
  seq: number;
};

type StoredChat = {
  sessionId: string;
  guestToken: string;
  visitorName?: string;
};

function loadStored(): StoredChat | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChat;
    if (!parsed.sessionId || !parsed.guestToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveStored(data: StoredChat | null) {
  if (!data) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type Props = {
  /** Socio logueado en Member OS: prellena nombre/teléfono y liga la sesión en recepción. */
  memberContext?: MemberChatContext | null;
};

export default function ReceptionChatWidget({ memberContext = null }: Props) {
  const pathname = usePathname();
  const english = pathname === "/en" || pathname.startsWith("/en/");
  const hidden = HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  const [open, setOpen] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [draft, setDraft] = useState("");
  const [session, setSession] = useState<ChatSession | null>(null);
  const [guestToken, setGuestToken] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const afterSeqRef = useRef(0);
  const sessionIdRef = useRef("");
  const tokenRef = useRef("");

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setSession({
        id: stored.sessionId,
        visitorName: stored.visitorName || "Visitante",
        status: "open",
        unreadByVisitor: 0,
        seq: 0,
      });
      setGuestToken(stored.guestToken);
      setVisitorName(stored.visitorName || "");
      sessionIdRef.current = stored.sessionId;
      tokenRef.current = stored.guestToken;
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!memberContext?.memberName) return;
    setVisitorName((current) => current || memberContext.memberName);
  }, [memberContext?.memberName]);

  useEffect(() => {
    sessionIdRef.current = session?.id || "";
    tokenRef.current = guestToken;
  }, [session?.id, guestToken]);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      const next = Array.from(byId.values()).sort((a, b) => a.seq - b.seq);
      afterSeqRef.current = next.reduce((max, m) => Math.max(max, m.seq), afterSeqRef.current);
      return next;
    });
  }, []);

  const poll = useCallback(async () => {
    const sid = sessionIdRef.current;
    const token = tokenRef.current;
    if (!sid || !token) return;
    try {
      const params = new URLSearchParams({
        sessionId: sid,
        afterSeq: String(afterSeqRef.current),
        guestToken: token,
      });
      const res = await fetch(`/api/xtreme/chat?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        session?: ChatSession;
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 404) {
          saveStored(null);
          setSession(null);
          setGuestToken("");
          setMessages([]);
          afterSeqRef.current = 0;
          sessionIdRef.current = "";
          tokenRef.current = "";
        }
        return;
      }
      if (json.session) {
        setSession(json.session);
        if (!open) setUnread(json.session.unreadByVisitor || 0);
        else setUnread(0);
      }
      if (json.messages?.length) mergeMessages(json.messages);
    } catch {
      /* soft fail */
    }
  }, [mergeMessages, memberContext, open]);

  useEffect(() => {
    if (!hydrated || hidden || !sessionIdRef.current) return;
    void poll();
    const ms = open ? POLL_OPEN_MS : POLL_BADGE_MS;
    const id = window.setInterval(() => void poll(), ms);
    return () => window.clearInterval(id);
  }, [hydrated, hidden, open, poll, session?.id]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  async function startFresh(text: string) {
    const res = await fetch("/api/xtreme/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "start",
        body: text,
        visitorName: visitorName.trim() || memberContext?.memberName || undefined,
        visitorPhone: memberContext?.memberPhone || undefined,
      }),
    });
    const json = (await res.json()) as {
      session?: ChatSession;
      messages?: ChatMessage[];
      guestToken?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(json.error || "No se pudo iniciar el chat.");
    if (!json.session || !json.guestToken) throw new Error("Respuesta incompleta.");
    setSession(json.session);
    setGuestToken(json.guestToken);
    setMessages([]);
    sessionIdRef.current = json.session.id;
    tokenRef.current = json.guestToken;
    afterSeqRef.current = 0;
    saveStored({
      sessionId: json.session.id,
      guestToken: json.guestToken,
      visitorName: visitorName.trim() || json.session.visitorName,
    });
    if (json.messages) mergeMessages(json.messages);
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      // Sesión nueva o la anterior ya cerrada → start
      if (!sessionIdRef.current || !tokenRef.current || session?.status === "closed") {
        await startFresh(text);
        setDraft("");
        return;
      }

      const res = await fetch("/api/xtreme/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-xtreme-chat-token": tokenRef.current,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "send",
          sessionId: sessionIdRef.current,
          guestToken: tokenRef.current,
          body: text,
          visitorName: visitorName.trim() || memberContext?.memberName || undefined,
          visitorPhone: memberContext?.memberPhone || undefined,
        }),
      });
      const json = (await res.json()) as {
        session?: ChatSession;
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) {
        // Si se cerró entre medias, abrimos otra
        if (res.status === 409) {
          await startFresh(text);
          setDraft("");
          return;
        }
        throw new Error(json.error || "No se pudo enviar.");
      }
      if (json.session) setSession(json.session);
      if (json.messages) mergeMessages(json.messages);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setSending(false);
    }
  }

  if (hidden || !hydrated) return null;

  const closed = session?.status === "closed";

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="pointer-events-auto flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden border-[3px] border-[#d8ff3e] bg-[#0c0c0c] shadow-[6px_6px_0_rgba(0,0,0,.65)]">
          <div className="flex items-center justify-between gap-2 border-b-[3px] border-white/15 bg-[#d8ff3e] px-3 py-2.5 text-black">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                Xtreme Gym
              </p>
              <p className="truncate text-sm font-black uppercase tracking-tight">
                {english ? "Chat with reception" : "Chat con recepción"}
              </p>
              {memberContext && (
                <p className="truncate text-[10px] font-bold text-black/55">
                  {memberContext.memberName} · socio
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center border-[2px] border-black/20 hover:bg-black/10"
              aria-label={english ? "Close chat" : "Cerrar chat"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-white/10 px-3 py-2">
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
              {english ? "Your name (optional)" : "Tu nombre (opcional)"}
            </label>
            <input
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder={english ? "What should we call you?" : "Cómo te decimos"}
              maxLength={80}
              className="mt-1 w-full border border-white/15 bg-black/40 px-2.5 py-2 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]/70"
            />
          </div>

          <div
            ref={listRef}
            className="flex max-h-[min(50vh,360px)] min-h-[220px] flex-col gap-2 overflow-y-auto px-3 py-3"
          >
            {!messages.length && (
              <div className="rounded border border-dashed border-white/15 px-3 py-4 text-center">
                <p className="text-sm font-bold text-white/70">
                  {english ? "Hello! Send us a message and reception will reply." : "¡Pura vida! Escribí y recepción te contesta en vivo."}
                </p>
                <p className="mt-1 text-xs font-bold text-white/40">
                  {english ? "Ask about hours, plans, your first day or anything else." : "Horarios, planes, primer día… lo que ocupés."}
                </p>
              </div>
            )}
            {messages.map((m) => {
              const mine = m.role === "visitor";
              return (
                <div
                  key={m.id}
                  className={`max-w-[88%] px-3 py-2 text-sm font-bold ${
                    mine
                      ? "ml-auto border-[2px] border-[#d8ff3e]/50 bg-[#d8ff3e]/15 text-white"
                      : "mr-auto border-[2px] border-white/15 bg-white/5 text-white"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-[#d8ff3e]/80">
                      {m.staffLabel || (english ? "Reception" : "Recepción")}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="mt-1 text-right text-[10px] font-bold text-white/35">
                    {formatTime(m.createdAt)}
                  </p>
                </div>
              );
            })}
            {closed && (
              <p className="text-center text-xs font-bold text-white/45">
                {english ? "Conversation closed. Send another message to start a new one." : "Conversación cerrada. Escribí de nuevo para abrir otra."}
              </p>
            )}
          </div>

          {error && (
            <p className="border-t border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
              {error}
            </p>
          )}

          <form
            onSubmit={(e) => void sendMessage(e)}
            className="flex gap-2 border-t-[3px] border-white/15 p-2.5"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={closed ? (english ? "New message…" : "Nuevo mensaje…") : (english ? "Message reception…" : "Escribí a recepción…")}
              maxLength={1000}
              disabled={sending}
              className="min-w-0 flex-1 border-[2px] border-white/20 bg-black/50 px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center border-[2px] border-black/30 bg-[#d8ff3e] text-black disabled:opacity-40"
              aria-label={english ? "Send" : "Enviar"}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto relative inline-flex h-14 w-14 items-center justify-center border-[3px] border-black/30 bg-[#d8ff3e] text-black shadow-[4px_4px_0_rgba(0,0,0,.55)] transition hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_rgba(0,0,0,.55)]"
        aria-label={open ? (english ? "Close chat" : "Cerrar chat") : (english ? "Open reception chat" : "Abrir chat con recepción")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center bg-red-500 px-1 text-[10px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
