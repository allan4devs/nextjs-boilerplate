import { PLAN_STORAGE_KEY, type PlanDocument } from "../plano/plan-model";
import { migrateEquipmentCode } from "@/lib/xtreme/equipment-area-codes";

export const MACHINE_LABELS_KEY = "xtreme:machine-labels:v1";
export const MACHINE_LABELS_EVENT = "xtreme:machine-labels-changed";
export type MachineText = { name?: string; code?: string };
export type MachineTexts = Record<string, MachineText>;

function textFields(value: unknown): MachineText {
  if (!value || typeof value !== "object") return {};
  const text = value as MachineText;
  return {
    ...(typeof text.name === "string" ? { name: text.name.slice(0, 140) } : {}),
    ...(typeof text.code === "string" ? { code: text.code.slice(0, 32) } : {}),
  };
}

/** One local source for physical names/codes, independent of placement and QR destination. */
export function readMachineTexts(): MachineTexts {
  const raw = window.localStorage.getItem(MACHINE_LABELS_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !parsed.labels || typeof parsed.labels !== "object") {
      throw new Error("No se pudo leer los nombres compartidos.");
    }
    return Object.fromEntries(Object.entries(parsed.labels).map(([id, value]) => {
      const text = textFields(value);
      return [id, { ...text, ...(text.code !== undefined ? { code: migrateEquipmentCode(id, text.code) } : {}) }];
    }));
  }

  // Migrate once. Existing plano corrections have priority over older QR drafts.
  const labels: MachineTexts = {};
  const qrRaw = window.localStorage.getItem("xtreme:machine-qr-editor:v1");
  if (qrRaw) {
    const qr = JSON.parse(qrRaw);
    if (qr.version === 1 && qr.drafts && typeof qr.drafts === "object") {
      for (const [id, value] of Object.entries(qr.drafts)) labels[id] = textFields(value);
    }
  }
  const planRaw = window.localStorage.getItem(PLAN_STORAGE_KEY);
  if (planRaw) {
    const saved = JSON.parse(planRaw);
    const plan = saved.plan ?? saved;
    if (plan.version === 1 && plan.placements && typeof plan.placements === "object") {
      for (const [id, value] of Object.entries(plan.placements)) {
        const placement = value as { label?: unknown; code?: unknown };
        labels[id] = { ...labels[id], ...textFields({ name: placement?.label, code: placement?.code }) };
      }
    }
  }
  for (const [id, text] of Object.entries(labels)) {
    if (text.code !== undefined) text.code = migrateEquipmentCode(id, text.code);
  }
  window.localStorage.setItem(MACHINE_LABELS_KEY, JSON.stringify({ version: 1, labels }));
  return labels;
}

export function writeMachineTexts(changes: MachineTexts) {
  const labels = readMachineTexts();
  for (const [id, change] of Object.entries(changes)) {
    labels[id] = { ...labels[id], ...textFields(change) };
  }
  window.localStorage.setItem(MACHINE_LABELS_KEY, JSON.stringify({ version: 1, labels }));
  window.dispatchEvent(new Event(MACHINE_LABELS_EVENT));
}

export function applyMachineTexts(plan: PlanDocument, labels: MachineTexts): PlanDocument {
  return { ...plan, placements: Object.fromEntries(Object.entries(plan.placements).map(([id, placement]) => {
    const text = labels[id];
    return [id, { ...placement,
      ...(text?.name !== undefined ? { label: text.name } : {}),
      ...(text?.code !== undefined ? { code: text.code } : {}),
    }];
  })) };
}
