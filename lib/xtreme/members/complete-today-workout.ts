import { businessDate } from "@/lib/xtreme/business-date";
import {
  MemberNotFoundError,
  MissingTodayCheckinError,
  TodayWorkoutAlreadyCompletedError,
} from "./errors";
import { syncMemberGamification } from "./gamification-service";
import type { MemberRepository } from "./repository";
import type { WorkoutEntry } from "./types";
import type { WorkoutExerciseDetail } from "@/lib/xtreme/shared";

export type CompleteTodayWorkoutInput = {
  memberKey: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  planItemId?: string;
  planTitle?: string;
  startedAt?: Date;
  exercises?: WorkoutExerciseDetail[];
};

export type WorkoutCompletedEvent = {
  memberKey: string;
  memberName: string;
  checkinId: string;
  workout: WorkoutEntry;
};

export type CompleteTodayWorkoutDependencies = {
  repository: MemberRepository;
  recordWorkoutCompleted: (event: WorkoutCompletedEvent) => Promise<void>;
  now?: () => Date;
};

/** Completes the single daily workout after a real check-in for the gym day. */
export async function completeTodayWorkout(
  dependencies: CompleteTodayWorkoutDependencies,
  input: CompleteTodayWorkoutInput,
) {
  const now = dependencies.now?.() ?? new Date();
  const completedDate = businessDate(now);
  const member = await dependencies.repository.findByKey(input.memberKey);
  if (!member) throw new MemberNotFoundError();

  const checkin = await dependencies.repository.findCheckinOnDate(
    input.memberKey,
    completedDate,
  );
  if (!checkin) throw new MissingTodayCheckinError();

  const entry: WorkoutEntry = {
    id: `workout-${completedDate}-${input.trainingId}`,
    trainingId: input.trainingId,
    trainingName: input.trainingName,
    intensity: input.intensity,
    minutes: input.minutes,
    completedDate,
    completedAt: now,
    ...(input.planItemId ? { planItemId: input.planItemId } : {}),
    ...(input.planTitle ? { planTitle: input.planTitle } : {}),
    ...(input.startedAt ? { startedAt: input.startedAt, endedAt: now } : {}),
    ...(input.exercises?.length ? { exercises: input.exercises } : {}),
  };
  const appendResult = await dependencies.repository.appendWorkoutOnce({
    memberKey: input.memberKey,
    trainingName: input.trainingName,
    entry,
    updatedAt: now,
  });

  if (appendResult === "member_not_found") throw new MemberNotFoundError();
  if (appendResult === "duplicate") {
    throw new TodayWorkoutAlreadyCompletedError();
  }

  const newBadges = await syncMemberGamification(
    dependencies.repository,
    input.memberKey,
    { today: completedDate, now },
  );
  await dependencies.recordWorkoutCompleted({
    memberKey: input.memberKey,
    memberName: member.memberName,
    checkinId: checkin.id,
    workout: entry,
  });

  const updatedMember = await dependencies.repository.findByKey(input.memberKey);
  if (!updatedMember) throw new MemberNotFoundError();
  return { member: updatedMember, newBadges };
}
