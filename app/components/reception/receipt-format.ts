// Helpers e identidad del comprobante térmico (AON Printer) compartidos entre la
// facturación de recepción (planes/pases) y el punto de venta de inventario.
// Editar acá si cambian los datos fiscales registrados en Latinsoft.

// Identidad fiscal del comprobante (tal como la imprime Latinsoft). El segundo
// correo y la cédula jurídica deben confirmarse contra Latinsoft; se dejan
// precargados según el comprobante real.
export const RECEIPT_HEADER = {
  name1: "Xtreme Gym San Carlos",
  name2: "Xtreme Gym San Carlos",
  address: "Alajuela, San Carlos, Ciudad Quesada, Barrio San Pablo, 300 m norte templo católico.",
  legalId: "3101686420",
  emails: ["xtremegymadm@gmail.com", "disagym@gmail.com"],
} as const;

const moneyFormat = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const colones = (value: number) => `₡${moneyFormat.format(value)}`;

// Fecha/hora en zona de Costa Rica → { date: "dd/mm/yyyy", time: "HH:MM" }.
export function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { date, time };
}

export function fmtIsoDate(ymd?: string | null) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return d && m && y ? `${d}/${m}/${y}` : ymd;
}

// Monto en letras (colones, mayúsculas, sin tildes al estilo Latinsoft).
export function numeroALetras(input: number): string {
  const num = Math.floor(Math.abs(Number(input) || 0));
  if (num === 0) return "CERO";
  const UNI = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const ESP = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDOS", "VEINTITRES", "VEINTICUATRO", "VEINTICINCO", "VEINTISEIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
  const DEC = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const CEN = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  const dos = (x: number): string => x < 10 ? UNI[x] : x <= 29 ? ESP[x - 10] : x % 10 === 0 ? DEC[Math.floor(x / 10)] : `${DEC[Math.floor(x / 10)]} Y ${UNI[x % 10]}`;
  const tres = (x: number): string => x === 100 ? "CIEN" : `${CEN[Math.floor(x / 100)]}${x % 100 ? `${Math.floor(x / 100) ? " " : ""}${dos(x % 100)}` : ""}`.trim();
  const apoc = (s: string) => s.replace(/VEINTIUNO$/, "VEINTIUN").replace(/UNO$/, "UN");
  const millones = Math.floor(num / 1_000_000);
  const miles = Math.floor((num % 1_000_000) / 1000);
  const resto = num % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLON" : `${apoc(tres(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${apoc(tres(miles))} MIL`);
  if (resto) partes.push(tres(resto));
  return partes.join(" ").replace(/\s+/g, " ").trim();
}
