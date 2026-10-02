import type { Db } from "mongodb";
import source from "./trainer-group-a-source.json";
import { businessDate } from "./business-date";
import { EQUIPMENT_ASSETS_COLLECTION } from "./shared";
import {
  GROUP_A_PROFILES, type GroupRoutine, type GroupEquipment, type GroupMapping,
  type GroupLink, type GroupLog, type GroupDashboard,
} from "./trainer-group-a-model";

export const GROUP_A_COLLECTION = "xtreme_gym_trainer_group_a";
export const GROUP_A_ROUTINES: GroupRoutine[] = source;
export type GroupRecord = {
  _id: string; kind: "mapping" | "link" | "log"; revision: number;
  profileId?: string; exerciseId?: string; assetId?: string; memberId?: string;
  log?: GroupLog; updatedBy: string; updatedAt: string;
};
export async function groupInventory(db: Db) {
  // Only actual shared assets, never a fallback that could resurrect removed machines.
  return db.collection<GroupEquipment>(EQUIPMENT_ASSETS_COLLECTION).find({ kind: "machine" }, {
    projection: { _id: 0, id: 1, code: 1, name: 1, status: 1, machineGuideId: 1, location: 1, floor: 1 },
  }).sort({ code: 1 }).toArray();
}
export async function getGroupDashboard(db: Db): Promise<GroupDashboard> {
  const records = db.collection<GroupRecord>(GROUP_A_COLLECTION);
  const [inventory, settings, logs] = await Promise.all([
    groupInventory(db), records.find({ kind: { $in: ["mapping", "link"] } }).toArray(),
    Promise.all(GROUP_A_PROFILES.map((profile) => records.find({ kind: "log", profileId: profile.id })
      .sort({ "log.date": -1, updatedAt: -1 }).limit(60).toArray())),
  ]);
  return {
    date: businessDate(), profiles: GROUP_A_PROFILES, routines: GROUP_A_ROUTINES, inventory,
    mappings: settings.filter((r) => r.kind === "mapping").map((r): GroupMapping => ({
      exerciseId: r.exerciseId!, assetId: r.assetId!, revision: r.revision, updatedBy: r.updatedBy,
    })),
    links: settings.filter((r) => r.kind === "link").map((r): GroupLink => ({ profileId: r.profileId!, memberId: r.memberId!, revision: r.revision })),
    logs: logs.flat().flatMap((r) => r.log ? [r.log] : []),
  };
}

export async function saveGroupRecord(db: Db, id: string, revision: number, record: Omit<GroupRecord, "_id" | "revision">) {
  const collection = db.collection<GroupRecord>(GROUP_A_COLLECTION);
  if (revision === 0) {
    try { await collection.insertOne({ _id: id, ...record, revision: 1 }); return true; }
    catch (error) { if ((error as { code?: number }).code === 11000) return false; throw error; }
  }
  const result = await collection.updateOne({ _id: id, revision }, { $set: record, $inc: { revision: 1 } });
  return result.matchedCount === 1;
}
