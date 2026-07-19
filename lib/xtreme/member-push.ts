/**
 * Avisos push del Member OS (por socio / dispositivo).
 * Independiente del correo: solo llega a quien activó push en su celular.
 * Nunca debe tumbar la acción del socio — errores se loguean y se ignoran.
 */
import type { Db } from "mongodb";
import { sendMemberPush } from "@/lib/helpers/push";

export type MemberPushEvent =
  | {
      type: "workout_done";
      trainingName: string;
      streak?: number;
      minutes?: number;
    }
  | {
      type: "plan_finished";
      trainingName: string;
      minutes?: number;
    }
  | {
      type: "badge_earned";
      badgeNames: string[];
    }
  | {
      type: "reservation_booked";
      trainingName: string;
      trainingDate: string;
    }
  | {
      type: "reservation_cancelled";
      trainingName: string;
      trainingDate: string;
    }
  | {
      type: "metric_logged";
      weightKg?: number;
    }
  | {
      type: "weekly_goal_hit";
      weekCount: number;
      weeklyGoal: number;
    }
  | {
      type: "class_reminder";
      trainingName: string;
      minutesUntil: number;
      startLabel: string;
    }
  | {
      type: "visit_checked_in";
    };

function payloadFor(event: MemberPushEvent): {
  title: string;
  body: string;
  url: string;
  tag: string;
} {
  switch (event.type) {
    case "workout_done":
      return {
        title: "Entreno registrado 💪",
        body: event.streak
          ? `${event.trainingName} listo. Racha: ${event.streak} día${event.streak === 1 ? "" : "s"}.`
          : `${event.trainingName} quedó en tu historial. ¡Pura vida!`,
        url: "/app",
        tag: "xtreme-workout",
      };
    case "plan_finished":
      return {
        title: "Plan del coach completado 🎯",
        body: `${event.trainingName}${
          event.minutes ? ` · ${event.minutes} min` : ""
        }. Buen trabajo.`,
        url: "/app",
        tag: "xtreme-plan",
      };
    case "badge_earned": {
      const names = event.badgeNames.filter(Boolean).slice(0, 3);
      return {
        title: names.length > 1 ? "¡Nuevos badges! 🏆" : "¡Nuevo badge! 🏆",
        body: names.length
          ? `Desbloqueaste: ${names.join(" · ")}`
          : "Desbloqueaste un logro nuevo en Xtreme.",
        url: "/app",
        tag: "xtreme-badge",
      };
    }
    case "reservation_booked":
      return {
        title: "Reserva confirmada 📅",
        body: `${event.trainingName} · ${event.trainingDate}. Te esperamos.`,
        url: "/app",
        tag: "xtreme-reserve",
      };
    case "reservation_cancelled":
      return {
        title: "Reserva cancelada",
        body: `${event.trainingName} del ${event.trainingDate} quedó libre.`,
        url: "/app",
        tag: "xtreme-reserve-cancel",
      };
    case "metric_logged":
      return {
        title: "Medidas guardadas 📏",
        body: event.weightKg
          ? `Registramos ${event.weightKg} kg. Seguimos el progreso.`
          : "Tu progreso corporal quedó actualizado.",
        url: "/app",
        tag: "xtreme-metrics",
      };
    case "weekly_goal_hit":
      return {
        title: "Meta semanal cumplida 🔥",
        body: `${event.weekCount}/${event.weeklyGoal} días esta semana. Sos una máquina.`,
        url: "/app",
        tag: "xtreme-weekly",
      };
    case "class_reminder":
      return {
        title: "Tu clase empieza pronto ⏰",
        body: `${event.trainingName} a las ${event.startLabel} (en ~${event.minutesUntil} min). ¡Nos vemos en Xtreme!`,
        url: "/app",
        tag: "xtreme-class-reminder",
      };
    case "visit_checked_in":
      return {
        title: "Ingreso registrado ✅",
        body: "Ya estás dentro. Que las máquinas no digan que solo viniste a saludar 😄 Al terminar, registrá tu salida.",
        url: "/app",
        tag: "xtreme-checkin",
      };
    default:
      return {
        title: "Xtreme Gym",
        body: "Tenés una actualización en tu app de socios.",
        url: "/app",
        tag: "xtreme-app",
      };
  }
}

/**
 * Envía un push al socio. Seguro de llamar sin await en rutas críticas
 * (o con void) para no retrasar la respuesta al cliente.
 */
export async function pushMemberEvent(
  db: Db,
  memberKey: string,
  event: MemberPushEvent,
): Promise<{ sent: number; attempted: number }> {
  const key = String(memberKey || "").trim();
  if (!key) return { sent: 0, attempted: 0 };

  try {
    const payload = payloadFor(event);
    const result = await sendMemberPush(db, key, {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      memberKey: key,
    });
    return { sent: result.sent, attempted: result.attempted };
  } catch (error) {
    console.error("XTREME MEMBER PUSH", event.type, error);
    return { sent: 0, attempted: 0 };
  }
}

/** Fire-and-forget: no bloquea el handler HTTP. */
export function queuePushMemberEvent(db: Db, memberKey: string, event: MemberPushEvent) {
  void pushMemberEvent(db, memberKey, event);
}

export function badgeNamesFromNewBadges(newBadges: unknown): string[] {
  if (!Array.isArray(newBadges)) return [];
  return newBadges
    .map((badge) => {
      if (!badge || typeof badge !== "object") return "";
      const name = (badge as { name?: unknown }).name;
      return typeof name === "string" ? name.trim() : "";
    })
    .filter(Boolean);
}
