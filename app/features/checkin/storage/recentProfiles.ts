"use client";

/**
 * Últimos socios que entraron por este kiosco, en localStorage.
 *
 * Es puro atajo de mostrador: la tablet queda fija en la entrada y casi siempre
 * la siguiente persona es una de las últimas. Nunca guarda datos sensibles,
 * solo el nombre visible, y toda lectura tolera el storage bloqueado o corrupto
 * porque un kiosco no puede quedarse en blanco por eso.
 */
import { MAX_RECENT_PROFILES } from "../constants";

export type RecentProfile = { memberName: string };

const RECENT_KEY = "xtreme-ingreso-recientes";
/** Clave heredada de una sola persona; se usa como semilla si no hay lista. */
const LAST_KEY = "xtreme-gym-member-name";

export function readRecentProfiles(): RecentProfile[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw) return (JSON.parse(raw) as RecentProfile[]).slice(0, MAX_RECENT_PROFILES);
    const last = window.localStorage.getItem(LAST_KEY);
    return last ? [{ memberName: last }] : [];
  } catch {
    return [];
  }
}

/** Pone al socio de primero, sin duplicarlo, y devuelve la lista resultante. */
export function saveRecentProfile(memberName: string): RecentProfile[] {
  try {
    const current = readRecentProfiles().filter(
      (profile) => profile.memberName.toUpperCase() !== memberName.toUpperCase(),
    );
    const next = [{ memberName }, ...current].slice(0, MAX_RECENT_PROFILES);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.localStorage.setItem(LAST_KEY, memberName);
    return next;
  } catch {
    return [{ memberName }];
  }
}
