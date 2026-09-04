"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileVideo, ImagePlus, Loader2, Save, Video, X } from "lucide-react";
import { findMachineGuide } from "@/app/lib/machines";
import { MACHINE_MEDIA_MAX_IMAGES } from "@/lib/xtreme/machine-media";
import { GameButton, GameCallout, GameLabel } from "../../GameOS";
import { useAdmin } from "../context/AdminProvider";
import { resizeGalleryPhoto } from "../helpers";
import { adminFetch, adminRequestError } from "../request";

type MachineMedia = { videoUrl?: string; videoLabel?: string; images?: string[] };
type MachineMediaDraft = { videoUrl: string; videoLabel: string; images: string[] };
type EquipmentAssetLite = { id: string; code: string; status: string; machineGuideId?: string };
type VideoLibraryItem = { name: string; path: string };

const INPUT_CLASS =
  "min-h-9 w-full border-2 border-white/15 bg-black/40 px-2 py-1 text-xs font-bold text-white outline-none transition placeholder:text-white/25 focus:border-[#d8ff3e]";

function toMediaDraft(media: MachineMedia | undefined): MachineMediaDraft {
  return {
    videoUrl: media?.videoUrl ?? "",
    videoLabel: media?.videoLabel ?? "",
    images: media?.images ?? [],
  };
}

function titleizeFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function BackLink() {
  return (
    <Link
      href="/admin/equipo"
      className="inline-flex min-h-9 items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/50 transition hover:text-[#d8ff3e]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Volver a Equipo
    </Link>
  );
}

/** Página dedicada al video/fotos de UNA máquina (`machineGuideId`), no un editor general de todas. */
export function AdminMachineMediaPage({ machineId }: { machineId: string }) {
  const {
    data: { data },
  } = useAdmin();

  const machine = findMachineGuide(machineId);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<MachineMediaDraft>(toMediaDraft(undefined));
  const [siblings, setSiblings] = useState<EquipmentAssetLite[]>([]);
  const [videoLibrary, setVideoLibrary] = useState<VideoLibraryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [mediaRes, assetsRes, libraryRes] = await Promise.all([
          adminFetch("/api/xtreme/admin/machine-media"),
          adminFetch("/api/xtreme/admin/equipment"),
          adminFetch("/api/xtreme/admin/machine-media/library"),
        ]);
        const mediaJson = (await mediaRes.json()) as {
          items?: (MachineMedia & { id: string })[];
          error?: string;
        };
        if (!mediaRes.ok) throw new Error(mediaJson.error ?? "No se pudo cargar el video y las fotos.");
        const assetsJson = (await assetsRes.json()) as { assets?: EquipmentAssetLite[]; error?: string };
        if (!assetsRes.ok) throw new Error(assetsJson.error ?? "No se pudo cargar el inventario.");
        if (!active) return;
        const found = (mediaJson.items ?? []).find((item) => item.id === machineId);
        setDraft(toMediaDraft(found));
        setSiblings((assetsJson.assets ?? []).filter((a) => a.machineGuideId === machineId));
        if (libraryRes.ok) {
          const libraryJson = (await libraryRes.json()) as { items?: VideoLibraryItem[] };
          if (active) setVideoLibrary(libraryJson.items ?? []);
        }
      } catch (err) {
        if (active) setLoadError(adminRequestError(err, "No se pudo cargar el video y las fotos."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [machineId]);

  if (!data || (data.role !== "admin" && data.role !== "super")) return null;

  if (!machine) {
    return (
      <div className="space-y-4">
        <BackLink />
        <GameCallout tone="orange">Esa máquina no existe en el catálogo.</GameCallout>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await adminFetch("/api/xtreme/admin/machine-media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: machineId,
          videoUrl: draft.videoUrl,
          videoLabel: draft.videoLabel,
          images: draft.images,
        }),
      });
      const json = (await res.json()) as { item?: MachineMedia & { id: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar.");
      setDraft(toMediaDraft(json.item));
      setSaved(true);
    } catch (err) {
      setError(adminRequestError(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MACHINE_MEDIA_MAX_IMAGES - draft.images.length;
    if (room <= 0) return;
    setBusy(true);
    setError("");
    try {
      const picked = Array.from(files).slice(0, room);
      const resized = await Promise.all(picked.map((file) => resizeGalleryPhoto(file)));
      setDraft((prev) => ({ ...prev, images: [...prev.images, ...resized] }));
      setSaved(false);
    } catch (err) {
      setError(adminRequestError(err, "No se pudo procesar la foto."));
    } finally {
      setBusy(false);
    }
  }

  function removePhoto(index: number) {
    setDraft((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <BackLink />

      <section className="border-[3px] border-white/15 bg-[#0c0c0c] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Video className="mt-0.5 h-6 w-6 shrink-0 text-[#d8ff3e]" />
          <div>
            <GameLabel>Video y fotos de la ficha pública</GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase">{machine.name}</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/40">
              {machine.zone} · {machine.level}
            </p>
            {siblings.length > 0 && (
              <p className="mt-2 max-w-2xl text-sm font-bold text-white/55">
                Aplica a las {siblings.length} unidades de este modelo en piso
                {siblings.some((s) => s.code)
                  ? `: ${siblings.map((s) => s.code).filter(Boolean).join(", ")}`
                  : ""}
                .
              </p>
            )}
          </div>
        </div>
      </section>

      {loadError && <GameCallout tone="orange">{loadError}</GameCallout>}

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm font-bold text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : (
        <section className="space-y-4 border-[3px] border-white/12 bg-white/[0.02] p-4 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <GameLabel tone="white">Link del video (YouTube u otro)</GameLabel>
              <input
                value={draft.videoUrl}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, videoUrl: e.target.value }));
                  setSaved(false);
                }}
                placeholder="https://youtube.com/..."
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1">
              <GameLabel tone="white">Título del video</GameLabel>
              <input
                value={draft.videoLabel}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, videoLabel: e.target.value }));
                  setSaved(false);
                }}
                placeholder="Ej. Técnica correcta"
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {videoLibrary.length > 0 && (
            <div className="space-y-1.5">
              <GameLabel tone="white">Videos subidos en public/videos</GameLabel>
              <div className="flex flex-wrap gap-1.5">
                {videoLibrary.map((item) => {
                  const active = draft.videoUrl === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          videoUrl: item.path,
                          videoLabel: prev.videoLabel || titleizeFileName(item.name),
                        }));
                        setSaved(false);
                      }}
                      className={`inline-flex items-center gap-1.5 border-2 px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
                        active
                          ? "border-[#d8ff3e] bg-[#d8ff3e]/10 text-[#d8ff3e]"
                          : "border-white/15 text-white/55 hover:border-[#d8ff3e]/50 hover:text-white"
                      }`}
                    >
                      <FileVideo className="h-3.5 w-3.5" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!draft.videoUrl && machine.videoUrl && (
            <p className="text-xs font-bold text-white/40">
              Sin link propio: la ficha pública usa el video del catálogo
              {machine.videoLabel ? ` (${machine.videoLabel})` : ""}.
            </p>
          )}

          <div>
            <GameLabel tone="white">
              Fotos de piso ({draft.images.length}/{MACHINE_MEDIA_MAX_IMAGES})
            </GameLabel>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {draft.images.map((src, index) => (
                <div
                  key={index}
                  className="group relative h-24 w-24 shrink-0 overflow-hidden border-2 border-white/15"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    aria-label="Quitar foto"
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center border border-black/40 bg-black/70 text-white/80 transition hover:bg-red-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {draft.images.length < MACHINE_MEDIA_MAX_IMAGES && (
                <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-white/20 text-white/40 transition hover:border-[#d8ff3e] hover:text-[#d8ff3e]">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <span className="text-[9px] font-black uppercase">Agregar</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      void addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            {!draft.images.length && machine.images?.length ? (
              <p className="mt-1.5 text-xs font-bold text-white/40">
                Sin fotos propias: la ficha pública usa las {machine.images.length} fotos del catálogo.
              </p>
            ) : null}
          </div>

          {error && <p className="text-xs font-bold text-red-300">{error}</p>}
          {saved && !error && <p className="text-xs font-bold text-[#d8ff3e]">Guardado.</p>}

          <GameButton variant="lime" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar video y fotos
          </GameButton>
        </section>
      )}
    </div>
  );
}
