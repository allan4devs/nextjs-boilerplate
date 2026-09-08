"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN_STORAGE_KEY, parsePlanDocument, type FloorInventoryItem, type PlanDocument } from "../plano/plan-model";
import { useMachineTexts } from "./useMachineTexts";
import { applyMachineTexts } from "./machine-label-store";

export function useFloorPlan(inventory: FloorInventoryItem[]) {
  const { labels, error: labelsError } = useMachineTexts();
  const [plan, setPlan] = useState<PlanDocument | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
        if (!raw) { setPlan(null); setError(""); return; }
        const saved: unknown = JSON.parse(raw);
        const candidate = saved && typeof saved === "object" && "plan" in saved ? saved.plan : saved;
        const parsed = parsePlanDocument(candidate, inventory);
        if (!parsed) throw new Error("invalid plan");
        setPlan(parsed);
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
