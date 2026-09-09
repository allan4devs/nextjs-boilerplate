import test from "node:test";
import assert from "node:assert/strict";
import { assessJourney, EMPTY_JOURNEY, journeyPhase } from "../lib/xtreme/member-journey.ts";
import { parseBodyMetric, BodyMetricValidationError } from "../lib/xtreme/body-composition.ts";

const exercise = { id: "e1", machineId: "", machineName: "", exerciseName: "Remo", sets: 3, reps: 10, weightKg: 20, seconds: 0, notes: "", completed: true };
const visits = [{ id: "v1", date: "2026-09-08" }];
const workouts = [{ id: "w1", completedDate: "2026-09-08", exercises: [exercise] }];

test("the session moves from arrival to check-in, selection, active training and recovery", () => {
  const state = { inside: false, activeWorkout: false, completed: false, assessed: false, skipped: false };
  assert.equal(journeyPhase(state), "arrival");
  assert.equal(journeyPhase({ ...state, inside: true }), "wellness");
  assert.equal(journeyPhase({ ...state, inside: true, assessed: true }), "choose");
  assert.equal(journeyPhase({ ...state, inside: true, skipped: true }), "choose");
  assert.equal(journeyPhase({ ...state, activeWorkout: true }), "training");
  assert.equal(journeyPhase({ ...state, completed: true }), "recovery");
  assert.equal(journeyPhase({ ...state, completed: true, activeWorkout: true }), "training");
});
test("levels need a goal, recorded attendance and explicitly completed exercise evidence", () => {
  assert.equal(assessJourney(EMPTY_JOURNEY, "Fuerza", workouts, visits).ready, true);
  assert.equal(assessJourney(EMPTY_JOURNEY, "", workouts, visits).ready, false);
  assert.equal(assessJourney(EMPTY_JOURNEY, "Fuerza", workouts, []).ready, false);
  assert.equal(assessJourney(EMPTY_JOURNEY, "Fuerza", [{ ...workouts[0], exercises: [{ ...exercise, completed: undefined }] }], visits).ready, false);
  assert.equal(assessJourney(EMPTY_JOURNEY, "Fuerza", [{ ...workouts[0], exercises: [{ ...exercise, sets: 0, reps: 0 }] }], visits).ready, false);
  const timed = [{ ...workouts[0], exercises: [{ ...exercise, sets: 0, reps: 0, seconds: 90 }] }];
  assert.equal(assessJourney(EMPTY_JOURNEY, "Movilidad", timed, visits).ready, true);
});
test("multiple logs or visits on one day cannot inflate a level", () => {
  const result = assessJourney({ ...EMPTY_JOURNEY, level: 1 }, "Fuerza", [...workouts, ...workouts, ...workouts], [...visits, ...visits, ...visits]);
  assert.equal(result.ready, false);
  assert.equal(result.requirements[1].current, 1);
  assert.equal(result.requirements[2].current, 1);
  const threeWorkouts = [8, 9, 10].map((day) => ({ ...workouts[0], id: `w${day}`, completedDate: `2026-09-${String(day).padStart(2, "0")}` }));
  const threeVisits = threeWorkouts.map((workout) => ({ id: `v${workout.id}`, date: workout.completedDate }));
  const checked = assessJourney({ ...EMPTY_JOURNEY, level: 1 }, "Fuerza", threeWorkouts, threeVisits);
  assert.equal(checked.nextLevel, 2);
  assert.equal(checked.ready, true);
  assert.deepEqual(checked.evidence.workoutIds, ["w8", "w9", "w10"]);
});
test("weight-only measurements do not invent waist or InBody results", () => {
  const parsed = parseBodyMetric({ weightKg: "72.3", waistCm: "" });
  assert.equal(parsed.weightKg, 72.3);
  assert.equal(parsed.waistCm, 0);
  assert.equal(parsed.inbody, undefined);
  for (const weightKg of ["", null, false, -1, Infinity, "invalid", 401]) assert.throws(() => parseBodyMetric({ weightKg }), BodyMetricValidationError);
});
test("InBody keeps zeroes, signed controls, segment results and additional report fields", () => {
  const parsed = parseBodyMetric({ weightKg: 72, inbody: {
    device: "Reporte personal", values: { weightControlKg: -2.5, muscleControlKg: 0, bodyFatPct: 21.3, ecwRatio: .38 },
    segments: { rightArm: { leanKg: 3.2, leanPct: 110, fatKg: .4 } },
    additional: [{ label: "Impedancia brazo derecho 5 kHz", value: "300", unit: "ohm" }],
  } });
  assert.equal(parsed.inbody.values.weightControlKg, -2.5);
  assert.equal(parsed.inbody.values.muscleControlKg, 0);
  assert.equal(parsed.inbody.segments.rightArm.leanPct, 110);
  assert.equal(parsed.inbody.additional[0].unit, "ohm");
  assert.equal(parsed.inbody.values.skeletalMuscleKg, undefined);
});
test("malformed or empty reports fail rather than becoming plausible measurements", () => {
  for (const inbody of [null, [], {}, { values: null }, { segments: [] }, { values: { bodyFatPct: 101 } }, { values: { ecwRatio: 2 } }, { segments: { rightArm: 3 } }, { additional: [{ label: "", value: "10" }] }]) {
    assert.throws(() => parseBodyMetric({ weightKg: 70, inbody }), BodyMetricValidationError);
  }
});
