import { createHash, timingSafeEqual } from "crypto";
import {
  ADMIN_CODE,
  PIN_PEPPER,
  RECEPTION_CODE,
  SUPER_ADMIN_CODE,
  TRAINER_CODE,
  type AdminRole,
  type StaffRole,
  STAFF_PINS,
} from "./config";
import { STAFF_DIRECTORY, type StaffId } from "../staff-directory";

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 80);
}

export function normalizePhone(value: unknown) {
  return String(value ?? "").replace(/[^\d+]/g, "").slice(0, 24);
}

export function normalizeCedula(value: unknown) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
}

export function cedulaDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 20);
}

export function matchCedula(stored: unknown, raw: unknown) {
  const digits = cedulaDigits(raw);
  const formatted = normalizeCedula(raw);
  if (!digits && !formatted) return false;
  const docDigits = cedulaDigits(stored);
  const docFormatted = normalizeCedula(stored);
  if (!docDigits && !docFormatted) return false;
  // Una cédula es una credencial de identidad: nunca aceptar sufijos ni
  // coincidencias parciales. Dos documentos distintos pueden compartirlos.
  if (digits && docDigits && docDigits === digits) return true;
  return Boolean(formatted && docFormatted && docFormatted === formatted);
}

export function findMemberByCedula<T extends { cedula?: string }>(docs: T[], raw: string): T | undefined {
  return docs.find((doc) => matchCedula(doc.cedula, raw));
}

export function hammingHexDistance(a: string, b: string) {
  const left = String(a || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  const right = String(b || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  if (!left || !right || left.length !== right.length) return 64;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let xor = parseInt(left[index], 16) ^ parseInt(right[index], 16);
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Correo usable para OTP, lifecycle y avisos sensibles.
 * Los importados del Excel vienen con emailVerified=false (y muchos están
 * traslapados); solo confiamos en correos confirmados por magic link / recepción.
 */
export function memberEmailIsTrusted(member: {
  email?: string | null;
  emailVerified?: boolean | null;
} | null | undefined) {
  const email = normalizeEmail(member?.email);
  return Boolean(email && isValidEmail(email) && member?.emailVerified === true);
}

/**
 * Correo al que se le puede mandar un código de acceso (OTP) para entrar o
 * crear el PIN. A diferencia de `memberEmailIsTrusted`, NO exige que el correo
 * ya esté verificado por magic link: mandar el código y que el socio lo digite
 * correctamente ES la verificación. Así no dejamos afuera a los importados
 * (emailVerified=false) que sí tienen un correo válido en la ficha; entran con
 * cédula + código al correo, sin tener que pasar por recepción.
 * Devuelve el correo normalizado listo para enviar, o "" si no hay uno usable.
 */
export function memberLoginEmail(
  member: { email?: string | null } | null | undefined,
): string {
  const email = normalizeEmail(member?.email);
  return email && isValidEmail(email) ? email : "";
}

export function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

export function hashPin(pin: string, normalizedName: string) {
  return createHash("sha256").update(`${normalizedName}|${pin}|${PIN_PEPPER}`).digest("hex");
}

export function memberAccessCode(normalizedName: string) {
  let hash = 0;
  const key = normalizeKey(normalizedName) || "XTREME01";
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100_000_000).toString().padStart(8, "0");
}

export function formatAccessCode(code: string) {
  const digits = code.replace(/\D/g, "").padStart(8, "0").slice(0, 8);
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

function safeCodeEqual(value: string, expected: string) {
  if (!expected) return false;
  const actualHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function resolveAdminRole(code: string): AdminRole | null {
  const value = code.trim();
  if (!value) return null;
  if (safeCodeEqual(value, SUPER_ADMIN_CODE)) return "super";
  if (safeCodeEqual(value, ADMIN_CODE)) return "admin";
  return null;
}

export function resolveStaffRole(
  code: string,
  allowedRoles: readonly StaffRole[] = ["super", "admin", "reception", "trainer"],
): StaffRole | null {
  const value = code.trim();
  if (!value) return null;
  if (allowedRoles.includes("super") && safeCodeEqual(value, SUPER_ADMIN_CODE)) return "super";
  if (allowedRoles.includes("admin") && safeCodeEqual(value, ADMIN_CODE)) return "admin";
  if (allowedRoles.includes("reception") && safeCodeEqual(value, RECEPTION_CODE)) return "reception";
  if (allowedRoles.includes("trainer") && safeCodeEqual(value, TRAINER_CODE)) return "trainer";
  return null;
}

export type StaffCredential = { id: StaffId | null; name: string | null; role: StaffRole };

/** Resuelve primero PIN individual y conserva códigos legacy durante la transición. */
export function resolveStaffCredential(
  code: string,
  allowedRoles: readonly StaffRole[] = ["super", "admin", "reception", "trainer"],
): StaffCredential | null {
  const value = code.trim();
  if (!value) return null;
  for (const person of STAFF_DIRECTORY) {
    if (person.role === "vip_admin" || !allowedRoles.includes(person.role)) continue;
    if (safeCodeEqual(value, STAFF_PINS[person.id])) {
      return { id: person.id, name: person.name, role: person.role };
    }
  }
  const role = resolveStaffRole(value, allowedRoles);
  return role ? { id: null, name: null, role } : null;
}
