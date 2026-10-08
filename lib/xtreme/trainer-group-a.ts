import type { Db } from "mongodb";
import source from "./trainer-group-a-source.json";
import { businessDate } from "./business-date";
import { EQUIPMENT_ASSETS_COLLECTION } from "./shared";
import {
  GROUP_A_PROFILES, type GroupRoutine, type GroupEquipment, type GroupMapping,
  GROUP_A_ID, type GroupLink, type GroupLog, type GroupDashboard, type GroupExercise, type TrainerGroup, type GroupAMemberView,
} from "./trainer-group-a-model";

export const GROUP_A_COLLECTION = "xtreme_gym_trainer_group_a";
export const GROUP_A_ROUTINES: GroupRoutine[] = source;
export type GroupRecord = {
  _id: string; kind: "mapping" | "link" | "log" | "exercise" | "group" | "membership"; revision: number;
  profileId?: string; exerciseId?: string; assetId?: string; memberId?: string; groupId?: string;
  groupName?: string; name?: string; routineId?: string; dayId?: string; active?: boolean; isCustom?: boolean; machineGuideId?: string;
  exercise?: GroupExercise;
  exercisePatch?: Partial<Pick<GroupExercise, "muscle" | "name" | "equipment" | "sourceMachine" | "sets" | "reps" | "time">>;
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
    groupInventory(db), records.find({ kind: { $in: ["mapping", "link", "exercise", "group", "membership"] } }).toArray(),
    records.find({ kind: "log" }).sort({ "log.date": -1, updatedAt: -1 }).toArray(),
  ]);
  const groupRecords = settings.filter((r) => r.kind === "group");
  const groups: TrainerGroup[] = [
    { id: GROUP_A_ID, name: "Grupo A", revision: 0 },
    ...groupRecords.map((r) => ({ id: r.groupId!, name: r.groupName || r.name || r.groupId!, revision: r.revision })),
  ];
  const links = settings.filter((r) => r.kind === "link").map((r): GroupLink => ({ profileId: r.profileId!, memberId: r.memberId!, revision: r.revision }));
  const memberships = settings.filter((r) => r.kind === "membership");
  const disabledProfiles = new Set(memberships.filter((r) => r.active === false).map((r) => r.profileId));
  const staticProfiles = GROUP_A_PROFILES
    .filter((profile) => !disabledProfiles.has(profile.id))
    .map((profile) => ({ ...profile, groupId: GROUP_A_ID, memberId: links.find((link) => link.profileId === profile.id)?.memberId }));
  const dynamicProfiles = memberships
    .filter((r) => r.active !== false && r.profileId && r.groupId && r.memberId)
    .map((r) => ({ id: r.profileId!, name: r.name || r.memberId!, routineId: r.routineId || GROUP_A_ROUTINES[0].id, groupId: r.groupId!, memberId: r.memberId! }));
  const profiles = [...staticProfiles, ...dynamicProfiles];
  const exerciseEdits = settings.filter((r) => r.kind === "exercise");
  const editsById = new Map(exerciseEdits.filter((r) => !r.isCustom).map((r) => [r.exerciseId!, r.exercisePatch ?? {}]));
  const routines = GROUP_A_ROUTINES.map((routine) => ({
    ...routine,
    days: routine.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => ({ ...exercise, ...(editsById.get(exercise.id) ?? {}) })),
    })),
  }));
  for (const record of exerciseEdits.filter((entry) => entry.isCustom && entry.exercise && entry.routineId && entry.dayId)) {
    const day = routines.find((routine) => routine.id === record.routineId)?.days.find((entry) => entry.id === record.dayId);
    if (day && record.exercise) day.exercises.push({ ...record.exercise, ...(record.exercisePatch ?? {}) });
  }
  return {
    date: businessDate(), groups, profiles, routines, inventory,
    mappings: settings.filter((r) => r.kind === "mapping").map((r): GroupMapping => ({
      exerciseId: r.exerciseId!, assetId: r.assetId!, ...(r.machineGuideId ? { machineGuideId: r.machineGuideId } : {}), revision: r.revision, updatedBy: r.updatedBy,
    })),
    links,
    logs: logs.flatMap((r) => r.log ? [r.log] : []),
    routineEdits: exerciseEdits.map((r) => ({ exerciseId: r.exerciseId!, revision: r.revision })),
  };
}

export async function getGroupAMemberView(db: Db, memberId: string, date = businessDate()): Promise<GroupAMemberView | null> {
  const dashboard = await getGroupDashboard(db);
  const profile = dashboard.profiles.find((entry) => entry.groupId === GROUP_A_ID && entry.memberId === memberId);
  if (!profile) return null;
  const routine = dashboard.routines.find((entry) => entry.id === profile.routineId);
  if (!routine || !routine.days.length) return null;

  const profileLogs = dashboard.logs
    .filter((entry) => entry.profileId === profile.id)
    .sort((a, b) => `${b.date}:${b.updatedAt}`.localeCompare(`${a.date}:${a.updatedAt}`));
  const loggedToday = profileLogs.find((entry) => entry.date === date);
  const day = routine.days.find((entry) => entry.id === loggedToday?.dayId) ?? routine.days[0];
  const todayLog = profileLogs.find((entry) => entry.date === date && entry.dayId === day.id);
  const weights = Object.fromEntries(
    (todayLog?.executions ?? []).map((execution) => [execution.exerciseId, execution.weightKg]),
  );
  const recent = profileLogs.slice(0, 14).map((entry) => ({
    date: entry.date,
    dayId: entry.dayId,
    dayLabel: routine.days.find((candidate) => candidate.id === entry.dayId)?.label ?? entry.dayId,
    completed: entry.completedIds.length,
    total: routine.days.find((candidate) => candidate.id === entry.dayId)?.exercises.length ?? entry.completedIds.length,
  }));

  return {
    profileId: profile.id,
    profileName: profile.name,
    routine,
    today: {
      date,
      dayId: day.id,
      label: day.label,
      focus: day.focus,
      completedIds: todayLog?.completedIds ?? [],
      weights,
      note: todayLog?.note ?? "",
      revision: todayLog?.revision ?? 0,
    },
    recent,
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
