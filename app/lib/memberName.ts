/**
 * Cómo se muestra el nombre de un socio. Una sola implementación para las tres
 * superficies (Member OS, recepción y el kiosco de ingreso): si el avatar del
 * mostrador y el de la app calcularan las iniciales distinto, la misma persona
 * se vería como dos.
 */

/** Iniciales para el avatar: primera letra del nombre y del primer apellido. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Primer nombre, para saludos y rótulos cortos donde no cabe el nombre entero. */
export function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}
