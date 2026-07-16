const COSTA_RICA_OFFSET = "-06:00";

type ClassSchedule = {
  hour: number;
  minute: number;
  /** 0 = domingo, 6 = sábado. Sin valor significa todos los días. */
  weekday?: number;
};

const CLASS_SCHEDULES: Record<string, ClassSchedule> = {
  "fuerza-total": { hour: 5, minute: 30 },
  "hiit-quemador": { hour: 18, minute: 0 },
  "glute-lab": { hour: 19, minute: 0 },
  "xtreme-core": { hour: 8, minute: 0, weekday: 6 },
};

function weekdayForIsoDate(date: string) {
  return new Date(`${date}T12:00:00${COSTA_RICA_OFFSET}`).getDay();
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

export function classTimeLabel(trainingId: string) {
  const schedule = CLASS_SCHEDULES[trainingId];
  if (!schedule) return "Horario por confirmar";
  const suffix = schedule.hour >= 12 ? "PM" : "AM";
  const hour = schedule.hour % 12 || 12;
  const time = `${hour}:${String(schedule.minute).padStart(2, "0")} ${suffix}`;
  return schedule.weekday === 6 ? `Sábado ${time}` : time;
}
