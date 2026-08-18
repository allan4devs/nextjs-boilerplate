import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/helpers/mongodb";
import { businessDate } from "@/lib/xtreme/business-date";

export const dynamic = "force-dynamic";

const EVENTS_COLLECTION = "xtreme_gym_food_choice_events";
const CANDIDATES_COLLECTION = "xtreme_gym_food_candidates";
const PROFILE_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
const ALLOWED_EVENTS = new Set([
  "ingredient_toggled",
  "favorite_selected",
  "builder_completed",
  "candidate_added",
  "probability_adjusted",
  "candidate_removed",
  "decision_made",
  "roulette_choice",
  "dish_ordered",
]);

type FoodEventBody = Record<string, unknown>;

function cleanText(value: unknown, max = 100) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 20);
}

function clampWeight(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.min(100, Math.max(5, Math.round(number)));
}

function periodKeys(now: Date) {
  const dayKey = businessDate(now);
  const [year, month, day] = dayKey.split("-").map(Number);
  const localCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localCalendarDate.getUTCDay() || 7;
  localCalendarDate.setUTCDate(localCalendarDate.getUTCDate() + 4 - weekday);
  const weekYear = localCalendarDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil(((localCalendarDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return {
    dayKey,
    weekKey: `${weekYear}-W${String(week).padStart(2, "0")}`,
    monthKey: dayKey.slice(0, 7),
  };
}

function candidateFields(body: FoodEventBody) {
  return {
    candidateKey: cleanText(body.candidateKey, 180),
    restaurant: cleanText(body.restaurant),
    location: cleanText(body.location),
    dish: cleanText(body.dish),
    categoryEmoji: cleanText(body.categoryEmoji, 8),
  };
}

export async function GET(req: NextRequest) {
  try {
    const profileId = cleanText(req.nextUrl.searchParams.get("profileId"), 64);
    if (!PROFILE_PATTERN.test(profileId)) {
      return NextResponse.json({ error: "Perfil de preferencias inválido." }, { status: 400 });
    }

    const db = await getDb();
    const events = db.collection(EVENTS_COLLECTION);
    const keys = periodKeys(new Date());

    const [candidates, recentOrders, todayOrders, weekOrders, monthOrders, preferenceEvents] = await Promise.all([
      db
        .collection(CANDIDATES_COLLECTION)
        .find({ profileId, active: true })
        .project({ _id: 0, candidateKey: 1, restaurant: 1, location: 1, dish: 1, categoryEmoji: 1, weight: 1 })
        .sort({ updatedAt: -1 })
        .limit(20)
        .toArray(),
      events
        .find({ profileId, type: "dish_ordered" })
        .project({ _id: 0, restaurant: 1, dish: 1, createdAt: 1, dayKey: 1 })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      events.countDocuments({ profileId, type: "dish_ordered", dayKey: keys.dayKey }),
      events.countDocuments({ profileId, type: "dish_ordered", weekKey: keys.weekKey }),
      events.countDocuments({ profileId, type: "dish_ordered", monthKey: keys.monthKey }),
      events
        .find({ profileId, type: { $in: ["ingredient_toggled", "favorite_selected", "dish_ordered"] } })
        .project({ _id: 0, type: 1, tag: 1, selected: 1, selectedTags: 1, candidateKey: 1 })
        .sort({ createdAt: -1 })
        .limit(3_000)
        .toArray(),
    ]);

    const tagAffinity: Record<string, number> = {};
    const dishAffinity: Record<string, number> = {};
    for (const event of preferenceEvents) {
      const multiplier = event.type === "dish_ordered" ? 3 : event.type === "favorite_selected" ? 2 : 1;
      if (event.type === "ingredient_toggled" && event.selected === false) continue;
      const tags = event.tag ? [String(event.tag)] : cleanTags(event.selectedTags);
      for (const tag of tags) tagAffinity[tag] = (tagAffinity[tag] ?? 0) + multiplier;
      if (event.type === "dish_ordered" && event.candidateKey) {
        const key = String(event.candidateKey);
        dishAffinity[key] = (dishAffinity[key] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      candidates,
      recentOrders,
      orderCounts: { day: todayOrders, week: weekOrders, month: monthOrders },
      tagAffinity,
      dishAffinity,
    });
  } catch (error) {
    console.error("FOOD PREFERENCES GET", error);
    return NextResponse.json({ error: "No se pudo cargar el historial de comidas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as FoodEventBody;
    const profileId = cleanText(body.profileId, 64);
    const type = cleanText(body.type, 40);
    if (!PROFILE_PATTERN.test(profileId) || !ALLOWED_EVENTS.has(type)) {
      return NextResponse.json({ error: "Evento de comida inválido." }, { status: 400 });
    }

    const now = new Date();
    const keys = periodKeys(now);
    const candidate = candidateFields(body);
    const selectedTags = cleanTags(body.selectedTags);
    const delta = Math.min(95, Math.max(-95, Number(body.delta) || 0));

    if (type === "ingredient_toggled" && !cleanText(body.tag, 40)) {
      return NextResponse.json({ error: "Falta la elección de ingrediente." }, { status: 400 });
    }
    if (type === "roulette_choice" && !cleanText(body.choiceLabel)) {
      return NextResponse.json({ error: "Falta la elección de la ruleta." }, { status: 400 });
    }
    if (["candidate_added", "decision_made", "dish_ordered"].includes(type)) {
      if (!candidate.candidateKey || !candidate.restaurant || !candidate.dish) {
        return NextResponse.json({ error: "Faltan datos del platillo." }, { status: 400 });
      }
    } else if (["probability_adjusted", "candidate_removed"].includes(type) && !candidate.candidateKey) {
      return NextResponse.json({ error: "Falta el platillo por modificar." }, { status: 400 });
    }

    const event = {
      profileId,
      type,
      ...keys,
      createdAt: now,
      ...(body.tag ? { tag: cleanText(body.tag, 40) } : {}),
      ...(typeof body.selected === "boolean" ? { selected: body.selected } : {}),
      ...(body.favoriteId ? { favoriteId: cleanText(body.favoriteId, 60) } : {}),
      ...(body.selectionStage ? { selectionStage: cleanText(body.selectionStage, 30) } : {}),
      ...(body.choiceLabel ? { choiceLabel: cleanText(body.choiceLabel) } : {}),
      ...(body.choiceMethod ? { choiceMethod: cleanText(body.choiceMethod, 20) } : {}),
      ...(selectedTags.length ? { selectedTags } : {}),
      ...(candidate.candidateKey ? candidate : {}),
      ...(body.delta != null ? { delta } : {}),
      ...(body.nextWeight != null ? { nextWeight: clampWeight(body.nextWeight) } : {}),
    };

    const db = await getDb();
    await db.collection(EVENTS_COLLECTION).insertOne(event);

    if (type === "candidate_added") {
      await db.collection(CANDIDATES_COLLECTION).updateOne(
        { profileId, candidateKey: candidate.candidateKey },
        {
          $set: { ...candidate, active: true, weight: clampWeight(body.initialWeight), updatedAt: now },
          $setOnInsert: { createdAt: now },
          $inc: { timesAdded: 1 },
        },
        { upsert: true },
      );
    } else if (type === "probability_adjusted") {
      await db.collection(CANDIDATES_COLLECTION).updateOne(
        { profileId, candidateKey: candidate.candidateKey },
        [
          {
            $set: {
              weight: { $min: [100, { $max: [5, { $add: [{ $ifNull: ["$weight", 50] }, delta] }] }] },
              updatedAt: now,
            },
          },
        ],
      );
    } else if (type === "candidate_removed") {
      await db.collection(CANDIDATES_COLLECTION).updateOne(
        { profileId, candidateKey: candidate.candidateKey },
        { $set: { active: false, updatedAt: now } },
      );
    } else if (type === "dish_ordered") {
      await db.collection(CANDIDATES_COLLECTION).updateOne(
        { profileId, candidateKey: candidate.candidateKey },
        { $set: { lastOrderedAt: now, updatedAt: now }, $inc: { timesOrdered: 1 } },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("FOOD PREFERENCES POST", error);
    return NextResponse.json({ error: "No se pudo guardar la elección." }, { status: 500 });
  }
}
