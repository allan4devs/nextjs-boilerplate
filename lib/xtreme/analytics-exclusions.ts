/**
 * Exclusiones de analytics internas (dueño / QA).
 * Allan Rojas prueba el app, admin y el sitio; sus sesiones no deben
 * inflar bitácora de uso ni growth (app_opened, login funnel, etc.).
 */
import type { Db } from "mongodb";

/** Misma colección que session-analytics (evita import circular). */
const SESSION_LOGS_COLLECTION = "xtreme_gym_session_logs";

/** Fichas de socio usadas para probar el Member OS. */
export const INTERNAL_ANALYTICS_MEMBER_IDS = [
  "ALLAN ROJAS DURAN",
  "ALLAN ROJAS",
] as const;

/**
 * Anon IDs estables de browsers de Allan (localStorage `xtreme-anon-id`).
 * Se amplían en runtime con anons que alguna vez se vincularon a esas fichas.
 */
export const INTERNAL_ANALYTICS_ANON_IDS_SEED = [
  "anon-d27cc3f7adab4cf6",
  "anon-60178ba9f7fe4b43",
  "anon-a7d6340f521c4148",
  "anon-r52zu7qfss",
  "anon-gwloglc358",
  "anon-yd3x89t85u",
  "anon-4gdpj44dow",
  "anon-9jgh4yqlc2",
  "anon-s8e43yb808",
  "anon-gp1s4ikcaq",
  "anon-eebb13350f5f4e4b",
  "anon-2fde1a4b10814ae9",
  "anon-t58zx0lmxy",
  "anon-np2r323rvv",
  "anon-06vaninvnq",
] as const;

function normId(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normAnon(value: unknown) {
  return String(value ?? "").trim();
}

/** ¿Es una ficha interna de prueba (Allan Rojas…)? */
export function isInternalMemberId(memberId: unknown): boolean {
  const id = normId(memberId);
  if (!id) return false;
  if ((INTERNAL_ANALYTICS_MEMBER_IDS as readonly string[]).includes(id)) return true;
  // Variantes: "ALLAN ROJAS", "ALLAN ROJAS DURAN", typos de espacios
  return id === "ALLAN ROJAS" || id.startsWith("ALLAN ROJAS ");
}

export function isInternalMemberName(memberName: unknown): boolean {
  const name = normId(memberName);
  if (!name) return false;
  return name === "ALLAN ROJAS" || name.startsWith("ALLAN ROJAS ");
}

export function isInternalAnonymousId(
  anonymousId: unknown,
  knownAnons?: ReadonlySet<string>,
): boolean {
  const anon = normAnon(anonymousId);
  if (!anon) return false;
  if ((INTERNAL_ANALYTICS_ANON_IDS_SEED as readonly string[]).includes(anon)) return true;
  return Boolean(knownAnons?.has(anon));
}

/**
 * Sujeto de analytics a excluir (sesión o evento).
 * - memberId / nombre de Allan
 * - anonymousId de sus browsers
 */
export function isInternalAnalyticsSubject(
  args: {
    memberId?: string | null;
    memberName?: string | null;
    anonymousId?: string | null;
  },
  knownAnons?: ReadonlySet<string>,
): boolean {
  if (isInternalMemberId(args.memberId)) return true;
  if (isInternalMemberName(args.memberName)) return true;
  if (isInternalAnonymousId(args.anonymousId, knownAnons)) return true;
  return false;
}

let cachedAnons: { at: number; ids: Set<string> } | null = null;
const ANON_CACHE_MS = 5 * 60_000;

/**
 * Carga anons que en algún momento se usaron logueados como ficha interna.
 * Así un browser nuevo de Allan se excluye en cuanto abra el app una vez.
 */
export async function loadInternalAnonymousIds(db: Db): Promise<Set<string>> {
  const now = Date.now();
  if (cachedAnons && now - cachedAnons.at < ANON_CACHE_MS) {
    return cachedAnons.ids;
  }

  const ids = new Set<string>(INTERNAL_ANALYTICS_ANON_IDS_SEED);
  try {
    const linked = await db.collection(SESSION_LOGS_COLLECTION).distinct("anonymousId", {
      memberId: { $in: [...INTERNAL_ANALYTICS_MEMBER_IDS] },
      anonymousId: { $type: "string", $ne: "" },
    });
    for (const a of linked) {
      const n = normAnon(a);
      if (n) ids.add(n);
    }
  } catch (err) {
    console.error("ANALYTICS EXCLUSIONS loadInternalAnonymousIds", err);
  }

  cachedAnons = { at: now, ids };
  return ids;
}
