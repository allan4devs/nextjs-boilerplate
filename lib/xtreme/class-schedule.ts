const COSTA_RICA_OFFSET = "-06:00";

/** Check-in permitido desde X min antes del inicio. */
export const CLASS_CHECKIN_EARLY_MINUTES = 30;
/** Grace después del fin de clase para cerrar check-in. */
export const CLASS_CHECKIN_GRACE_MINUTES = 15;

type ClassSchedule = {
  hour: number;
  minute: number;
  /** Duración canónica en minutos (para ventana de check-in). */
  durationMin: number;
  /** 0 = domingo, 6 = sábado. Sin valor significa todos los días. */
  weekday?: number;
};

const CLASS_SCHEDULES: Record<string, ClassSchedule> = {
  "fuerza-total": { hour: 5, minute: 30, durationMin: 55 },
  "hiit-quemador": { hour: 18, minute: 0, durationMin: 35 },
  "glute-lab": { hour: 19, minute: 0, durationMin: 45 },
  "xtreme-core": { hour: 8, minute: 0, durationMin: 40, weekday: 6 },
};

function weekdayForIsoDate(date: string) {
  return new Date(`${date}T12:00:00${COSTA_RICA_OFFSET}`).getDay();
}

/** True si el trainingId es una clase grupal con horario fijo. */
export function isScheduledClass(trainingId: string) {
  return Boolean(CLASS_SCHEDULES[trainingId]);
}

/** Hora canónica de una clase en Costa Rica. Null = esa clase no se imparte ese día. */
export function classStartAt(trainingId: string, date: string) {
  const schedule = CLASS_SCHEDULES[trainingId];
  if (!schedule || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (schedule.weekday !== undefined && weekdayForIsoDate(date) !== schedule.weekday) return null;

  const hh = String(schedule.hour).padStart(2, "0");
  const mm = String(schedule.minute).padStart(2, "0");
  return new Date(`${date}T${hh}:${mm}:00${COSTA_RICA_OFFSET}`);
}

export function classDurationMin(trainingId: string, fallback = 55) {
  return CLASS_SCHEDULES[trainingId]?.durationMin ?? fallback;
}

/** Fin de clase (inicio + duración). Null si no se imparte ese día. */
export function classEndAt(trainingId: string, date: string) {
  const start = classStartAt(trainingId, date);
  if (!start) return null;
  return new Date(start.getTime() + classDurationMin(trainingId) * 60_000);
}

export type ClassCheckInWindow =
  | { status: "not_a_class" }
  | { status: "not_today" }
  | { status: "too_early"; startAt: Date; opensAt: Date; endsAt: Date }
  | { status: "open"; startAt: Date; opensAt: Date; endsAt: Date }
  | { status: "ended"; startAt: Date; opensAt: Date; endsAt: Date };

/**
 * Ventana de check-in de clase grupal (sin mirar reserva).
 * open = [start - early, end + grace]
 */
export function classCheckInWindow(
  trainingId: string,
  date: string,
  now: Date = new Date(),
): ClassCheckInWindow {
  if (!isScheduledClass(trainingId)) return { status: "not_a_class" };
  const startAt = classStartAt(trainingId, date);
  if (!startAt) return { status: "not_today" };

  const endAt = new Date(startAt.getTime() + classDurationMin(trainingId) * 60_000);
  const opensAt = new Date(startAt.getTime() - CLASS_CHECKIN_EARLY_MINUTES * 60_000);
  const endsAt = new Date(endAt.getTime() + CLASS_CHECKIN_GRACE_MINUTES * 60_000);

  if (now < opensAt) {
    return { status: "too_early", startAt, opensAt, endsAt };
  }
  if (now > endsAt) {
    return { status: "ended", startAt, opensAt, endsAt };
  }
  return { status: "open", startAt, opensAt, endsAt };
}

export function classTimeLabel(trainingId: string) {
  const schedule = CLASS_SCHEDULES[trainingId];
  if (!schedule) return "Horario por confirmar";
  const suffix = schedule.hour >= 12 ? "PM" : "AM";
  const hour = schedule.hour % 12 || 12;
  const time = `${hour}:${String(schedule.minute).padStart(2, "0")} ${suffix}`;
  return schedule.weekday === 6 ? `Sábado ${time}` : time;
}
