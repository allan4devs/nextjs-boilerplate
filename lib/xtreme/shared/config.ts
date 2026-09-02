export const MEMBERS_COLLECTION = "xtreme_gym_members";
export const RESERVATIONS_COLLECTION = "xtreme_gym_class_reservations";
export const PINS_COLLECTION = "xtreme_gym_pins";
export const PAYMENTS_COLLECTION = "xtreme_gym_payments";
export const CHECKINS_COLLECTION = "xtreme_gym_checkins";
export const OTPS_COLLECTION = "xtreme_gym_otps";
export const PENDING_REGISTRATIONS_COLLECTION = "xtreme_gym_pending_registrations";
export const AUDIT_COLLECTION = "xtreme_gym_audit";
export const OPS_ALERTS_COLLECTION = "xtreme_gym_ops_alerts";
export const BADGES_COLLECTION = "xtreme_gym_badges";
export const REFERRALS_COLLECTION = "xtreme_gym_referrals";
export const BUDDY_REQUESTS_COLLECTION = "xtreme_gym_buddy_requests";
export const SESSIONS_COLLECTION = "xtreme_gym_sessions";
export const STAFF_SESSIONS_COLLECTION = "xtreme_gym_staff_sessions";
export const ENTITLEMENTS_COLLECTION = "xtreme_gym_entitlements";
export const ENTITLEMENT_LEDGER_COLLECTION = "xtreme_gym_entitlement_ledger";
export const CLASS_TEMPLATES_COLLECTION = "xtreme_gym_class_templates";
export const CLASS_SESSIONS_COLLECTION = "xtreme_gym_class_sessions";
export const BOOKINGS_COLLECTION = "xtreme_gym_bookings";
export const WAITLIST_COLLECTION = "xtreme_gym_waitlist";
export const PAYPAL_ORDERS_COLLECTION = "xtreme_gym_paypal_orders";
export const CHAT_SESSIONS_COLLECTION = "xtreme_gym_chat_sessions";
export const CHAT_MESSAGES_COLLECTION = "xtreme_gym_chat_messages";
export const MEMBER_LIFESTYLE_COLLECTION = "xtreme_gym_member_lifestyle";
export const EMAIL_CONTACTS_COLLECTION = "xtreme_gym_email_contacts";
export const EMAIL_CAMPAIGNS_COLLECTION = "xtreme_gym_email_campaigns";
export const EMAIL_CAMPAIGN_DELIVERIES_COLLECTION = "xtreme_gym_email_campaign_deliveries";
export const EMAIL_SUPPRESSIONS_COLLECTION = "xtreme_gym_email_suppressions";
export const PRODUCT_INVENTORY_COLLECTION = "xtreme_gym_product_inventory";
export const PRODUCT_SALES_COLLECTION = "xtreme_gym_product_sales";
export const RECEPTION_CONTROLS_COLLECTION = "xtreme_gym_reception_controls";
export const RECEPTION_DUTIES_COLLECTION = "xtreme_gym_reception_duties";
/** Cierres de caja de recepción: cada doc es un turno cerrado [from, to). */
export const CASH_CLOSEOUTS_COLLECTION = "xtreme_gym_cash_closeouts";
/** PIN de mostrador por operador (hash), aparte de los códigos de admin/env. */
export const STAFF_RECEPTION_PINS_COLLECTION = "xtreme_gym_staff_reception_pins";
export const FACE_TEMPLATES_COLLECTION = "xtreme_gym_face_templates";
/** Mapa enrollid (terminal física de la puerta) → normalizedName del socio. */
export const FACE_TERMINAL_MAP_COLLECTION = "xtreme_gym_face_terminal_map";
export const HABIT_LOGS_COLLECTION = "xtreme_gym_habit_logs";
/** Bitácora de todo correo saliente (transaccional y de campaña). */
export const EMAIL_LOG_COLLECTION = "xtreme_gym_email_log";
/** Reserva idempotente por socio + ciclo para no duplicar recordatorios de pago. */
export const PAYMENT_REMINDERS_COLLECTION = "xtreme_gym_payment_reminders";
/** Notas internas de staff sobre un socio, con autor y fecha. */
export const MEMBER_NOTES_COLLECTION = "xtreme_gym_member_notes";

export const FREE_FIRST_DAY_OFFER_ID = "free-first-day";
export const FREE_FIRST_DAY_PLAN_LABEL = "Primer día gratis";
/** Max calendar days a day pass / free first day can sit unused before expiring (effectively unlimited until first gym check-in). */
export const DAY_PASS_HOLD_DAYS = 3650;
export const GYM_CAPACITY = 85;
export const PIN_PEPPER = "xtreme-gym-member-pin-v1";
/** Pepper propio del PIN de mostrador: no comparte hash con el PIN de socio. */
export const STAFF_RECEPTION_PIN_PEPPER = "xtreme-gym-staff-reception-pin-v1";

export type AdminRole = "admin" | "super";
export type StaffRole = "reception" | "trainer" | AdminRole;

function adminEnv(
  name: "XTREME_RECEPTION_CODE" | "XTREME_TRAINER_CODE" | "XTREME_ADMIN_CODE" | "XTREME_SUPER_ADMIN_CODE",
  devFallback: string,
) {
  const value = process.env[name]?.trim() ?? "";
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    console.error(`[xtreme] Missing required env ${name} - admin auth disabled for this role.`);
    return "";
  }
  console.warn(`[xtreme] ${name} not set; using dev fallback. Set it before production.`);
  return devFallback;
}

export const RECEPTION_CODE = adminEnv("XTREME_RECEPTION_CODE", "xtreme-reception");
export const TRAINER_CODE = adminEnv("XTREME_TRAINER_CODE", "xtreme-trainer");
export const ADMIN_CODE = adminEnv("XTREME_ADMIN_CODE", "xtreme-admin");
export const SUPER_ADMIN_CODE = adminEnv("XTREME_SUPER_ADMIN_CODE", "xtreme-super");

/**
 * PIN individuales de staff para códigos legacy (admin/trainer/VIP) vía env.
 * Sin fallback: en producción se configuran como secretos. El PIN de mostrador
 * es aparte y se guarda en Mongo (`STAFF_RECEPTION_PINS_COLLECTION`).
 */
export const STAFF_PINS = {
  allan: process.env.XTREME_ALLAN_PIN?.trim() ?? "",
  alejandro: process.env.XTREME_ALEJANDRO_PIN?.trim() ?? "",
  eileen: process.env.XTREME_EILEEN_PIN?.trim() ?? "",
  victoria: process.env.XTREME_VICTORIA_PIN?.trim() ?? "",
  valeska: process.env.XTREME_VALESKA_PIN?.trim() ?? "",
  kengie: process.env.XTREME_KENGIE_PIN?.trim() ?? "",
  josue: process.env.XTREME_JOSUE_PIN?.trim() ?? "",
  alberto: process.env.XTREME_ALBERTO_VIP_PIN?.trim() ?? "",
} as const;

export const TRAININGS = [
  { id: "fuerza-total", name: "Fuerza Total", capacity: 8 },
  { id: "hiit-quemador", name: "HIIT Quemador", capacity: 12 },
  { id: "glute-lab", name: "Glute Lab", capacity: 10 },
  { id: "xtreme-core", name: "Xtreme Core", capacity: 15 },
] as const;
