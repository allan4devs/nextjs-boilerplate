import type { Db } from "mongodb";

export const HABIT_LOGS_COLLECTION = "xtreme_gym_habit_logs";

export type HabitCategory = "sleep" | "water" | "food" | "exercise" | "focus";

export type HabitLogDoc = {
  memberKey: string;
  date: string;
  hours: Array<HabitCategory | null>;
  updatedAt: Date;
};

const HOURS_PER_DAY = 24;

function emptyHours(): Array<HabitCategory | null> {
  return Array.from({ length: HOURS_PER_DAY }, () => null);
}

export async function getOrCreateHabitLog(
  db: Db,
  memberKey: string,
  date: string,
): Promise<HabitLogDoc> {
  const now = new Date();
  const doc = await db.collection<HabitLogDoc>(HABIT_LOGS_COLLECTION).findOneAndUpdate(
    { memberKey, date },
    {
      $setOnInsert: {
        memberKey,
        date,
        hours: emptyHours(),
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!doc) throw new Error("No se pudo crear el registro de hábitos.");
  return doc;
}

export async function setHabitHour(
  db: Db,
  memberKey: string,
  date: string,
  hour: number,
  category: HabitCategory | null,
): Promise<HabitLogDoc> {
  if (!Number.isInteger(hour) || hour < 0 || hour >= HOURS_PER_DAY) {
    throw new RangeError("La hora debe estar entre 0 y 23.");
  }

  const now = new Date();
  const doc = await db.collection<HabitLogDoc>(HABIT_LOGS_COLLECTION).findOneAndUpdate(
    { memberKey, date },
    [
      {
        $set: {
          memberKey,
          date,
          hours: {
            $let: {
              vars: {
                existingHours: {
                  $cond: [{ $isArray: "$hours" }, "$hours", emptyHours()],
                },
              },
              in: {
                $map: {
                  input: { $range: [0, HOURS_PER_DAY] },
                  as: "currentHour",
                  in: {
                    $cond: [
                      { $eq: ["$$currentHour", hour] },
                      category,
                      {
                        $ifNull: [
                          { $arrayElemAt: ["$$existingHours", "$$currentHour"] },
                          null,
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          updatedAt: now,
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  if (!doc) throw new Error("No se pudo actualizar el registro de hábitos.");
  return doc;
}
