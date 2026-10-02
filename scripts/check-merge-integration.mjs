import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks = {}, extra = "", globals = {}) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8") + extra;
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, URL, structuredClone, ...globals, crypto: { randomUUID: () => "scanned-exercise" },
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : require(id),
  }, { filename: file });
  return exports;
}
function stateHarness() {
  const cells = [];
  let cursor = 0;
  return {
    render: (fn) => { cursor = 0; return fn(); },
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
        return [cells[index], (value) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }];
      },
      useEffect: () => {},
    },
  };
}
function findElement(node, type) {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) return node.map((child) => findElement(child, type)).find(Boolean) ?? null;
  if (node.type === type) return node;
  return findElement(node.props?.children, type);
}
const json = (value) => JSON.parse(JSON.stringify(value));

// Saving an imported workout must retain both the current prescription fields
// and the tracking fields contributed by the other checkout.
const tracking = load("lib/xtreme/workout-tracking.ts");
const sanitizers = load("lib/xtreme/shared/sanitizers.ts", {
  "../workout-tracking": tracking,
  "./dates": { isoDateOrEmpty: (value) => value },
});
const prescribed = {
  id: "prescribed", assetId: "eq-plan", machineId: "leg-press", machineName: "Prensa",
  machineCode: "PI-01", machineArea: "Piernas", machineLocation: "Zona A", machineFloor: 1,
  exerciseName: "Prensa del plan", sets: 4, reps: 8, weightKg: 90, seconds: 30,
  targetSeconds: 60, notes: "Mantener técnica", completed: false,
  tracking: { elapsedSeconds: 30, startedAt: null, restUntil: null, logs: [{ reps: 8, seconds: 30, weightKg: 90 }] },
};
assert.deepEqual(json(sanitizers.sanitizeWorkoutExercises([prescribed])[0]), prescribed);
assert.equal(tracking.scannedAsset("https://gym.test/maquinas/equipo/eq-plan"), "eq-plan");
assert.equal(tracking.scannedAsset("https://gym.test/maquinas/leg-press"), null);
assert.equal(tracking.scannedAsset("javascript:alert(1)"), null);

// Selecting a QR preserves the prescribed exercise instead of replacing it
// with generic defaults. Another physical unit must stay a distinct exercise.
const state = stateHarness();
const Scanner = () => null;
const guide = load("app/components/member/journey/WorkoutGuide.tsx", {
  react: state.react,
  "next/link": () => null,
  "@/app/maquinas/_components/MachineVideo": () => null,
  "@/app/lib/physical-machine-links": { physicalMachinePath: (id) => `/maquinas/equipo/${id}` },
  "../catalog/machines": { MACHINE_GUIDE: [{ id: "leg-press", name: "Prensa", muscles: [], zone: "Piernas" }] },
  "./MachineScanner": Scanner,
}, "\nexport { WorkoutSteps };");
const saves = [];
let savingSucceeds = true;
const os = {
  currentMember: { activePlanWorkout: { id: "workout", trainingName: "Plan actual" }, exercisePreferences: [] },
  savePlanWorkout: async (entries) => { saves.push(json(entries)); return savingSucceeds; },
};
const renderGuide = () => state.render(() => guide.WorkoutSteps({ os, initial: [prescribed] }));
const select = (asset) => findElement(renderGuide(), Scanner).props.onSelect(asset);
await select({ id: "eq-plan", name: "Prensa actualizada", code: "PI-02", machineGuideId: "leg-press" });
assert.equal(saves.at(-1).length, 1);
assert.equal(saves.at(-1)[0].id, prescribed.id);
assert.equal(saves.at(-1)[0].sets, 4);
assert.equal(saves.at(-1)[0].weightKg, 90);
assert.deepEqual(saves.at(-1)[0].tracking, prescribed.tracking);
await select({ id: "eq-other", name: "Otra prensa", code: "PI-03", machineGuideId: "leg-press" });
assert.equal(saves.at(-1).length, 2);
assert.equal(saves.at(-1)[0].assetId, "eq-plan");
assert.equal(saves.at(-1)[1].assetId, "eq-other");
savingSucceeds = false;
await assert.rejects(select({ id: "eq-failed", name: "Prensa", code: "PI-04", machineGuideId: "leg-press" }));
savingSucceeds = true;
await select({ id: "eq-other", name: "Otra prensa", code: "PI-03", machineGuideId: "leg-press" });
assert.equal(saves.at(-1).length, 2, "failed saves must not add a local exercise");

// Verify the combined Trainer surface contains the current programs/agenda
// and the imported health/group workspaces for an authenticated trainer.
const markers = {};
const marker = (name) => markers[name] ??= () => null;
const trainerState = {
  authenticated: true, stats: {}, selected: { memberId: "member-id", memberName: "Socio" },
  selectedSignal: { tone: "lime" }, tab: "health", groupActive: true,
};
const trainer = load("app/components/trainer/TrainerOs.tsx", {
  "next/image": marker("Image"), "next/link": marker("Link"),
  "next/dynamic": (factory) => marker(factory.toString().match(/\.\/ui\/([A-Za-z]+)/)[1]),
  "@/app/components/GameOS": { GameButton: marker("GameButton"), GameLabel: marker("GameLabel") },
  "./constants": { TRAINER_TABS: [{ id: "health", label: "Ficha personal y salud" }] },
  "./hooks/useTrainerOs": { useTrainerOs: () => trainerState },
  "./ui/TrainerOverview": { TrainerOverview: marker("TrainerOverview") },
  "./ui/TrainerProgramsPanel": { TrainerProgramsPanel: marker("TrainerProgramsPanel") },
  "./ui/TrainerRoster": { TrainerRoster: marker("TrainerRoster") },
  "./ui/TrainerTodayClasses": { TrainerTodayClasses: marker("TrainerTodayClasses") },
});
const surface = trainer.default();
assert.ok(findElement(surface, markers.TrainerProgramsPanel));
assert.ok(findElement(surface, markers.TrainerTodayClasses));
assert.equal(findElement(surface, markers.TrainerGroupA).props.active, true);
assert.equal(findElement(surface, markers.TrainerHealthRecord).props.member.memberId, "member-id");
assert.equal(findElement(surface, markers.TrainerHealthRecord).props.active, false);
trainerState.groupActive = false;
assert.equal(findElement(trainer.default(), markers.TrainerHealthRecord).props.active, true);

// Hidden Group A drafts still protect refresh/logout. Switching workspaces
// preserves the draft, and in-flight group saves block destructive navigation.
const hookState = stateHarness();
let confirms = 0;
let dashboardReads = 0;
let logouts = 0;
const constants = load("app/components/trainer/constants.ts");
const utils = load("app/components/trainer/utils.ts", {
  "@/app/components/member/catalog/machines": { MACHINE_GUIDE: [] }, "./constants": constants,
});
const hook = load("app/components/trainer/hooks/useTrainerOs.ts", {
  react: { ...hookState.react, useMemo: (fn) => fn(), useCallback: (fn) => fn },
  "../constants": constants, "../utils": utils,
  "../api": {
    fetchTrainerMembers: async () => { dashboardReads++; return { authenticated: true, members: [], programs: [], equipment: [], todayClasses: [], date: "2026-10-02" }; },
    logoutTrainer: async () => { logouts++; },
  },
}, "", { window: { confirm: () => { confirms++; return false; } } });
const renderHook = () => hookState.render(() => hook.useTrainerOs());
let workspace = renderHook();
workspace.setGroupActive(true);
workspace.setGroupDirty(true);
workspace = renderHook();
workspace.setGroupActive(false);
workspace = renderHook();
assert.equal(workspace.groupDirty, true);
await workspace.refresh();
await workspace.logout();
assert.equal(confirms, 2);
assert.equal(dashboardReads, 0);
assert.equal(logouts, 0);
workspace.setGroupBusy(true);
workspace = renderHook();
await workspace.refresh();
await workspace.logout();
assert.equal(confirms, 2, "in-flight group saves must block navigation before confirmation");
workspace.setGroupBusy(false);
workspace.setGroupDirty(false);
workspace = renderHook();
await workspace.refresh();
assert.equal(dashboardReads, 1);
assert.equal(renderHook().groupRefresh, 1);
console.log("PASS: combined Trainer surface, draft guards, prescription/tracking preservation, physical QR identity and failed-save recovery.");
