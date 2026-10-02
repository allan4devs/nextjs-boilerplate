import type { ExercisePreference, WorkoutExerciseDetail } from "./shared/types";

const MAX_PREFERENCES = 120;

function cleanId(value: unknown) {
  return String(value ?? "").trim().slice(0, 80);
}

function weight(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(1000, Math.round(parsed * 10) / 10))
    : 0;
}

function seconds(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(8 * 60 * 60, Math.round(parsed)))
    : 0;
}

export function exercisePreferenceKey(input: { assetId?: string; machineId?: string }) {
  const assetId = cleanId(input.assetId);
  if (assetId) return `asset:${assetId}`;
  const machineId = cleanId(input.machineId);
  return machineId ? `machine:${machineId}` : "";
}

export function resolveExercisePreference(
  preferences: ExercisePreference[] | undefined,
  input: { assetId?: string; machineId?: string },
) {
  const list = preferences ?? [];
  const exactKey = exercisePreferenceKey(input);
  const exact = exactKey ? list.find((entry) => entry.key === exactKey) : undefined;
  if (exact) return exact;
  const machineId = cleanId(input.machineId);
  return machineId
    ? list.find((entry) => entry.machineId === machineId && !entry.assetId)
      ?? list.find((entry) => entry.machineId === machineId)
    : undefined;
}

function replacePreference(
  preferences: ExercisePreference[] | undefined,
  next: ExercisePreference,
) {
  return [next, ...(preferences ?? []).filter((entry) => entry.key !== next.key)]
    .slice(0, MAX_PREFERENCES);
}

export function saveFavoriteExercisePreference(args: {
  preferences?: ExercisePreference[];
  assetId?: string;
  machineId?: string;
  favoriteWeightKg?: unknown;
  favoriteSeconds?: unknown;
  now?: Date;
}) {
  const assetId = cleanId(args.assetId);
  const machineId = cleanId(args.machineId);
  const key = exercisePreferenceKey({ assetId, machineId });
  if (!key || !machineId) return args.preferences ?? [];
  const previous = resolveExercisePreference(args.preferences, { assetId, machineId });
  const next: ExercisePreference = {
    key,
    ...(assetId ? { assetId } : {}),
    machineId,
    ...(previous?.lastWeightKg !== undefined ? { lastWeightKg: previous.lastWeightKg } : {}),
    ...(previous?.lastSeconds !== undefined ? { lastSeconds: previous.lastSeconds } : {}),
    ...(previous?.favoriteWeightKg !== undefined ? { favoriteWeightKg: previous.favoriteWeightKg } : {}),
    ...(previous?.favoriteSeconds !== undefined ? { favoriteSeconds: previous.favoriteSeconds } : {}),
    ...(args.favoriteWeightKg !== undefined ? { favoriteWeightKg: weight(args.favoriteWeightKg) } : {}),
    ...(args.favoriteSeconds !== undefined ? { favoriteSeconds: seconds(args.favoriteSeconds) } : {}),
    updatedAt: args.now ?? new Date(),
  };
  return replacePreference(args.preferences, next);
}

export function mergeLastExercisePreferences(
  preferences: ExercisePreference[] | undefined,
  exercises: WorkoutExerciseDetail[],
  now = new Date(),
) {
  let next = preferences ?? [];
  for (const exercise of exercises) {
    if (exercise.completed === false) continue;
    const machineId = cleanId(exercise.machineId);
    const assetId = cleanId(exercise.assetId);
    const key = exercisePreferenceKey({ assetId, machineId });
    if (!key || !machineId) continue;
    const previous = resolveExercisePreference(next, { assetId, machineId });
    const lastWeightKg = weight(exercise.weightKg);
    const lastSeconds = seconds(exercise.targetSeconds || exercise.seconds);
    const entry: ExercisePreference = {
      key,
      ...(assetId ? { assetId } : {}),
      machineId,
      ...(previous?.favoriteWeightKg !== undefined ? { favoriteWeightKg: previous.favoriteWeightKg } : {}),
      ...(previous?.favoriteSeconds !== undefined ? { favoriteSeconds: previous.favoriteSeconds } : {}),
      ...(lastWeightKg > 0 ? { lastWeightKg } : previous?.lastWeightKg !== undefined ? { lastWeightKg: previous.lastWeightKg } : {}),
      ...(lastSeconds > 0 ? { lastSeconds } : previous?.lastSeconds !== undefined ? { lastSeconds: previous.lastSeconds } : {}),
      updatedAt: now,
    };
    next = replacePreference(next, entry);
  }
  return next;
}
