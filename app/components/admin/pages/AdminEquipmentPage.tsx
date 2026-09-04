"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
  Save,
  Video,
  Wrench,
} from "lucide-react";
import { MACHINE_MEDIA_MAX_IMAGES } from "@/lib/xtreme/machine-media";
import { GameButton, GameCallout, GameChip, GameLabel } from "../../GameOS";
import { useAdmin } from "../context/AdminProvider";
import { adminFetch, adminRequestError } from "../request";

type EquipmentStatus = "bueno" | "fuera_de_servicio" | "pendiente" | "sin_dato";
type EquipmentKind = "machine" | "bench" | "plate";

type EquipmentAsset = {
  id: string;
  area: string;
  kind: EquipmentKind;
  code: string;
  name: string;
  description?: string;
  location: string;
  status: EquipmentStatus;
  machineGuideId?: string;
  brand?: string;
  serial?: string;
  supplier?: string;
  invoiceNumber?: string;
  year?: number;
  cost?: number;
  depreciation?: string;
  maintenance?: string;
  warranty?: string;
};

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  bueno: "Funcionando / bueno",
  fuera_de_servicio: "Fuera de servicio",
  pendiente: "Pendiente confirmar",
  sin_dato: "Sin dato",
};

const STATUS_TONE: Record<EquipmentStatus, "lime" | "red" | "yellow" | "default"> = {
  bueno: "lime",
  fuera_de_servicio: "red",
  pendiente: "yellow",
  sin_dato: "default",
};

const KIND_LABEL: Record<EquipmentKind, string> = {
  machine: "Máquina",
  bench: "Banco",
  plate: "Disco",
};

type EditableFields = {
  code: string;
  name: string;
  location: string;
  status: EquipmentStatus;
  brand: string;
  serial: string;
  supplier: string;
  invoiceNumber: string;
  year: string;
  cost: string;
  depreciation: string;
  maintenance: string;
  warranty: string;
};

function toEditable(asset: EquipmentAsset): EditableFields {
  return {
    code: asset.code ?? "",
    name: asset.name ?? "",
    location: asset.location ?? "",
    status: asset.status,
    brand: asset.brand ?? "",
    serial: asset.serial ?? "",
    supplier: asset.supplier ?? "",
    invoiceNumber: asset.invoiceNumber ?? "",
    year: asset.year ? String(asset.year) : "",
    cost: asset.cost ? String(asset.cost) : "",
    depreciation: asset.depreciation ?? "",
    maintenance: asset.maintenance ?? "",
    warranty: asset.warranty ?? "",
  };
}

const INPUT_CLASS =
  "min-h-9 w-full border-2 border-white/15 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#d8ff3e]";

type MachineMedia = { videoUrl?: string; videoLabel?: string; images?: string[] };

export function AdminEquipmentPage() {
  const {
    data: { data },
  } = useAdmin();

  const [assets, setAssets] = useState<EquipmentAsset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, EditableFields>>({});
  const [savingId, setSavingId] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const [mediaById, setMediaById] = useState<Record<string, MachineMedia>>({});
  const autoOpenedRef = useRef(false);

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams();
      if (areaFilter) params.set("area", areaFilter);
      if (kindFilter) params.set("kind", kindFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await adminFetch(`/api/xtreme/admin/equipment?${params.toString()}`);
      const json = (await res.json()) as { assets?: EquipmentAsset[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar el inventario.");
      setAssets(json.assets ?? []);
    } catch (err) {
      setLoadError(adminRequestError(err, "No se pudo cargar el inventario."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter, kindFilter, statusFilter]);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch("/api/xtreme/admin/machine-media");
        const json = (await res.json()) as { items?: (MachineMedia & { id: string })[] };
        if (!res.ok) return;
        const map: Record<string, MachineMedia> = {};
        for (const item of json.items ?? []) map[item.id] = item;
        setMediaById(map);
      } catch {
        // La edición de video/fotos es secundaria: si falla, el resto del inventario sigue usable.
      }
    })();
  }, []);

  // Deep link desde /maquinas/qr (`?machine=<machineGuideId>`): abre y enfoca esa máquina.
  useEffect(() => {
    if (autoOpenedRef.current || !assets) return;
    const targetId = new URLSearchParams(window.location.search).get("machine");
    if (!targetId) return;
    const match = assets.find((a) => a.machineGuideId === targetId);
    if (!match) return;
    autoOpenedRef.current = true;
    setExpanded(match.id);
    requestAnimationFrame(() => {
      document.getElementById(`equipment-row-${match.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [assets]);

  const areas = useMemo(
    () => Array.from(new Set((assets ?? []).map((a) => a.area))).sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets ?? [];
    return (assets ?? []).filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q),
    );
  }, [assets, search]);

  if (!data || (data.role !== "admin" && data.role !== "super")) return null;

  function draftFor(asset: EquipmentAsset): EditableFields {
    return drafts[asset.id] ?? toEditable(asset);
  }

  function setDraft(id: string, patch: Partial<EditableFields>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? toEditable(assets!.find((a) => a.id === id)!)), ...patch } }));
  }

  async function save(asset: EquipmentAsset) {
    const draft = draftFor(asset);
    setSavingId(asset.id);
    setRowError((prev) => ({ ...prev, [asset.id]: "" }));
    try {
      const res = await adminFetch("/api/xtreme/admin/equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          code: draft.code,
          name: draft.name,
          location: draft.location,
          status: draft.status,
          brand: draft.brand || undefined,
          serial: draft.serial || undefined,
          supplier: draft.supplier || undefined,
          invoiceNumber: draft.invoiceNumber || undefined,
          year: draft.year ? Number(draft.year) : undefined,
          cost: draft.cost ? Number(draft.cost) : undefined,
          depreciation: draft.depreciation || undefined,
          maintenance: draft.maintenance || undefined,
          warranty: draft.warranty || undefined,
        }),
      });
      const json = (await res.json()) as { asset?: EquipmentAsset; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar.");
      setAssets((prev) => (prev ?? []).map((a) => (a.id === asset.id ? { ...a, ...json.asset } : a)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[asset.id];
        return next;
      });
    } catch (err) {
      setRowError((prev) => ({ ...prev, [asset.id]: adminRequestError(err, "No se pudo guardar.") }));
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Wrench className="mt-0.5 h-6 w-6 shrink-0 text-[#d8ff3e]" />
          <div>
            <GameLabel>Inventario de activos fijos</GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase">Equipo</h2>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-white/55">
              131 equipos de la auditoría física. Completá marca, código, costo y estado a medida que
              se van confirmando en piso — los cambios quedan en la bitácora.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 border-[3px] border-white/10 bg-white/[0.02] p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código o ubicación"
          className={`${INPUT_CLASS} max-w-xs`}
        />
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className={`${INPUT_CLASS} max-w-[220px]`}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className={`${INPUT_CLASS} max-w-[160px]`}>
          <option value="">Todos los tipos</option>
          {(Object.keys(KIND_LABEL) as EquipmentKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${INPUT_CLASS} max-w-[200px]`}>
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as EquipmentStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <span className="text-[11px] font-black uppercase text-white/40">
          {loading ? "Cargando…" : `${filtered.length} de ${assets?.length ?? 0}`}
        </span>
      </section>

      {loadError && <GameCallout tone="orange">{loadError}</GameCallout>}

      {loading && !assets ? (
        <div className="flex items-center gap-2 p-6 text-sm font-bold text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando inventario…
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((asset) => {
            const draft = draftFor(asset);
            const isOpen = expanded === asset.id;
            return (
              <div key={asset.id} id={`equipment-row-${asset.id}`} className="border-2 border-white/12 bg-white/[0.02] scroll-mt-24">
                <div className="flex flex-wrap items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? "" : asset.id)}
                    className="flex min-h-9 items-center gap-1.5 border-2 border-white/15 bg-black/40 px-2 text-white/60 hover:text-[#d8ff3e]"
                  >
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-sm font-black text-white">{asset.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
                      {asset.area} · {KIND_LABEL[asset.kind]}
                    </p>
                  </div>
                  <input
                    value={draft.code}
                    onChange={(e) => setDraft(asset.id, { code: e.target.value })}
                    placeholder="Código"
                    className={`${INPUT_CLASS} w-24`}
                  />
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft(asset.id, { status: e.target.value as EquipmentStatus })}
                    className={`${INPUT_CLASS} w-44`}
                  >
                    {(Object.keys(STATUS_LABEL) as EquipmentStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <GameChip tone={STATUS_TONE[asset.status]}>{STATUS_LABEL[asset.status]}</GameChip>
                  <GameButton variant="lime" onClick={() => void save(asset)} disabled={savingId === asset.id}>
                    {savingId === asset.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </GameButton>
                </div>

                {rowError[asset.id] && (
                  <div className="px-3 pb-2 text-xs font-bold text-red-300">{rowError[asset.id]}</div>
                )}

                {isOpen && (
                  <>
                  <div className="grid gap-2 border-t-2 border-white/10 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-1">
                      <GameLabel tone="white">Nombre</GameLabel>
                      <input value={draft.name} onChange={(e) => setDraft(asset.id, { name: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Ubicación</GameLabel>
                      <input value={draft.location} onChange={(e) => setDraft(asset.id, { location: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Marca</GameLabel>
                      <input value={draft.brand} onChange={(e) => setDraft(asset.id, { brand: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Serie / placa</GameLabel>
                      <input value={draft.serial} onChange={(e) => setDraft(asset.id, { serial: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Proveedor</GameLabel>
                      <input value={draft.supplier} onChange={(e) => setDraft(asset.id, { supplier: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">N. factura</GameLabel>
                      <input value={draft.invoiceNumber} onChange={(e) => setDraft(asset.id, { invoiceNumber: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Año</GameLabel>
                      <input value={draft.year} onChange={(e) => setDraft(asset.id, { year: e.target.value })} className={INPUT_CLASS} inputMode="numeric" />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Costo (₡)</GameLabel>
                      <input value={draft.cost} onChange={(e) => setDraft(asset.id, { cost: e.target.value })} className={INPUT_CLASS} inputMode="numeric" />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Depreciación</GameLabel>
                      <input value={draft.depreciation} onChange={(e) => setDraft(asset.id, { depreciation: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Mantenimiento</GameLabel>
                      <input value={draft.maintenance} onChange={(e) => setDraft(asset.id, { maintenance: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    <label className="space-y-1">
                      <GameLabel tone="white">Garantía</GameLabel>
                      <input value={draft.warranty} onChange={(e) => setDraft(asset.id, { warranty: e.target.value })} className={INPUT_CLASS} />
                    </label>
                    {asset.description && (
                      <div className="sm:col-span-2 lg:col-span-4">
                        <GameLabel tone="white">Nota de la auditoría</GameLabel>
                        <p className="mt-1 text-xs font-bold text-white/50">{asset.description}</p>
                      </div>
                    )}
                  </div>

                  {asset.machineGuideId && (() => {
                    const machineGuideId = asset.machineGuideId;
                    const media = mediaById[machineGuideId];
                    const photoCount = media?.images?.length ?? 0;
                    const siblingCount = assets?.filter((a) => a.machineGuideId === machineGuideId).length ?? 1;
                    return (
                      <div className="flex flex-wrap items-center gap-2 border-t-2 border-white/10 bg-black/20 p-3">
                        <Link
                          href={`/admin/equipo/media/${machineGuideId}`}
                          className="inline-flex min-h-9 items-center gap-1.5 border-2 border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-white/70 transition hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
                        >
                          <Video className="h-3.5 w-3.5" />
                          Editar video y fotos
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white/35">
                          {media?.videoUrl ? "Video propio" : "Video del catálogo"} · {photoCount}/
                          {MACHINE_MEDIA_MAX_IMAGES} fotos propias
                          {siblingCount > 1 ? ` · ${siblingCount} unidades comparten esta ficha` : ""}
                        </span>
                      </div>
                    );
                  })()}
                  </>
                )}
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p className="p-6 text-center text-sm font-bold text-white/40">Sin resultados con estos filtros.</p>
          )}
        </div>
      )}
    </div>
  );
}
