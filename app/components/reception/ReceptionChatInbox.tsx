"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, XCircle } from "lucide-react";
import { GameButton, GameLabel } from "../GameOS";

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
  memberKey?: string;
  source?: "member_app" | "site";
  status: "open" | "closed";
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageRole: "visitor" | "staff";
  unreadByStaff: number;
  messageCount: number;
  seq: number;
};

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatWhen(value: string) {
  try {
    const d = new Date(value);
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    if (sameDay) return formatTime(value);
    return d.toLocaleDateString("es-CR", { day: "2-digit", month: "short" });
  } catch {
    return "-";
  }
}

export default function ReceptionChatInbox() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filter, setFilter] = useState<"open" | "all" | "closed">("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

  const afterSeqRef = useRef(0);
  const activeIdRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadInbox = useCallback(async () => {
    try {
      const res = await fetch(`/api/xtreme/chat/inbox?status=${filter}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        sessions?: ChatSession[];
        error?: string;
      };
      if (!res.ok) return;
      if (json.sessions) setSessions(json.sessions);
    } catch {
      /* soft */
    }
  }, [filter]);

  const loadThread = useCallback(
    async (sessionId: string, reset = false) => {
      if (reset) {
        afterSeqRef.current = 0;
        setLoadingThread(true);
      }
      try {
        const params = new URLSearchParams({
          sessionId,
          afterSeq: String(reset ? 0 : afterSeqRef.current),
        });
        const res = await fetch(`/api/xtreme/chat/inbox?${params}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          session?: ChatSession;
          messages?: ChatMessage[];
          error?: string;
        };
        if (!res.ok) {
          setError(json.error || "No se pudo cargar el chat.");
          return;
        }
        if (json.session) setActiveSession(json.session);
        if (json.messages?.length) {
          setMessages((prev) => {
            const base = reset ? [] : prev;
            const byId = new Map(base.map((m) => [m.id, m]));
            for (const m of json.messages!) byId.set(m.id, m);
            const next = Array.from(byId.values()).sort((a, b) => a.seq - b.seq);
            afterSeqRef.current = next.reduce((max, m) => Math.max(max, m.seq), 0);
            return next;
          });
        } else if (reset) {
          setMessages([]);
          afterSeqRef.current = 0;
        }
      } catch {
        if (reset) setError("Error de conexión.");
      } finally {
        if (reset) setLoadingThread(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadInbox();
    const id = window.setInterval(() => void loadInbox(), 2000);
    return () => window.clearInterval(id);
  }, [loadInbox]);

  useEffect(() => {
    if (!activeId) return;
    void loadThread(activeId, true);
    const id = window.setInterval(() => {
      if (activeIdRef.current) void loadThread(activeIdRef.current, false);
    }, 1500);
    return () => window.clearInterval(id);
  }, [activeId, loadThread]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, activeId]);

  async function reply(e?: React.FormEvent) {
    e?.preventDefault();
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/chat/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          sessionId: activeId,
          body: draft.trim(),
        }),
      });
      const json = (await res.json()) as {
        session?: ChatSession;
        messages?: ChatMessage[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "No se pudo responder.");
      if (json.session) setActiveSession(json.session);
      if (json.messages?.length) {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const m of json.messages!) byId.set(m.id, m);
          const next = Array.from(byId.values()).sort((a, b) => a.seq - b.seq);
          afterSeqRef.current = next.reduce((max, m) => Math.max(max, m.seq), 0);
          return next;
        });
      }
      setDraft("");
      void loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(action: "close" | "reopen") {
    if (!activeId) return;
    setError("");
    try {
      const res = await fetch("/api/xtreme/chat/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sessionId: activeId }),
      });
      const json = (await res.json()) as { session?: ChatSession; error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo actualizar.");
      if (json.session) setActiveSession(json.session);
      void loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    }
  }

  const unreadTotal = sessions.reduce((n, s) => n + (s.unreadByStaff || 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="border-[3px] border-white/15 bg-black/30">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <div>
            <GameLabel tone="lime">Inbox live</GameLabel>
            <p className="text-sm font-black uppercase">Chats</p>
          </div>
          {unreadTotal > 0 && (
            <span className="grid h-6 min-w-6 place-items-center bg-[#d8ff3e] px-1.5 text-xs font-black text-black">
              {unreadTotal}
            </span>
          )}
        </div>
        <div className="flex border-b border-white/10">
          {(
            [
              { id: "open" as const, label: "Abiertos" },
              { id: "all" as const, label: "Todos" },
              { id: "closed" as const, label: "Cerrados" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wide ${
                filter === f.id
                  ? "bg-[#d8ff3e]/15 text-[#d8ff3e]"
                  : "text-white/45 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="max-h-[min(60vh,520px)] overflow-y-auto">
          {!sessions.length && (
            <p className="px-3 py-8 text-center text-sm font-bold text-white/40">
              Nadie escribiendo por ahora.
            </p>
          )}
          {sessions.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`flex w-full flex-col gap-0.5 border-b border-white/10 px-3 py-3 text-left transition ${
                  active ? "bg-[#d8ff3e]/12" : "hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase">{s.visitorName}</p>
                    {s.memberKey && (
                      <p className="truncate text-[9px] font-black uppercase tracking-wide text-[#d8ff3e]/80">
                        Socio app · {s.memberKey}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-white/40">
                    {formatWhen(s.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold text-white/50">
                    {s.lastMessageRole === "staff" ? "Vos: " : ""}
                    {s.lastMessagePreview}
                  </p>
                  {s.unreadByStaff > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center bg-[#d8ff3e] px-1 text-[10px] font-black text-black">
                      {s.unreadByStaff}
                    </span>
                  )}
                  {s.status === "closed" && (
                    <span className="shrink-0 text-[9px] font-black uppercase text-white/35">
                      cerrado
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[420px] flex-col border-[3px] border-white/15 bg-black/30">
        {!activeId ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <MessageCircle className="mx-auto h-10 w-10 text-white/25" />
              <p className="mt-3 text-sm font-bold text-white/45">
                Elegí un chat de la lista para responder en vivo.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
              <div className="min-w-0">
                <p className="truncate text-base font-black uppercase">
                  {activeSession?.visitorName || "Visitante"}
                </p>
                {activeSession?.memberKey && (
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#d8ff3e]/80">
                    Socio registrado · {activeSession.memberKey}
                  </p>
                )}
                {activeSession?.visitorPhone && (
                  <p className="text-xs font-bold text-white/45">{activeSession.visitorPhone}</p>
                )}
              </div>
              <div className="flex gap-2">
                {activeSession?.status === "open" ? (
                  <button
                    type="button"
                    onClick={() => void setStatus("close")}
                    className="border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white/60 hover:border-red-400/40 hover:text-red-300"
                  >
                    Cerrar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setStatus("reopen")}
                    className="border border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white/60 hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e]"
                  >
                    Reabrir
                  </button>
                )}
              </div>
            </div>

            <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 sm:px-4">
              {loadingThread && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#d8ff3e]" />
                </div>
              )}
              {!loadingThread &&
                messages.map((m) => {
                  const staff = m.role === "staff";
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[85%] px-3 py-2 text-sm font-bold ${
                        staff
                          ? "ml-auto border-[2px] border-[#d8ff3e]/45 bg-[#d8ff3e]/12"
                          : "mr-auto border-[2px] border-white/15 bg-white/5"
                      }`}
                    >
                      <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-white/40">
                        {staff ? m.staffLabel || "Recepción" : activeSession?.visitorName || "Visitante"}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="mt-1 text-right text-[10px] font-bold text-white/35">
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  );
                })}
            </div>

            {error && (
              <p className="flex items-center gap-2 border-t border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
                <XCircle className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}

            <form
              onSubmit={(e) => void reply(e)}
              className="flex gap-2 border-t-[3px] border-white/15 p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Respondé al visitante..."
                maxLength={1000}
                disabled={sending}
                className="min-w-0 flex-1 border-[3px] border-white/20 bg-black/50 px-3 py-3 text-sm font-bold outline-none focus:border-[#d8ff3e]"
              />
              <GameButton type="submit" disabled={sending || !draft.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Enviar
                  </>
                )}
              </GameButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
