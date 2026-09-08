import { absoluteAppUrl } from "@/lib/constants/app-url";

/** QR identity survives name, printed-code and guide-association changes. */
export function physicalMachinePath(assetId: string) {
  return `/maquinas/equipo/${encodeURIComponent(assetId)}`;
}

export function physicalMachineQrValue(assetId: string) {
  return absoluteAppUrl(physicalMachinePath(assetId));
}
