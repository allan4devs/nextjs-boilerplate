import { getDb } from "@/lib/helpers/mongodb";
import { DEFAULT_EQUIPMENT_ASSETS, type EquipmentAssetDoc } from "./equipment";
import { EQUIPMENT_ASSETS_COLLECTION } from "./shared";

/** Only fields intended for floor plans and public machine labels. Never serialize financial/admin fields. */
export type PublicEquipment = Pick<EquipmentAssetDoc, "id" | "area" | "kind" | "code" | "name" | "location" | "status" | "machineGuideId" | "description" | "brand" | "year">;

export async function getPublicEquipment(): Promise<{ inventory: PublicEquipment[]; source: "shared" | "fallback" }> {
  const project = ({ id, area, kind, code, name, location, status, machineGuideId, description, brand, year }: PublicEquipment): PublicEquipment => ({ id, area, kind, code, name, location, status, ...(description ? { description } : {}), ...(brand ? { brand } : {}), ...(year ? { year } : {}), ...(machineGuideId ? { machineGuideId } : {}) });
  try {
    const db = await getDb();
    const saved = await db.collection<EquipmentAssetDoc>(EQUIPMENT_ASSETS_COLLECTION).find({}, {
      projection: { _id: 0, id: 1, area: 1, kind: 1, code: 1, name: 1, location: 1, status: 1, machineGuideId: 1, description: 1, brand: 1, year: 1 },
    }).toArray();
    const merged = new Map(DEFAULT_EQUIPMENT_ASSETS.map((asset) => [asset.id, project(asset)]));
    for (const asset of saved) merged.set(asset.id, project(asset));
    return { inventory: [...merged.values()], source: "shared" };
  } catch {
    return { inventory: DEFAULT_EQUIPMENT_ASSETS.map(project), source: "fallback" };
  }
}
