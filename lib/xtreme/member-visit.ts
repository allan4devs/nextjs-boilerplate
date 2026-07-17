import type { Db } from "mongodb";
import { businessDate } from "@/lib/xtreme/business-date";
import {
  CHECKINS_COLLECTION,
  type CheckinDoc,
} from "@/lib/xtreme/shared";

export const VISIT_CHECKOUT_REMINDER_MINUTES = 90;

export type ActiveMemberVisit = {
  id: string;
  checkedInAt: string;
  elapsedMinutes: number;
  reminderAfterMinutes: number;
};

export async function findActiveMemberVisit(
  db: Db,
  memberKey: string,
  now = new Date(),
): Promise<CheckinDoc | null> {
  return db.collection<CheckinDoc>(CHECKINS_COLLECTION).findOne(
    {
      normalizedName: memberKey,
      date: businessDate(now),
      checkedOutAt: null,
    },
    { sort: { checkedInAt: -1 } },
  );
}

export function presentActiveMemberVisit(
  visit: CheckinDoc | null,
  now = new Date(),
): ActiveMemberVisit | null {
  if (!visit) return null;
  const checkedInAt = new Date(visit.checkedInAt);
  return {
    id: visit.id,
    checkedInAt: checkedInAt.toISOString(),
    elapsedMinutes: Math.max(
      0,
      Math.floor((now.getTime() - checkedInAt.getTime()) / 60_000),
    ),
    reminderAfterMinutes: VISIT_CHECKOUT_REMINDER_MINUTES,
  };
}
