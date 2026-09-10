import { absoluteAppUrl } from "@/lib/constants/app-url";

/** QR identity survives name, printed-code and guide-association changes. */
export function physicalMachinePath(assetId: string) {
  return `/maquinas/equipo/${encodeURIComponent(assetId)}`;
}

export function physicalMachineQrValue(assetId: string) {
  return absoluteAppUrl(physicalMachinePath(assetId));
}

/** Printing excludes loose plates and dumbbells, but includes benches. */
export function isPrintableEquipment(asset: { kind: string; name: string }) {
  return !["plate", "dumbbell"].includes(asset.kind) && !/^(?:discos?|mancuernas?)\b/i.test(asset.name.trim());
}
