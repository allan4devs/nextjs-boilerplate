/**
 * Cliente de bitácora de uso (session analytics).
 * Cola en memoria + flush periódico / al ocultar la pestaña.
 * Best-effort: fallos de red se ignoran.
 */

export type AnalyticsSource = "site" | "member_app" | "admin" | "reception" | "kiosk";

export type ClientAnalyticsEvent = {
  type:
    | "session_start"
    | "session_end"
    | "heartbeat"
    | "page_view"
    | "tab_view"
    | "action"
    | "click"
    | "visibility";
  at: number;
  path?: string;
  tab?: string;
  action?: string;
  label?: string;
  meta?: Record<string, string | number | boolean | null>;
};

const SESSION_ID_KEY = "xtreme-usage-session-id";
const ANON_ID_KEY = "xtreme-anon-id";
const FLUSH_MS = 8_000;
const MAX_QUEUE = 60;
const HEARTBEAT_MS = 60_000;

let source: AnalyticsSource = "site";
let memberName: string | undefined;
let queue: ClientAnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let started = false;
let lastPath = "";
let lastTab = "";
let flushing = false;

function storageGet(key: string): string {
  try {
    return window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function storageSet(key: string, value: string, persist = false) {
  try {
    window.sessionStorage.setItem(key, value);
    if (persist) window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function randomId(prefix: string) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rnd}`;
}

export function getUsageSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = storageGet(SESSION_ID_KEY);
  if (!id) {
    id = randomId("us");
    storageSet(SESSION_ID_KEY, id, false);
  }
  return id;
}

export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";
  let id = storageGet(ANON_ID_KEY);
  if (!id) {
    id = randomId("anon");
    storageSet(ANON_ID_KEY, id, true);
  }
  return id;
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushUsageQueue();
  }, FLUSH_MS);
}

function clientMeta() {
  if (typeof window === "undefined") return {};
  return {
    userAgent: navigator.userAgent?.slice(0, 200),
    language: navigator.language?.slice(0, 32),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    referrer: document.referrer?.slice(0, 200) || undefined,
  };
}

export async function flushUsageQueue(): Promise<void> {
  if (typeof window === "undefined" || flushing) return;
  if (queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, MAX_QUEUE);
  try {
    await fetch("/api/xtreme/events/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getUsageSessionId(),
        source,
        memberName: memberName || undefined,
        anonymousId: getAnonymousId(),
        events: batch,
        client: clientMeta(),
      }),
      keepalive: true,
    });
  } catch {
    // Reencolar un poco si falló (sin crecer sin límite)
    if (queue.length < MAX_QUEUE) {
      queue = [...batch.slice(0, 10), ...queue].slice(0, MAX_QUEUE);
    }
  } finally {
    flushing = false;
  }
}

function enqueue(event: ClientAnalyticsEvent) {
  if (typeof window === "undefined") return;
  queue.push(event);
  if (queue.length >= 12) {
    void flushUsageQueue();
  } else {
    scheduleFlush();
  }
}

export function trackUsage(event: Omit<ClientAnalyticsEvent, "at"> & { at?: number }) {
  enqueue({
    ...event,
    at: event.at ?? Date.now(),
    path: event.path?.slice(0, 160),
    tab: event.tab?.slice(0, 40),
    action: event.action?.slice(0, 64),
    label: event.label?.slice(0, 80),
  });
}

export function trackPageView(path: string) {
  const clean = path.slice(0, 160) || "/";
  if (clean === lastPath) return;
  lastPath = clean;
  trackUsage({ type: "page_view", path: clean });
}

export function trackTabView(tab: string, path?: string) {
  const t = tab.slice(0, 40);
  if (t === lastTab) return;
  lastTab = t;
  trackUsage({
    type: "tab_view",
    tab: t,
    path: path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
  });
}

export function trackAction(
  action: string,
  opts?: {
    label?: string;
    path?: string;
    tab?: string;
    meta?: Record<string, string | number | boolean | null>;
  },
) {
  trackUsage({
    type: "action",
    action: action.slice(0, 64),
    label: opts?.label,
    path: opts?.path ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    tab: opts?.tab,
    meta: opts?.meta,
  });
}

export function trackClick(label: string, action?: string) {
  trackUsage({
    type: "click",
    label: label.slice(0, 80),
    action: action?.slice(0, 64),
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
}

export function identifyUsageMember(name: string | undefined) {
  const next = name?.trim() || undefined;
  if (next === memberName) return;
  memberName = next;
  // Flush pronto para asociar eventos pendientes al socio
  if (next) scheduleFlush();
}

export function setUsageSource(next: AnalyticsSource) {
  source = next;
}

function onVisibility() {
  if (typeof document === "undefined") return;
  const state = document.visibilityState;
  trackUsage({
    type: "visibility",
    label: state,
    path: window.location.pathname,
  });
  if (state === "hidden") {
    void flushUsageQueue();
  }
}

function onPageHide() {
  trackUsage({
    type: "session_end",
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
  });
  void flushUsageQueue();
}

/**
 * Inicializa la bitácora de sesión una vez por carga de página.
 */
export function startUsageSession(opts: {
  source: AnalyticsSource;
  path?: string;
  memberName?: string;
}) {
  if (typeof window === "undefined") return;
  setUsageSource(opts.source);
  if (opts.memberName) identifyUsageMember(opts.memberName);

  if (!started) {
    started = true;
    trackUsage({
      type: "session_start",
      path: opts.path ?? window.location.pathname,
    });

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    heartbeatTimer = setInterval(() => {
      trackUsage({
        type: "heartbeat",
        path: window.location.pathname,
        tab: lastTab || undefined,
      });
      void flushUsageQueue();
    }, HEARTBEAT_MS);
  }

  if (opts.path) trackPageView(opts.path);
}

export function stopUsageSession() {
  if (typeof window === "undefined" || !started) return;
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onPageHide);
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  trackUsage({ type: "session_end", path: window.location.pathname });
  void flushUsageQueue();
  started = false;
}

/** Texto legible para un click (botón / link). */
export function clickLabelFromElement(el: Element): string {
  const analytics = el.getAttribute("data-analytics");
  if (analytics) return analytics.slice(0, 80);
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.slice(0, 80);
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 80);
  if (el instanceof HTMLAnchorElement && el.href) {
    try {
      return new URL(el.href).pathname.slice(0, 80);
    } catch {
      return "link";
    }
  }
  return el.tagName.toLowerCase();
}
