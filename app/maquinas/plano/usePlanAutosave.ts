"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { floorPlanStorageKey, parsePlanDocument, type FloorInventoryItem, type PlanDocument } from "./plan-model";

type Remote = { plan: PlanDocument | null; revision: number; savedAt?: string };

export function usePlanAutosave(plan: PlanDocument, ready: boolean, inventory: FloorInventoryItem[], onRestore: (plan: PlanDocument) => void, floor: 1 | 2 = 1) {
  const storageKey = floorPlanStorageKey(floor);
  const syncKey = `${storageKey}:mongo`;
  const endpoint = `/api/xtreme/admin/floor-plan?floor=${floor}`;
  const [status, setStatus] = useState("Cargando MongoDB");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const current = useRef(plan);
  const restore = useRef(onRestore);
  const revision = useRef<number | null>(null);
  const acknowledged = useRef("");
  const busy = useRef(false);
  const blocked = useRef(false);
  const changedAt = useRef(0);
  current.current = plan;
  restore.current = onRestore;

  const readRemote = useCallback(async (): Promise<Remote> => {
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo cargar MongoDB.");
    const parsed = data.plan === null ? null : parsePlanDocument(data.plan, inventory);
    if (data.plan !== null && !parsed) throw new Error("El plano de MongoDB no es válido.");
    return { ...data, plan: parsed };
  }, [inventory, endpoint]);

  const remember = useCallback((value: PlanDocument, rev: number) => {
    revision.current = rev;
    acknowledged.current = JSON.stringify(value);
    // Failure here must not turn a successful Mongo write into a failed write.
    try { localStorage.setItem(syncKey, JSON.stringify({ revision: rev, plan: acknowledged.current })); } catch { /* local backup reports its own status */ }
  }, [syncKey]);

  const sync = useCallback(async () => {
    if (busy.current || blocked.current) return;
    busy.current = true;
    try {
      if (revision.current === null) {
        const before = JSON.stringify(current.current);
        let meta: { revision?: number; plan?: string } | null = null;
        let hasLocal = false;
        try {
          meta = JSON.parse(localStorage.getItem(syncKey) || "null");
          hasLocal = Boolean(localStorage.getItem(storageKey));
        } catch { /* preserve current draft */ }
        const remote = await readRemote();
        if (remote.plan) {
          const remoteText = JSON.stringify(remote.plan);
          const localText = JSON.stringify(current.current);
          if (localText === remoteText) remember(current.current, remote.revision);
          else if ((!hasLocal || meta?.plan === localText) && before === localText) {
            remember(remote.plan, remote.revision);
            current.current = remote.plan;
            restore.current(remote.plan);
          } else if (meta?.revision === remote.revision) {
            revision.current = remote.revision;
            acknowledged.current = remoteText;
          } else {
            blocked.current = true;
            setConflict(true);
            throw new Error("Hay un plano en MongoDB y una copia local distinta. Elegí cuál conservar.");
          }
        } else {
          revision.current = 0;
        }
      }
      const snapshot = current.current;
      if (JSON.stringify(snapshot) !== acknowledged.current) {
        setStatus("Guardando en MongoDB");
        const response = await fetch(endpoint, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: snapshot, revision: revision.current }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!response.ok) {
          if (response.status === 409) { blocked.current = true; setConflict(true); }
          throw new Error(data.error || "No se pudo guardar en MongoDB.");
        }
        remember(snapshot, data.revision);
      }
      setError("");
      setStatus(JSON.stringify(current.current) === acknowledged.current ? "Guardado en MongoDB" : "Cambios pendientes de guardar");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo conectar a MongoDB.");
      setStatus("Pendiente de guardar en MongoDB");
    } finally { busy.current = false; }
  }, [readRemote, remember, storageKey, endpoint, syncKey]);

  useEffect(() => {
    if (!ready) return;
    changedAt.current = Date.now();
    if (JSON.stringify(plan) !== acknowledged.current) setStatus("Cambios pendientes de guardar");
  }, [plan, ready]);

  useEffect(() => {
    if (!ready) return;
    void sync();
    // One request at a time; edits made during a write are picked up next.
    let lastAttempt = 0;
    const timer = window.setInterval(() => {
      if (Date.now() - changedAt.current < 800 || Date.now() - lastAttempt < 5000) return;
      lastAttempt = Date.now();
      void sync();
    }, 1000);
    const retry = () => { void sync(); };
    const warn = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(current.current) !== acknowledged.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    window.addEventListener("beforeunload", warn);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
      window.removeEventListener("beforeunload", warn);
    };
  }, [ready, sync]);

  const choose = useCallback(async (useLocal: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const remote = await readRemote();
      if (!useLocal && !remote.plan) throw new Error("Todavía no hay un plano guardado en MongoDB.");
      // Preserve the discarded draft separately for recovery.
      if (!useLocal) {
        localStorage.setItem(`${storageKey}:recovery`, JSON.stringify({ savedAt: new Date().toISOString(), plan: current.current }));
        remember(remote.plan!, remote.revision);
        current.current = remote.plan!;
        restore.current(remote.plan!);
      } else {
        revision.current = remote.revision;
        acknowledged.current = remote.plan ? JSON.stringify(remote.plan) : "";
      }
      blocked.current = false;
      setConflict(false);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo restaurar el plano.");
    } finally { busy.current = false; }
    if (!blocked.current) void sync();
  }, [readRemote, remember, sync, storageKey]);

  return { status, error, conflict, retry: sync, restore: () => choose(false), keepLocal: () => choose(true) };
}
