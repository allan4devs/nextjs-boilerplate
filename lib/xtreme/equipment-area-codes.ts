/** Stable audited asset IDs make this a one-time code migration, independent of sorting. */
const upperIds = Array.from({ length: 27 }, (_, index) => index + 101)
  .filter((id) => ![108, 109, 111, 112, 116, 117].includes(id));
const code = (prefix: string, sequence: number) => `${prefix}-${String(sequence).padStart(2, "0")}`;

export function migrateEquipmentCode(id: string, value: string): string {
  const corrections: Record<string, [string, string]> = {
    "eq-078": ["TS-010", "TS-10"],
    "eq-110": ["TS-007", "TS-08"],
    "eq-127": ["PA-001", "PA-01"],
    "eq-128": ["PA-002", "PA-02"],
    "eq-129": ["PA-003", "PA-03"],
    "eq-130": ["PA-004", "PA-04"],
    "eq-131": ["PA-005", "PA-05"],
  };
  const correction = corrections[id];
  if (correction && value === correction[0]) return correction[1];
  if (!/^eq-\d{3}$/.test(id)) return value;
  const n = Number(id.slice(3));
  if (n >= 23 && n <= 39 && value === "") return code("PB", n - 22);
  if (n >= 40 && n <= 77 && value === "") return code("PD", n - 39);
  const original = n >= 101 && n <= 112 ? code("RI", n - 100)
    : n >= 113 && n <= 122 ? code("RD", n - 112)
    : n >= 123 && n <= 127 ? code("ZC", n - 122) : null;
  if (value !== original) return value;
  if (n === 116 || n === 117) return code("AB", n - 115);
  const cardioIndex = [108, 109, 111, 112].indexOf(n);
  if (cardioIndex >= 0) return code("CA", 24 + cardioIndex);
  const upperIndex = upperIds.indexOf(n);
  return upperIndex >= 0 ? code("TS", upperIndex + 1) : value;
}
