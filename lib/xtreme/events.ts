import { randomUUID } from "crypto";
import type { Db } from "mongodb";

export const EVENTS_COLLECTION = "xtreme_gym_events";

export type EventSource = "site" | "member_app" | "admin" | "kiosk" | "job" | "paypal";

export type ProductEvent = {
  id: string;
  type: string;
  occurredAt: Date;
  memberId?: string;
  anonymousId?: string;
  source: EventSource;
  entity?: { type: string; id: string };
  properties: Record<string, string | number | boolean | null>;
  schemaVersion: 1;
};

/** Best-effort analytics write. A metrics outage must never break the source action. */
export async function recordEvent(
  db: Db,
  event: Omit<ProductEvent, "id" | "occurredAt" | "schemaVersion">,
) {
  try {
    await db.collection<ProductEvent>(EVENTS_COLLECTION).insertOne({
      ...event,
      id: randomUUID(),
      occurredAt: new Date(),
      schemaVersion: 1,
    });
  } catch (error) {
    console.error("XTREME EVENT WRITE", event.type, error);
  }
}
