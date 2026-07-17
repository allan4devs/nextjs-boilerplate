import type { ActiveVisit, Member, NotificationPrefs } from "../domain/member";
import type { NextBestAction } from "../domain/nextBestAction";

export type MemberProfilePatch = {
  goal?: Member["goal"];
  favoriteTraining?: Member["favoriteTraining"];
  phone?: Member["phone"];
  email?: Member["email"];
  cedula?: NonNullable<Member["cedula"]>;
  weeklyGoal?: number;
  notificationPrefs?: Partial<NotificationPrefs>;
  pinnedBadges?: string[];
};

export type MembersResponse = {
  member: Member | null;
  activeVisit?: ActiveVisit | null;
  leaderboard: Member[];
  exists?: boolean;
  nextBestAction?: NextBestAction | null;
  error?: string;
  duplicate?: {
    memberName: string;
    phone: string;
    email: string;
  };
};

export type MemberLookupResponse = MembersResponse & {
  lookup?: string;
  cedula?: string;
};
