/**
 * Tipos del kiosco de ingreso. Separados del componente para que las tarjetas
 * puedan tiparse contra ellos sin importar la pantalla entera.
 */

/** Qué está mostrando el kiosco: la ficha, la búsqueda por nombre, o la cámara. */
export type Mode = "profile" | "search" | "face";

/**
 * Etapas del guiado facial, en el orden en que las ve la persona: esperando,
 * cara detectada, sosteniendo la pose, escaneando, y la pausa posterior.
 */
export type FaceGuideStatus = "waiting" | "detected" | "locking" | "scanning" | "cooldown";

export type { RecentProfile } from "@/app/features/checkin/storage/recentProfiles";
