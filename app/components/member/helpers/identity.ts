// Las iniciales las calcula el helper compartido: el mismo socio tiene que
// verse igual en la app, en recepción y en el kiosco.
export { initialsOf } from "@/app/lib/memberName";

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}

export function formatCedulaInput(value: string) {
  const str = String(value ?? "");
  // Si contiene letras o '@', el usuario está escribiendo un correo electrónico
  if (/[a-zA-Z@]/.test(str)) {
    return str.trimStart().slice(0, 80);
  }
  // Si son solo números/guiones, formatear como cédula
  return str.replace(/[^\d-]/g, "").slice(0, 20);
}

export function memberCode(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100000000)
    .toString()
    .padStart(8, "0")
    .replace(/(\d{4})(\d{4})/, "$1 $2");
}
