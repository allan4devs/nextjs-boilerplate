/**
 * Puente entre la terminal física de rostro y el sistema limpio de Xtreme.
 *
 * Lee los rostros que la terminal reconoció (`pullTerminalLog`), resuelve cada
 * uno a un socio de Mongo y registra el ingreso. La resolución es agnóstica al
 * esquema del equipo, así funciona sin importar qué haya dado el chequeo:
 *
 *   1. por CÉDULA  — si el enrollid es (o contiene) la cédula del socio.
 *   2. por MAPA    — tabla enrollid → normalizedName (para ids internos).
 *   3. por NOMBRE  — último recurso, usando el nombre que guarda el equipo.
 *
 * Cada rostro termina en uno de cuatro estados, cada uno con un mensaje listo
 * para mostrarle a recepción: detectado, ya-adentro, sin-ligar, o error.
 */
import type { Db } from "mongodb";
import {
  CHECKINS_COLLECTION,
  FACE_TERMINAL_MAP_COLLECTION,
  MEMBERS_COLLECTION,
  type CheckinDoc,
  type MemberDoc,
  formatAccessCode,
  isCheckinOpen,
  memberAccessCode,
  membershipStatus,
  todayIso,
} from "@/lib/xtreme/shared";
import { digitsOnly } from "@/lib/xtreme/shared/lookup-query";
import { resolveMember } from "@/lib/xtreme/members/resolve-member";
import { recordEvent } from "@/lib/xtreme/events";
import {
  pullTerminalLog,
  TerminalError,
  type TerminalErrorReason,
  type TerminalScan,
} from "./terminal-client";

export type TerminalMatchedBy = "cedula" | "map" | "name";

export type TerminalOutcomeKind = "detected" | "already_inside" | "unlinked" | "error";

export type TerminalOutcome = {
  kind: TerminalOutcomeKind;
  enrollid: string;
  /** Nombre que la terminal tiene para ese enrollid. */
  terminalName: string;
  /** Veces que apareció en esta corrida. */
  scans: number;
  time: string;
  member: { memberName: string; normalizedName: string; membershipStatus: string } | null;
  matchedBy?: TerminalMatchedBy;
  /** Mensaje para recepción, en español. */
  message: string;
};

export type TerminalSyncSummary = {
  processed: number;
  detected: number;
  alreadyInside: number;
  unlinked: number;
  errors: number;
  /** Renglón "todo" — resumen de la corrida. */
  message: string;
};

export type TerminalSyncResult = {
  ok: boolean;
  outcomes: TerminalOutcome[];
  summary: TerminalSyncSummary;
  /** Falla a nivel equipo: no se pudo leer nada. */
  deviceError?: { reason: TerminalErrorReason; message: string };
};

type ResolvedTerminalMember = {
  member: MemberDoc;
  memberKey: string;
  matchedBy: TerminalMatchedBy;
};

/** enrollid → socio, probando cédula, luego el mapa manual, luego el nombre. */
async function resolveTerminalMember(
  db: Db,
  scan: TerminalScan,
): Promise<ResolvedTerminalMember | null> {
  // 1) Cédula: el enrollid es la cédula (o la contiene) para la mayoría de gimnasios.
  const cedula = digitsOnly(scan.enrollid);
  if (cedula.length >= 6) {
    const byCedula = await resolveMember(db, { cedula, strictCedula: true });
    if (byCedula) {
      return { member: byCedula.member, memberKey: byCedula.memberKey, matchedBy: "cedula" };
    }
  }

  // 2) Mapa manual enrollid → normalizedName (para equipos con id interno).
  const mapped = await db
    .collection<{ enrollid: string; normalizedName: string }>(FACE_TERMINAL_MAP_COLLECTION)
    .findOne({ enrollid: scan.enrollid });
  if (mapped?.normalizedName) {
    const doc = await db
      .collection<MemberDoc>(MEMBERS_COLLECTION)
      .findOne({ normalizedName: mapped.normalizedName });
    if (doc?.memberName) {
      return { member: doc, memberKey: mapped.normalizedName, matchedBy: "map" };
    }
  }

  // 3) Nombre que guarda el equipo — último recurso, exacto.
  if (scan.name) {
    const byName = await resolveMember(db, { memberName: scan.name, q: scan.name });
    if (byName) {
      return { member: byName.member, memberKey: byName.memberKey, matchedBy: "name" };
    }
  }

  return null;
}

/** Inserta el ingreso si no hay uno abierto hoy. Devuelve si fue nuevo o duplicado. */
async function fileTerminalCheckin(
  db: Db,
  resolved: ResolvedTerminalMember,
  scan: TerminalScan,
): Promise<{ duplicate: boolean; status: CheckinDoc["membershipStatus"] }> {
  const { member, memberKey } = resolved;
  const displayName = String(member.memberName || "").trim();
  const ms = membershipStatus(member.membership);
  const date = todayIso();

  const latest = await db
    .collection<CheckinDoc>(CHECKINS_COLLECTION)
    .findOne({ normalizedName: memberKey, date }, { sort: { checkedInAt: -1 } });
  if (latest && isCheckinOpen(latest)) {
    return { duplicate: true, status: ms.status };
  }

  const now = new Date();
  const checkin: CheckinDoc = {
    id: `chk-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    memberName: displayName,
    normalizedName: memberKey,
    accessCode: formatAccessCode(memberAccessCode(memberKey)),
    method: "face",
    membershipStatus: ms.status,
    date,
    checkedInAt: now,
    checkedOutAt: null,
    by: "reception",
    // Deja rastro de que vino del equipo y con qué enrollid, para auditar.
    note: `terminal:${scan.enrollid}`.slice(0, 120),
  };
  await db.collection<CheckinDoc>(CHECKINS_COLLECTION).insertOne(checkin);

  await recordEvent(db, {
    type: "checkin_completed",
    memberId: memberKey,
    source: "reception",
    entity: { type: "checkin", id: checkin.id },
    properties: { method: "face", via: "terminal", membershipStatus: ms.status, date },
  }).catch(() => {});

  return { duplicate: false, status: ms.status };
}

const firstName = (name: string) => name.split(" ")[0] || name;

/** Mensaje del socio detectado según el estado de su membresía. */
function detectedMessage(name: string, status: string, duplicate: boolean): string {
  const who = firstName(name);
  if (duplicate) return `ℹ️ ${who} ya estaba adentro.`;
  if (status === "expired") return `⚠️ ${who} · ingreso registrado, MEMBRESÍA VENCIDA — pasá por recepción.`;
  if (status === "warning") return `✅ ${who} · ingreso registrado (la membresía vence pronto).`;
  return `✅ ${who} · ingreso registrado.`;
}

function unlinkedMessage(scan: TerminalScan): string {
  const who = scan.name ? ` (${scan.name})` : "";
  return `🟨 Rostro sin socio · enrollid ${scan.enrollid}${who}. Ligá a esta persona a un socio para que su ingreso quede registrado.`;
}

/** Colapsa repeticiones del mismo enrollid en la corrida (mismo socio, varios frames). */
function collapse(scans: TerminalScan[]): (TerminalScan & { count: number })[] {
  const map = new Map<string, TerminalScan & { count: number }>();
  for (const scan of scans) {
    const prev = map.get(scan.enrollid);
    if (prev) {
      prev.count += 1;
      prev.time = scan.time || prev.time;
      if (!prev.name && scan.name) prev.name = scan.name;
    } else {
      map.set(scan.enrollid, { ...scan, count: 1 });
    }
  }
  return [...map.values()];
}

/**
 * Corre el puente una vez: lee el equipo, resuelve y registra. Con `dryRun` no
 * escribe ingresos (solo clasifica), para que recepción pueda previsualizar.
 */
export async function syncTerminalScans(
  db: Db,
  options: { dryRun?: boolean } = {},
): Promise<TerminalSyncResult> {
  const empty: TerminalSyncSummary = {
    processed: 0,
    detected: 0,
    alreadyInside: 0,
    unlinked: 0,
    errors: 0,
    message: "",
  };

  // ── Lectura del equipo ── caso "algo salió mal" a nivel terminal.
  let scans: TerminalScan[];
  try {
    scans = await pullTerminalLog();
  } catch (err) {
    const reason: TerminalErrorReason =
      err instanceof TerminalError ? err.reason : "device";
    const message = err instanceof Error ? err.message : "Error desconocido con la terminal.";
    return {
      ok: false,
      outcomes: [],
      summary: { ...empty, message: `🟥 ${message}` },
      deviceError: { reason, message },
    };
  }

  const distinct = collapse(scans);
  const outcomes: TerminalOutcome[] = [];

  for (const scan of distinct) {
    const base = {
      enrollid: scan.enrollid,
      terminalName: scan.name,
      scans: scan.count,
      time: scan.time,
    };
    try {
      const resolved = await resolveTerminalMember(db, scan);

      // ── Caso "falta / sin ligar" ──
      if (!resolved) {
        outcomes.push({ ...base, kind: "unlinked", member: null, message: unlinkedMessage(scan) });
        continue;
      }

      const memberInfo = {
        memberName: resolved.member.memberName || "",
        normalizedName: resolved.memberKey,
        membershipStatus: membershipStatus(resolved.member.membership).status,
      };

      // Previsualización: resuelto pero sin escribir.
      if (options.dryRun) {
        outcomes.push({
          ...base,
          kind: "detected",
          member: memberInfo,
          matchedBy: resolved.matchedBy,
          message: `${detectedMessage(memberInfo.memberName, memberInfo.membershipStatus, false)} (previsualización)`,
        });
        continue;
      }

      const filed = await fileTerminalCheckin(db, resolved, scan);

      // ── Caso "detectado" (y su variante "ya adentro") ──
      outcomes.push({
        ...base,
        kind: filed.duplicate ? "already_inside" : "detected",
        member: { ...memberInfo, membershipStatus: filed.status },
        matchedBy: resolved.matchedBy,
        message: detectedMessage(memberInfo.memberName, filed.status, filed.duplicate),
      });
    } catch (err) {
      // ── Caso "algo salió mal" por rostro ──
      const message = err instanceof Error ? err.message : "Error al procesar el rostro.";
      outcomes.push({ ...base, kind: "error", member: null, message: `🟥 ${message}` });
      console.error("XTREME TERMINAL SYNC scan", scan.enrollid, err);
    }
  }

  // ── Caso "todo" — resumen de la corrida ──
  const summary: TerminalSyncSummary = {
    processed: distinct.length,
    detected: outcomes.filter((o) => o.kind === "detected").length,
    alreadyInside: outcomes.filter((o) => o.kind === "already_inside").length,
    unlinked: outcomes.filter((o) => o.kind === "unlinked").length,
    errors: outcomes.filter((o) => o.kind === "error").length,
    message: "",
  };
  summary.message = distinct.length
    ? `Procesados ${summary.processed}: ${summary.detected} ingresos${
        summary.alreadyInside ? `, ${summary.alreadyInside} ya adentro` : ""
      }${summary.unlinked ? `, ${summary.unlinked} sin ligar` : ""}${
        summary.errors ? `, ${summary.errors} con error` : ""
      }.`
    : "Sin rostros nuevos en la terminal.";

  return { ok: true, outcomes, summary };
}
