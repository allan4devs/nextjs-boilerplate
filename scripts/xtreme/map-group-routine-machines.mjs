import envPkg from "@next/env";
import { MongoClient } from "mongodb";
import source from "../../lib/xtreme/trainer-group-a-source.json" with { type: "json" };

const { loadEnvConfig } = envPkg;
loadEnvConfig(process.cwd());
const apply = process.argv.includes("--apply");
const normalize = (value = "") => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const available = (asset) => asset.status !== "fuera_de_servicio" && asset.status !== "pendiente";

function guidesFor(exercise) {
  const name = normalize(exercise.name);
  const equipment = normalize(exercise.equipment);
  if (exercise.muscle === "cardiovascular") {
    if (`${name} ${equipment}`.includes("caminadora")) return ["treadmill"];
    if (`${name} ${equipment}`.includes("eliptica")) return ["elliptical"];
    if (`${name} ${equipment}`.includes("bici")) return ["bicicleta-estatica"];
    if (equipment.includes("escaladora")) return ["stair-climber", "stair-stepper"];
    return [];
  }
  if (/polea|polrea/.test(equipment)) return ["cable-station", "polea-crossover"];
  if (!equipment.includes("maquina")) return [];
  if (/abdyadd|add y abd/.test(name)) return ["hip-abductor-aductor-dual"];
  if (name.includes("abduccion")) return ["hip-abductor"];
  if (name.includes("aduccion")) return ["hip-adductor"];
  if (name.includes("hip thrust")) return ["hip-thrust"];
  if (name.includes("sissy")) return ["sissy-squat"];
  if (name.includes("perfecta")) return ["sentadilla-perfecta"];
  if (name.includes("sentadilla acostada")) return ["lying-squat"];
  if (name.includes("hack")) return ["hack-squat"];
  if (name.includes("prensa pantorrilla")) return ["calf-press-horizontal"];
  if (name === "potro") return ["donkey-calf-raise"];
  if (name.includes("prensa inclinada")) return ["leg-press-incline"];
  if (name.includes("prensa unilateral")) return ["horizontal-leg-press"];
  if (/ext de rodilla/.test(name)) return ["leg-extension"];
  if (/flex.*acostada/.test(name)) return ["lying-leg-curl"];
  if (/flex.*sentada/.test(name)) return ["leg-curl"];
  if (/flex.*(de pie)/.test(name)) return ["standing-leg-curl"];
  if (name.includes("patada gluteo")) return ["glute-hip-extension"];
  if (name.includes("dominadas")) return ["dominada-asistida"];
  if (name.includes("jalon")) return ["lat-pulldown"];
  if (/remo t /.test(name)) return ["remo-t"];
  if (name.includes("remo unilateral")) return ["remo-hammer"];
  if (name.includes("remo")) return ["remo-hammer-strength"];
  if (name.includes("press inclinado")) return ["incline-chest-press"];
  if (name.includes("press plano")) return ["chest-press"];
  if (name.includes("aperturas inclinadas")) return ["incline-fly-machine"];
  if (/aperturas|posteriores/.test(name)) return ["pec-deck-rear-delt-dual"];
  if (/press mili/.test(name)) return ["shoulder-press", "overhead-press-machine"];
  if (name.includes("laterales")) return ["lateral-raise-machine"];
  if (name.includes("predicador")) return ["preacher-curl"];
  if (name.includes("ext de codo")) return ["elbow-extension"];
  if (name.includes("fondos")) return ["dip-machine"];
  if (name.includes("lumbar")) return ["back-extension"];
  if (name.includes("abdominal")) return ["ab-machine"];
  return [];
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 12_000 });
await client.connect();
try {
  const db = client.db(process.env.MONGODB_DB?.trim() || "xtreme_gym");
  const records = db.collection("xtreme_gym_trainer_group_a");
  const [assets, stored] = await Promise.all([
    db.collection("xtreme_gym_equipment_assets").find({ kind: "machine" }, { projection: { _id: 0, id: 1, code: 1, name: 1, status: 1, machineGuideId: 1 } }).sort({ code: 1 }).toArray(),
    records.find({ kind: { $in: ["mapping", "exercise", "routine", "day"] } }).toArray(),
  ]);
  const routines = [...source, ...stored.filter((row) => row.kind === "routine" && row.routine).map((row) => row.routine)];
  for (const row of stored.filter((entry) => entry.kind === "day" && entry.day)) routines.find((routine) => routine.id === row.routineId)?.days.push(row.day);
  for (const row of stored.filter((entry) => entry.kind === "exercise" && entry.isCustom && entry.exercise)) routines.find((routine) => routine.id === row.routineId)?.days.find((day) => day.id === row.dayId)?.exercises.push(row.exercise);
  const mappings = new Map(stored.filter((row) => row.kind === "mapping").map((row) => [row.exerciseId, row]));
  const usage = new Map();
  for (const row of mappings.values()) usage.set(row.assetId, (usage.get(row.assetId) || 0) + 1);
  const choices = [];
  const unresolved = [];
  for (const routine of routines) for (const day of routine.days) for (const exercise of day.exercises) {
    const guides = guidesFor(exercise);
    const needsMachine = guides.length > 0 || normalize(exercise.equipment).includes("maquina");
    if (!needsMachine) continue;
    const existing = mappings.get(exercise.id);
    if (existing && assets.some((asset) => asset.id === existing.assetId && available(asset))) continue;
    const candidates = assets.filter((asset) => guides.includes(asset.machineGuideId || "") && available(asset));
    const sourceNumbers = String(exercise.sourceMachine || "").match(/\d+/g) || [];
    const numbered = candidates.filter((asset) => sourceNumbers.length && sourceNumbers.every((number) => (asset.code.match(/\d+/g) || []).some((entry) => Number(entry) === Number(number))));
    const pool = numbered.length ? numbered : candidates;
    if (!pool.length) { unresolved.push({ routine: routine.objective, module: day.label, exercise: exercise.name, equipment: exercise.equipment, sourceMachine: exercise.sourceMachine }); continue; }
    pool.sort((a, b) => (usage.get(a.id) || 0) - (usage.get(b.id) || 0) || a.code.localeCompare(b.code));
    const asset = pool[0];
    usage.set(asset.id, (usage.get(asset.id) || 0) + 1);
    choices.push({ exerciseId: exercise.id, routine: routine.objective, module: day.label, exercise: exercise.name, assetId: asset.id, code: asset.code, name: asset.name, machineGuideId: asset.machineGuideId });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", assignments: choices.length, unresolved: unresolved.length, choices, unresolved }, null, 2));
  if (apply && choices.length) {
    const now = new Date().toISOString();
    await records.bulkWrite(choices.map((choice) => ({ updateOne: { filter: { _id: `mapping:${choice.exerciseId}` }, update: { $set: { kind: "mapping", exerciseId: choice.exerciseId, assetId: choice.assetId, machineGuideId: choice.machineGuideId, updatedBy: "Codex inventory review", updatedAt: now }, $inc: { revision: 1 } }, upsert: true } })));
  }
} finally {
  await client.close();
}
