"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Dumbbell,
  Loader2,
  ScanFace,
  Search,
  Settings,
} from "lucide-react";
import {
  FACE_COOLDOWN_MS,
  FACE_HOLD_MS,
  FACE_POLL_MS,
} from "@/app/features/checkin/constants";
import { KioskProvider, useKiosk } from "./context/KioskProvider";
import { isFaceInCircle } from "@/app/features/checkin/face/faceInCircle";
import {
  readRecentProfiles,
  saveRecentProfile,
  type RecentProfile,
} from "@/app/features/checkin/storage/recentProfiles";
import { FaceCard, GymCollage, ProfileCard, SearchCard } from "./ui";
import type { Mode } from "./types";
import { computeFaceHash } from "@/app/features/checkin/face/computeFaceHash";
import { useUserCamera } from "@/app/features/checkin/hooks/useUserCamera";
import {
  classifyMemberSearchInput,
  memberLookupToSearchParams,
} from "@/app/lib/memberLookup";
import type { GymStatus, MemberHit } from "@/lib/xtreme/checkin/contracts";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";


/**
 * Con el reconocimiento facial apagado, todo lo que antes llevaba al modo
 * "face" cae a la busqueda manual (y la camara nunca se abre).
 */
const FACE_MODE: Mode = FACE_RECOGNITION_ENABLED ? "face" : "search";

type IngresoKioskProps = {
  /** Si se pasa, el engranaje abre Reception OS (staff) en vez de /admin. */
  onStaffRequest?: () => void;
};

export default function IngresoKiosk(props: IngresoKioskProps) {
  return (
    <KioskProvider>
      <KioskScreen {...props} />
    </KioskProvider>
  );
}

/**
 * La pantalla del kiosco. El guiado facial y el veredicto de ingreso llegan
 * del contexto; el modo, el buscador y la ficha son estado de la pantalla.
 */
function KioskScreen({ onStaffRequest }: IngresoKioskProps) {
  const [recent, setRecent] = useState<RecentProfile[]>([]);
  const [profile, setProfile] = useState<MemberHit | null>(null);
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [mode, setMode] = useState<Mode>("profile");
  const [query, setQuery] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [kioskPin, setKioskPin] = useState("");
  const [error, setError] = useState("");

  // Reconocimiento facial y veredicto: ambos vienen del provider del kiosco.
  const { flash, setFlash, face } = useKiosk();
  const {
    isScanning,
    setIsScanning,
    faceMatches,
    setFaceMatches,
    faceGuide,
    setFaceGuide,
    holdProgress,
    setHoldProgress,
    scanLockRef,
    cooldownUntilRef,
    faceSeenSinceRef,
  } = face;
  const [checkinMethod, setCheckinMethod] = useState<"name" | "face" | "code">("name");
  const {
    videoRef,
    cameraOn,
    cameraError,
    reportCameraError,
    startCamera,
    stopCamera,
  } = useUserCamera({
    idealWidth: 720,
    idealHeight: 540,
    permissionErrorMessage:
      "No se pudo abrir la camara. Permita el acceso o use busqueda por nombre.",
  });

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/xtreme/checkin", { cache: "no-store" });
      const json = (await res.json()) as { status?: GymStatus };
      if (json.status) setStatus(json.status);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  const fetchMember = useCallback(
    async (opts: { q?: string; code?: string; cedula?: string; faceHash?: string }) => {
      const params = opts.faceHash
        ? new URLSearchParams({ faceHash: opts.faceHash })
        : memberLookupToSearchParams(opts);
      const res = await fetch(`/api/xtreme/checkin?${params}`, { cache: "no-store" });
      const json = (await res.json()) as {
        status?: GymStatus;
        member?: MemberHit | null;
        bestMatch?: MemberHit | null;
        matches?: MemberHit[];
        error?: string;
        resolvedBy?: string;
      };
      if (json.status) setStatus(json.status);
      return json;
    },
    [],
  );

  // Cargar el perfil recordado al abrir.
  useEffect(() => {
    const list = readRecentProfiles();
    setRecent(list);
    void loadStatus();
    (async () => {
      if (!list.length) {
        setMode(FACE_MODE);
        setIsLoadingProfile(false);
        return;
      }
      try {
        const json = await fetchMember({ q: list[0].memberName });
        if (json.member) setProfile(json.member);
        else setMode(FACE_MODE);
      } catch {
        setMode(FACE_MODE);
      } finally {
        setIsLoadingProfile(false);
      }
    })();
    const id = window.setInterval(() => void loadStatus(), 15_000);
    return () => window.clearInterval(id);
  }, [loadStatus, fetchMember]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 4500);
    return () => window.clearTimeout(id);
  }, [flash, setFlash]);

  // Camera lifecycle by mode
  useEffect(() => {
    if (mode === "face") {
      void startCamera();
    } else {
      stopCamera();
      setFaceMatches([]);
    }
    return () => {
      if (mode !== "face") stopCamera();
    };
  }, [mode, startCamera, stopCamera, setFaceMatches]);

  async function selectProfile(name: string) {
    setError("");
    setIsLoadingProfile(true);
    try {
      const json = await fetchMember({ q: name });
      if (json.member) {
        setProfile(json.member);
        setRecent(saveRecentProfile(json.member.memberName));
        setCheckinMethod("name");
        setMode("profile");
      } else {
        setError(json.error || "Socio no encontrado.");
      }
    } catch {
      setError("Error de conexion.");
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function searchMember(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setError("");
    try {
      // Fuente única de clasificación (cédula > código > nombre)
      const classified = classifyMemberSearchInput(q);
      const lookup =
        classified.kind === "empty"
          ? { q }
          : classified.kind === "cedula"
            ? { cedula: classified.cedula, q: classified.q }
            : classified.kind === "code"
              ? { code: classified.code, cedula: classified.cedula, q: classified.q }
              : {
                  q: classified.q,
                  cedula: classified.cedula,
                  code: classified.code,
                };

      const json = await fetchMember(lookup);

      if (!json.member) {
        setError(
          json.error ||
            "Socio no encontrado. La cédula es la clave principal; también sirve nombre o código de 8 dígitos.",
        );
        return;
      }
      setProfile(json.member);
      setRecent(saveRecentProfile(json.member.memberName));
      setCheckinMethod(
        json.resolvedBy === "code" || classified.kind === "code" ? "code" : "name",
      );
      setMode("profile");
      setQuery("");
    } catch {
      setError("Error de conexión. Revisá internet e intentá de nuevo.");
    } finally {
      setIsSearching(false);
    }
  }

  const armCooldown = useCallback(() => {
    cooldownUntilRef.current = Date.now() + FACE_COOLDOWN_MS;
    faceSeenSinceRef.current = null;
    setHoldProgress(0);
    setFaceGuide("cooldown");
  }, [cooldownUntilRef, faceSeenSinceRef, setFaceGuide, setHoldProgress]);

  const confirmCheckin = useCallback(
    async (target?: MemberHit, method: "name" | "face" | "code" = checkinMethod) => {
      const member = target ?? profile;
      if (!member) return;
      if (!/^\d{4}$/.test(kioskPin)) {
        setError("Ingresá tu PIN de 4 dígitos para registrar el ingreso.");
        setMode("profile");
        return;
      }
      setIsCheckingIn(true);
      setError("");
      try {
        const res = await fetch("/api/xtreme/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberName: member.memberName,
            pin: kioskPin,
            method: "pin",
            by: "kiosk",
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          error?: string;
          membershipStatus?: MemberHit["membershipStatus"];
          status?: GymStatus;
          duplicate?: boolean;
        };
        if (!res.ok) {
          setError(json.error || "No se pudo registrar.");
          setFlash({ type: "err", title: "Acceso denegado", subtitle: json.error || "Error" });
          if (method === "face") armCooldown();
          return;
        }
        if (json.status) setStatus(json.status);
        setRecent(saveRecentProfile(member.memberName));
        setProfile(member);
        setKioskPin("");
        const ms = json.membershipStatus || member.membershipStatus;
        setFlash({
          type: ms === "expired" ? "warn" : "ok",
          title: json.duplicate
            ? "Ya estabas adentro"
            : `Bienvenido, ${member.memberName.split(" ")[0]}!`,
          subtitle:
            json.message ||
            (method === "face" ? "Ingreso por reconocimiento facial" : "Ingreso registrado"),
        });
        // Tras ingreso por cara, volver a la camara para el siguiente socio
        if (method === "face") {
          setFaceMatches([]);
          setMode(FACE_MODE);
          setProfile(null);
          armCooldown();
        } else {
          setMode("profile");
        }
      } catch {
        setError("Error de conexion.");
        setFlash({ type: "err", title: "Error", subtitle: "No se pudo registrar el ingreso." });
        if (method === "face") armCooldown();
      } finally {
        setIsCheckingIn(false);
      }
    },
    [armCooldown, checkinMethod, kioskPin, profile, setFaceMatches, setFlash],
  );

  const scanFace = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !cameraOn) {
      reportCameraError("Active la camara primero.");
      return;
    }
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setIsScanning(true);
    setFaceGuide("scanning");
    setError("");
    setFaceMatches([]);
    try {
      const faceHash = await computeFaceHash(video);
      if (!faceHash) {
        setError("No se pudo leer el rostro. Centra la cara en el círculo.");
        armCooldown();
        return;
      }
      const json = await fetchMember({ faceHash });
      const matches = json.matches || [];
      setFaceMatches(matches);
      if (json.bestMatch || json.member) {
        const best = json.bestMatch || json.member!;
        setProfile(best);
        setCheckinMethod("face");
        // Siempre pedir PIN en perfil (no auto-checkin sin autenticacion).
        setMode("profile");
        armCooldown();
      } else {
        setProfile(null);
        setError(
          json.error ||
            "Sin coincidencias. Usá búsqueda por nombre o enrolá el rostro en recepción.",
        );
        armCooldown();
      }
    } catch {
      setError("Error al escanear rostro.");
      armCooldown();
    } finally {
      setIsScanning(false);
      scanLockRef.current = false;
    }
  }, [armCooldown, cameraOn, fetchMember, reportCameraError, videoRef, scanLockRef, setFaceGuide, setFaceMatches, setIsScanning]);

  // Loop: detecta rostro en el círculo y dispara el escaneo solo
  useEffect(() => {
    if (mode !== "face" || !cameraOn) {
      faceSeenSinceRef.current = null;
      setHoldProgress(0);
      if (mode !== "face") setFaceGuide("waiting");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      if (cancelled) return;
      const now = Date.now();

      if (scanLockRef.current || isScanning || isCheckingIn) {
        setFaceGuide("scanning");
        timer = window.setTimeout(() => void tick(), FACE_POLL_MS);
        return;
      }

      if (now < cooldownUntilRef.current) {
        setFaceGuide("cooldown");
        setHoldProgress(0);
        faceSeenSinceRef.current = null;
        timer = window.setTimeout(() => void tick(), FACE_POLL_MS);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        setFaceGuide("waiting");
        timer = window.setTimeout(() => void tick(), FACE_POLL_MS);
        return;
      }

      let present = false;
      try {
        present = await isFaceInCircle(video);
      } catch {
        present = false;
      }
      if (cancelled) return;

      if (present) {
        if (faceSeenSinceRef.current == null) faceSeenSinceRef.current = now;
        const held = now - faceSeenSinceRef.current;
        const pct = Math.min(1, held / FACE_HOLD_MS);
        setHoldProgress(pct);
        if (held >= FACE_HOLD_MS) {
          setFaceGuide("locking");
          setHoldProgress(1);
          void scanFace();
        } else {
          setFaceGuide(pct > 0.15 ? "locking" : "detected");
        }
      } else {
        faceSeenSinceRef.current = null;
        setHoldProgress(0);
        setFaceGuide("waiting");
      }

      timer = window.setTimeout(() => void tick(), FACE_POLL_MS);
    };

    timer = window.setTimeout(() => void tick(), 200);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [mode, cameraOn, isScanning, isCheckingIn, scanFace, videoRef, cooldownUntilRef, faceSeenSinceRef, scanLockRef, setFaceGuide, setHoldProgress]);

  return (
    <main className="min-h-screen bg-white text-[#0b0b0b] lg:grid lg:grid-cols-2">
      {flash && (
        <div
          className={`fixed inset-x-0 top-0 z-50 border-b px-5 py-6 text-center ${
            flash.type === "ok"
              ? "border-lime-300/40 bg-[#d8ff3e] text-black"
              : flash.type === "warn"
                ? "border-orange-300/50 bg-orange-400 text-black"
                : "border-red-400/50 bg-red-500 text-white"
          }`}
        >
          <p className="text-2xl font-black uppercase tracking-tight sm:text-4xl">{flash.title}</p>
          <p className="mt-1 text-sm font-bold opacity-80 sm:text-base">{flash.subtitle}</p>
        </div>
      )}

      {/* Panel izquierdo - marca + collage */}
      <section className="relative flex flex-col justify-center px-8 py-14 sm:px-14">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-10 lg:gap-14">
          <div className="grid h-14 w-14 place-items-center bg-[#0b0b0b] text-[#d8ff3e]">
            <Dumbbell className="h-8 w-8" />
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
            Entrena
            <br />
            lo que <span className="text-[#8fbf00]">más te</span>
            <br />
            gusta<span className="text-[#8fbf00]">.</span>
          </h1>

          <GymCollage occupancyPct={status?.occupancyPct ?? 0} level={status?.level ?? "-"} />
        </div>
      </section>

      {/* Panel derecho - ingreso (cara / buscar / perfil) */}
      <section className="relative flex flex-col justify-center bg-white px-6 py-12 sm:px-14 lg:border-l lg:border-black/10">
        {onStaffRequest ? (
          <button
            type="button"
            onClick={onStaffRequest}
            aria-label="Reception OS - staff"
            className="absolute right-6 top-6 text-black/40 transition hover:text-black"
          >
            <Settings className="h-6 w-6" />
          </button>
        ) : (
          <Link
            href="/recepcion"
            aria-label="Reception OS"
            className="absolute right-6 top-6 text-black/40 transition hover:text-black"
          >
            <Settings className="h-6 w-6" />
          </Link>
        )}

        <div className="mx-auto w-full max-w-sm">
          {/* Mode switcher */}
          {!isLoadingProfile && (
            <div
              className={`mb-6 grid gap-2 ${FACE_RECOGNITION_ENABLED ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {FACE_RECOGNITION_ENABLED && (
                <button
                  type="button"
                  onClick={() => {
                    setMode(FACE_MODE);
                    setError("");
                    setFaceMatches([]);
                  }}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-3 text-xs font-black uppercase tracking-wide transition ${
                    mode === "face"
                      ? "border-black bg-[#0b0b0b] text-[#d8ff3e]"
                      : "border-black/15 text-black/60 hover:border-black/30"
                  }`}
                >
                  <ScanFace className="h-4 w-4" /> Rostro
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode("search");
                  setError("");
                  stopCamera();
                }}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-3 text-xs font-black uppercase tracking-wide transition ${
                  mode === "search" || (mode === "profile" && !profile)
                    ? "border-black bg-[#0b0b0b] text-[#d8ff3e]"
                    : "border-black/15 text-black/60 hover:border-black/30"
                }`}
              >
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>
          )}

          {isLoadingProfile ? (
            <div className="grid place-items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-black/40" />
            </div>
          ) : mode === "face" ? (
            <FaceCard
              videoRef={videoRef}
              cameraOn={cameraOn}
              cameraError={cameraError}
              isScanning={isScanning}
              isCheckingIn={isCheckingIn}
              faceGuide={faceGuide}
              holdProgress={holdProgress}
              error={error}
              matches={faceMatches}
              onStartCamera={() => void startCamera()}
              onScan={() => void scanFace()}
              onPickMatch={(m) => {
                setProfile(m);
                setCheckinMethod("face");
                void confirmCheckin(m, "face");
              }}
            />
          ) : mode === "profile" && profile ? (
            <ProfileCard
              profile={profile}
              isCheckingIn={isCheckingIn}
              error={error}
              method={checkinMethod}
              pin={kioskPin}
              onPinChange={setKioskPin}
              onContinue={() => void confirmCheckin()}
              onSwitch={() => {
                setMode(FACE_MODE);
                setError("");
                setKioskPin("");
              }}
            />
          ) : (
            <SearchCard
              query={query}
              setQuery={setQuery}
              isSearching={isSearching}
              error={error}
              recent={recent}
              hasProfile={Boolean(profile)}
              onSubmit={searchMember}
              onPickRecent={(name) => void selectProfile(name)}
              onBack={() => {
                setMode("profile");
                setError("");
              }}
              onFace={() => {
                setMode(FACE_MODE);
                setError("");
              }}
            />
          )}
        </div>

        <p className="mx-auto mt-10 flex w-full max-w-sm items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-black/35">
          <Dumbbell className="h-4 w-4" /> Xtreme Gym · Reception OS
        </p>
        {onStaffRequest && (
          <p className="mx-auto mt-2 w-full max-w-sm text-center text-[11px] font-bold text-black/30">
            Staff: tocá el engranaje para desbloquear el mostrador
          </p>
        )}
      </section>
    </main>
  );
}
