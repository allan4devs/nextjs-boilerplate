import type { AnyBulkWriteOperation, Db, Filter } from "mongodb";
import { businessDate } from "./business-date";
import { listEquipmentAssets, type EquipmentAssetDoc } from "./equipment";
import {
  MEMBERS_COLLECTION,
  TRAINING_PROGRAMS_COLLECTION,
} from "./shared/config";
import type {
  MemberDoc,
  TrainingPlan,
  TrainingProgramAssignment,
} from "./shared/types";
import {
  DEFAULT_TRAINING_PROGRAMS,
  type TrainingProgramTemplate,
} from "./training-program-catalog";

export type TrainingProgramDoc = TrainingProgramTemplate & {
  revision: number;
  active: boolean;
  defaultPool: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type AssignmentSource = TrainingProgramAssignment["source"];

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function cloneDefaultProgram(template: TrainingProgramTemplate, now: Date): TrainingProgramDoc {
  return {
    ...template,
    sessions: template.sessions.map((session) => ({
      ...session,
      machines: session.machines.map((machine) => ({ ...machine })),
    })),
    revision: 1,
    active: true,
    defaultPool: true,
    createdAt: now,
    updatedAt: now,
  };
}

/** Seed is insert-only: after creation Mongo is the operational source of truth. */
export async function ensureTrainingPrograms(db: Db) {
  const now = new Date();
  await db.collection<TrainingProgramDoc>(TRAINING_PROGRAMS_COLLECTION).bulkWrite(
    DEFAULT_TRAINING_PROGRAMS.map((template) => ({
      updateOne: {
        filter: { id: template.id },
        update: { $setOnInsert: cloneDefaultProgram(template, now) },
        upsert: true,
      },
    })),
  );
}

export async function listTrainingPrograms(db: Db) {
  await ensureTrainingPrograms(db);
  return db.collection<TrainingProgramDoc>(TRAINING_PROGRAMS_COLLECTION)
    .find({ active: true }, { projection: { _id: 0 } })
    .sort({ weeklySessions: 1, name: 1 })
    .toArray();
}

function goalProgramIds(goal: string) {
  const value = goal.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/fuerz|potencia|carga/.test(value)) return ["strength"];
  if (/masa|muscul|hipertrof|volumen|defin/.test(value)) return ["hypertrophy"];
  if (/bajar|peso|grasa|cardio|resisten|acondicion|salud|energia/.test(value)) return ["conditioning"];
  if (/primer|empez|inicio|tecnic|retom|movilidad|adapt/.test(value)) return ["starter"];
  return [];
}

export function chooseTrainingProgram(
  programs: TrainingProgramDoc[],
  member: Pick<MemberDoc, "normalizedName" | "goal">,
  cycle = 0,
) {
  const defaults = programs.filter((program) => program.active && program.defaultPool);
  const preferred = new Set(goalProgramIds(member.goal ?? ""));
  const pool = defaults.filter((program) => preferred.has(program.id));
  const candidates = pool.length ? pool : defaults.length ? defaults : programs.filter((program) => program.active);
  if (!candidates.length) return null;
  return candidates[stableHash(`${member.normalizedName ?? "member"}:${cycle}`) % candidates.length];
}

function physicalMachineFor(
  equipment: EquipmentAssetDoc[],
  machineGuideId: string,
  key: string,
) {
  const candidates = equipment.filter(
    (asset) => asset.kind === "machine"
      && asset.machineGuideId === machineGuideId
      && asset.status !== "fuera_de_servicio",
  );
  if (!candidates.length) return null;
  return candidates[stableHash(key) % candidates.length];
}

function assignmentFor(
  program: TrainingProgramDoc,
  memberKey: string,
  source: AssignmentSource,
  assignedBy: string,
  cycle: number,
  now: Date,
): TrainingProgramAssignment {
  return {
    programId: program.id,
    programName: program.name,
    programRevision: program.revision,
    groupId: program.id,
    cohort: `${program.id}-${(stableHash(memberKey) % 3) + 1}`,
    source,
    cycle,
    assignedBy,
    assignedAt: now,
  };
}

export function materializeTrainingPlan(args: {
  program: TrainingProgramDoc;
  equipment: EquipmentAssetDoc[];
  memberKey: string;
  today: string;
  cycle: number;
  previous?: TrainingPlan;
}) {
  const { program, equipment, memberKey, today, cycle, previous } = args;
  const previousItems = new Map((previous?.items ?? []).map((item) => [item.id, item]));
  const items = program.sessions.map((session, sessionIndex) => {
    const id = `${program.id}-c${cycle}-${session.id}`;
    const saved = previousItems.get(id);
    return {
      id,
      day: session.day,
      focus: session.focus,
      exercises: session.exercises,
      targetMinutes: session.targetMinutes,
      done: saved?.done ?? false,
      doneDate: saved?.doneDate ?? null,
      doneWorkoutId: saved?.doneWorkoutId ?? null,
      prescribedExercises: session.machines.map((exercise, exerciseIndex) => {
        const machine = physicalMachineFor(
          equipment,
          exercise.machineId,
          `${memberKey}:${program.id}:${cycle}:${sessionIndex}:${exerciseIndex}`,
        );
        return {
          id: `${id}-${exercise.id}`,
          ...(machine ? { assetId: machine.id } : {}),
          machineId: exercise.machineId,
          machineName: machine?.name ?? exercise.exerciseName,
          ...(machine?.code ? { machineCode: machine.code } : {}),
          ...(machine?.area ? { machineArea: machine.area } : {}),
          ...(machine?.location ? { machineLocation: machine.location } : {}),
          ...(machine ? { machineFloor: machine.floor ?? 1 } : {}),
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          reps: exercise.reps,
          weightKg: exercise.weightKg ?? 0,
          targetSeconds: exercise.targetSeconds ?? 0,
          notes: exercise.notes ?? "",
        };
      }),
    };
  });
  const plan: TrainingPlan = {
    programId: program.id,
    programName: program.name,
    programRevision: program.revision,
    groupId: program.id,
    assignmentSource: "group",
    cycle,
    title: program.name,
    objective: program.objective,
    coachNote: program.coachNote,
    startDate: today,
    endDate: addDays(today, Math.max(1, program.durationWeeks) * 7 - 1),
    weeklySessions: program.weeklySessions,
    items,
  };
  return plan;
}

async function programResources(db: Db) {
  const [programs, equipment] = await Promise.all([
    listTrainingPrograms(db),
    listEquipmentAssets(db, { kind: "machine" }),
  ]);
  return { programs, equipment };
}

export async function ensureMemberTrainingPlan(db: Db, memberKey: string, today = businessDate()) {
  const members = db.collection<MemberDoc>(MEMBERS_COLLECTION);
  const member = await members.findOne({ normalizedName: memberKey });
  if (!member || member.activePlanWorkout) return member;

  const { programs, equipment } = await programResources(db);
  const assignment = member.trainingProgramAssignment;
  const completed = Boolean(member.trainingPlan?.items?.length)
    && member.trainingPlan!.items.every((item) => item.done);
  const shouldCycle = completed && assignment?.source === "auto_default";
  const cycle = shouldCycle ? (assignment?.cycle ?? 0) + 1 : assignment?.cycle ?? 0;
  const assignedProgram = assignment
    ? programs.find((program) => program.id === assignment.programId)
    : null;
  const program = shouldCycle
    ? chooseTrainingProgram(programs, member, cycle)
    : assignedProgram ?? chooseTrainingProgram(programs, member, cycle);
  if (!program) return member;

  const missingPlan = !member.trainingPlan?.items?.length;
  const staleGroupPlan = Boolean(
    assignment
      && assignment.source !== "trainer_custom"
      && program.revision > assignment.programRevision,
  );
  if (!missingPlan && !staleGroupPlan && !shouldCycle) return member;

  const now = new Date();
  const source: AssignmentSource = assignment?.source === "trainer_group" && !shouldCycle
    ? "trainer_group"
    : "auto_default";
  const nextAssignment = assignmentFor(
    program,
    memberKey,
    source,
    assignment?.assignedBy || "Xtreme AutoCoach",
    cycle,
    now,
  );
  const trainingPlan = materializeTrainingPlan({
    program,
    equipment,
    memberKey,
    today,
    cycle,
    previous: staleGroupPlan ? member.trainingPlan : undefined,
  });
  await members.updateOne(
    { normalizedName: memberKey, activePlanWorkout: { $exists: false } },
    { $set: { trainingPlan, trainingProgramAssignment: nextAssignment, updatedAt: now } },
  );
  return members.findOne({ normalizedName: memberKey });
}

export async function assignTrainingProgram(args: {
  db: Db;
  memberKey: string;
  programId: string;
  assignedBy: string;
  today?: string;
}) {
  const { db, memberKey, programId, assignedBy } = args;
  const members = db.collection<MemberDoc>(MEMBERS_COLLECTION);
  const member = await members.findOne({ normalizedName: memberKey });
  if (!member) return { status: "missing" as const, member: null };
  if (member.activePlanWorkout) return { status: "active_workout" as const, member };
  const { programs, equipment } = await programResources(db);
  const program = programs.find((entry) => entry.id === programId);
  if (!program) return { status: "missing_program" as const, member };
  const now = new Date();
  const today = args.today ?? businessDate(now);
  const cycle = (member.trainingProgramAssignment?.cycle ?? -1) + 1;
  const assignment = assignmentFor(program, memberKey, "trainer_group", assignedBy, cycle, now);
  const trainingPlan = materializeTrainingPlan({ program, equipment, memberKey, today, cycle });
  await members.updateOne(
    { normalizedName: memberKey, activePlanWorkout: { $exists: false } },
    { $set: { trainingPlan, trainingProgramAssignment: assignment, coach: assignedBy, updatedAt: now } },
  );
  return { status: "assigned" as const, member: await members.findOne({ normalizedName: memberKey }) };
}

export async function assignDefaultProgramsToMembers(db: Db, assignedBy: string, today = businessDate()) {
  const members = db.collection<MemberDoc>(MEMBERS_COLLECTION);
  const missingPlanFilter: Filter<MemberDoc> = {
    $or: [{ trainingPlan: { $exists: false } }, { trainingPlan: { $type: "null" } }],
  };
  const missing = await members.find(
    missingPlanFilter,
    { projection: { normalizedName: 1, goal: 1 } },
  ).toArray();
  if (!missing.length) return { matched: 0, assigned: 0 };
  const { programs, equipment } = await programResources(db);
  const now = new Date();
  const operations: AnyBulkWriteOperation<MemberDoc>[] = missing.flatMap((member) => {
    const memberKey = member.normalizedName ?? "";
    const program = chooseTrainingProgram(programs, member, 0);
    if (!memberKey || !program) return [];
    return [{
      updateOne: {
        filter: {
          normalizedName: memberKey,
          ...missingPlanFilter,
        },
        update: {
          $set: {
            trainingPlan: materializeTrainingPlan({ program, equipment, memberKey, today, cycle: 0 }),
            trainingProgramAssignment: assignmentFor(program, memberKey, "auto_default", assignedBy, 0, now),
            updatedAt: now,
          },
        },
      },
    }];
  });
  if (!operations.length) return { matched: missing.length, assigned: 0 };
  const result = await members.bulkWrite(operations, { ordered: false });
  return { matched: missing.length, assigned: result.modifiedCount };
}
