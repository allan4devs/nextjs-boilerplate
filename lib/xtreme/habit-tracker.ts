/**
 * Bitácora de hábitos por hora. Cada socio tiene un documento por día con 24
 * casillas; la casilla guarda qué estuvo haciendo esa hora (o `null` si no la
 * registró). El vocabulario de categorías y el validador viven acá para que el
 * route handler y la base no puedan discrepar sobre qué es un valor válido.
 */
import type { Db } from "mongodb";
import { HABIT_LOGS_COLLECTION } from "@/lib/xtreme/shared/config";

/** Única fuente de verdad del vocabulario: el tipo se deriva de la lista. */
export const HABIT_CATEGORIES = ["sleep", "water", "food", "exercise", "focus"] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const HABIT_HOURS_PER_DAY = 24;

export type HabitLogDoc = {
  memberKey: string;
  date: string;
  hours: Array<HabitCategory | null>;
  updatedAt: Date;
};

const CATEGORY_LOOKUP: ReadonlySet<string> = new Set(HABIT_CATEGORIES);

/** `null` es válido: es cómo se borra una hora ya marcada. */
export function isHabitCategory(value: unknown): value is HabitCategory | null {
  return value === null || (typeof value === "string" && CATEGORY_LOOKUP.has(value));
}

export function isHabitHour(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < HABIT_HOURS_PER_DAY
  );
}

function emptyHours(): Array<HabitCategory | null> {
  return Array.from({ length: HABIT_HOURS_PER_DAY }, () => null);
}

export async function getOrCreateHabitLog(
  db: Db,
  memberKey: string,
  date: string,
): Promise<HabitLogDoc> {
  const doc = await db.collection<HabitLogDoc>(HABIT_LOGS_COLLECTION).findOneAndUpdate(
    { memberKey, date },
    {
      $setOnInsert: {
        memberKey,
        date,
        hours: emptyHours(),
        updatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  if (!doc) throw new Error("No se pudo crear el registro de hábitos.");
  return doc;
}

/**
 * Marca una sola hora. Se escribe con pipeline de agregación y no leyendo el
 * arreglo para reescribirlo: dos pestañas marcando horas distintas del mismo
 * día no se pisan entre sí, y el documento se normaliza a 24 casillas aunque
 * venga viejo o incompleto.
 */
export async function setHabitHour(
  db: Db,
  memberKey: string,
  date: string,
  hour: number,
  category: HabitCategory | null,
): Promise<HabitLogDoc> {
  if (!isHabitHour(hour)) {
    throw new RangeError(`La hora debe estar entre 0 y ${HABIT_HOURS_PER_DAY - 1}.`);
  }

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
                  input: { $range: [0, HABIT_HOURS_PER_DAY] },
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
          updatedAt: new Date(),
        },
      },
    ],
    { upsert: true, returnDocument: "after" },
  );

  if (!doc) throw new Error("No se pudo actualizar el registro de hábitos.");
  return doc;
}
