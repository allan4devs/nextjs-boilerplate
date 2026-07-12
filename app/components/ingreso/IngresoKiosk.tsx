"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  Loader2,
  ScanFace,
  Search,
  Settings,
  ShieldAlert,
  Timer,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { MEMBERSHIP_STATUS_LABELS } from "@/app/features/checkin/constants";
import { computeFaceHash } from "@/app/features/checkin/face/computeFaceHash";
import { useUserCamera } from "@/app/features/checkin/hooks/useUserCamera";
import type { GymStatus, MemberHit } from "@/lib/xtreme/checkin/contracts";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";

const RECENT_KEY = "xtreme-ingreso-recientes";
const LAST_KEY = "xtreme-gym-member-name";
const MAX_RECENT = 4;
/** Frames con rostro en el círculo antes de escanear (~0.7s a 100ms). */
const FACE_HOLD_MS = 700;
/** Pausa tras un escaneo para no re-disparar al mismo socio. */
const FACE_COOLDOWN_MS = 3500;
/** Intervalo del loop de detección. */
const FACE_POLL_MS = 120;

type RecentProfile = { memberName: string };
type Mode = "profile" | "search" | "face";

/**
 * Con el reconocimiento facial apagado, todo lo que antes llevaba al modo
 * "face" cae a la busqueda manual (y la camara nunca se abre).
 */
const FACE_MODE: Mode = FACE_RECOGNITION_ENABLED ? "face" : "search";
type FaceGuideStatus = "waiting" | "detected" | "locking" | "scanning" | "cooldown";

type FaceDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

let faceDetectorSingleton: FaceDetectorLike | null | undefined;

function getFaceDetector(): FaceDetectorLike | null {
  if (faceDetectorSingleton !== undefined) return faceDetectorSingleton;
  try {
    const Ctor = (
      globalThis as unknown as {
        FaceDetector?: new (o?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
      }
    ).FaceDetector;
    faceDetectorSingleton = Ctor ? new Ctor({ fastMode: true, maxDetectedFaces: 2 }) : null;
  } catch {
    faceDetectorSingleton = null;
  }
  return faceDetectorSingleton;
}

/**
 * ¿Hay un rostro centrado en el óvalo guía?
 * Prefer FaceDetector (Chrome); fallback heurístico de piel + detalle en el centro.
 */
async function isFaceInCircle(video: HTMLVideoElement): Promise<boolean> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h || video.readyState < 2) return false;

  // Óvalo de la UI (aprox. centro y radios del frame nativo)
  const ovalCx = w / 2;
  const ovalCy = h * 0.42;
  const ovalRx = w * 0.26;
  const ovalRy = h * 0.3;

  const detector = getFaceDetector();
  if (detector) {
    try {
      const faces = await detector.detect(video);
      for (const face of faces) {
        const box = face.boundingBox;
        // Requiere tamaño mínimo (no un punto lejano)
        if (box.width < w * 0.12 || box.height < h * 0.12) continue;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const dx = (cx - ovalCx) / ovalRx;
        const dy = (cy - ovalCy) / ovalRy;
        if (dx * dx + dy * dy <= 1.2) return true;
      }
      return false;
    } catch {
      // cae al heurístico
    }
  }

  return detectFaceHeuristic(video, ovalCx, ovalCy, ovalRx, ovalRy);
}

/** Heurístico sin ML: piel + contraste/detalle en el óvalo. */
function detectFaceHeuristic(
  video: HTMLVideoElement,
  ovalCx: number,
  ovalCy: number,
  ovalRx: number,
  ovalRy: number,
): boolean {
  const sample = 48;
  const canvas = document.createElement("canvas");
  canvas.width = sample;
  canvas.height = sample;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  // Recorte del óvalo (bounding box)
  const sx = Math.max(0, ovalCx - ovalRx);
  const sy = Math.max(0, ovalCy - ovalRy);
  const sw = Math.min(video.videoWidth - sx, ovalRx * 2);
  const sh = Math.min(video.videoHeight - sy, ovalRy * 2);
  if (sw < 8 || sh < 8) return false;

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sample, sample);
  const { data } = ctx.getImageData(0, 0, sample, sample);

  let skin = 0;
  let total = 0;
  let sum = 0;
  let sumSq = 0;
  let edge = 0;
  const gray = new Float32Array(sample * sample);

  for (let y = 0; y < sample; y += 1) {
    for (let x = 0; x < sample; x += 1) {
      // Solo pixeles dentro del óvalo unitario
      const nx = (x + 0.5) / sample * 2 - 1;
      const ny = (y + 0.5) / sample * 2 - 1;
      if (nx * nx + ny * ny > 1) continue;

      const i = (y * sample + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const yv = 0.299 * r + 0.587 * g + 0.114 * b;
      gray[y * sample + x] = yv;
      sum += yv;
      sumSq += yv * yv;
      total += 1;

      // Skin-ish (aprox. RGB simple, luz de interior)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (
        r > 60 &&
        g > 30 &&
        b > 15 &&
        r > g &&
        r > b &&
        max - min > 12 &&
        Math.abs(r - g) > 8
      ) {
        skin += 1;
      }
    }
  }

  if (total < 40) return false;
  const mean = sum / total;
  const variance = sumSq / total - mean * mean;
  const skinRatio = skin / total;

  // Detalle/edges en el óvalo (cara tiene textura; pared no)
  for (let y = 1; y < sample - 1; y += 1) {
    for (let x = 1; x < sample - 1; x += 1) {
      const nx = (x + 0.5) / sample * 2 - 1;
      const ny = (y + 0.5) / sample * 2 - 1;
      if (nx * nx + ny * ny > 0.85) continue;
      const c = gray[y * sample + x];
      if (!c) continue;
      const gx = Math.abs(c - gray[y * sample + x + 1]);
      const gy = Math.abs(c - gray[(y + 1) * sample + x]);
      if (gx + gy > 18) edge += 1;
    }
  }
  const edgeRatio = edge / total;

  // Umbrales: algo de piel + textura + no escena plana
  return skinRatio >= 0.12 && variance >= 180 && edgeRatio >= 0.08 && mean > 35 && mean < 230;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function readRecent(): RecentProfile[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw) return (JSON.parse(raw) as RecentProfile[]).slice(0, MAX_RECENT);
    const last = window.localStorage.getItem(LAST_KEY);
    return last ? [{ memberName: last }] : [];
  } catch {
    return [];
  }
}

function saveRecent(memberName: string) {
  try {
    const current = readRecent().filter(
      (p) => p.memberName.toUpperCase() !== memberName.toUpperCase(),
    );
    const next = [{ memberName }, ...current].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.localStorage.setItem(LAST_KEY, memberName);
    return next;
  } catch {
    return [{ memberName }];
  }
}

type IngresoKioskProps = {
  /** Si se pasa, el engranaje abre Reception OS (staff) en vez de /admin. */
  onStaffRequest?: () => void;
};

export default function IngresoKiosk({ onStaffRequest }: IngresoKioskProps) {
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
  const [flash, setFlash] = useState<{
    type: "ok" | "warn" | "err";
    title: string;
    subtitle: string;
  } | null>(null);

  // Face recognition
  const scanLockRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const faceSeenSinceRef = useRef<number | null>(null);
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
  const [isScanning, setIsScanning] = useState(false);
  const [faceMatches, setFaceMatches] = useState<MemberHit[]>([]);
  const [checkinMethod, setCheckinMethod] = useState<"name" | "face" | "code">("name");
  const [faceGuide, setFaceGuide] = useState<FaceGuideStatus>("waiting");
  const [holdProgress, setHoldProgress] = useState(0);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/xtreme/checkin", { cache: "no-store" });
      const json = (await res.json()) as { status?: GymStatus };
      if (json.status) setStatus(json.status);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  const fetchMember = useCallback(async (opts: { q?: string; code?: string; faceHash?: string }) => {
    const params = new URLSearchParams();
    if (opts.faceHash) params.set("faceHash", opts.faceHash);
    else if (opts.code) params.set("code", opts.code);
    else if (opts.q) params.set("q", opts.q);
    const res = await fetch(`/api/xtreme/checkin?${params}`, { cache: "no-store" });
    const json = (await res.json()) as {
      status?: GymStatus;
      member?: MemberHit | null;
      bestMatch?: MemberHit | null;
      matches?: MemberHit[];
      error?: string;
    };
    if (json.status) setStatus(json.status);
    return json;
  }, []);

  // Cargar el perfil recordado al abrir.
  useEffect(() => {
    const list = readRecent();
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
  }, [flash]);

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
  }, [mode, startCamera, stopCamera]);

  async function selectProfile(name: string) {
    setError("");
    setIsLoadingProfile(true);
    try {
      const json = await fetchMember({ q: name });
      if (json.member) {
        setProfile(json.member);
        setRecent(saveRecent(json.member.memberName));
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
      const digits = q.replace(/\D/g, "");
      const useCode = digits.length >= 4 && digits.length === q.replace(/\s/g, "").length;
      const json = await fetchMember(useCode ? { code: digits } : { q });
      if (!json.member) {
        setError(json.error || "Socio no encontrado.");
        return;
      }
      setProfile(json.member);
      setRecent(saveRecent(json.member.memberName));
      setCheckinMethod(useCode ? "code" : "name");
      setMode("profile");
      setQuery("");
    } catch {
      setError("Error de conexion.");
    } finally {
      setIsSearching(false);
    }
  }

  const armCooldown = useCallback(() => {
    cooldownUntilRef.current = Date.now() + FACE_COOLDOWN_MS;
    faceSeenSinceRef.current = null;
    setHoldProgress(0);
    setFaceGuide("cooldown");
  }, []);

  const confirmCheckin = useCallback(
    async (target?: MemberHit, method: "name" | "face" | "code" = checkinMethod) => {
      const member = target ?? profile;
      if (!member) return;
      if (!/^\d{4}$/.test(kioskPin)) {
        setError("Ingrese su PIN de 4 digitos para registrar el ingreso.");
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
        setRecent(saveRecent(member.memberName));
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
    [armCooldown, checkinMethod, kioskPin, profile],
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
            "Sin coincidencias. Use búsqueda por nombre o enrole el rostro en recepción.",
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
  }, [armCooldown, cameraOn, confirmCheckin, fetchMember, reportCameraError]);

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
  }, [mode, cameraOn, isScanning, isCheckingIn, scanFace]);

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

      {/* Panel izquierdo — marca + collage */}
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

          <GymCollage occupancyPct={status?.occupancyPct ?? 0} level={status?.level ?? "—"} />
        </div>
      </section>

      {/* Panel derecho — ingreso (cara / buscar / perfil) */}
      <section className="relative flex flex-col justify-center bg-white px-6 py-12 sm:px-14 lg:border-l lg:border-black/10">
        {onStaffRequest ? (
          <button
            type="button"
            onClick={onStaffRequest}
            aria-label="Reception OS — staff"
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

function FaceCard({
  videoRef,
  cameraOn,
  cameraError,
  isScanning,
  isCheckingIn,
  faceGuide,
  holdProgress,
  error,
  matches,
  onStartCamera,
  onScan,
  onPickMatch,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  cameraError: string;
  isScanning: boolean;
  isCheckingIn: boolean;
  faceGuide: FaceGuideStatus;
  holdProgress: number;
  error: string;
  matches: MemberHit[];
  onStartCamera: () => void;
  onScan: () => void;
  onPickMatch: (m: MemberHit) => void;
}) {
  const ringColor =
    faceGuide === "waiting"
      ? "border-[#d8ff3e]/55"
      : faceGuide === "detected" || faceGuide === "locking"
        ? "border-[#d8ff3e]"
        : faceGuide === "scanning"
          ? "border-cyan-300"
          : "border-white/40";

  const statusCopy: Record<FaceGuideStatus, string> = {
    waiting: "Coloque su rostro en el círculo",
    detected: "Rostro detectado — mantenga la posición",
    locking: "Perfecto… identificando",
    scanning: isCheckingIn ? "Registrando ingreso…" : "Analizando rostro…",
    cooldown: "Listo para el siguiente socio",
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-black/[0.04] text-black/70">
        <ScanFace className="h-7 w-7" />
      </div>
      <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">Reconocimiento facial</h2>
      <p className="mt-1 text-sm font-bold text-black/45">
        Ponga la cara en el círculo. Se detecta y registra solo.
      </p>

      <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-black/10 bg-black shadow-lg">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full scale-x-[-1] object-cover"
        />

        {/* Face guide overlay + progress ring */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative flex h-[58%] w-[48%] items-center justify-center">
            {/* Progress arc (CSS con conic-gradient) */}
            {(faceGuide === "detected" || faceGuide === "locking") && (
              <div
                className="absolute -inset-2 rounded-full opacity-90 transition-all"
                style={{
                  background: `conic-gradient(#d8ff3e ${Math.round(holdProgress * 360)}deg, transparent 0deg)`,
                  WebkitMask:
                    "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
                  mask: "radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px))",
                }}
              />
            )}
            <div
              className={`h-full w-full rounded-full border-[3px] border-dashed shadow-[0_0_0_999px_rgba(0,0,0,0.32)] transition-colors duration-200 ${ringColor} ${
                faceGuide === "detected" || faceGuide === "locking"
                  ? "border-solid shadow-[0_0_0_999px_rgba(0,0,0,0.28),0_0_28px_rgba(216,255,62,0.45)]"
                  : ""
              } ${faceGuide === "scanning" ? "animate-pulse border-solid" : ""}`}
            />
          </div>
        </div>

        {/* Live status chip */}
        {cameraOn && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-4 pt-10">
            <p
              className={`flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wide ${
                faceGuide === "waiting" || faceGuide === "cooldown"
                  ? "text-white/80"
                  : "text-[#d8ff3e]"
              }`}
            >
              {(faceGuide === "scanning" || isScanning || isCheckingIn) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {(faceGuide === "detected" || faceGuide === "locking") && (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {statusCopy[faceGuide]}
            </p>
            {(faceGuide === "detected" || faceGuide === "locking") && (
              <div className="mx-auto mt-2 h-1.5 w-2/3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-[#d8ff3e] transition-[width] duration-100"
                  style={{ width: `${Math.round(holdProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!cameraOn && (
          <div className="absolute inset-0 grid place-items-center bg-black/75 p-4">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-white/50" />
              <p className="mt-2 text-sm font-bold text-white/70">
                {cameraError || "Camara apagada"}
              </p>
              <button
                type="button"
                onClick={onStartCamera}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#d8ff3e] px-4 py-2 text-xs font-black uppercase text-black"
              >
                Activar camara
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex w-full items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-left text-sm font-bold text-red-600">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Manual fallback — la detección es automática */}
      <button
        type="button"
        onClick={onScan}
        disabled={!cameraOn || isScanning || isCheckingIn}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black/15 px-6 py-3 text-sm font-black uppercase tracking-wide text-black/55 transition hover:border-black/30 hover:text-black disabled:opacity-50"
      >
        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanFace className="h-4 w-4" />}
        Escanear ahora (manual)
      </button>

      {matches.length > 1 && (
        <div className="mt-5 w-full text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-black/40">
            Varias coincidencias — elija la suya
          </p>
          <div className="mt-2 space-y-2">
            {matches.map((m) => (
              <button
                key={m.normalizedName || m.memberName}
                type="button"
                onClick={() => onPickMatch(m)}
                disabled={isCheckingIn}
                className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] px-3 py-2.5 text-left transition hover:border-[#8fbf00]/50 hover:bg-[#d8ff3e]/10 disabled:opacity-50"
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt={m.memberName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0b0b0b] text-sm font-black text-[#d8ff3e]">
                    {initials(m.memberName)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black uppercase">{m.memberName}</span>
                  <span className="text-[11px] font-bold text-black/40">
                    Match {m.faceDistance ?? "—"} · {MEMBERSHIP_STATUS_LABELS[m.membershipStatus]}
                  </span>
                </span>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#8fbf00]" />
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-[11px] font-bold text-black/35">
        Detección automática al centrar la cara. Enrolar rostro en recepción si es la primera vez.
      </p>
    </div>
  );
}

function ProfileCard({
  profile,
  isCheckingIn,
  error,
  method,
  pin,
  onPinChange,
  onContinue,
  onSwitch,
}: {
  profile: MemberHit;
  isCheckingIn: boolean;
  error: string;
  method: string;
  pin: string;
  onPinChange: (value: string) => void;
  onContinue: () => void;
  onSwitch: () => void;
}) {
  const expired = profile.membershipStatus === "expired";
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid h-36 w-36 place-items-center overflow-visible rounded-full bg-[#0b0b0b] text-[#d8ff3e] shadow-lg ring-4 ring-[#d8ff3e]/30">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoUrl}
            alt={profile.memberName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span className="text-5xl font-black">{initials(profile.memberName)}</span>
        )}
        {profile.streak > 0 && (
          <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-1 rounded-full bg-[#d8ff3e] px-2.5 py-1 text-xs font-black text-black">
            <Flame className="h-3.5 w-3.5" /> {profile.streak}
          </span>
        )}
      </div>

      <h2 className="mt-6 text-2xl font-black uppercase tracking-tight">{profile.memberName}</h2>
      <p className="mt-1 text-sm font-bold text-black/45">
        {MEMBERSHIP_STATUS_LABELS[profile.membershipStatus]}
        {profile.daysRemaining >= 0 ? ` · ${profile.daysRemaining} dias` : " · vencida"} · {profile.plan}
      </p>
      {method === "face" && (
        <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[#6f9800]">
          <ScanFace className="h-3.5 w-3.5" /> Detectado por rostro
          {profile.faceDistance != null ? ` · dist ${profile.faceDistance}` : ""}
        </p>
      )}

      {expired && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-left text-sm font-bold text-orange-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Membresia vencida. Podes ingresar, pero pasa por recepcion.
        </div>
      )}

      <label className="mt-5 w-full text-left">
        <span className="mb-1 block text-xs font-black uppercase tracking-wide text-black/45">
          PIN de 4 digitos
        </span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={pin}
          onChange={(e) => onPinChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className="w-full rounded-xl border-2 border-black/15 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.4em] text-black outline-none focus:border-[#8fbf00]"
        />
        {profile.hasPin === false && (
          <span className="mt-1 block text-xs font-bold text-orange-700">
            Sin PIN: configurelo en la app o pida ayuda en recepcion.
          </span>
        )}
      </label>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isCheckingIn || pin.length !== 4}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0b] px-6 py-4 text-base font-black uppercase tracking-wide text-[#d8ff3e] transition hover:bg-[#1a1a1a] disabled:opacity-50"
      >
        {isCheckingIn ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        Confirmar ingreso
      </button>

      <button
        type="button"
        onClick={onSwitch}
        className="mt-3 w-full rounded-full border border-black/15 px-6 py-4 text-base font-black uppercase tracking-wide text-black/70 transition hover:border-black/30 hover:text-black"
      >
        Usar rostro / otro perfil
      </button>

      <Link
        href="/app"
        className="mt-6 w-full rounded-full border border-[#8fbf00]/40 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#6f9800] transition hover:border-[#8fbf00] hover:text-[#5c7d00]"
      >
        App de socio
      </Link>
    </div>
  );
}

function SearchCard({
  query,
  setQuery,
  isSearching,
  error,
  recent,
  hasProfile,
  onSubmit,
  onPickRecent,
  onBack,
  onFace,
}: {
  query: string;
  setQuery: (v: string) => void;
  isSearching: boolean;
  error: string;
  recent: RecentProfile[];
  hasProfile: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onPickRecent: (name: string) => void;
  onBack: () => void;
  onFace: () => void;
}) {
  return (
    <div>
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-black/[0.04] text-black/60">
          <UserRound className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">Inicia tu ingreso</h2>
        <p className="mt-1 text-sm font-bold text-black/45">
          Escribe tu nombre, telefono, cedula o codigo de socio.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. Kengie Araya o 1-2345-6789"
            autoFocus
            className="w-full rounded-full border border-black/15 bg-white py-4 pl-12 pr-4 text-base font-bold text-black outline-none placeholder:text-black/30 focus:border-[#8fbf00]"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0b] px-6 py-4 text-base font-black uppercase tracking-wide text-[#d8ff3e] transition hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar mi perfil"}
        </button>
      </form>

      <button
        type="button"
        onClick={onFace}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black/15 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black/70 transition hover:border-black/30 hover:text-black"
      >
        <ScanFace className="h-4 w-4" /> Preferir camara / rostro
      </button>

      {recent.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">
            Perfiles recientes
          </p>
          <div className="mt-3 space-y-2">
            {recent.map((p) => (
              <button
                key={p.memberName}
                type="button"
                onClick={() => onPickRecent(p.memberName)}
                className="flex w-full items-center gap-3 rounded-full border border-black/10 bg-black/[0.02] px-3 py-2.5 text-left transition hover:border-[#8fbf00]/50 hover:bg-[#d8ff3e]/10"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0b0b0b] text-sm font-black text-[#d8ff3e]">
                  {initials(p.memberName)}
                </span>
                <span className="truncate text-sm font-black uppercase text-black/80">
                  {p.memberName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasProfile && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full text-center text-sm font-black uppercase tracking-wide text-black/40 transition hover:text-black/70"
        >
          Volver
        </button>
      )}
    </div>
  );
}

/** Collage tipo Facebook, pero con escenas de gym. */
function GymCollage({ occupancyPct, level }: { occupancyPct: number; level: string }) {
  return (
    <div className="relative mx-auto hidden aspect-[4/3] w-full max-w-md sm:block">
      <div className="absolute right-4 top-0 h-64 w-44 -rotate-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b0b0b] via-[#1c1c1c] to-[#2b2b2b] shadow-2xl">
        <div className="flex h-full flex-col justify-between p-4">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#d8ff3e] px-2.5 py-1 text-xs font-black text-black">
            <Timer className="h-3.5 w-3.5" /> 16:45
          </span>
          <Dumbbell className="h-16 w-16 self-center text-[#d8ff3e]/80" />
          <p className="text-xs font-black uppercase tracking-widest text-white/70">
            Sesion en vivo
          </p>
        </div>
      </div>

      <div className="absolute bottom-2 left-0 h-40 w-40 rotate-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#8fbf00] to-[#d8ff3e] p-4 shadow-xl">
        <Users className="h-7 w-7 text-black/70" />
        <p className="mt-6 text-3xl font-black text-black">{occupancyPct}%</p>
        <p className="text-xs font-black uppercase tracking-wide text-black/60">{level}</p>
      </div>

      <div className="absolute bottom-8 right-16 h-28 w-36 -rotate-6 overflow-hidden rounded-2xl border border-black/10 bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#8fbf00]" />
          <span className="text-xs font-black uppercase">Racha</span>
        </div>
        <div className="mt-3 flex items-end gap-1">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="text-2xl font-black">7</span>
        </div>
      </div>

      <div className="absolute left-16 top-6 h-24 w-28 rotate-6 overflow-hidden rounded-2xl bg-[#0b0b0b] p-3 shadow-lg">
        <Heart className="h-5 w-5 text-[#d8ff3e]" />
        <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-white/50">Zona</p>
        <p className="text-sm font-black text-white">Fuerza</p>
      </div>

      <div className="absolute bottom-0 right-0 flex h-16 w-16 items-center justify-center rounded-full bg-black text-[#d8ff3e] shadow-lg">
        <Activity className="h-7 w-7" />
      </div>
    </div>
  );
}
