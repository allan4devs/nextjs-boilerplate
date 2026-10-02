export function bounded(value: unknown, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.round(number))) : 0;
}
export function sanitizeTracking(input: unknown) {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
  return {
    elapsedSeconds: bounded(raw.elapsedSeconds, 28800),
    startedAt: date(raw.startedAt), restUntil: date(raw.restUntil),
    logs: (Array.isArray(raw.logs) ? raw.logs : []).slice(0, 20).map((entry) => ({
      reps: bounded(entry?.reps, 500), seconds: bounded(entry?.seconds, 28800), weightKg: bounded(entry?.weightKg, 1000),
    })),
  };
}
export function elapsedSeconds(tracking: { elapsedSeconds: number; startedAt: string | null }, now: number) {
  return bounded(tracking.elapsedSeconds + (tracking.startedAt ? Math.max(0, Math.floor((now - Date.parse(tracking.startedAt)) / 1000)) : 0), 28800);
}
export function scannedAsset(value: string) {
  try {
    const url = new URL(value, "https://local.invalid");
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    const match = /^\/maquinas\/equipo\/([^/]+)\/?$/.exec(url.pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch { return null; }
}
