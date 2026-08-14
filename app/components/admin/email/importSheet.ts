/**
 * Importación de contactos pegados desde una hoja de cálculo. Funciones puras:
 * entra texto crudo, salen filas limpias.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function splitRow(line: string, delimiter: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim());
      value = "";
    } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

export function parseSpreadsheet(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const delimiter = text.includes("\t") ? "\t" : text.includes(";") ? ";" : ",";
  const rows = lines.map((line) => splitRow(line, delimiter));
  const first = (rows[0] || []).map((cell) => cell.toLowerCase());
  const header = first.some((cell) => /correo|email|nombre|name|telefono|teléfono|phone/.test(cell));
  const emailIndex = header ? first.findIndex((cell) => /correo|email/.test(cell)) : -1;
  const nameIndex = header ? first.findIndex((cell) => /nombre|name/.test(cell)) : -1;
  const phoneIndex = header ? first.findIndex((cell) => /telefono|teléfono|phone|celular/.test(cell)) : -1;
  const contacts = (header ? rows.slice(1) : rows).map((cells) => {
    const dynamicEmailIndex = emailIndex >= 0 ? emailIndex : cells.findIndex((cell) => EMAIL_RE.test(cell.trim().toLowerCase()));
    const email = cells[dynamicEmailIndex]?.trim().toLowerCase() || "";
    const other = cells.filter((_, index) => index !== dynamicEmailIndex);
    return {
      email,
      name: nameIndex >= 0 ? cells[nameIndex] || "" : other[0] || "",
      phone: phoneIndex >= 0 ? cells[phoneIndex] || "" : other.find((cell) => /\d{7,}/.test(cell.replace(/\D/g, ""))) || "",
    };
  });
  return contacts.filter((row) => row.email || row.name || row.phone);
}
