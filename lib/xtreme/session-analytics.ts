/**
 * Bitácora de uso por sesión de navegador.
 * Guarda un documento por clientSessionId con rutas, tabs, acciones y timeline.
 * Best-effort: nunca debe romper la UX de la app.
 */
import type { Db } from "mongodb";
import type { EventSource } from "./events";
import { normalizeKey, normalizeName } from "./shared";

export const SESSION_LOGS_COLLECTION = "xtreme_gym_session_logs";

export type SessionLogEventType =
  | "session_start"
  | "session_end"
  | "heartbeat"
  | "page_view"
  | "tab_view"
  | "action"
  | "click"
  | "visibility";

export type SessionTimelineItem = {
  at: Date;
  type: SessionLogEventType;
  path?: string;
  tab?: string;
  action?: string;
  label?: string;
};

export type SessionLogDoc = {
  id: string;
  source: EventSource;
  memberId?: string;
  memberName?: string;
  anonymousId?: string;
  startedAt: Date;
  lastSeenAt: Date;
  endedAt?: Date | null;
  durationMs: number;
  pageViews: number;
  clicks: number;
  actions: number;
  entryPath?: string;
  exitPath?: string;
  paths: Record<string, number>;
  tabs: Record<string, number>;
  actionCounts: Record<string, number>;
  timeline: SessionTimelineItem[];
  userAgent?: string;
  language?: string;
  viewport?: string;
  referrer?: string;
  schemaVersion: 1;
};

export type ClientSessionEvent = {
  type: string;
  at?: number | string;
  path?: string;
  tab?: string;
  action?: string;
  label?: string;
  meta?: Record<string, unknown>;
};

const ALLOWED_TYPES = new Set<SessionLogEventType>([
  "session_start",
  "session_end",
  "heartbeat",
  "page_view",
  "tab_view",
  "action",
  "click",
  "visibility",
]);

const MAX_EVENTS_PER_BATCH = 40;
const MAX_TIMELINE = 120;
const MAX_PATH_LEN = 160;
const MAX_LABEL_LEN = 80;
const MAX_ACTION_LEN = 64;
const MAX_TAB_LEN = 40;

function clampStr(value: unknown, max: number): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim().slice(0, max);
  return s || undefined;
}

function parseAt(raw: unknown, fallback: Date): Date {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  if (typeof raw === "string" && raw) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? fallback : d;
  }
  return fallback;
}

function isEventType(v: string): v is SessionLogEventType {
  return ALLOWED_TYPES.has(v as SessionLogEventType);
}

function bump(map: Record<string, number>, key: string, by = 1) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + by;
}

function topEntries(map: Record<string, number>, limit: number) {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * Aplica un batch de eventos de cliente a un SessionLogDoc (upsert).
 */
export async function ingestSessionBatch(
  db: Db,
  args: {
    sessionId: string;
    source: EventSource;
    memberName?: string;
    anonymousId?: string;
    events: ClientSessionEvent[];
    client?: {
      userAgent?: string;
      language?: string;
      viewport?: string;
      referrer?: string;
    };
  },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const sessionId = clampStr(args.sessionId, 64);
  if (!sessionId || !/^[\w.-]{8,64}$/.test(sessionId)) {
    return { ok: false, error: "sessionId inválido." };
  }

  const now = new Date();
  const rawEvents = Array.isArray(args.events) ? args.events.slice(0, MAX_EVENTS_PER_BATCH) : [];
  if (rawEvents.length === 0) {
    return { ok: false, error: "Sin eventos." };
  }

  const memberName = clampStr(args.memberName, 80);
  const memberId = memberName ? normalizeKey(normalizeName(memberName)) : undefined;
  const anonymousId = clampStr(args.anonymousId, 64);
  const source = args.source;

  const col = db.collection<SessionLogDoc>(SESSION_LOGS_COLLECTION);
  const existing = await col.findOne({ id: sessionId });

  const paths: Record<string, number> = { ...(existing?.paths ?? {}) };
  const tabs: Record<string, number> = { ...(existing?.tabs ?? {}) };
  const actionCounts: Record<string, number> = { ...(existing?.actionCounts ?? {}) };
  const timeline: SessionTimelineItem[] = [...(existing?.timeline ?? [])];

  let pageViews = existing?.pageViews ?? 0;
  let clicks = existing?.clicks ?? 0;
  let actions = existing?.actions ?? 0;
  let entryPath = existing?.entryPath;
  let exitPath = existing?.exitPath;
  let endedAt: Date | null | undefined = existing?.endedAt ?? null;
  let startedAt = existing?.startedAt ?? now;
  let lastSeenAt = existing?.lastSeenAt ?? now;

  for (const raw of rawEvents) {
    const typeRaw = String(raw?.type ?? "").trim();
    if (!isEventType(typeRaw)) continue;
    const at = parseAt(raw.at, now);
    if (at.getTime() < startedAt.getTime()) startedAt = at;
    if (at.getTime() > lastSeenAt.getTime()) lastSeenAt = at;

    const path = clampStr(raw.path, MAX_PATH_LEN);
    const tab = clampStr(raw.tab, MAX_TAB_LEN);
    const action = clampStr(raw.action, MAX_ACTION_LEN);
    const label = clampStr(raw.label, MAX_LABEL_LEN);

    if (path) {
      exitPath = path;
      if (!entryPath) entryPath = path;
    }

    if (typeRaw === "page_view" && path) {
      pageViews += 1;
      bump(paths, path);
    } else if (typeRaw === "tab_view" && tab) {
      pageViews += 1;
      bump(tabs, tab);
      if (path) bump(paths, path);
    } else if (typeRaw === "click") {
      clicks += 1;
      if (action) bump(actionCounts, `click:${action}`);
      else if (label) bump(actionCounts, `click:${label}`);
      else bump(actionCounts, "click");
    } else if (typeRaw === "action" && action) {
      actions += 1;
      bump(actionCounts, action);
    } else if (typeRaw === "session_start") {
      if (path) {
        entryPath = entryPath ?? path;
        bump(paths, path);
      }
    } else if (typeRaw === "session_end") {
      endedAt = at;
    }

    timeline.push({
      at,
      type: typeRaw,
      path,
      tab,
      action,
      label,
    });
  }

  // Cap timeline (keep most recent)
  const cappedTimeline =
    timeline.length > MAX_TIMELINE ? timeline.slice(timeline.length - MAX_TIMELINE) : timeline;

  const durationMs = Math.max(0, lastSeenAt.getTime() - startedAt.getTime());

  const doc: SessionLogDoc = {
    id: sessionId,
    source: existing?.source ?? source,
    memberId: memberId || existing?.memberId,
    memberName: memberName || existing?.memberName,
    anonymousId: anonymousId || existing?.anonymousId,
    startedAt,
    lastSeenAt,
    endedAt: endedAt ?? null,
    durationMs,
    pageViews,
    clicks,
    actions,
    entryPath,
    exitPath,
    paths,
    tabs,
    actionCounts,
    timeline: cappedTimeline,
    userAgent: clampStr(args.client?.userAgent, 200) || existing?.userAgent,
    language: clampStr(args.client?.language, 32) || existing?.language,
    viewport: clampStr(args.client?.viewport, 32) || existing?.viewport,
    referrer: clampStr(args.client?.referrer, 200) || existing?.referrer,
    schemaVersion: 1,
  };

  try {
    await col.updateOne({ id: sessionId }, { $set: doc }, { upsert: true });
    return { ok: true, id: sessionId };
  } catch (error) {
    console.error("XTREME SESSION LOG WRITE", sessionId, error);
    return { ok: false, error: "No se pudo guardar la bitácora." };
  }
}

export type UsageBitacoraSnapshot = {
  windowDays: number;
  fromDate: string;
  toDate: string;
  sessions: number;
  memberSessions: number;
  anonSessions: number;
  uniqueMembers: number;
  avgDurationMs: number;
  medianDurationMs: number;
  totalPageViews: number;
  totalClicks: number;
  totalActions: number;
  topPages: Array<{ path: string; views: number; sessions: number }>;
  topTabs: Array<{ tab: string; views: number }>;
  topActions: Array<{ action: string; count: number }>;
  bySource: Array<{ source: string; sessions: number }>;
  recentSessions: Array<{
    id: string;
    source: string;
    memberName?: string;
    memberId?: string;
    startedAt: string;
    lastSeenAt: string;
    durationMs: number;
    pageViews: number;
    clicks: number;
    actions: number;
    entryPath?: string;
    exitPath?: string;
    topPaths: Array<{ path: string; count: number }>;
    topTabs: Array<{ tab: string; count: number }>;
    topActions: Array<{ action: string; count: number }>;
    timeline: Array<{
      at: string;
      type: string;
      path?: string;
      tab?: string;
      action?: string;
      label?: string;
    }>;
  }>;
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function median(nums: number[]) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/** Agregados de bitácora para el panel admin. */
export async function computeUsageBitacora(
  db: Db,
  windowDays = 14,
): Promise<UsageBitacoraSnapshot> {
  const to = new Date();
  const from = new Date(to.getTime() - (windowDays - 1) * 86_400_000);
  from.setUTCHours(0, 0, 0, 0);

  const docs = await db
    .collection<SessionLogDoc>(SESSION_LOGS_COLLECTION)
    .find({ lastSeenAt: { $gte: from } })
    .sort({ lastSeenAt: -1 })
    .limit(2000)
    .toArray();

  const pathViews: Record<string, number> = {};
  const pathSessions: Record<string, number> = {};
  const tabViews: Record<string, number> = {};
  const actionTotals: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const memberIds = new Set<string>();
  let memberSessions = 0;
  let anonSessions = 0;
  let totalPageViews = 0;
  let totalClicks = 0;
  let totalActions = 0;
  const durations: number[] = [];

  for (const d of docs) {
    bump(sourceCounts, d.source || "unknown");
    if (d.memberId) {
      memberSessions += 1;
      memberIds.add(d.memberId);
    } else {
      anonSessions += 1;
    }
    totalPageViews += d.pageViews || 0;
    totalClicks += d.clicks || 0;
    totalActions += d.actions || 0;
    if (d.durationMs > 0) durations.push(d.durationMs);

    const seenPaths = new Set<string>();
    for (const [path, count] of Object.entries(d.paths || {})) {
      bump(pathViews, path, count);
      if (!seenPaths.has(path)) {
        seenPaths.add(path);
        bump(pathSessions, path);
      }
    }
    for (const [tab, count] of Object.entries(d.tabs || {})) {
      bump(tabViews, tab, count);
    }
    for (const [action, count] of Object.entries(d.actionCounts || {})) {
      bump(actionTotals, action, count);
    }
  }

  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length)
    : 0;

  const recentSessions = docs.slice(0, 40).map((d) => ({
    id: d.id,
    source: d.source,
    memberName: d.memberName,
    memberId: d.memberId,
    startedAt: d.startedAt instanceof Date ? d.startedAt.toISOString() : String(d.startedAt),
    lastSeenAt: d.lastSeenAt instanceof Date ? d.lastSeenAt.toISOString() : String(d.lastSeenAt),
    durationMs: d.durationMs,
    pageViews: d.pageViews,
    clicks: d.clicks,
    actions: d.actions,
    entryPath: d.entryPath,
    exitPath: d.exitPath,
    topPaths: topEntries(d.paths || {}, 5).map(({ key, count }) => ({ path: key, count })),
    topTabs: topEntries(d.tabs || {}, 5).map(({ key, count }) => ({ tab: key, count })),
    topActions: topEntries(d.actionCounts || {}, 8).map(({ key, count }) => ({
      action: key,
      count,
    })),
    timeline: (d.timeline || [])
      .slice(-30)
      .map((t) => ({
        at: t.at instanceof Date ? t.at.toISOString() : String(t.at),
        type: t.type,
        path: t.path,
        tab: t.tab,
        action: t.action,
        label: t.label,
      })),
  }));

  return {
    windowDays,
    fromDate: isoDay(from),
    toDate: isoDay(to),
    sessions: docs.length,
    memberSessions,
    anonSessions,
    uniqueMembers: memberIds.size,
    avgDurationMs,
    medianDurationMs: median(durations),
    totalPageViews,
    totalClicks,
    totalActions,
    topPages: topEntries(pathViews, 15).map(({ key, count }) => ({
      path: key,
      views: count,
      sessions: pathSessions[key] ?? 0,
    })),
    topTabs: topEntries(tabViews, 12).map(({ key, count }) => ({ tab: key, views: count })),
    topActions: topEntries(actionTotals, 20).map(({ key, count }) => ({
      action: key,
      count,
    })),
    bySource: topEntries(sourceCounts, 10).map(({ key, count }) => ({
      source: key,
      sessions: count,
    })),
    recentSessions,
  };
}
