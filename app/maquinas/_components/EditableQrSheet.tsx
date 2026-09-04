"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  Check,
  Cloud,
  CloudOff,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { MachineLabel } from "@/app/lib/machines";
import { absoluteAppUrl } from "@/lib/constants/app-url";
import QrSheet from "./QrSheet";

const STORAGE_KEY = "xtreme:machine-qr-editor:v1";

type EquipmentStatus = "bueno" | "fuera_de_servicio" | "pendiente" | "sin_dato";

export type EditableQrItem = MachineLabel & {
  assetId: string;
  machineGuideId: string;
  status: EquipmentStatus;
};

type Draft = { code?: string; name?: string };
type Drafts = Record<string, Draft>;
type SyncState = "checking" | "connected" | "local" | "error";

type ApiEquipmentAsset = {
  id: string;
  area: string;
  kind: string;
  code: string;
  name: string;
  status: EquipmentStatus;
  machineGuideId?: string;
};

type StoredEditorState = {
  version: 1;
  order: string[];
  drafts: Drafts;
};

function reconcileOrder(order: string[], items: EditableQrItem[]) {
  const available = new Set(items.map((item) => item.assetId));
  const seen = new Set<string>();
  const reconciled: string[] = [];

  for (const id of order) {
    if (!available.has(id) || seen.has(id)) continue;
    seen.add(id);
    reconciled.push(id);
  }
  for (const item of items) {
    if (seen.has(item.assetId)) continue;
    seen.add(item.assetId);
    reconciled.push(item.assetId);
  }
  return reconciled;
}

function withUnitCounts(items: EditableQrItem[]): EditableQrItem[] {
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const item of items) {
    totals.set(item.machineGuideId, (totals.get(item.machineGuideId) ?? 0) + 1);
  }
  return items.map((item) => {
    const unit = (seen.get(item.machineGuideId) ?? 0) + 1;
    seen.set(item.machineGuideId, unit);
    return {
      ...item,
      id: item.machineGuideId,
      unit,
      units: totals.get(item.machineGuideId) ?? 1,
      unitLetter: null,
    };
  });
}

function safeStoredState(raw: string | null, ids: Set<string>): StoredEditorState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredEditorState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.order) || !parsed.drafts) return null;

    const order = parsed.order.filter((id): id is string => typeof id === "string" && ids.has(id));
    const drafts: Drafts = {};
    for (const [id, value] of Object.entries(parsed.drafts)) {
      if (!ids.has(id) || !value || typeof value !== "object") continue;
      const draft = value as Draft;
      const next: Draft = {};
      if (typeof draft.code === "string") next.code = draft.code.slice(0, 32);
      if (typeof draft.name === "string") next.name = draft.name.slice(0, 140);
      if (next.code !== undefined || next.name !== undefined) drafts[id] = next;
    }
    return { version: 1, order, drafts };
  } catch {
    return null;
  }
}

function normalizedCode(code: string) {
  return code.trim().toLocaleLowerCase("es");
}

function effectiveItem(item: EditableQrItem, draft?: Draft): EditableQrItem {
  const code = draft?.code ?? item.code;
  return {
    ...item,
    code,
    baseCode: code,
    name: draft?.name ?? item.name,
  };
}

function canonicalQrUrl(machineGuideId: string) {
  return absoluteAppUrl(`/maquinas/${encodeURIComponent(machineGuideId)}`);
}

export default function EditableQrSheet({ initialItems }: { initialItems: EditableQrItem[] }) {
  const [baseItems, setBaseItems] = useState(() => withUnitCounts(initialItems));
  const [order, setOrder] = useState(() => initialItems.map((item) => item.assetId));
  const [drafts, setDrafts] = useState<Drafts>({});
  const [search, setSearch] = useState("");
  const [syncState, setSyncState] = useState<SyncState>("checking");
  const [storageReady, setStorageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [orderUndo, setOrderUndo] = useState<string[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = new Set(initialItems.map((item) => item.assetId));
    let stored: StoredEditorState | null = null;
    try {
      stored = safeStoredState(window.localStorage.getItem(STORAGE_KEY), ids);
    } catch {
      setNotice("Este navegador no permitió recuperar la copia local.");
    }
    if (stored) {
      setOrder(reconcileOrder(stored.order, initialItems));
      setDrafts(stored.drafts);
    }
    setStorageReady(true);
  }, [initialItems]);

  useEffect(() => {
    if (!storageReady) return;
    const state: StoredEditorState = { version: 1, order, drafts };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setNotice("Este navegador no permitió guardar la copia local.");
    }
  }, [drafts, order, storageReady]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadLiveInventory() {
      try {
        const response = await fetch("/api/xtreme/admin/equipment?kind=machine", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          setSyncState("local");
          return;
        }
        if (!response.ok) throw new Error("No se pudo consultar el inventario.");
        const payload = (await response.json()) as { assets?: ApiEquipmentAsset[] };
        const assets = (payload.assets ?? []).filter(
          (asset) => asset.kind === "machine" && Boolean(asset.machineGuideId),
        );
        if (!assets.length) throw new Error("El inventario no devolvió máquinas.");

        const initialById = new Map(initialItems.map((item) => [item.assetId, item]));
        const liveItems = assets.map((asset): EditableQrItem => {
          const machineGuideId = asset.machineGuideId as string;
          const initial = initialById.get(asset.id);
          return {
            assetId: asset.id,
            machineGuideId,
            id: machineGuideId,
            code: asset.code ?? "",
            baseCode: asset.code ?? "",
            name: asset.name,
            zone: asset.area,
            status: asset.status,
            unit: initial?.unit ?? 1,
            units: initial?.units ?? 1,
            unitLetter: null,
            url: canonicalQrUrl(machineGuideId),
          };
        });
        const normalized = withUnitCounts(liveItems);
        setBaseItems(normalized);
        setOrder((current) => reconcileOrder(current, normalized));
        setSyncState("connected");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSyncState("error");
      }
    }
    void loadLiveInventory();
    return () => controller.abort();
  }, [initialItems, reloadKey]);

  const orderedItems = useMemo(() => {
    const byId = new Map(baseItems.map((item) => [item.assetId, item]));
    return reconcileOrder(order, baseItems)
      .map((id) => byId.get(id))
      .filter((item): item is EditableQrItem => Boolean(item))
      .map((item) => effectiveItem(item, drafts[item.assetId]));
  }, [baseItems, drafts, order]);

  const codeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of orderedItems) {
      const code = normalizedCode(item.code);
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [orderedItems]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return orderedItems;
    return orderedItems.filter((item) =>
      [item.code, item.name, item.zone, item.assetId]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(query),
    );
  }, [orderedItems, search]);

  const dirtyIds = useMemo(() => Object.keys(drafts), [drafts]);
  const withoutCode = orderedItems.filter((item) => !item.code.trim()).length;
  const duplicateCodes = Array.from(codeCounts.values()).filter((count) => count > 1).length;

  function updateDraft(assetId: string, field: keyof Draft, value: string) {
    const base = baseItems.find((item) => item.assetId === assetId);
    if (!base) return;
    setDrafts((current) => {
      const nextDraft = { ...current[assetId], [field]: value };
      if (nextDraft.code === base.code) delete nextDraft.code;
      if (nextDraft.name === base.name) delete nextDraft.name;
      if (!Object.keys(nextDraft).length) {
        const next = { ...current };
        delete next[assetId];
        return next;
      }
      return { ...current, [assetId]: nextDraft };
    });
    setSaveErrors((current) => {
      if (!current[assetId]) return current;
      const next = { ...current };
      delete next[assetId];
      return next;
    });
    setNotice("");
  }

  function sortBy(kind: "code" | "name" | "area" | "pending") {
    const next = [...orderedItems];
    next.sort((a, b) => {
      if (kind === "pending") {
        const pending = Number(Boolean(a.code.trim())) - Number(Boolean(b.code.trim()));
        if (pending) return pending;
      }
      if (kind === "code") {
        if (!a.code.trim() && b.code.trim()) return 1;
        if (a.code.trim() && !b.code.trim()) return -1;
        return a.code.localeCompare(b.code, "es", { numeric: true, sensitivity: "base" });
      }
      if (kind === "area") {
        return a.zone.localeCompare(b.zone, "es", { sensitivity: "base" }) ||
          a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });
      }
      return a.name.localeCompare(b.name, "es", { numeric: true, sensitivity: "base" });
    });
    setOrderUndo(orderedItems.map((item) => item.assetId));
    setOrder(next.map((item) => item.assetId));
    setNotice(`Orden aplicado: ${kind === "pending" ? "sin código primero" : kind}.`);
  }

  function move(assetId: string, delta: -1 | 1) {
    if (search.trim()) {
      setNotice("Limpiá la búsqueda para cambiar posiciones manualmente.");
      return;
    }
    const next = orderedItems.map((item) => item.assetId);
    const index = next.indexOf(assetId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrderUndo(orderedItems.map((item) => item.assetId));
    setOrder(next);
    setNotice(`Máquina movida a la posición ${target + 1}.`);
  }

  function resetOrder() {
    if (!window.confirm("¿Restablecer el orden original del inventario?")) return;
    setOrderUndo(orderedItems.map((item) => item.assetId));
    setOrder(baseItems.map((item) => item.assetId));
    setNotice("Orden original restablecido.");
  }

  function undoOrderChange() {
    if (!orderUndo) return;
    const current = orderedItems.map((item) => item.assetId);
    setOrder(reconcileOrder(orderUndo, baseItems));
    setOrderUndo(current);
    setNotice("Se deshizo el último cambio de orden.");
  }

  function discardDrafts() {
    if (!dirtyIds.length) return;
    if (!window.confirm("¿Descartar los cambios de código y nombre que todavía no se guardaron?")) return;
    setDrafts({});
    setNotice("Cambios de texto descartados.");
  }

  async function saveChanges() {
    if (!dirtyIds.length) {
      setNotice("No hay cambios de código o nombre por guardar.");
      return;
    }
    if (syncState !== "connected") {
      setNotice(
        syncState === "error"
          ? "Los cambios siguen guardados en este navegador. Reintentá la conexión para enviarlos al inventario central."
          : "Los cambios ya quedaron guardados en este navegador. Iniciá sesión como admin para guardarlos en el inventario central.",
      );
      return;
    }

    const invalid = orderedItems.find((item) => drafts[item.assetId] && !item.name.trim());
    if (invalid) {
      setNotice(`El nombre de ${invalid.assetId} no puede quedar vacío.`);
      document.getElementById(`qr-name-${invalid.assetId}`)?.focus();
      return;
    }

    setSaving(true);
    setSaveErrors({});
    setNotice("");
    const submittedDrafts = drafts;
    const submittedIds = Object.keys(submittedDrafts);
    const results = await Promise.allSettled(
      submittedIds.map(async (assetId) => {
        const item = orderedItems.find((candidate) => candidate.assetId === assetId);
        if (!item) throw new Error("Activo no encontrado.");
        const draft = submittedDrafts[assetId];
        const body: { id: string; code?: string; name?: string } = { id: assetId };
        if (draft.code !== undefined) body.code = item.code.trim();
        if (draft.name !== undefined) body.name = item.name.trim();
        const response = await fetch("/api/xtreme/admin/equipment", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (response.status === 401) setSyncState("local");
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `No se pudo guardar ${assetId}.`);
        }
        const payload = (await response.json()) as { asset: ApiEquipmentAsset };
        return payload.asset;
      }),
    );

    const saved = results
      .filter((result): result is PromiseFulfilledResult<ApiEquipmentAsset> => result.status === "fulfilled")
      .map((result) => result.value);
    const savedIds = new Set(saved.map((asset) => asset.id));
    if (saved.length) {
      const savedById = new Map(saved.map((asset) => [asset.id, asset]));
      setBaseItems((current) =>
        withUnitCounts(
          current.map((item) => {
            const asset = savedById.get(item.assetId);
            return asset
              ? { ...item, code: asset.code, baseCode: asset.code, name: asset.name, zone: asset.area }
              : item;
          }),
        ),
      );
      setDrafts((current) => {
        const next = { ...current };
        for (const id of savedIds) {
          const asset = savedById.get(id);
          const remaining = { ...next[id] };
          if (remaining.code === asset?.code) delete remaining.code;
          if (remaining.name === asset?.name) delete remaining.name;
          if (Object.keys(remaining).length) next[id] = remaining;
          else delete next[id];
        }
        return next;
      });
    }
    const failed = results.length - saved.length;
    const errors: Record<string, string> = {};
    results.forEach((result, index) => {
      if (result.status === "fulfilled") return;
      const reason = result.reason;
      errors[submittedIds[index]] = reason instanceof Error ? reason.message : "No se pudo guardar.";
    });
    setSaveErrors(errors);
    setNotice(
      failed
        ? `${saved.length} cambios guardados; ${failed} siguen pendientes. ${Object.values(errors)[0] ?? ""}`
        : `${saved.length} ${saved.length === 1 ? "máquina guardada" : "máquinas guardadas"} en el inventario.`,
    );
    setSaving(false);
    const firstFailedId = Object.keys(errors)[0];
    if (firstFailedId) document.getElementById(`qr-row-${firstFailedId}`)?.focus();
  }

  function retryInventory() {
    setSyncState("checking");
    setReloadKey((value) => value + 1);
  }

  const syncLabel =
    syncState === "checking"
      ? "Comprobando acceso"
      : syncState === "connected"
        ? "Inventario conectado"
        : syncState === "local"
          ? "Edición local"
          : "Inventario sin conexión";

  return (
    <div className="space-y-10">
      <section className="border-[3px] border-[#d8ff3e]/55 bg-[#0c0c0c] shadow-[5px_5px_0_rgba(0,0,0,0.7)] print:hidden">
        <div className="border-b-2 border-white/10 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Editor de etiquetas</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.02em]">Orden, código y nombre</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/60">
                El orden de esta lista es el orden de impresión y descarga. Podés cambiar el código físico y el nombre impreso; el destino del QR permanece bloqueado.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-9 items-center gap-2 border border-white/15 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
                {syncState === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : syncState === "connected" ? <Cloud className="h-3.5 w-3.5 text-[#d8ff3e]" /> : <CloudOff className="h-3.5 w-3.5" />}
                {syncLabel}
              </span>
              {syncState === "error" ? (
                <button
                  type="button"
                  onClick={retryInventory}
                  className="inline-flex min-h-11 items-center gap-2 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                </button>
              ) : null}
              {syncState === "connected" ? (
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving || !dirtyIds.length}
                  className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-[#d8ff3e] px-4 text-[11px] font-black uppercase tracking-[0.1em] text-black shadow-[2px_2px_0_rgba(0,0,0,0.5)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Guardando" : "Guardar inventario"}
                </button>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-2 border-2 border-white/10 bg-white/[0.03] px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/45">
                  {syncState === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {syncState === "checking" ? "Preparando inventario" : "Copia local automática"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-[10px] font-black uppercase tracking-[0.11em] sm:grid-cols-4">
            <span className="border border-white/10 bg-white/[0.03] px-3 py-2 text-white/55">{orderedItems.length} etiquetas físicas</span>
            <span className="border border-white/10 bg-white/[0.03] px-3 py-2 text-white/55">{orderedItems.length - withoutCode} con código</span>
            <span className="border border-amber-300/25 bg-amber-300/5 px-3 py-2 text-amber-200">{withoutCode} sin código</span>
            <span className="border border-amber-300/25 bg-amber-300/5 px-3 py-2 text-amber-200">{duplicateCodes} códigos repetidos</span>
          </div>
        </div>

        <div className="border-b-2 border-white/10 p-4 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.13em] text-white/50">Buscar etiqueta</span>
              <span className="flex min-h-11 items-center gap-2 border-2 border-white/15 bg-black/35 px-3 focus-within:border-[#d8ff3e]">
                <Search className="h-4 w-4 text-white/35" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Código, máquina, área o eq-###"
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
                />
                {search ? (
                  <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="grid min-h-11 min-w-11 place-items-center text-white/45 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </span>
            </label>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.13em] text-white/50">Orden automático</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => sortBy("code")} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-[#d8ff3e] hover:text-[#d8ff3e]"><ArrowDownAZ className="mr-1.5 inline h-3.5 w-3.5" />Código</button>
                <button type="button" onClick={() => sortBy("name")} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-[#d8ff3e] hover:text-[#d8ff3e]">Nombre</button>
                <button type="button" onClick={() => sortBy("area")} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-[#d8ff3e] hover:text-[#d8ff3e]">Área</button>
                <button type="button" onClick={() => sortBy("pending")} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-[#d8ff3e] hover:text-[#d8ff3e]">Sin código</button>
                <button type="button" onClick={undoOrderChange} disabled={!orderUndo} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><Undo2 className="mr-1.5 inline h-3.5 w-3.5" />Deshacer</button>
                <button type="button" onClick={resetOrder} className="min-h-11 border-2 border-white/15 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/65 hover:border-white/40 hover:text-white"><RotateCcw className="mr-1.5 inline h-3.5 w-3.5" />Original</button>
              </div>
            </div>
          </div>

          {(withoutCode > 0 || duplicateCodes > 0) && (
            <div className="mt-4 flex items-start gap-2 border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs font-semibold leading-5 text-amber-100/80">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Los códigos vacíos y repetidos vienen del inventario físico. Se muestran para corregirlos; el sistema no agrega letras ni números inventados.
            </div>
          )}
          <a
            href="#resultado-etiquetas"
            className="mt-4 inline-flex min-h-11 items-center text-[10px] font-black uppercase tracking-[0.12em] text-[#d8ff3e] underline decoration-[#d8ff3e]/45 underline-offset-4 hover:decoration-[#d8ff3e]"
          >
            Saltar al resultado, impresión y PNG
          </a>
        </div>

        <div className="p-3 sm:p-4 md:max-h-[68vh] md:overflow-y-auto md:overscroll-contain">
          <ol className="space-y-2">
            {visibleItems.map((item) => {
              const position = orderedItems.findIndex((candidate) => candidate.assetId === item.assetId);
              const codeKey = normalizedCode(item.code);
              const repeated = Boolean(codeKey && (codeCounts.get(codeKey) ?? 0) > 1);
              const codeChanged = drafts[item.assetId]?.code !== undefined;
              const nameChanged = drafts[item.assetId]?.name !== undefined;
              const saveError = saveErrors[item.assetId];
              return (
                <li
                  key={item.assetId}
                  id={`qr-row-${item.assetId}`}
                  tabIndex={-1}
                  onKeyDown={(event) => {
                    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                    event.preventDefault();
                    move(item.assetId, event.key === "ArrowUp" ? -1 : 1);
                  }}
                  className={`grid gap-3 border-2 bg-white/[0.025] p-3 focus:outline-none focus-visible:border-[#d8ff3e] md:grid-cols-[72px_minmax(120px,0.48fr)_minmax(220px,1.25fr)_minmax(210px,0.8fr)] md:items-end ${saveError ? "border-red-400/70" : "border-white/10"}`}
                >
                  <div className="flex items-center gap-1 md:self-center">
                    <span className="w-7 text-center font-mono text-xs font-black text-white/40">{String(position + 1).padStart(2, "0")}</span>
                    <div className="flex gap-1 md:flex-col">
                      <button type="button" onClick={() => move(item.assetId, -1)} disabled={Boolean(search.trim()) || position === 0} title={search.trim() ? "Limpiá la búsqueda para reordenar" : undefined} aria-label={`Subir ${item.name}`} className="grid min-h-11 min-w-11 place-items-center border border-white/15 text-white/55 hover:border-[#d8ff3e] hover:text-[#d8ff3e] disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => move(item.assetId, 1)} disabled={Boolean(search.trim()) || position === orderedItems.length - 1} title={search.trim() ? "Limpiá la búsqueda para reordenar" : undefined} aria-label={`Bajar ${item.name}`} className="grid min-h-11 min-w-11 place-items-center border border-white/15 text-white/55 hover:border-[#d8ff3e] hover:text-[#d8ff3e] disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                      Código físico
                      {codeChanged ? <em className="not-italic text-[#d8ff3e]">Modificado</em> : null}
                      {!item.code.trim() ? <em className="not-italic text-amber-300">Sin código</em> : repeated ? <em className="not-italic text-amber-300">Repetido</em> : null}
                    </span>
                    <input
                      value={item.code}
                      onChange={(event) => updateDraft(item.assetId, "code", event.target.value)}
                      disabled={saving}
                      maxLength={32}
                      className="h-11 w-full border-2 border-white/15 bg-black/40 px-3 font-mono text-sm font-black text-white outline-none focus:border-[#d8ff3e] disabled:cursor-wait disabled:opacity-55"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                      Nombre impreso {nameChanged ? <em className="not-italic text-[#d8ff3e]">Modificado</em> : null}
                    </span>
                    <input
                      id={`qr-name-${item.assetId}`}
                      value={item.name}
                      onChange={(event) => updateDraft(item.assetId, "name", event.target.value)}
                      disabled={saving}
                      required
                      aria-invalid={!item.name.trim() || Boolean(saveError)}
                      maxLength={140}
                      className="h-11 w-full border-2 border-white/15 bg-black/40 px-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e] disabled:cursor-wait disabled:opacity-55 aria-invalid:border-red-400"
                    />
                  </label>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.11em] text-white/35">{item.assetId} · {item.zone}</p>
                    <div className="mt-1.5 flex min-h-11 items-center gap-2 border border-white/10 bg-black/25 px-3 text-[11px] font-bold text-white/45">
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-[#d8ff3e]" />
                      <span className="min-w-0 flex-1 truncate">/maquinas/{item.machineGuideId}</span>
                      <Link href={`/maquinas/${item.machineGuideId}`} target="_blank" className="shrink-0 text-[#d8ff3e] underline-offset-4 hover:underline">Abrir</Link>
                    </div>
                    <p className="mt-1 text-[10px] font-bold text-white/60">QR bloqueado: editar texto no cambia este destino.</p>
                  </div>
                  {saveError ? <p className="text-xs font-bold text-red-300 md:col-start-2 md:col-span-3" role="alert">{saveError}</p> : null}
                </li>
              );
            })}
          </ol>
          {!visibleItems.length ? <p className="p-8 text-center text-sm font-bold text-white/45">No hay etiquetas que coincidan con la búsqueda.</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-white/10 p-4 sm:p-6">
          <p aria-live="polite" className="text-xs font-bold text-white/55">
            {notice || `${dirtyIds.length} ${dirtyIds.length === 1 ? "cambio de texto pendiente" : "cambios de texto pendientes"}. El orden se guarda automáticamente en este navegador.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={discardDrafts} disabled={!dirtyIds.length || saving} className="min-h-11 border-2 border-white/15 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-white/60 hover:border-white/40 hover:text-white disabled:opacity-35">Descartar texto</button>
            {syncState === "connected" ? (
              <button type="button" onClick={saveChanges} disabled={saving || !dirtyIds.length} className="inline-flex min-h-11 items-center gap-2 border-2 border-[#d8ff3e]/60 bg-[#d8ff3e]/10 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-[#eaff93] hover:border-[#d8ff3e] disabled:opacity-35"><Save className="h-4 w-4" />Guardar inventario</button>
            ) : (
              <span className="inline-flex min-h-11 items-center gap-2 border border-white/10 px-3 text-[10px] font-black uppercase tracking-[0.1em] text-white/40"><Check className="h-3.5 w-3.5" />Copia local automática</span>
            )}
          </div>
        </div>
      </section>

      <section id="resultado-etiquetas" tabIndex={-1} className="scroll-mt-6 outline-none">
        <div className="mb-4 print:hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Resultado actualizado</p>
          <h2 className="mt-2 text-2xl font-black uppercase">Rótulo 16:9, hoja A4 y PNG</h2>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/50">
            La vista previa y el PNG muestran el rótulo horizontal 16:9; imprimir genera una hoja A4 compacta para recortar.
          </p>
        </div>
        {syncState === "checking" ? (
          <div className="flex min-h-40 items-center justify-center gap-3 border-2 border-white/10 bg-white/[0.025] text-sm font-bold text-white/55" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-[#d8ff3e]" /> Comprobando el inventario antes de habilitar impresión y descargas…
          </div>
        ) : syncState === "error" ? (
          <div className="border-2 border-amber-300/35 bg-amber-300/[0.06] p-5 text-sm font-semibold leading-6 text-amber-100/80">
            <p>No se habilitó la impresión porque no fue posible confirmar el inventario actual.</p>
            <button type="button" onClick={retryInventory} className="mt-3 inline-flex min-h-11 items-center gap-2 border-2 border-amber-200/40 px-4 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 hover:border-amber-100"><RefreshCw className="h-4 w-4" />Reintentar conexión</button>
          </div>
        ) : (
          <>
            {syncState === "local" ? (
              <div className="mb-4 flex items-start gap-2 border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs font-semibold leading-5 text-amber-100/80 print:hidden">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Vista local basada en el inventario inicial y en tus borradores. Iniciá sesión como admin para confirmar datos actuales y guardarlos centralmente.
              </div>
            ) : null}
            <QrSheet items={orderedItems} />
          </>
        )}
      </section>
    </div>
  );
}
