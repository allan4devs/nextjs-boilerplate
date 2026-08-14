"use client";

/**
 * Ingreso por rostro del mostrador.
 *
 * La cámara escanea en continuo: cuando el reconocedor está muy seguro registra
 * el ingreso solo, y cuando duda deja la decisión en recepción con el porcentaje
 * a la vista. El enrolamiento pide varias muestras del mismo socio.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  Loader2,
  RefreshCw,
  ScanFace,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { GameCallout, GameChip, GameLabel } from "../GameOS";
import { Avatar, MemberPreview } from "./MemberCards";
import { useUserCamera } from "@/app/features/checkin/hooks/useUserCamera";
import { useFaceRecognizer } from "@/app/features/checkin/face/useFaceRecognizer";
import {
  FACE_AUTO_SIMILARITY,
  FACE_ENROLL_SAMPLES,
  FACE_MIN_SIMILARITY,
} from "@/lib/xtreme/face/config";
import type { MemberHit } from "@/lib/xtreme/checkin/contracts";

type Props = {
  roster: MemberHit[];
  member: MemberHit | null;
  onSelectMember: (member: MemberHit | null) => void;
  onCheckin: (member: MemberHit, method: "face") => void | Promise<void>;
  isCheckingIn: boolean;
  /** Refresca el roster del panel tras enrolar o borrar un rostro. */
  onRosterChanged: () => void;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

export default function FaceRecognitionPanel({
  roster,
  member,
  onSelectMember,
  onCheckin,
  isCheckingIn,
  onRosterChanged,
}: Props) {
  const {
    videoRef,
    cameraOn,
    cameraError,
    startCamera,
    stopCamera,
  } = useUserCamera({
    idealWidth: 1280,
    idealHeight: 720,
    permissionErrorMessage: "No se pudo abrir la cámara. Revisá permisos del navegador.",
  });

  const [enrollQuery, setEnrollQuery] = useState("");
  const [enrollTarget, setEnrollTarget] = useState<MemberHit | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void startCamera("user");
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleAutoCheckin = useCallback(
    async (matched: MemberHit) => {
      onSelectMember(matched);
      await onCheckin(matched, "face");
    },
    [onCheckin, onSelectMember],
  );

  const {
    engineStatus,
    engineError,
    feedback,
    quality,
    candidates,
    scanning,
    enrollProgress,
    enrollError,
    enroll,
    forget,
    retry,
  } = useFaceRecognizer({
    videoRef,
    cameraOn,
    active: true,
    roster,
    onAutoCheckin: handleAutoCheckin,
  });

  const best = candidates[0] ?? null;
  const enrolled = useMemo(() => roster.filter((hit) => hit.faceEnrolled), [roster]);

  const enrollMatches = useMemo(() => {
    const query = enrollQuery.trim().toLocaleLowerCase("es");
    if (query.length < 2) return [];
    return roster
      .filter((hit) => hit.memberName.toLocaleLowerCase("es").includes(query))
      .slice(0, 6);
  }, [enrollQuery, roster]);

  async function runEnroll() {
    if (!enrollTarget) return;
    setNotice("");
    const ok = await enroll(enrollTarget);
    if (ok) {
      setNotice(`${enrollTarget.memberName} ya puede ingresar por rostro.`);
      setEnrollTarget(null);
      setEnrollQuery("");
      onRosterChanged();
    }
  }

  async function runForget(target: MemberHit) {
    setNotice("");
    const ok = await forget(target);
    if (ok) {
      setNotice(`Se borró el rostro de ${target.memberName}.`);
      onRosterChanged();
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0">
        <GameLabel tone="lime">Reconocimiento facial · escaneo continuo</GameLabel>
        <h2 className="mt-2 text-[clamp(1.5rem,3vw,2rem)] font-black uppercase leading-[1.05] tracking-tight text-balance">
          Pedile que mire a la cámara
        </h2>
        <p className="mt-2 max-w-prose text-sm font-bold leading-6 text-white/45 text-pretty">
          Si la coincidencia es clara, el ingreso queda registrado solo. Si hay dudas, elegí
          vos a la persona en la lista de la derecha.
        </p>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden border-[3px] border-white/20 bg-black shadow-[4px_4px_0_rgba(0,0,0,.55)]">
          <video ref={videoRef} playsInline muted className="h-full w-full scale-x-[-1] object-cover" />

          <div className="pointer-events-none absolute inset-x-[18%] inset-y-[10%] rounded-[50%] border-[3px] border-[#d8ff3e]/35" />

          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
            <EngineBadge status={engineStatus} scanning={scanning} />
            {best && (
              <span className="border-[3px] border-black/30 bg-[#d8ff3e] px-2.5 py-1.5 text-[11px] font-black uppercase text-black">
                {percent(best.similarity)} · {best.member?.memberName.split(" ")[0] ?? "?"}
              </span>
            )}
          </div>

          {!cameraOn && (
            <div className="absolute inset-0 grid place-items-center bg-black/75 p-6 text-center">
              <div>
                <Camera className="mx-auto h-10 w-10 text-white/40" />
                <p className="mx-auto mt-3 max-w-sm text-sm font-bold text-white/55 text-pretty">
                  {cameraError || "Cámara apagada"}
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera("user")}
                  className="mt-4 min-h-11 bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black"
                >
                  Activar cámara
                </button>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 border-t-[3px] border-white/15 bg-black/80 px-3 py-2.5 backdrop-blur-sm">
            <p className="truncate text-sm font-black uppercase tracking-tight text-white/85">
              {engineStatus === "loading"
                ? "Cargando reconocedor…"
                : engineStatus === "error"
                  ? "Reconocedor no disponible"
                  : feedback || "Esperando a alguien frente a la cámara"}
            </p>
            <QualityMeter value={quality} />
          </div>
        </div>

        {engineStatus === "error" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <GameCallout tone="red" icon={XCircle}>
                {engineError || "No se pudo cargar el reconocedor facial."}
              </GameCallout>
            </div>
            <button
              type="button"
              onClick={retry}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 text-xs font-black uppercase text-white/70 hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
            >
              <RefreshCw className="h-4 w-4" /> Reintentar
            </button>
          </div>
        )}

        <section className="mt-4 border-[3px] border-cyan-300/40 bg-cyan-300/[0.05] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <GameLabel tone="cyan">Enrolar un rostro</GameLabel>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
              {enrolled.length} de {roster.length} socios
            </span>
          </div>
          <p className="mt-2 text-xs font-bold leading-5 text-white/45 text-pretty">
            Buscá a la persona, pedile que mire de frente y girá levemente la cara entre
            capturas. Se guardan {FACE_ENROLL_SAMPLES} muestras.
          </p>

          {enrollTarget ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-[3px] border-white/15 bg-black/45 p-3">
              <Avatar name={enrollTarget.memberName} photoUrl={enrollTarget.photoUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black uppercase">{enrollTarget.memberName}</p>
                <p className="text-[11px] font-bold text-white/35">
                  {enrollTarget.faceEnrolled ? "Ya tiene rostro · se agregan muestras" : "Sin rostro enrolado"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnrollTarget(null)}
                className="min-h-11 border-[3px] border-white/15 px-3 text-[10px] font-black uppercase text-white/45 hover:border-white/35 hover:text-white"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => void runEnroll()}
                disabled={Boolean(enrollProgress) || !cameraOn || engineStatus !== "ready"}
                className="inline-flex min-h-11 items-center gap-2 bg-[#d8ff3e] px-4 text-xs font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                {enrollProgress ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
                {enrollProgress
                  ? `${enrollProgress.captured}/${enrollProgress.total}`
                  : "Capturar rostro"}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  value={enrollQuery}
                  onChange={(event) => setEnrollQuery(event.target.value)}
                  placeholder="Nombre del socio a enrolar"
                  autoComplete="off"
                  className="min-h-12 w-full border-[3px] border-white/15 bg-black/50 pl-10 pr-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-cyan-300"
                />
              </label>
              {enrollMatches.length > 0 && (
                <ul className="mt-2 grid gap-1.5">
                  {enrollMatches.map((hit) => (
                    <li key={hit.normalizedName}>
                      <button
                        type="button"
                        onClick={() => setEnrollTarget(hit)}
                        className="flex min-h-12 w-full items-center gap-3 border-[3px] border-white/10 bg-black/40 px-3 text-left transition hover:border-cyan-300/60"
                      >
                        <Avatar name={hit.memberName} photoUrl={hit.photoUrl} />
                        <span className="min-w-0 flex-1 truncate text-sm font-black uppercase">
                          {hit.memberName}
                        </span>
                        {hit.faceEnrolled && <GameChip tone="lime">Rostro</GameChip>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {enrollProgress && (
            <p className="mt-3 text-xs font-black uppercase tracking-wide text-[#d8ff3e]">
              Muestra {enrollProgress.captured} de {enrollProgress.total} · mantené a la persona en el cuadro
            </p>
          )}
          {enrollError && (
            <p className="mt-3 flex items-start gap-2 text-xs font-bold text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {enrollError}
            </p>
          )}
          {notice && (
            <p className="mt-3 flex items-start gap-2 text-xs font-bold text-[#d8ff3e]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
            </p>
          )}
        </section>
      </div>

      <div className="min-w-0">
        <MemberPreview
          member={member}
          error=""
          isCheckingIn={isCheckingIn}
          onConfirm={() => member && void onCheckin(member, "face")}
          eyebrow="Identificado por rostro"
          badge={
            best && member?.normalizedName === best.normalizedName ? (
              <GameChip tone={best.similarity >= FACE_AUTO_SIMILARITY ? "lime" : "orange"}>
                {percent(best.similarity)} de coincidencia
              </GameChip>
            ) : undefined
          }
        />

        {candidates.length > 0 && (
          <section className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
              Candidatos · umbral {percent(FACE_MIN_SIMILARITY)}
            </p>
            <ul className="mt-2 grid gap-2">
              {candidates.map((candidate) => {
                const hit = candidate.member;
                const selected = member?.normalizedName === candidate.normalizedName;
                return (
                  <li key={candidate.normalizedName}>
                    <button
                      type="button"
                      disabled={!hit}
                      onClick={() => hit && onSelectMember(hit)}
                      className={`flex min-h-14 w-full items-center gap-3 border-[3px] px-3 py-2 text-left transition disabled:opacity-40 ${
                        selected
                          ? "border-[#d8ff3e] bg-[#d8ff3e]/10"
                          : "border-white/12 bg-black/40 hover:border-white/30"
                      }`}
                    >
                      <Avatar
                        name={candidate.memberName}
                        photoUrl={hit?.photoUrl}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black uppercase">
                          {hit?.memberName ?? candidate.memberName}
                        </span>
                        <span className="mt-1 block h-1.5 w-full bg-white/10">
                          <span
                            className={`block h-full ${candidate.similarity >= FACE_AUTO_SIMILARITY ? "bg-[#d8ff3e]" : "bg-orange-300"}`}
                            style={{ width: `${Math.round(candidate.similarity * 100)}%` }}
                          />
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-black text-[#d8ff3e]">
                        {percent(candidate.similarity)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            Rostros enrolados ({enrolled.length})
          </p>
          <div className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-3">
            {enrolled.slice(0, 48).map((hit) => (
              <div
                key={hit.normalizedName}
                className="group relative border-[3px] border-white/10 p-1.5 text-center"
              >
                <button
                  type="button"
                  onClick={() => onSelectMember(hit)}
                  className="block w-full"
                >
                  <Avatar name={hit.memberName} photoUrl={hit.photoUrl} large />
                  <span className="mt-1 block truncate text-[10px] font-black uppercase text-white/60">
                    {hit.memberName.split(" ")[0]}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void runForget(hit)}
                  aria-label={`Borrar rostro de ${hit.memberName}`}
                  className="absolute right-0.5 top-0.5 grid h-8 w-8 place-items-center bg-black/70 text-white/40 opacity-0 transition focus-visible:opacity-100 hover:text-red-300 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!enrolled.length && (
              <p className="col-span-full border-[3px] border-dashed border-white/10 py-6 text-center text-xs font-bold text-white/35">
                Nadie enrolado todavía. Empezá por los socios que vienen a diario.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EngineBadge({ status, scanning }: { status: string; scanning: boolean }) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 border-[3px] border-white/20 bg-black/80 px-2.5 py-1.5 text-[11px] font-black uppercase text-white/70">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando motor
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 border-[3px] border-red-400/60 bg-black/80 px-2.5 py-1.5 text-[11px] font-black uppercase text-red-300">
        <XCircle className="h-3.5 w-3.5" /> Motor caído
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 border-[3px] border-white/20 bg-black/80 px-2.5 py-1.5 text-[11px] font-black uppercase text-white/70">
      <ScanFace className={`h-3.5 w-3.5 ${scanning ? "text-[#d8ff3e]" : "text-white/40"}`} />
      {scanning ? "Escaneando" : "En pausa"}
    </span>
  );
}

/** Barra segmentada: le dice a recepción si vale la pena insistir o reacomodar a la persona. */
function QualityMeter({ value }: { value: number }) {
  const segments = 12;
  const filled = Math.round(value * segments);
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Calidad</span>
      <span className="flex flex-1 gap-0.5" role="presentation">
        {Array.from({ length: segments }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 ${
              index < filled
                ? value > 0.7
                  ? "bg-[#d8ff3e]"
                  : "bg-orange-300"
                : "bg-white/12"
            }`}
          />
        ))}
      </span>
    </div>
  );
}
