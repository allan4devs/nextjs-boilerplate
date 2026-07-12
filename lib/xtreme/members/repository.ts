import type { Db } from "mongodb";
import {
  CHECKINS_COLLECTION,
  MEMBERS_COLLECTION,
  type CheckinDoc,
} from "@/lib/xtreme/shared";
import type { EarnedBadge } from "@/lib/xtreme/gamification";
import type { WorkoutEntry, XtremeMemberDoc } from "./types";

export type AppendWorkoutResult = "inserted" | "duplicate" | "member_not_found";

export type MemberGamificationUpdate = {
  freezeHistory: string[];
  earnedBadges: EarnedBadge[];
  updatedAt: Date;
};

export type MemberRepository = {
  findByKey(memberKey: string): Promise<XtremeMemberDoc | null>;
  findCheckinOnDate(
    memberKey: string,
    date: string,
  ): Promise<Pick<CheckinDoc, "id"> | null>;
  appendWorkoutOnce(args: {
    memberKey: string;
    trainingName: string;
    entry: WorkoutEntry;
    updatedAt: Date;
  }): Promise<AppendWorkoutResult>;
  updateGamification(
    memberKey: string,
    update: MemberGamificationUpdate,
  ): Promise<void>;
  listLeaderboardCandidates(): Promise<XtremeMemberDoc[]>;
};

export function createMongoMemberRepository(db: Db): MemberRepository {
  const members = db.collection<XtremeMemberDoc>(MEMBERS_COLLECTION);

  return {
    findByKey(memberKey) {
      return members.findOne({ normalizedName: memberKey });
    },

    findCheckinOnDate(memberKey, date) {
      return db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne(
        { normalizedName: memberKey, date },
        { projection: { _id: 0, id: 1 } },
      );
    },

    async appendWorkoutOnce({ memberKey, trainingName, entry, updatedAt }) {
      const result = await members.updateOne(
        {
          normalizedName: memberKey,
          "workouts.completedDate": { $ne: entry.completedDate },
        },
        {
          $set: {
            favoriteTraining: trainingName,
            updatedAt,
          },
          $push: { workouts: entry },
        },
      );

      if (result.modifiedCount === 1) return "inserted";

      const member = await members.findOne(
        { normalizedName: memberKey },
        { projection: { _id: 1 } },
      );
      return member ? "duplicate" : "member_not_found";
    },

    async updateGamification(memberKey, update) {
      await members.updateOne(
        { normalizedName: memberKey },
        {
          $set: {
            freezeHistory: update.freezeHistory,
            earnedBadges: update.earnedBadges,
            updatedAt: update.updatedAt,
          },
        },
      );
    },

    listLeaderboardCandidates() {
      return members
        .find(
          {},
          {
            projection: {
              memberName: 1,
              normalizedName: 1,
              workouts: 1,
              favoriteTraining: 1,
              goal: 1,
              photoUrl: 1,
              weeklyGoal: 1,
              freezeHistory: 1,
              earnedBadges: 1,
            },
          },
        )
        .toArray();
    },
  };
}
