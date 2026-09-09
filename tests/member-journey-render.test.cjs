const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  module._compile(outputText, filename);
};
const Home = require('../app/components/member/journey/MemberJourneyHome.tsx').default;
const Hud = require('../app/components/member/TopHud.tsx').default;
const { initialMember } = require('../app/components/member/helpers/createInitialMember.ts');
const { assessJourney, EMPTY_JOURNEY } = require('../lib/xtreme/member-journey.ts');
const { todayIso } = require('../app/components/member/utils.ts');
const today = todayIso();
const noop = () => {};
const member = { ...initialMember('Socio prueba'), goal: 'Ganar fuerza' };
const base = {
  currentMember: member, memberName: 'Socio prueba', unlocked: true,
  activeVisit: null, journey: assessJourney(EMPTY_JOURNEY, member.goal, [], []),
  lifestyle: { today: null, recent: [] }, setNavOpen: noop, setTab: noop, setOsModal: noop,
  weeklyGoal: 3, weekDoneCount: 0, effectiveStreak: 0,
};
const inside = { ...base, activeVisit: { id: 'visit-a', checkedInAt: new Date().toISOString(), elapsedMinutes: 1 } };
const assessed = { ...inside, lifestyle: { today: { date: today, assessedAt: new Date().toISOString(), energy: 3, mood: 4, soreness: 2, sleepHours: 7, note: '' }, recent: [] } };
const render = (os, Component = Home) => renderToStaticMarkup(React.createElement(Component, { os }));

test('arrival invites check-in; an active visit removes check-in and keeps a small HUD timer', () => {
  assert.match(render(base), /Ya llegué · registrar ingreso/);
  const markup = render(inside);
  assert.doesNotMatch(markup, /Ya llegué · registrar ingreso/);
  assert.match(markup, /¿Cómo te sentís hoy\?/);
  const hud = render(inside, Hud);
  assert.match(hud, /Tiempo desde tu ingreso/);
  assert.doesNotMatch(hud, /Ingreso|Racha|>Nv</);
});
test('without an assigned plan, the next step offers a free session and explains assignment status', () => {
  const markup = render(assessed);
  assert.match(markup, /¿Qué vamos a trabajar primero\?/);
  assert.match(markup, /Aún no te asignaron un plan/);
  assert.match(markup, /Empezar mi entrenamiento libre/);
  assert.match(markup, /Mi peso e InBody/);
});
test('assigned sessions show the real plan, exercise text and next session selector', () => {
  const os = { ...assessed, currentMember: { ...member, trainingPlan: { title: 'Fuerza A', coachNote: 'Ajustar asiento', items: [{ id: 'a', day: 'Lunes', focus: 'Espalda', exercises: 'Remo y jalón', targetMinutes: 40, done: false }] } } };
  const markup = render(os);
  assert.match(markup, /Fuerza A/);
  assert.match(markup, /Remo y jalón/);
  assert.match(markup, /Empezar esta sesión/);
});
test('resumed exercise list presents the first unfinished exercise and keeps completed progress', () => {
  const item = { id: 'e1', machineId: '', machineName: '', exerciseName: 'Remo terminado', sets: 3, reps: 10, weightKg: 15, seconds: 0, notes: '', completed: true };
  const workout = { id: 'free-a', visitId: 'visit-a', trainingName: 'Espalda', startedAt: new Date().toISOString(), exercises: [item, { ...item, id: 'e2', exerciseName: 'Jalón pendiente', completed: false }] };
  const markup = render({ ...assessed, journey: { ...assessed.journey, workout } });
  assert.match(markup, /Estás trabajando · Espalda/);
  assert.match(markup, /<h2[^>]*>Jalón pendiente<\/h2>/);
  assert.match(markup, /1 de 2 ejercicios guardados/);
  assert.doesNotMatch(markup, /Empezar mi entrenamiento libre/);
});
test('a saved workout switches the main action to recovery and checking progress', () => {
  const markup = render({ ...assessed, currentMember: { ...member, workouts: [{ id: 'w', trainingName: 'Espalda', completedDate: today, minutes: 42 }], totalWorkouts: 1 } });
  assert.match(markup, /Tu entrenamiento quedó guardado/);
  assert.match(markup, /42 min/);
  assert.match(markup, /Ya terminé · registrar salida/);
  assert.doesNotMatch(markup, /Empezar esta sesión/);
});
