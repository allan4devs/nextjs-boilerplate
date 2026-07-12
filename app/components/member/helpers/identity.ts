export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}

export function formatCedulaInput(value: string) {
  return value.replace(/[^\d-]/g, "").slice(0, 20);
}

export function memberCode(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100000000)
    .toString()
    .padStart(8, "0")
    .replace(/(\d{4})(\d{4})/, "$1 $2");
}
