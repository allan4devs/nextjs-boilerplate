import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, globals = {}, extra = "") {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8") + extra;
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, ...globals }, { filename: file });
  return exports;
}

// Stall analytics delivery, then produce far more events than the queue cap.
let finishDelivery;
const requests = [];
const store = new Map();
const analytics = load("app/lib/analytics/session-client.ts", {
  window: { sessionStorage: { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) },
    localStorage: { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) } },
  document: { referrer: "" }, navigator: { userAgent: "test", language: "es-CR" },
  setTimeout: () => 1, clearTimeout: () => {},
  AbortSignal: { timeout: (ms) => ({ timeoutMs: ms }) },
  fetch: (url, options) => { requests.push({ url, options }); return new Promise((resolve) => { finishDelivery = resolve; }); },
}, "\nexport function testQueueSize() { return queue.length; }");
for (let index = 0; index < 10_000; index++) analytics.trackUsage({ type: "click", label: `event-${index}` });
assert.equal(requests.length, 1, "only one delivery may be in flight");
assert.equal(analytics.testQueueSize(), 60, "stalled delivery must not grow the queue");
assert.equal(requests[0].options.signal.timeoutMs, 15_000, "delivery must have a deadline");
finishDelivery({ ok: true });
await Promise.resolve();

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function cameraHarness(play = async () => {}) {
  const refs = [];
  const cleanups = [];
  const permissions = [];
  const react = {
    useCallback: (fn) => fn,
    useState: (value) => [value, () => {}],
    useRef: (current) => { const ref = { current }; refs.push(ref); return ref; },
    useEffect: (fn) => { cleanups.push(fn()); },
  };
  const { useUserCamera: createCamera } = load("app/features/checkin/hooks/useUserCamera.ts", {
    require: (name) => { assert.equal(name, "react"); return react; },
    navigator: { mediaDevices: { getUserMedia: () => { const permission = deferred(); permissions.push(permission); return permission.promise; } } },
    DOMException,
  });
  const camera = createCamera({ idealWidth: 640, idealHeight: 480, permissionErrorMessage: "Camera unavailable" });
  camera.videoRef.current = { srcObject: null, play };
  return { camera, permissions, cleanups };
}
function stream() {
  const track = { stopped: false, stop() { this.stopped = true; } };
  return { track, getTracks: () => [track] };
}

// A permission prompt resolves after unmount: its tracks must still be closed.
const leaving = cameraHarness();
const startLeaving = leaving.camera.startCamera();
leaving.cleanups.forEach((cleanup) => cleanup?.());
const lateStream = stream();
leaving.permissions[0].resolve(lateStream);
assert.equal(await startLeaving, false);
assert.equal(lateStream.track.stopped, true);
assert.equal(leaving.camera.videoRef.current.srcObject, null);

// Two overlapping permission prompts must never leave the older stream alive.
const overlapping = cameraHarness();
const first = overlapping.camera.startCamera();
const second = overlapping.camera.startCamera();
const firstStream = stream();
const secondStream = stream();
overlapping.permissions[1].resolve(secondStream);
assert.equal(await second, true);
overlapping.permissions[0].resolve(firstStream);
assert.equal(await first, false);
assert.equal(firstStream.track.stopped, true);
assert.equal(secondStream.track.stopped, false);
assert.equal(overlapping.camera.videoRef.current.srcObject, secondStream);
overlapping.camera.stopCamera();
assert.equal(secondStream.track.stopped, true);

// A playback error must release the acquired device, too.
const failing = cameraHarness(async () => { throw new Error("playback failed"); });
const failedStart = failing.camera.startCamera();
const failedStream = stream();
failing.permissions[0].resolve(failedStream);
assert.equal(await failedStart, false);
assert.equal(failedStream.track.stopped, true);
assert.equal(failing.camera.videoRef.current.srcObject, null);

// Verify that the cap is propagated through NODE_OPTIONS, where Next reads it.
const launcher = readFileSync(new URL("./next-memory.mjs", import.meta.url), "utf8")
  .replace('import { createRequire } from "node:module";', "const createRequire = () => cliRequire;")
  .replace("import.meta.url", '"file:///test.mjs"');
const fakeProcess = { env: { NODE_OPTIONS: "--trace-warnings --max-old-space-size=8192" }, argv: ["node", "launcher", "--help"] };
let cliLoaded = false;
const cliRequire = () => { cliLoaded = true; };
cliRequire.resolve = () => "next-cli";
vm.runInNewContext(launcher, { process: fakeProcess, cliRequire });
assert.equal(fakeProcess.env.NODE_OPTIONS, "--trace-warnings --max-old-space-size=4096");
assert.equal(fakeProcess.argv[1], "next-cli");
assert.equal(cliLoaded, true);
console.log("PASS: bounded analytics queue, delivery timeout, camera cleanup/races, inherited Next heap cap.");
