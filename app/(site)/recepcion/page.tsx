"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CreditCard,
  DoorOpen,
  IdCard,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  ScanFace,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameHudPill,
  GameLabel,
} from "../../components/GameOS";
import IngresoKiosk from "../../components/ingreso/IngresoKiosk";
import ReceptionChatInbox from "../../components/reception/ReceptionChatInbox";
import { MEMBERSHIP_STATUS_LABELS } from "@/app/features/checkin/constants";
import { computeFaceHash } from "@/app/features/checkin/face/computeFaceHash";
import { useUserCamera } from "@/app/features/checkin/hooks/useUserCamera";
import type { GymStatus, MemberHit } from "@/lib/xtreme/checkin/contracts";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";

const ADMIN_CODE_KEY = "xtreme-admin-code";
const AUTO_LOOKUP_MS = 280;

type RecentCheckin = {
  id: string;
  memberName: string;
  accessCode: string;
  method: string;
  membershipStatus: string;
  checkedInAt: string;
  by: string;
};

type Tab = "cedula" | "face" | "register" | "chat";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function formatTime(value: string | Date) {
  try {
    return new Date(value).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

async function capturePhotoDataUrl(video: HTMLVideoElement, maxSide = 480) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return "";
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function RecepcionPage() {
  const [adminCode, setAdminCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [tab, setTab] = useState<Tab>("cedula");
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [recent, setRecent] = useState<RecentCheckin[]>([]);
  const [roster, setRoster] = useState<MemberHit[]>([]);

  const [cedula, setCedula] = useState("");
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<MemberHit | null>(null);
  const [faceMatches, setFaceMatches] = useState<MemberHit[]>([]);
  const [isLooking, setIsLooking] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<{
    type: "ok" | "warn" | "err";
    title: string;
    subtitle: string;
  } | null>(null);

  // Registro
  const [regName, setRegName] = useState("");
  const [regCedula, setRegCedula] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPlan, setRegPlan] = useState("Xtreme Mensual");
  const [regPhoto, setRegPhoto] = useState("");
  const [regFaceHash, setRegFaceHash] = useState("");
  const [regCheckIn, setRegCheckIn] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  /** Kiosco de ingreso por defecto; staff abre el form de código. */
  const [showStaffGate, setShowStaffGate] = useState(false);

  // Camara
  const {
    videoRef,
    cameraOn,
    cameraError,
    reportCameraError,
    startCamera,
    stopCamera,
  } = useUserCamera({
    idealWidth: 1280,
    idealHeight: 720,
    permissionErrorMessage: "No se pudo abrir la camara. Revise permisos del navegador.",
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const cedulaInputRef = useRef<HTMLInputElement | null>(null);
  const lookupTimer = useRef<number | null>(null);

  const headers = useCallback(
    (json = false): HeadersInit => {
      const h: Record<string, string> = { "x-xtreme-admin": adminCode };
      if (json) h["Content-Type"] = "application/json";
      return h;
    },
    [adminCode],
  );

  const loadPanel = useCallback(
    async (withRoster = false) => {
      if (!adminCode) return;
      try {
        const params = withRoster ? "?roster=1" : "";
        const res = await fetch(`/api/xtreme/reception${params}`, {
          cache: "no-store",
          headers: headers(),
        });
        const json = (await res.json()) as {
          status?: GymStatus;
          recent?: RecentCheckin[];
          members?: MemberHit[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Error");
        if (json.status) setStatus(json.status);
        if (json.recent) setRecent(json.recent);
        if (json.members) setRoster(json.members);
      } catch {
        /* poll soft-fail */
      }
    },
    [adminCode, headers],
  );

  async function unlock(e?: React.FormEvent) {
    e?.preventDefault();
    const code = adminCode.trim();
    if (!code) return;
    setIsUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/xtreme/reception", {
        cache: "no-store",
        headers: { "x-xtreme-admin": code },
      });
      const json = (await res.json()) as {
        status?: GymStatus;
        recent?: RecentCheckin[];
        error?: string;
      };
      if (!res.ok) {
        setUnlockError(json.error || "Codigo incorrecto.");
        return;
      }
      window.localStorage.setItem(ADMIN_CODE_KEY, code);
      setAdminCode(code);
      setUnlocked(true);
      if (json.status) setStatus(json.status);
      if (json.recent) setRecent(json.recent);
    } catch {
      setUnlockError("Error de conexion.");
    } finally {
      setIsUnlocking(false);
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(ADMIN_CODE_KEY);
    if (stored) {
      setAdminCode(stored);
      void (async () => {
        setIsUnlocking(true);
        try {
          const res = await fetch("/api/xtreme/reception", {
            cache: "no-store",
            headers: { "x-xtreme-admin": stored },
          });
          const json = (await res.json()) as {
            status?: GymStatus;
            recent?: RecentCheckin[];
          };
          if (!res.ok) {
            window.localStorage.removeItem(ADMIN_CODE_KEY);
            setAdminCode("");
            return;
          }
          setUnlocked(true);
          if (json.status) setStatus(json.status);
          if (json.recent) setRecent(json.recent);
        } finally {
          setIsUnlocking(false);
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadPanel(tab === "face");
    const id = window.setInterval(() => void loadPanel(tab === "face"), 12_000);
    return () => window.clearInterval(id);
  }, [unlocked, tab, loadPanel]);

  // Badge de chats no leídos (poll liviano aunque no estés en el tab)
  useEffect(() => {
    if (!unlocked || !adminCode) return;
    let cancelled = false;
    async function pollChatBadge() {
      try {
        const res = await fetch("/api/xtreme/chat/inbox?status=open", {
          cache: "no-store",
          headers: { "x-xtreme-admin": adminCode },
        });
        const json = (await res.json()) as { unreadTotal?: number };
        if (!cancelled && res.ok) setChatUnread(json.unreadTotal ?? 0);
      } catch {
        /* soft */
      }
    }
    void pollChatBadge();
    const id = window.setInterval(() => void pollChatBadge(), tab === "chat" ? 4000 : 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [unlocked, adminCode, tab]);

  useEffect(() => {
    if (tab === "face" && unlocked) {
      void startCamera();
      void loadPanel(true);
    } else {
      stopCamera();
    }
    return () => {
      if (tab !== "face") stopCamera();
    };
  }, [tab, unlocked, startCamera, stopCamera, loadPanel]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 4200);
    return () => window.clearTimeout(id);
  }, [flash]);

  useEffect(() => {
    if (unlocked && tab === "cedula") {
      cedulaInputRef.current?.focus();
    }
  }, [unlocked, tab, flash]);

  const lookupMember = useCallback(
    async (opts: { cedula?: string; q?: string; code?: string }) => {
      setIsLooking(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (opts.cedula) params.set("cedula", opts.cedula);
        else if (opts.code) params.set("code", opts.code);
        else if (opts.q) params.set("q", opts.q);
        const res = await fetch(`/api/xtreme/checkin?${params}`, {
          cache: "no-store",
          headers: adminCode ? { "x-xtreme-admin": adminCode } : {},
        });
        const json = (await res.json()) as {
          status?: GymStatus;
          member?: MemberHit | null;
          error?: string;
        };
        if (json.status) setStatus(json.status);
        if (!json.member) {
          setMember(null);
          setError(json.error || "Socio no encontrado.");
          return null;
        }
        setMember(json.member);
        return json.member;
      } catch {
        setError("Error de conexion.");
        setMember(null);
        return null;
      } finally {
        setIsLooking(false);
      }
    },
    [adminCode],
  );

  // Auto-busqueda por cedula al digitar (lector de barras / teclado)
  useEffect(() => {
    if (!unlocked || tab !== "cedula") return;
    const digits = cedula.replace(/\D/g, "");
    if (digits.length < 6) {
      if (!digits) {
        setMember(null);
        setError("");
      }
      return;
    }
    if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    lookupTimer.current = window.setTimeout(() => {
      void lookupMember({ cedula: digits });
    }, AUTO_LOOKUP_MS);
    return () => {
      if (lookupTimer.current) window.clearTimeout(lookupTimer.current);
    };
  }, [cedula, unlocked, tab, lookupMember]);

  async function confirmCheckin(target?: MemberHit, method: "cedula" | "face" | "name" | "code" = "cedula") {
    const m = target || member;
    if (!m) return;
    setIsCheckingIn(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminCode ? { "x-xtreme-admin": adminCode } : {}),
        },
        body: JSON.stringify({
          memberName: m.memberName,
          accessCode: m.accessCode,
          cedula: m.cedula || cedula,
          method,
          by: "reception",
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
        return;
      }
      if (json.status) setStatus(json.status);
      const ms = json.membershipStatus || m.membershipStatus;
      setFlash({
        type: ms === "expired" ? "warn" : "ok",
        title: json.duplicate
          ? "Ya esta adentro"
          : `Listo · ${m.memberName.split(" ")[0]}`,
        subtitle: json.message || "Ingreso registrado en recepcion.",
      });
      setCedula("");
      setQuery("");
      setMember(null);
      setFaceMatches([]);
      void loadPanel(tab === "face");
      window.setTimeout(() => cedulaInputRef.current?.focus(), 100);
    } catch {
      setError("Error de conexion.");
      setFlash({ type: "err", title: "Error", subtitle: "No se pudo registrar el ingreso." });
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function searchFallback(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    const digits = q.replace(/\D/g, "");
    const useCode = digits.length >= 4 && digits.length === q.replace(/\s/g, "").length;
    const hit = await lookupMember(useCode ? { code: digits } : { q });
    if (hit) setMember(hit);
  }

  async function scanFace() {
    const video = videoRef.current;
    if (!video || !cameraOn) {
      reportCameraError("Active la camara primero.");
      return;
    }
    setIsScanning(true);
    setError("");
    setFaceMatches([]);
    try {
      const faceHash = await computeFaceHash(video);
      if (!faceHash) {
        setError("No se pudo leer el rostro. Centra la cara y reintenta.");
        return;
      }
      const res = await fetch(`/api/xtreme/reception?faceHash=${faceHash}`, {
        cache: "no-store",
        headers: headers(),
      });
      const json = (await res.json()) as {
        matches?: MemberHit[];
        bestMatch?: MemberHit | null;
        status?: GymStatus;
        recent?: RecentCheckin[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "No se pudo buscar rostro.");
        return;
      }
      if (json.status) setStatus(json.status);
      if (json.recent) setRecent(json.recent);
      const matches = json.matches || [];
      setFaceMatches(matches);
      if (json.bestMatch) {
        setMember(json.bestMatch);
        // Auto-ingreso si el match es muy claro (distancia baja)
        if ((json.bestMatch.faceDistance ?? 99) <= 6 && matches.length === 1) {
          await confirmCheckin(json.bestMatch, "face");
          return;
        }
      } else {
        setMember(null);
        setError("Sin coincidencias. Use cedula o registre al socio.");
      }
    } catch {
      setError("Error al escanear rostro.");
    } finally {
      setIsScanning(false);
    }
  }

  async function enrollCurrentFace() {
    if (!member) {
      setError("Busque al socio primero (cedula) para enrolar su rostro.");
      return;
    }
    const video = videoRef.current;
    if (!video || !cameraOn) {
      reportCameraError("Active la camara primero.");
      return;
    }
    setIsEnrolling(true);
    setError("");
    try {
      const faceHash = await computeFaceHash(video);
      const photoUrl = await capturePhotoDataUrl(video);
      if (!faceHash) {
        setError("No se pudo capturar el rostro.");
        return;
      }
      const res = await fetch("/api/xtreme/reception", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({
          action: "enroll_face",
          memberName: member.memberName,
          faceHash,
          photoUrl,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; member?: MemberHit; error?: string };
      if (!res.ok) {
        setError(json.error || "No se pudo enrolar.");
        return;
      }
      if (json.member) setMember(json.member);
      setFlash({
        type: "ok",
        title: "Rostro guardado",
        subtitle: `${member.memberName} ya puede ingresar por cara.`,
      });
      void loadPanel(true);
    } catch {
      setError("Error de conexion al enrolar.");
    } finally {
      setIsEnrolling(false);
    }
  }

  async function captureForRegister() {
    const video = videoRef.current;
    if (!video) {
      await startCamera();
      return;
    }
    if (!cameraOn) await startCamera();
    // small wait for stream
    await new Promise((r) => setTimeout(r, 200));
    const v = videoRef.current;
    if (!v) return;
    // La foto sigue siendo util por si sola; el hash solo se calcula si la feature esta activa.
    const faceHash = FACE_RECOGNITION_ENABLED ? await computeFaceHash(v) : "";
    const photoUrl = await capturePhotoDataUrl(v);
    setRegFaceHash(faceHash);
    setRegPhoto(photoUrl);
  }

  async function registerWalkin(e?: React.FormEvent) {
    e?.preventDefault();
    setIsRegistering(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/reception", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({
          action: "register",
          memberName: regName,
          cedula: regCedula,
          phone: regPhone,
          email: regEmail,
          plan: regPlan,
          photoUrl: regPhoto || undefined,
          faceHash: regFaceHash || undefined,
          checkInNow: regCheckIn,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        member?: MemberHit;
        membershipStatus?: MemberHit["membershipStatus"];
        status?: GymStatus;
        created?: boolean;
      };
      if (!res.ok) {
        setError(json.error || "No se pudo registrar.");
        if (json.member) setMember(json.member);
        setFlash({ type: "err", title: "No se pudo registrar", subtitle: json.error || "" });
        return;
      }
      if (json.status) setStatus(json.status);
      setFlash({
        type: json.membershipStatus === "expired" ? "warn" : "ok",
        title: json.created ? "Socio nuevo" : "Actualizado",
        subtitle: json.message || regName,
      });
      setRegName("");
      setRegCedula("");
      setRegPhone("");
      setRegEmail("");
      setRegPhoto("");
      setRegFaceHash("");
      setMember(null);
      void loadPanel(true);
      setTab("cedula");
    } catch {
      setError("Error de conexion.");
    } finally {
      setIsRegistering(false);
    }
  }

  function logout() {
    stopCamera();
    window.localStorage.removeItem(ADMIN_CODE_KEY);
    setUnlocked(false);
    setAdminCode("");
    setMember(null);
    setRoster([]);
    setRecent([]);
    setShowStaffGate(false);
    setTab("cedula");
  }

  if (!unlocked) {
    return (
      <>
        <IngresoKiosk onStaffRequest={() => setShowStaffGate(true)} />
        {showStaffGate && (
          <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
            <form
              onSubmit={(e) => void unlock(e)}
              className="w-full max-w-md border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 text-white shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-8"
            >
              <div className="grid h-14 w-14 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
                <DoorOpen className="h-7 w-7" />
              </div>
              <GameLabel tone="lime" className="mt-4">
                Reception OS
              </GameLabel>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Mostrador</h1>
              <p className="mt-2 text-sm font-bold text-white/50">
                Cedula, registro, chat y herramientas de staff. El ingreso de socios queda en la
                pantalla de atras (PIN / rostro).
              </p>
              <label className="mt-6 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                Codigo de staff
              </label>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  autoFocus
                  placeholder="Codigo admin"
                  className="min-h-12 w-full border-[3px] border-white/20 bg-black/40 py-3.5 pl-10 pr-4 text-base font-bold outline-none focus:border-[#d8ff3e]"
                />
              </div>
              {unlockError && (
                <div className="mt-3 flex items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                  <XCircle className="h-4 w-4" /> {unlockError}
                </div>
              )}
              <GameButton
                type="submit"
                full
                className="mt-5"
                disabled={isUnlocking || !adminCode.trim()}
              >
                {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar al mostrador"}
              </GameButton>
              <button
                type="button"
                onClick={() => {
                  setShowStaffGate(false);
                  setUnlockError("");
                }}
                className="mt-3 w-full py-2 text-center text-xs font-black uppercase tracking-wide text-white/45 hover:text-white/70"
              >
                Volver al ingreso
              </button>
              <p className="mt-3 text-center text-xs font-bold text-white/35">
                <Link href="/admin" className="hover:text-white/70">
                  Panel admin
                </Link>
              </p>
            </form>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      {flash && (
        <div
          className={`fixed inset-x-0 top-0 z-50 border-b-[3px] px-4 py-4 text-center shadow-[0_6px_0_rgba(0,0,0,.35)] sm:px-5 sm:py-5 ${
            flash.type === "ok"
              ? "border-black/30 bg-[#d8ff3e] text-black"
              : flash.type === "warn"
                ? "border-black/30 bg-orange-400 text-black"
                : "border-black/30 bg-red-500 text-white"
          }`}
        >
          <p className="text-2xl font-black uppercase tracking-tight sm:text-4xl">{flash.title}</p>
          <p className="mt-1 text-sm font-bold opacity-80 sm:text-base">{flash.subtitle}</p>
        </div>
      )}

      <header className="xg-safe-top sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-white/15 bg-[#050505]/95 px-3 py-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <GameLabel tone="lime">Reception OS</GameLabel>
            <p className="truncate text-base font-black uppercase tracking-tight sm:text-lg">
              Recepcion Xtreme
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OccupancyPill status={status} />
          <GameHudPill
            icon={Users}
            label="Hoy"
            value={status?.checkinsToday ?? recent.length}
            tone="lime"
          />
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/60 hover:border-white/40 hover:text-white"
          >
            Admin
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 items-center gap-1.5 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/60 hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e]"
          >
            <LogOut className="h-3.5 w-3.5" /> Modo ingreso
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[1fr_320px] lg:p-6">
        <section className="border-[3px] border-white/20 bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,.55)]">
          <div className="flex border-b-[3px] border-white/15">
            {(
              [
                { id: "cedula" as const, label: "Cedula", icon: IdCard },
                ...(FACE_RECOGNITION_ENABLED
                  ? [{ id: "face" as const, label: "Rostro", icon: ScanFace }]
                  : []),
                { id: "register" as const, label: "Registro", icon: UserPlus },
                { id: "chat" as const, label: "Chat", icon: MessageCircle },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              const showBadge = t.id === "chat" && chatUnread > 0 && !active;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setError("");
                    setFaceMatches([]);
                  }}
                  className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 border-t-[3px] px-2 py-2 text-[10px] font-black uppercase tracking-wide transition sm:flex-row sm:gap-2 sm:text-sm ${
                    active
                      ? "border-t-[#d8ff3e] bg-[#d8ff3e] text-black"
                      : "border-t-transparent text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                    {showBadge && (
                      <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center bg-red-500 px-0.5 text-[9px] font-black text-white">
                        {chatUnread > 9 ? "9+" : chatUnread}
                      </span>
                    )}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-6">
            {tab === "chat" && <ReceptionChatInbox adminCode={adminCode} />}

            {tab === "cedula" && (
              <div className="mx-auto max-w-xl">
                <div className="text-center">
                  <GameLabel tone="lime">Via mas rapida · toca teclas grandes</GameLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                    Digite o escanee la cedula
                  </h2>
                  <p className="mt-2 text-sm font-bold text-white/45">
                    El lector de barras o el teclado buscan solo. Enter confirma el ingreso.
                  </p>
                </div>

                <form
                  className="mt-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (member) void confirmCheckin(member, "cedula");
                    else if (cedula.replace(/\D/g, "").length >= 6) {
                      void lookupMember({ cedula: cedula.replace(/\D/g, "") }).then((m) => {
                        if (m) void confirmCheckin(m, "cedula");
                      });
                    }
                  }}
                >
                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-white/35" />
                    <input
                      ref={cedulaInputRef}
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                      autoFocus
                      placeholder="1-2345-6789"
                      className="w-full border-[3px] border-white/20 bg-black/50 py-5 pl-14 pr-14 text-center text-3xl font-black tracking-widest outline-none placeholder:text-white/20 focus:border-[#d8ff3e] sm:text-4xl"
                    />
                    {isLooking && (
                      <Loader2 className="absolute right-4 top-1/2 h-6 w-6 -translate-y-1/2 animate-spin text-[#d8ff3e]" />
                    )}
                  </div>

                  {/* Teclado numerico rapido (tablet) — estilo juego */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (key === "clear") setCedula("");
                          else if (key === "back") setCedula((v) => v.slice(0, -1));
                          else setCedula((v) => (v + key).slice(0, 20));
                        }}
                        className="min-h-[52px] border-[3px] border-white/20 bg-black/40 py-3.5 text-xl font-black text-white shadow-[3px_3px_0_rgba(0,0,0,.45)] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black active:translate-x-px active:translate-y-px active:shadow-none"
                      >
                        {key === "clear" ? "C" : key === "back" ? "⌫" : key}
                      </button>
                    ))}
                  </div>

                  <MemberPreview
                    member={member}
                    error={error}
                    isCheckingIn={isCheckingIn}
                    onConfirm={() => void confirmCheckin(member || undefined, "cedula")}
                  />
                </form>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/35">
                    Alternativa · nombre o codigo
                  </p>
                  <form onSubmit={(e) => void searchFallback(e)} className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nombre, telefono o codigo"
                        className="w-full border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm font-bold outline-none focus:border-[#d8ff3e]/60"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLooking || !query.trim()}
                      className="border border-white/15 px-4 text-xs font-black uppercase tracking-wide text-white/70 hover:border-white/30 disabled:opacity-40"
                    >
                      Buscar
                    </button>
                  </form>
                </div>
              </div>
            )}

            {tab === "face" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="text-center lg:text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#d8ff3e]/80">
                      Reconocimiento facial
                    </p>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                      Apunte la camara al socio
                    </h2>
                    <p className="mt-2 text-sm font-bold text-white/45">
                      Match automatico si el rostro esta enrolado. Si no, use cedula (mas rapido) o enrole la cara.
                    </p>
                  </div>

                  <div className="relative mt-4 aspect-[4/3] overflow-hidden border border-white/15 bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="h-full w-full scale-x-[-1] object-cover"
                    />
                    {!cameraOn && (
                      <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center">
                        <div>
                          <Camera className="mx-auto h-10 w-10 text-white/40" />
                          <p className="mt-3 text-sm font-bold text-white/50">
                            {cameraError || "Camara apagada"}
                          </p>
                          <button
                            type="button"
                            onClick={() => void startCamera()}
                            className="mt-4 bg-[#d8ff3e] px-4 py-2 text-xs font-black uppercase text-black"
                          >
                            Activar camara
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-8 rounded-full border-2 border-[#d8ff3e]/40" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void scanFace()}
                      disabled={isScanning || !cameraOn}
                      className="inline-flex items-center justify-center gap-2 bg-[#d8ff3e] py-3.5 text-sm font-black uppercase text-black disabled:opacity-50"
                    >
                      {isScanning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ScanFace className="h-4 w-4" />
                      )}
                      Escanear
                    </button>
                    <button
                      type="button"
                      onClick={() => void enrollCurrentFace()}
                      disabled={isEnrolling || !cameraOn || !member}
                      className="inline-flex items-center justify-center gap-2 border border-white/15 py-3.5 text-sm font-black uppercase text-white/80 hover:border-white/30 disabled:opacity-40"
                    >
                      {isEnrolling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      Enrolar
                    </button>
                  </div>
                  {error && tab === "face" && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-bold text-red-400">
                      <XCircle className="h-4 w-4 shrink-0" /> {error}
                    </p>
                  )}
                </div>

                <div>
                  <MemberPreview
                    member={member}
                    error=""
                    isCheckingIn={isCheckingIn}
                    onConfirm={() => void confirmCheckin(member || undefined, "face")}
                  />

                  {faceMatches.length > 1 && (
                    <div className="mt-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                        Candidatos
                      </p>
                      <div className="mt-2 space-y-2">
                        {faceMatches.map((m) => (
                          <button
                            key={m.normalizedName}
                            type="button"
                            onClick={() => setMember(m)}
                            className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition ${
                              member?.normalizedName === m.normalizedName
                                ? "border-[#d8ff3e]/60 bg-[#d8ff3e]/10"
                                : "border-white/10 hover:border-white/25"
                            }`}
                          >
                            <Avatar name={m.memberName} photoUrl={m.photoUrl} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black uppercase">{m.memberName}</p>
                              <p className="text-xs font-bold text-white/40">
                                Dist. {m.faceDistance ?? "—"} · {MEMBERSHIP_STATUS_LABELS[m.membershipStatus]}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                      Galeria con foto ({roster.filter((m) => m.photoUrl || m.hasFace).length})
                    </p>
                    <div className="mt-2 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                      {roster
                        .filter((m) => m.photoUrl || m.hasFace)
                        .slice(0, 48)
                        .map((m) => (
                          <button
                            key={m.normalizedName}
                            type="button"
                            onClick={() => {
                              setMember(m);
                              setError("");
                            }}
                            className="border border-white/10 p-1.5 text-center transition hover:border-[#d8ff3e]/50"
                          >
                            <Avatar name={m.memberName} photoUrl={m.photoUrl} large />
                            <p className="mt-1 truncate text-[10px] font-black uppercase text-white/60">
                              {m.memberName.split(" ")[0]}
                            </p>
                          </button>
                        ))}
                      {!roster.filter((m) => m.photoUrl || m.hasFace).length && (
                        <p className="col-span-full py-6 text-center text-sm font-bold text-white/35">
                          Nadie con foto enrolada aun. Use Enrolar o Registro.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "register" && (
              <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-2">
                <form onSubmit={(e) => void registerWalkin(e)} className="space-y-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#d8ff3e]/80">
                      Alta en mostrador
                    </p>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                      Nuevo socio
                    </h2>
                    <p className="mt-2 text-sm font-bold text-white/45">
                      Sin correo magico. Ideal para walk-in. Opcional: foto + rostro en el acto.
                    </p>
                  </div>

                  <Field label="Nombre completo" required>
                    <input
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]"
                      placeholder="Nombre y apellidos"
                    />
                  </Field>
                  <Field label="Cedula" required>
                    <input
                      value={regCedula}
                      onChange={(e) => setRegCedula(e.target.value)}
                      required
                      inputMode="numeric"
                      className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]"
                      placeholder="1-2345-6789"
                    />
                  </Field>
                  <Field label="Telefono" required>
                    <input
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                      inputMode="tel"
                      className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]"
                      placeholder="8888-8888"
                    />
                  </Field>
                  <Field label="Correo (opcional)">
                    <input
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      type="email"
                      className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]"
                      placeholder="correo@ejemplo.com"
                    />
                  </Field>
                  <Field label="Plan">
                    <select
                      value={regPlan}
                      onChange={(e) => setRegPlan(e.target.value)}
                      className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]"
                    >
                      <option className="text-black">Xtreme Mensual</option>
                      <option className="text-black">Pase dia</option>
                      <option className="text-black">Semanal</option>
                      <option className="text-black">Quincenal</option>
                      <option className="text-black">Trimestral</option>
                    </select>
                  </Field>

                  <label className="flex items-center gap-2 text-sm font-bold text-white/70">
                    <input
                      type="checkbox"
                      checked={regCheckIn}
                      onChange={(e) => setRegCheckIn(e.target.checked)}
                      className="h-4 w-4 accent-[#d8ff3e]"
                    />
                    Registrar ingreso ahora
                  </label>

                  {error && tab === "register" && (
                    <p className="flex items-center gap-2 text-sm font-bold text-red-400">
                      <XCircle className="h-4 w-4 shrink-0" /> {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isRegistering || !regName.trim() || !regCedula.trim() || !regPhone.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 bg-[#d8ff3e] py-4 text-sm font-black uppercase tracking-wide text-black disabled:opacity-50"
                  >
                    {isRegistering ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                    {regCheckIn ? "Registrar e ingresar" : "Solo registrar"}
                  </button>
                </form>

                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                    Foto / rostro (opcional)
                  </p>
                  <div className="relative mt-2 aspect-[4/3] overflow-hidden border border-white/15 bg-black">
                    {regPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={regPhoto} alt="Captura" className="h-full w-full scale-x-[-1] object-cover" />
                    ) : (
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="h-full w-full scale-x-[-1] object-cover"
                      />
                    )}
                    {!cameraOn && !regPhoto && (
                      <div className="absolute inset-0 grid place-items-center bg-black/70 p-4 text-center">
                        <p className="text-sm font-bold text-white/45">
                          {cameraError || "Sin captura"}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegPhoto("");
                        setRegFaceHash("");
                        void startCamera();
                      }}
                      className="border border-white/15 py-2.5 text-xs font-black uppercase text-white/70 hover:border-white/30"
                    >
                      Camara
                    </button>
                    <button
                      type="button"
                      onClick={() => void captureForRegister()}
                      className="bg-white/10 py-2.5 text-xs font-black uppercase text-white hover:bg-white/15"
                    >
                      Capturar
                    </button>
                  </div>
                  {regFaceHash && (
                    <p className="mt-2 text-xs font-bold text-[#d8ff3e]/80">
                      Rostro listo para match futuro
                    </p>
                  )}
                  <p className="mt-4 text-xs font-bold leading-relaxed text-white/35">
                    Recomendacion: en el dia a dia la cedula es la via mas rapida y confiable.
                    El rostro sirve cuando el socio ya esta enrolado y no trae documento a mano.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-3 sm:space-y-4">
          <div className="border-[3px] border-cyan-300/45 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]">
            <GameLabel tone="cyan" className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Ahora en el gym
            </GameLabel>
            <p className="mt-2 text-4xl font-black text-[#d8ff3e]">
              {status?.currentPeople ?? 0}
              <span className="text-lg text-white/40"> / {status?.capacity ?? 85}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-white/50">
              {status?.occupancyPct ?? 0}% · {status?.level ?? "—"} · hoy {status?.checkinsToday ?? 0} ingresos
            </p>
            <div className="mt-3 h-3 border-[3px] border-white/15 bg-black/45">
              <div
                className="h-full bg-[#d8ff3e] transition-all"
                style={{ width: `${Math.min(100, status?.occupancyPct ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="border-[3px] border-white/20 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]">
            <GameLabel tone="white">Ultimos ingresos</GameLabel>
            <ul className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
              {recent.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 border-[3px] border-white/10 bg-black/40 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase">{c.memberName}</p>
                    <p className="text-[11px] font-bold text-white/35">
                      {c.method} · {c.by} · {formatTime(c.checkedInAt)}
                    </p>
                  </div>
                  <GameChip
                    tone={
                      c.membershipStatus === "expired"
                        ? "orange"
                        : c.membershipStatus === "warning"
                          ? "yellow"
                          : "lime"
                    }
                  >
                    {c.membershipStatus === "expired"
                      ? "Vencida"
                      : c.membershipStatus === "warning"
                        ? "Pronto"
                        : "OK"}
                  </GameChip>
                </li>
              ))}
              {!recent.length && (
                <li className="border-[3px] border-dashed border-white/10 py-6 text-center text-sm font-bold text-white/30">
                  Sin ingresos hoy
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>

    </main>
  );
}

function OccupancyPill({ status }: { status: GymStatus | null }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 border-[3px] border-cyan-300/50 bg-black/50 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-100 shadow-[3px_3px_0_rgba(0,0,0,.4)]">
      <span className="h-2.5 w-2.5 bg-[#d8ff3e] shadow-[0_0_8px_rgba(216,255,62,.8)]" />
      {status?.currentPeople ?? 0}/{status?.capacity ?? 85} · {status?.occupancyPct ?? 0}%
    </span>
  );
}

function Avatar({
  name,
  photoUrl,
  large,
}: {
  name: string;
  photoUrl?: string;
  large?: boolean;
}) {
  const size = large ? "h-14 w-14" : "h-10 w-10";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${size} shrink-0 object-cover ${large ? "" : "rounded-none"}`}
      />
    );
  }
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center bg-[#d8ff3e]/15 text-xs font-black text-[#d8ff3e]`}
    >
      {initials(name)}
    </span>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function MemberPreview({
  member,
  error,
  isCheckingIn,
  onConfirm,
}: {
  member: MemberHit | null;
  error: string;
  isCheckingIn: boolean;
  onConfirm: () => void;
}) {
  if (!member && !error) return null;

  if (!member) {
    return (
      <div className="mt-4">
        <GameCallout tone="red" icon={XCircle}>
          {error}
        </GameCallout>
      </div>
    );
  }

  const expired = member.membershipStatus === "expired";

  return (
    <div className="mt-5 border-[3px] border-[#d8ff3e]/55 bg-black/50 p-4 shadow-[4px_4px_0_rgba(216,255,62,0.2)]">
      <GameLabel tone="lime" className="mb-3">
        Socio encontrado · confirmar
      </GameLabel>
      <div className="flex items-center gap-4">
        <div className="relative">
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photoUrl}
              alt={member.memberName}
              className="h-16 w-16 border-[3px] border-[#d8ff3e]/50 object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-xl font-black text-black">
              {initials(member.memberName)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black uppercase tracking-tight">{member.memberName}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <GameChip
              tone={
                member.membershipStatus === "expired"
                  ? "red"
                  : member.membershipStatus === "warning"
                    ? "orange"
                    : "lime"
              }
            >
              {MEMBERSHIP_STATUS_LABELS[member.membershipStatus]}
            </GameChip>
            {member.daysRemaining >= 0 && (
              <GameChip tone="cyan">{member.daysRemaining}d</GameChip>
            )}
            <GameChip>{member.plan}</GameChip>
          </div>
          <p className="mt-1 text-xs font-bold text-white/35">
            {member.cedula ? `Ced. ${member.cedula} · ` : ""}
            {member.accessCode}
          </p>
        </div>
      </div>

      {expired && (
        <div className="mt-3">
          <GameCallout tone="orange" icon={ShieldAlert}>
            Membresia vencida — puede ingresar, cobrar renovacion.
          </GameCallout>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <GameCallout tone="red" icon={XCircle}>
            {error}
          </GameCallout>
        </div>
      )}

      <GameButton full className="mt-4 !min-h-14 !text-base" disabled={isCheckingIn} onClick={onConfirm}>
        {isCheckingIn ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        Confirmar ingreso
      </GameButton>
    </div>
  );
}
