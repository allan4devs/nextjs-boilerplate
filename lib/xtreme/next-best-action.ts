/**
 * Xtreme Gym — Phase 3 next-best action (rules v0).
 * Exactly one home-screen recommendation. Pure function, no I/O.
 */

export type NbaKind =
  | "train_today"
  | "protect_streak"
  | "renew_plan"
  | "book_class"
  | "coach_note"
  | "badge_progress"
  | "invite_buddy"
  | "second_visit"
  | "recovery";

export type NextBestAction = {
  kind: NbaKind;
  title: string;
  body: string;
  cta: string;
  href: string;
  priority: number;
};

export type NbaInput = {
  trainedToday: boolean;
  weekCount: number;
  weeklyGoal: number;
  streak: number;
  freezesAvailable: number;
  daysRemaining: number;
  membershipStatus: "active" | "warning" | "expired" | string;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
  today: string;
  hasUnseenCoachNote?: boolean;
  nextBadgeName?: string | null;
  nextBadgeRemaining?: number | null;
  nextReservationLabel?: string | null;
  nextReservationHref?: string | null;
  buddyInviteAvailable?: boolean;
};

function dateDiffDays(laterIso: string, earlierIso: string) {
  const later = Date.parse(`${laterIso}T00:00:00.000Z`);
  const earlier = Date.parse(`${earlierIso}T00:00:00.000Z`);
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return 999;
  return Math.floor((later - earlier) / 86_400_000);
}

/**
 * Pick the single highest-priority action for the home card.
 * Lower priority number = more urgent.
 */
export function pickNextBestAction(input: NbaInput): NextBestAction {
  const candidates: NextBestAction[] = [];

  if (input.membershipStatus === "expired" || input.daysRemaining <= 0) {
    candidates.push({
      kind: "renew_plan",
      title: "Tu plan está vencido",
      body: "Podés revisar los planes y elegir cómo querés continuar.",
      cta: "Ver planes",
      href: "/precios#inscripcion",
      priority: 1,
    });
  } else if (input.daysRemaining <= 5) {
    candidates.push({
      kind: "renew_plan",
      title: `Renovación en ${input.daysRemaining} día${input.daysRemaining === 1 ? "" : "s"}`,
      body: "Revisá las opciones con tiempo y elegí la que mejor te funcione.",
      cta: "Ver opciones",
      href: "/precios#inscripcion",
      priority: 2,
    });
  }

  if (input.hasUnseenCoachNote) {
    candidates.push({
      kind: "coach_note",
      title: "Tu coach te dejó una nota",
      body: "Leela y seguí el plan. Los que responden entrenan más.",
      cta: "Ver nota",
      href: "#plan",
      priority: 3,
    });
  }

  if (!input.trainedToday && input.streak >= 3) {
    candidates.push({
      kind: "protect_streak",
      title: `Protegé tu racha de ${input.streak} días`,
      body:
        input.freezesAvailable > 0
          ? `Entrená hoy o usá un protector (${input.freezesAvailable} disponible${input.freezesAvailable === 1 ? "" : "s"}).`
          : "Entrená hoy antes de que se rompa la cadena.",
      cta: "Marcar entreno de hoy",
      href: "#entrenar-hoy",
      priority: 4,
    });
  }

  if (input.totalWorkouts === 1) {
    candidates.push({
      kind: "second_visit",
      title: "Segundo entreno esta semana",
      body: "El hábito se traba en la visita 2. Reservá o marcá el próximo.",
      cta: "Seguir entrenando",
      href: "#entrenar-hoy",
      priority: 5,
    });
  }

  if (input.nextReservationLabel) {
    candidates.push({
      kind: "book_class",
      title: "Tu próxima clase",
      body: input.nextReservationLabel,
      cta: "Ver reserva",
      href: input.nextReservationHref || "#clases",
      priority: 6,
    });
  }

  if (!input.trainedToday && input.weekCount < input.weeklyGoal) {
    const left = Math.max(0, input.weeklyGoal - input.weekCount);
    candidates.push({
      kind: "train_today",
      title: `Meta semanal: ${input.weekCount}/${input.weeklyGoal}`,
      body: left === 1 ? "Te falta 1 entreno para cerrar la semana." : `Te faltan ${left} entrenos esta semana.`,
      cta: "Marcar entreno de hoy",
      href: "#entrenar-hoy",
      priority: 7,
    });
  }

  if (
    input.nextBadgeName &&
    input.nextBadgeRemaining != null &&
    input.nextBadgeRemaining > 0 &&
    input.nextBadgeRemaining <= 3
  ) {
    candidates.push({
      kind: "badge_progress",
      title: `Casi: ${input.nextBadgeName}`,
      body: `Te faltan ${input.nextBadgeRemaining} para el logro.`,
      cta: "Seguir sumando",
      href: "#entrenar-hoy",
      priority: 8,
    });
  }

  if (input.buddyInviteAvailable) {
    candidates.push({
      kind: "invite_buddy",
      title: "Invitá a un compa",
      body: "Entrenar en pareja sube la constancia. Mandá una solicitud.",
      cta: "Ir a comunidad",
      href: "/app/comunidad",
      priority: 9,
    });
  }

  if (input.trainedToday && input.weekCount >= input.weeklyGoal) {
    candidates.push({
      kind: "recovery",
      title: "Semana en verde",
      body: "Meta cumplida. Descansá bien o sumá una clase suave.",
      cta: "Ver clases",
      href: "#clases",
      priority: 10,
    });
  }

  // Comeback if inactive 3+ days and not already covered
  if (input.lastWorkoutDate) {
    const gap = dateDiffDays(input.today, input.lastWorkoutDate);
    if (gap >= 3 && !input.trainedToday) {
      candidates.push({
        kind: "train_today",
        title: "Volvé hoy",
        body: `Llevás ${gap} días sin marcar entreno. Un solo check y listo.`,
        cta: "Marcar entreno de hoy",
        href: "#entrenar-hoy",
        priority: 4,
      });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority || a.kind.localeCompare(b.kind));
  return (
    candidates[0] ?? {
      kind: "train_today",
      title: "Tu siguiente paso",
      body: "Abrí la app, marcá el entreno y sumá XP.",
      cta: "Ir a entrenar",
      href: "#entrenar-hoy",
      priority: 99,
    }
  );
}
