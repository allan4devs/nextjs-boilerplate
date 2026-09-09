"use client";

import { useEffect, useMemo, useState } from "react";
import { floorPlanStorageKey, parsePlanDocument, type FloorInventoryItem, type PlanDocument } from "../plano/plan-model";
import { useMachineTexts } from "./useMachineTexts";
import { applyMachineTexts } from "./machine-label-store";

export function useFloorPlan(inventory: FloorInventoryItem[]) {
  const { labels, error: labelsError } = useMachineTexts();
  const [plan, setPlan] = useState<PlanDocument | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        const plans: PlanDocument[] = [];
        for (const floor of [1, 2] as const) {
          const raw = window.localStorage.getItem(floorPlanStorageKey(floor));
          if (!raw) continue;
          const saved: unknown = JSON.parse(raw);
          const candidate = saved && typeof saved === "object" && "plan" in saved ? saved.plan : saved;
          const parsed = parsePlanDocument(candidate, inventory.filter((asset) => (asset.floor ?? 1) === floor));
          if (!parsed) throw new Error("invalid plan");
          plans.push(parsed);
        }
        setPlan(plans.length ? { ...plans[0], placements: Object.assign({}, ...plans.map((plan) => plan.placements)), customElements: plans.flatMap((plan) => plan.customElements) } : null);
        setError("");
      } catch {
        setPlan(null);
        setError("No se pudo leer el plano local. Abrí el plano para revisar tu copia guardada.");
      }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [inventory]);
  const sharedPlan = useMemo(() => plan ? applyMachineTexts(plan, labels) : null, [plan, labels]);
  return { plan: sharedPlan, labels, error: labelsError || error };
}
