/**
 * Avisos push del Member OS (por socio / dispositivo).
 * Independiente del correo: solo llega a quien activó push en su celular.
 * Nunca debe tumbar la acción del socio - errores se loguean y se ignoran.
 */
import type { Db } from "mongodb";
import { sendMemberPush, type PushPayload } from "@/lib/helpers/push";

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
    }
  | {
      type: "streak_warning";
      streak: number;
    }
  | {
      type: "visit_reminder_checkout";
      elapsedMinutes: number;
    }
  | {
      type: "membership_expiring";
      daysRemaining: number;
      plan?: string;
    }
  | {
      type: "membership_renewed";
      plan?: string;
    }
  | {
      type: "trainer_plan_assigned";
      planName: string;
    }
  | {
      type: "referral_reward";
    }
  | {
      type: "level_up";
      level: number;
    };

function payloadFor(event: MemberPushEvent): PushPayload {
  switch (event.type) {
    case "workout_done":
      return {
        title: "¡Entreno registrado! 💪",
        body: event.streak
          ? `${event.trainingName} listo. ¡Llevás ${event.streak} día${event.streak === 1 ? "" : "s"} seguidos en fuego! 🔥`
          : `${event.trainingName} guardado en tu historial. ¡Buen trabajo hoy!`,
        url: "/app?tab=comunidad",
        tag: "xtreme-workout",
        actions: [{ action: "streak", title: "Ver racha 🔥" }],
        actionUrls: { streak: "/app?tab=comunidad" },
      };
    case "plan_finished":
      return {
        title: "¡Plan del coach completado! 🎯",
        body: `${event.trainingName}${
          event.minutes ? ` · ${event.minutes} min` : ""
        }. ¡Misión cumplida en Xtreme Gym!`,
        url: "/app?tab=entrenar",
        tag: "xtreme-plan",
      };
    case "badge_earned": {
      const names = event.badgeNames.filter(Boolean).slice(0, 3);
      return {
        title: names.length > 1 ? "¡Nuevos badges desbloqueados! 🏆" : "¡Nuevo badge desbloqueado! 🏆",
        body: names.length
          ? `Desbloqueaste: ${names.join(" · ")}. ¡Sos imparable!`
          : "Desbloqueaste un nuevo logro en tu perfil.",
        url: "/app?tab=comunidad",
        tag: "xtreme-badge",
      };
    }
    case "reservation_booked":
      return {
        title: "¡Reserva confirmada! 📅",
        body: `${event.trainingName} · ${event.trainingDate}. Te esperamos en Xtreme Gym.`,
        url: "/app?tab=clases",
        tag: "xtreme-reserve",
        actions: [{ action: "view", title: "Ver reserva 📅" }],
        actionUrls: { view: "/app?tab=clases" },
      };
    case "reservation_cancelled":
      return {
        title: "Reserva liberada 🔄",
        body: `Tu lugar en ${event.trainingName} (${event.trainingDate}) quedó cancelado.`,
        url: "/app?tab=clases",
        tag: "xtreme-reserve-cancel",
      };
    case "metric_logged":
      return {
        title: "Avances corporales guardados 📏",
        body: event.weightKg
          ? `Registramos ${event.weightKg} kg. ¡Cada paso suma en tu transformación!`
          : "Tu progreso corporal quedó actualizado.",
        url: "/app?tab=progreso",
        tag: "xtreme-metrics",
      };
    case "weekly_goal_hit":
      return {
        title: "¡Meta semanal cumplida! 🔥",
        body: `${event.weekCount}/${event.weeklyGoal} días completados esta semana. ¡Sos pura disciplina!`,
        url: "/app",
        tag: "xtreme-weekly",
      };
    case "class_reminder":
      return {
        title: "⏰ Tu clase empieza pronto",
        body: `${event.trainingName} a las ${event.startLabel} (en ~${event.minutesUntil} min). ¡Nos vemos en el gym!`,
        url: "/app?tab=clases",
        tag: "xtreme-class-reminder",
        renotify: true,
        requireInteraction: true,
        vibrate: [150, 75, 150, 75, 150],
        actions: [{ action: "view_class", title: "Ver clase 🧘" }],
        actionUrls: { view_class: "/app?tab=clases" },
      };
    case "visit_checked_in":
      return {
        title: "¡Ingreso registrado! ✅",
        body: "Ya estás dentro de Xtreme Gym. ¡A romperla hoy! Recordá marcar tu salida al terminar.",
        url: "/app?action=checkout",
        tag: "xtreme-checkin",
        actions: [{ action: "checkout", title: "Marcar Salida 🚪" }],
        actionUrls: { checkout: "/app?action=checkout" },
      };
    case "streak_warning":
      return {
        title: `⚠️ ¡Tu racha de ${event.streak} días está en riesgo!`,
        body: `Aún no has registrado entreno hoy. ¡No dejes apagar tu racha de ${event.streak} días!`,
        url: "/app?action=workout",
        tag: "xtreme-streak-warning",
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [{ action: "train", title: "Entrenar ahora 💪" }],
        actionUrls: { train: "/app?tab=entrenar" },
      };
    case "visit_reminder_checkout":
      return {
        title: "🚪 ¿Ya terminaste tu entreno?",
        body: `Llevás ~${event.elapsedMinutes} min en el gym. Registrá tu salida para liberar espacio.`,
        url: "/app?action=checkout",
        tag: "xtreme-checkout-reminder",
        renotify: true,
        vibrate: [100, 50, 100],
        actions: [{ action: "checkout", title: "Registrar Salida 🚪" }],
        actionUrls: { checkout: "/app?action=checkout" },
      };
    case "membership_expiring":
      return {
        title: event.daysRemaining <= 1 ? "⚠️ Tu membresía vence hoy" : `⏳ Tu membresía vence en ${event.daysRemaining} día(s)`,
        body: `Renová tu plan${event.plan ? ` ${event.plan}` : ""} para mantener tu acceso y conservar tus rachas sin interrupciones.`,
        url: "/app?modal=checkout",
        tag: "xtreme-membership-expiring",
        actions: [{ action: "renew", title: "Renovar ahora 💳" }],
        actionUrls: { renew: "/app?modal=checkout" },
      };
    case "membership_renewed":
      return {
        title: "🚀 ¡Membresía renovada!",
        body: `Tu plan${event.plan ? ` ${event.plan}` : ""} ya está activo. ¡Gracias por seguir en la familia Xtreme Gym!`,
        url: "/app",
        tag: "xtreme-membership-renewed",
      };
    case "trainer_plan_assigned":
      return {
        title: "📋 ¡Nueva rutina de tu trainer!",
        body: `Tu coach te asignó la rutina '${event.planName}'. Tocá para ver los ejercicios de hoy.`,
        url: "/app?tab=entrenar",
        tag: "xtreme-trainer-plan",
        actions: [{ action: "plan", title: "Ver rutina 🏋️" }],
        actionUrls: { plan: "/app?tab=entrenar" },
      };
    case "referral_reward":
      return {
        title: "🎁 ¡Ganaste 7 días gratis!",
        body: "Tu invitado completó su primer ingreso. Acabamos de sumar 7 días de regalo a tu membresía.",
        url: "/app?tab=perfil",
        tag: "xtreme-referral",
      };
    case "level_up":
      return {
        title: `⚡ ¡Subiste al Nivel ${event.level}!`,
        body: `¡Felicidades! Acumulaste suficiente XP para alcanzar el Nivel ${event.level}. ¡Seguí así!`,
        url: "/app?tab=comunidad",
        tag: "xtreme-level-up",
      };
    default:
      return {
        title: "Xtreme Gym 🏋️",
        body: "Tenés novedades en tu app de socios.",
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
      ...payload,
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
