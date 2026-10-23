import { normalizeGroupName, type GroupEquipment } from "./trainer-group-a-model";

export type EquipmentFamily = "all" | "cardio" | "legs" | "upper" | "cables" | "free";
export type EquipmentGlyphKind = "treadmill" | "bike" | "elliptical" | "stairs" | "leg-press" | "leg-extension" | "leg-curl" | "hip" | "press" | "pulldown" | "cable" | "rack" | "bench" | "dumbbell";

export function equipmentGlyphKind(asset: Pick<GroupEquipment, "name" | "machineGuideId">): EquipmentGlyphKind {
  const key = normalizeGroupName(`${asset.machineGuideId ?? ""} ${asset.name}`);
  if (/treadmill|caminadora|cinta/.test(key)) return "treadmill";
  if (/bicicleta|bike|spinning/.test(key)) return "bike";
  if (/elliptical|eliptica/.test(key)) return "elliptical";
  if (/stair|escaladora/.test(key)) return "stairs";
  if (/leg.press|prensa.*pierna|prensa inclinada/.test(key)) return "leg-press";
  if (/leg.extension|extension.*pierna|extension.*rodilla/.test(key)) return "leg-extension";
  if (/leg.curl|curl.*femoral|flex.*rodilla/.test(key)) return "leg-curl";
  if (/hip|glute|abduct|aduct/.test(key)) return "hip";
  if (/cable|polea|crossover/.test(key)) return "cable";
  if (/pulldown|jalon|remo|row/.test(key)) return "pulldown";
  if (/press|pecho|pectoral|hombro/.test(key)) return "press";
  if (/bench|banco/.test(key)) return "bench";
  if (/mancuerna|dumbbell|barra|disco/.test(key)) return "dumbbell";
  return "rack";
}

export function equipmentFamily(asset: Pick<GroupEquipment, "name" | "machineGuideId">): EquipmentFamily {
  const kind = equipmentGlyphKind(asset);
  if (["treadmill", "bike", "elliptical", "stairs"].includes(kind)) return "cardio";
  if (["leg-press", "leg-extension", "leg-curl", "hip"].includes(kind)) return "legs";
  if (kind === "cable") return "cables";
  if (["bench", "dumbbell"].includes(kind)) return "free";
  if (kind === "pulldown" || kind === "press") return "upper";
  const key = normalizeGroupName(`${asset.machineGuideId ?? ""} ${asset.name}`);
  return /squat|sentadilla|pantorrilla|calf/.test(key) ? "legs" : "upper";
}

function queryKey(value: string) {
  return normalizeGroupName(value).replace(/^(?:(?:maquina|maq\.?)\s+|n[°º.]\s*|no\.?\s+(?=\d))/u, "").replace(/[#№]/gu, "").trim();
}
function compact(value: string) { return value.replace(/[^a-z0-9]/g, ""); }

/** Exact numeric segments: #24 matches PI-24, never PI-124 or a floor number. */
export function equipmentSearchRank(asset: GroupEquipment, query: string): number {
  const key = queryKey(query);
  if (!key) return 0;
  const code = normalizeGroupName(asset.code);
  if (compact(code) === compact(key)) return 0;
  if (/^\d+$/.test(key)) return (code.match(/\d+/g) ?? []).some((n) => Number(n) === Number(key)) ? 1 : -1;
  const words = key.split(/\s+/);
  const haystack = normalizeGroupName(`${asset.code} ${asset.name} ${asset.location ?? ""} ${asset.machineGuideId ?? ""}`);
  if (!words.every((word) => haystack.includes(word) || compact(code).includes(compact(word)))) return -1;
  return code.startsWith(key) ? 1 : normalizeGroupName(asset.name).startsWith(key) ? 2 : 3;
}

export function searchTrainerEquipment(inventory: GroupEquipment[], query: string, family: EquipmentFamily = "all") {
  return inventory.map((asset) => ({ asset, rank: equipmentSearchRank(asset, query) }))
    .filter(({ asset, rank }) => rank >= 0 && (family === "all" || equipmentFamily(asset) === family))
    .sort((a, b) => a.rank - b.rank || a.asset.code.localeCompare(b.asset.code, "es", { numeric: true }) || a.asset.id.localeCompare(b.asset.id))
    .map(({ asset }) => asset);
}
