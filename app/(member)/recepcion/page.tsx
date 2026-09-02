"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bolt,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  DoorOpen,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  ScanFace,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  Send,
  UserPlus,
  Users,
  UsersRound,
  Video,
  X,
  XCircle,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameHudPill,
  GameLabel,
} from "../../components/GameOS";
import ReceptionChatInbox from "../../components/reception/ReceptionChatInbox";
import ReceptionDutiesPanel from "../../components/reception/ReceptionDutiesPanel";
import ReceptionBillingPanel from "../../components/reception/ReceptionBillingPanel";
import FaceTerminalPanel from "../../components/reception/FaceTerminalPanel";
import CameraWallPanel from "../../components/reception/CameraWallPanel";
import { MemberPreview } from "../../components/reception/MemberCards";
import StaffThemeToggle from "../../components/StaffThemeToggle";
import {
  Field,
  InsideRoster,
  OccupancyPill,
  SearchMatchList,
  SidePanelAction,
} from "../../components/reception/ui";
import { capturePhotoDataUrl, formatTime } from "../../components/reception/helpers";
import {
  ReceptionProvider,
  useReception,
} from "../../components/reception/context/ReceptionProvider";
import { useWalkinForm } from "../../components/reception/hooks/useWalkinForm";
import type {
  ActiveVisit,
  RecentCheckin,
  ReceptionTab,
} from "../../components/reception/types";
import { useUserCamera } from "@/app/features/checkin/hooks/useUserCamera";
import { memberLookupToSearchParams } from "@/app/lib/memberLookup";
import type { GymStatus, MemberHit } from "@/lib/xtreme/checkin/contracts";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";


export default function RecepcionPage() {
  return (
    <ReceptionProvider>
      <ReceptionConsole />
    </ReceptionProvider>
  );
}

/**
 * El panel del mostrador. La sesión de staff y los avisos llegan del
 * contexto; acá vive el estado efímero de la pantalla.
 */
function ReceptionConsole() {
  const {
    session: {
      adminCode,
      setAdminCode,
      staffName,
      setStaffName,
      unlocked,
      setUnlocked,
      unlockError,
      setUnlockError,
      isUnlocking,
      setIsUnlocking,
      operators,
      operatorsLoaded,
      loadOperators,
      signIn,
      submitPin,
      acceptSession,
      signOut,
    },
    feedback: { error, setError, flash, setFlash },
  } = useReception();

  // Acceso: selector de operador → PIN. `code` es el fallback legacy.
  const [authStep, setAuthStep] = useState<"pick" | "pin" | "code">("pick");
  const [pickedId, setPickedId] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const [tab, setTab] = useState<ReceptionTab>("cedula");
  const [dutiesCollapsed, setDutiesCollapsed] = useState(false);
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [recent, setRecent] = useState<RecentCheckin[]>([]);
  const [inside, setInside] = useState<ActiveVisit[]>([]);
  const [checkoutQuery, setCheckoutQuery] = useState("");
  const [checkingOutId, setCheckingOutId] = useState("");

  const [query, setQuery] = useState("");
  const [member, setMember] = useState<MemberHit | null>(null);
  const [billingMember, setBillingMember] = useState<MemberHit | null>(null);
  const [searchMatches, setSearchMatches] = useState<MemberHit[]>([]);
  const [isLooking, setIsLooking] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Registro
  const {
    regName,
    setRegName,
    regCedula,
    setRegCedula,
    regPhone,
    setRegPhone,
    regEmail,
    setRegEmail,
    regPlan,
    setRegPlan,
    regLastPaidAt,
    setRegLastPaidAt,
    regNextBillingDate,
    setRegNextBillingDate,
    regPhoto,
    setRegPhoto,
    regCheckIn,
    setRegCheckIn,
    editingMemberKey,
    setEditingMemberKey,
    resetWalkin,
  } = useWalkinForm();
  const [isRegistering, setIsRegistering] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  // Cámara del alta en mostrador (solo la foto de la ficha). El ingreso por
  // rostro ya no usa webcam: lo hace la terminal física de la puerta.
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
  const nameLookupTimer = useRef<number | null>(null);

  const headers = useCallback(
    (json = false): HeadersInit => {
      const h: Record<string, string> = {};
      if (json) h["Content-Type"] = "application/json";
      return h;
    },
    [],
  );

  const loadPanel = useCallback(
    async (withRoster = false) => {
      if (!unlocked) return;
      try {
        const params = withRoster ? "?roster=1" : "";
        const res = await fetch(`/api/xtreme/reception${params}`, {
          cache: "no-store",
        });
        if (res.status === 401) {
          setUnlocked(false);
          setAdminCode("");
          return;
        }
        const json = (await res.json()) as {
          status?: GymStatus;
          recent?: RecentCheckin[];
          inside?: ActiveVisit[];
          members?: MemberHit[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "Error");
        if (json.status) setStatus(json.status);
        if (json.recent) setRecent(json.recent);
        if (json.inside) setInside(json.inside);
      } catch {
        /* poll soft-fail */
      }
    },
    [unlocked, setAdminCode, setUnlocked],
  );

  /** Trae el panel y abre la sesión en pantalla tras un acceso correcto. */
  const finishSignIn = useCallback(
    async (role: string, name: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/xtreme/reception", { cache: "no-store" });
        const json = (await res.json()) as {
          status?: GymStatus;
          recent?: RecentCheckin[];
          inside?: ActiveVisit[];
          error?: string;
        };
        if (!res.ok) {
          setUnlockError(json.error || "No se pudo abrir el mostrador.");
          return false;
        }
        acceptSession(role, name);
        if (json.status) setStatus(json.status);
        if (json.recent) setRecent(json.recent);
        if (json.inside) setInside(json.inside);
        return true;
      } catch {
        setUnlockError("Error de conexión.");
        return false;
      }
    },
    [acceptSession, setUnlockError],
  );

  const pickedOperator = operators.find((op) => op.id === pickedId) ?? null;
  const pinMode: "verify" | "set" = pickedOperator?.hasPin ? "verify" : "set";
  const pinReady =
    /^\d{4}$/.test(pinInput) && (pinMode === "verify" || pinInput === pinConfirm);

  function goToPin(id: string) {
    setPickedId(id);
    setPinInput("");
    setPinConfirm("");
    setUnlockError("");
    setAuthStep("pin");
  }

  function backToPick() {
    setAuthStep("pick");
    setPickedId("");
    setPinInput("");
    setPinConfirm("");
    setUnlockError("");
    void loadOperators();
  }

  async function submitPinFlow(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pickedOperator || !pinReady) return;
    const result = await submitPin(pinMode, pickedOperator.id, pinInput);
    if (!result.ok) {
      setUnlockError(result.error);
      // El PIN cambió de estado entre pantallas: recargar y reubicar.
      if (result.code === "pin_not_set" || result.code === "pin_already_set") {
        setPinInput("");
        setPinConfirm("");
        void loadOperators();
      }
      return;
    }
    await finishSignIn(result.role, result.staffName);
  }

  async function unlockWithCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!adminCode.trim()) return;
    const session = await signIn();
    if (!session.ok) {
      setUnlockError(session.error);
      return;
    }
    await finishSignIn(session.role, session.staffName);
  }

  useEffect(() => {
    void (async () => {
      const sessionRes = await fetch("/api/xtreme/staff-session?surface=reception", {
        cache: "no-store",
      });
      const session = (await sessionRes.json()) as { authenticated?: boolean; role?: string; staffName?: string | null };
      if (session.authenticated) {
        setAdminCode(session.role || "reception");
        setStaffName(session.staffName ?? "");
        setIsUnlocking(true);
        try {
          const res = await fetch("/api/xtreme/reception", { cache: "no-store" });
          const json = (await res.json()) as {
            status?: GymStatus;
            recent?: RecentCheckin[];
            inside?: ActiveVisit[];
          };
          if (!res.ok) {
            setAdminCode("");
            return;
          }
          setUnlocked(true);
          if (json.status) setStatus(json.status);
          if (json.recent) setRecent(json.recent);
          if (json.inside) setInside(json.inside);
        } finally {
          setIsUnlocking(false);
        }
      }
    })();
    // Solo al montar: retomar la sesión abierta una vez. Los setters del hook
    // son estables, así que no hacen falta en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selector de operadores: cargar mientras no haya sesión abierta.
  useEffect(() => {
    if (unlocked) return;
    void loadOperators();
  }, [unlocked, loadOperators]);

  useEffect(() => {
    if (!unlocked) return;
    void loadPanel(tab === "face");
    const id = window.setInterval(() => void loadPanel(tab === "face"), 12_000);
    return () => window.clearInterval(id);
  }, [unlocked, tab, loadPanel]);

  // Badge de chats no leídos (poll liviano aunque no estés en el tab)
  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    async function pollChatBadge() {
      try {
        const res = await fetch("/api/xtreme/chat/inbox?status=open", {
          cache: "no-store",
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
  }, [unlocked, tab]);

  // Fuera del alta en mostrador la cámara de la página se apaga: el panel de
  // rostro abre la suya y dos streams simultáneos traban la webcam.
  useEffect(() => {
    if (tab !== "register") stopCamera();
  }, [tab, stopCamera]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 4200);
    return () => window.clearTimeout(id);
  }, [flash, setFlash]);

  const lookupMember = useCallback(
    async (opts: { cedula?: string; q?: string; code?: string }) => {
      setIsLooking(true);
      setError("");
      try {
        // Misma fuente de verdad que Ingreso / Member.
        const params = memberLookupToSearchParams(opts);
        const res = await fetch(`/api/xtreme/checkin?${params}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          status?: GymStatus;
          member?: MemberHit | null;
          matches?: MemberHit[];
          error?: string;
        };
        if (json.status) setStatus(json.status);
        setSearchMatches(json.matches ?? []);
        if (!json.member) {
          setMember(null);
          if ((json.matches?.length ?? 0) > 1) {
            setError("");
            return null;
          }
          setError(
            json.error ||
              "No encontramos una persona con ese nombre.",
          );
          return null;
        }
        setMember(json.member);
        if (!json.matches) setSearchMatches([]);
        return json.member;
      } catch {
        setError("Error de conexión.");
        setMember(null);
        setSearchMatches([]);
        return null;
      } finally {
        setIsLooking(false);
      }
    },
    [setError],
  );

  // Búsqueda en vivo por nombre: espera brevemente mientras se escribe.
  useEffect(() => {
    if (!unlocked || tab !== "cedula") return;
    const value = query.trim();
    if (nameLookupTimer.current) window.clearTimeout(nameLookupTimer.current);
    if (value.length < 2) {
      setSearchMatches([]);
      setMember(null);
      setError("");
      return;
    }
    nameLookupTimer.current = window.setTimeout(() => {
      void lookupMember({ q: value });
    }, 240);
    return () => {
      if (nameLookupTimer.current) window.clearTimeout(nameLookupTimer.current);
    };
  }, [query, unlocked, tab, lookupMember, setError]);

  async function confirmCheckin(target?: MemberHit, method: "cedula" | "face" | "name" | "code" = "name") {
    const m = target || member;
    if (!m) return;
    setIsCheckingIn(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberName: m.memberName,
          accessCode: m.accessCode,
          cedula: m.cedula,
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
      setQuery("");
      setMember(null);
      void loadPanel(tab === "face");
    } catch {
      setError("Error de conexion.");
      setFlash({ type: "err", title: "Error", subtitle: "No se pudo registrar el ingreso." });
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function confirmCheckout(visit: ActiveVisit) {
    setCheckingOutId(visit.id);
    setError("");
    try {
      const res = await fetch("/api/xtreme/reception", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ action: "checkout", checkinId: visit.id }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        memberName?: string;
        durationMinutes?: number;
        status?: GymStatus;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        const message = json.error || "No se pudo registrar la salida.";
        setError(message);
        setFlash({ type: "err", title: "Salida no registrada", subtitle: message });
        return;
      }
      if (json.status) setStatus(json.status);
      setInside((current) => current.filter((item) => item.id !== visit.id));
      setCheckoutQuery("");
      const duration = json.durationMinutes
        ? ` · ${json.durationMinutes} min en el gym`
        : "";
      setFlash({
        type: "ok",
        title: "Salida lista",
        subtitle: `${json.memberName || visit.memberName}${duration}`,
      });
      void loadPanel(false);
    } catch {
      setError("Error de conexion al registrar la salida.");
      setFlash({ type: "err", title: "Error", subtitle: "No se pudo registrar la salida." });
    } finally {
      setCheckingOutId("");
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
    // Solo la foto de la ficha. El rostro para ingresar se enrola en el tab de
    // reconocimiento facial, que usa el reconocedor real y guarda varias muestras.
    const photoUrl = await capturePhotoDataUrl(v);
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
          action: editingMemberKey ? "update_member" : "register",
          memberKey: editingMemberKey || undefined,
          memberName: regName,
          cedula: regCedula,
          phone: regPhone,
          email: regEmail,
          plan: regPlan,
          lastPaidAt: regLastPaidAt || undefined,
          nextBillingDate: regNextBillingDate || undefined,
          photoUrl: regPhoto || undefined,
          checkInNow: editingMemberKey ? false : regCheckIn,
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
      resetWalkin();
      setMember(null);
      void loadPanel(true);
      setTab("cedula");
    } catch {
      setError("Error de conexion.");
    } finally {
      setIsRegistering(false);
    }
  }

  async function inviteToApp(e?: React.FormEvent) {
    e?.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setIsInviting(true);
    setInviteResult("");
    setError("");
    try {
      const res = await fetch("/api/xtreme/reception", {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ action: "invite_app", email }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !json.ok) {
        const message = json.error || "No se pudo enviar la invitación.";
        setError(message);
        setFlash({ type: "err", title: "Invitación no enviada", subtitle: message });
        return;
      }
      const message = json.message || "Invitación enviada.";
      setInviteResult(`Enviada a ${email}. ${message}`);
      setInviteEmail("");
      setFlash({ type: "ok", title: "Invitación enviada", subtitle: email });
    } catch {
      setError("Error de conexión al enviar la invitación.");
      setFlash({ type: "err", title: "Error", subtitle: "No se pudo enviar la invitación." });
    } finally {
      setIsInviting(false);
    }
  }

  async function logout() {
    stopCamera();
    await signOut();
    setMember(null);
    setInside([]);
    setRecent([]);
    setTab("cedula");
    setAuthStep("pick");
    setPickedId("");
    setPinInput("");
    setPinConfirm("");
    setUnlockError("");
  }

  if (!unlocked) {
    return (
      <main className="xg-os-login-shell grid bg-[#050505] text-white">
        <div className="w-full max-w-md">
          <div className="w-full border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 text-white shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-8">
            <div className="grid h-14 w-14 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
              <DoorOpen className="h-7 w-7" />
            </div>
            <GameLabel tone="lime" className="mt-4">
              Reception OS
            </GameLabel>
            <h1 className="mt-2 text-[clamp(1.75rem,6vw,2.25rem)] font-black uppercase leading-none tracking-tight [text-wrap:balance]">
              Mostrador
            </h1>

            {authStep === "pick" && (
              <>
                <p className="mt-2 text-sm font-bold leading-relaxed text-white/50 [text-wrap:pretty]">
                  Elegí quién está en recepción. Cada quien entra con su PIN de mostrador, aparte
                  del modo ingreso y de administración.
                </p>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                  ¿Quién está en el mostrador?
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {!operatorsLoaded && (
                    <div className="col-span-full flex min-h-16 items-center justify-center border-[3px] border-white/15 bg-black/40 text-white/40">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                  {operatorsLoaded &&
                    operators.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => goToPin(op.id)}
                        className="group flex min-h-16 flex-col justify-center gap-1 border-[3px] border-white/20 bg-black/40 px-3.5 py-3 text-left transition hover:border-[#d8ff3e] focus-visible:border-[#d8ff3e] focus-visible:outline-none"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-base font-black uppercase tracking-tight">
                            {op.name}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-[#d8ff3e]" />
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-[0.14em] ${
                            op.hasPin ? "text-white/35" : "text-[#d8ff3e]"
                          }`}
                        >
                          {op.hasPin ? op.title : "Primera vez · creá tu PIN"}
                        </span>
                      </button>
                    ))}
                </div>
                {unlockError && (
                  <div className="mt-3 flex items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                    <XCircle className="h-4 w-4 shrink-0" /> {unlockError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("code");
                    setUnlockError("");
                  }}
                  className="mt-5 min-h-11 text-xs font-black uppercase tracking-wide text-white/35 underline underline-offset-4 hover:text-white/70"
                >
                  Entrar con código de recepción
                </button>
              </>
            )}

            {authStep === "pin" && pickedOperator && (
              <form onSubmit={(e) => void submitPinFlow(e)}>
                <button
                  type="button"
                  onClick={backToPick}
                  className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/40 hover:text-[#d8ff3e]"
                >
                  <ArrowLeft className="h-4 w-4" /> Cambiar de persona
                </button>
                <p className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-[#d8ff3e]">
                  {pinMode === "set" ? "Primera vez" : "Ingreso"}
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight [text-wrap:balance]">
                  {pickedOperator.name}
                </h2>

                {pinMode === "set" && (
                  <div className="mt-3 flex gap-2 border-[3px] border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.06] p-3 text-xs font-bold leading-relaxed text-[#eaff93] [text-wrap:pretty]">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                    Elegí un PIN de 4 dígitos solo para el mostrador. No es el código de admin; si lo
                    olvidás, un administrador lo restablece.
                  </div>
                )}

                <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                  {pinMode === "set" ? "PIN nuevo (4 dígitos)" : "Tu PIN (4 dígitos)"}
                </label>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoFocus
                    placeholder="••••"
                    className="min-h-12 w-full border-[3px] border-white/20 bg-black/40 py-3.5 pl-10 pr-4 text-lg font-black tracking-[0.4em] outline-none focus:border-[#d8ff3e]"
                  />
                </div>

                {pinMode === "set" && (
                  <>
                    <label className="mt-3 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                      Repetir PIN
                    </label>
                    <div className="relative mt-2">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={4}
                        value={pinConfirm}
                        onChange={(e) =>
                          setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        placeholder="••••"
                        className="min-h-12 w-full border-[3px] border-white/20 bg-black/40 py-3.5 pl-10 pr-4 text-lg font-black tracking-[0.4em] outline-none focus:border-[#d8ff3e]"
                      />
                    </div>
                    {pinConfirm.length === 4 && pinInput !== pinConfirm && (
                      <p className="mt-2 text-xs font-bold text-orange-300">
                        Los dos PIN no coinciden.
                      </p>
                    )}
                  </>
                )}

                {unlockError && (
                  <div className="mt-3 flex items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                    <XCircle className="h-4 w-4 shrink-0" /> {unlockError}
                  </div>
                )}

                <GameButton type="submit" full className="mt-5" disabled={isUnlocking || !pinReady}>
                  {isUnlocking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : pinMode === "set" ? (
                    "Crear PIN y entrar"
                  ) : (
                    "Entrar al mostrador"
                  )}
                </GameButton>
              </form>
            )}

            {authStep === "code" && (
              <form onSubmit={(e) => void unlockWithCode(e)}>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("pick");
                    setUnlockError("");
                  }}
                  className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/40 hover:text-[#d8ff3e]"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver al selector
                </button>
                <p className="mt-3 text-sm font-bold leading-relaxed text-white/50 [text-wrap:pretty]">
                  Código de recepción compartido. Usalo solo si tu PIN no está disponible.
                </p>
                <label className="mt-5 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                  Código de recepción
                </label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    autoFocus
                    placeholder="Código de recepción"
                    className="min-h-12 w-full border-[3px] border-white/20 bg-black/40 py-3.5 pl-10 pr-4 text-base font-bold outline-none focus:border-[#d8ff3e]"
                  />
                </div>
                {unlockError && (
                  <div className="mt-3 flex items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-300">
                    <XCircle className="h-4 w-4 shrink-0" /> {unlockError}
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
              </form>
            )}

            <p className="mt-5 flex justify-center gap-4 text-center text-xs font-bold text-white/35">
              <Link href="/admin" className="hover:text-white/70">
                Panel admin
              </Link>
            </p>
          </div>
        </div>
      </main>
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
              {staffName ? `Recepción · ${staffName}` : "Recepción Xtreme"}
            </p>
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-white/35 sm:block">Ingresos · personas · atención</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StaffThemeToggle />
          <OccupancyPill status={status} />
          <GameHudPill
            icon={Users}
            label="Hoy"
            value={status?.checkinsToday ?? recent.length}
            tone="lime"
          />
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-11 items-center gap-1.5 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/60 hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e]"
          >
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] items-start gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-[240px_minmax(0,1fr)_320px] xl:p-6">
        <aside className="border-[3px] border-white/20 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] xl:sticky xl:top-24">
          <GameLabel tone="lime">Personas y accesos</GameLabel>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <SidePanelAction active={tab === "cedula"} icon={Search} label="Buscar persona" detail="Nombre y apellido" onClick={() => setTab("cedula")} />
            <SidePanelAction active={tab === "inside"} icon={LogOut} label="Registrar salida" detail={`${inside.length} dentro`} onClick={() => setTab("inside")} />
            <SidePanelAction active={tab === "register"} icon={UserPlus} label="Registrar persona" detail="Alta e ingreso" onClick={() => setTab("register")} />
            <SidePanelAction active={tab === "invite"} icon={Mail} label="Invitar a la app" detail="Enviar por correo" onClick={() => setTab("invite")} />
            <SidePanelAction active={tab === "chat"} icon={MessageCircle} label="Responder chat" detail={chatUnread > 0 ? `${chatUnread} pendiente${chatUnread === 1 ? "" : "s"}` : "Sin pendientes"} badge={chatUnread} onClick={() => setTab("chat")} />
            {FACE_RECOGNITION_ENABLED && <SidePanelAction active={tab === "face"} icon={ScanFace} label="Ingreso por rostro" detail="Terminal de la puerta" onClick={() => setTab("face")} />}
            <SidePanelAction active={tab === "cameras"} icon={Video} label="Cámaras" detail="Video en vivo" onClick={() => setTab("cameras")} />
          </div>
          <div className="mt-3 grid gap-2 border-t-[3px] border-white/10 pt-3">
            <Link href="/recepcion/ventas" className="flex min-h-12 items-center justify-between border-[3px] border-[#d8ff3e]/45 px-3 text-xs font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black"><span>Ventas e inventario</span><ArrowRight className="h-4 w-4" /></Link>
            <Link href="/admin" className="flex min-h-12 items-center justify-between border-[3px] border-white/15 px-3 text-xs font-black uppercase text-white/50 hover:border-white/35 hover:text-white"><span>Administración</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
        </aside>

        <section className="min-w-0 border-[3px] border-white/20 bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,.55)]">
          <header className="flex min-h-14 items-center justify-between gap-3 border-b-[3px] border-white/15 px-4 py-3">
            <div><GameLabel tone="cyan">Panel central</GameLabel><p className="mt-1 text-sm font-black uppercase">{{ cedula: "Buscar persona", inside: "Personas adentro", register: "Registrar persona", invite: "Invitar a la app", chat: "Chat de recepción", face: "Ingreso por rostro", billing: "Facturar", cameras: "Cámaras", empty: "Panel minimizado" }[tab]}</p></div>
            {tab !== "empty" && <button type="button" onClick={() => setTab("empty")} aria-label="Cerrar panel" className="grid h-10 w-10 place-items-center border-[3px] border-white/15 text-white/45 hover:border-red-300/60 hover:text-red-200"><X className="h-5 w-5" /></button>}
          </header>
          <div className="p-4 sm:p-6">
            {tab === "empty" && <div className="grid min-h-[28rem] place-items-center text-center"><div><LayoutDashboard className="mx-auto h-12 w-12 text-white/15" /><h2 className="mt-4 text-2xl font-black uppercase">Panel minimizado</h2><p className="mt-2 text-sm font-bold text-white/40">Elegí una herramienta en el sidebar izquierdo.</p><button type="button" onClick={() => setTab("cedula")} className="mt-5 min-h-12 bg-[#d8ff3e] px-5 text-sm font-black uppercase text-black">Buscar persona</button></div></div>}
            {tab === "inside" && (
              <InsideRoster
                visits={inside}
                query={checkoutQuery}
                onQueryChange={setCheckoutQuery}
                checkingOutId={checkingOutId}
                onCheckout={(visit) => void confirmCheckout(visit)}
              />
            )}
            {tab === "chat" && <ReceptionChatInbox />}
            {tab === "billing" && billingMember && <ReceptionBillingPanel member={billingMember} />}

            {tab === "invite" && (
              <div className="mx-auto max-w-2xl">
                <div className="relative overflow-hidden border-[3px] border-violet-300/55 bg-gradient-to-br from-violet-400/[0.14] via-[#0b0b0b] to-[#d8ff3e]/[0.06] p-5 shadow-[6px_6px_0_rgba(0,0,0,.55)] sm:p-7">
                  <span className="pointer-events-none absolute -right-12 top-20 h-[3px] w-52 rotate-45 bg-violet-200 opacity-10" />
                  <span className="pointer-events-none absolute -right-12 top-20 h-[3px] w-52 -rotate-45 bg-violet-200 opacity-10" />
                  <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <GameLabel tone="cyan">Invitación directa · sin registro en mostrador</GameLabel>
                      <h2 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Invitar a la app</h2>
                      <p className="mt-3 max-w-xl text-sm font-bold leading-6 text-white/52">
                        La persona recibe un enlace privado para confirmar el correo y completar nombre, cédula y teléfono por su cuenta.
                      </p>
                    </div>
                    <span className="grid h-14 w-14 shrink-0 place-items-center border-[3px] border-violet-200 bg-violet-300 text-black shadow-[4px_4px_0_rgba(0,0,0,.45)]">
                      <Mail className="h-7 w-7" />
                    </span>
                  </div>

                  <div className="relative mt-6 grid gap-2 sm:grid-cols-3">
                    {[
                      ["01", "Correo", "Recepción escribe únicamente el correo."],
                      ["02", "Perfil", "La persona completa sus datos desde el enlace."],
                      ["03", "App", "Entra a su cuenta y puede elegir un plan."],
                    ].map(([number, title, description]) => (
                      <div key={number} className="border-[3px] border-white/10 bg-black/35 p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">{number} / {title}</p>
                        <p className="mt-2 text-xs font-bold leading-5 text-white/48">{description}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={(e) => void inviteToApp(e)} className="relative mt-5 border-[3px] border-white/15 bg-[#080808] p-4 sm:p-5">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/55">Correo de la persona</span>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <div className="relative min-w-0 flex-1">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
                          <input
                            type="email"
                            autoComplete="email"
                            value={inviteEmail}
                            onChange={(event) => {
                              setInviteEmail(event.target.value);
                              setInviteResult("");
                              setError("");
                            }}
                            required
                            className="min-h-14 w-full border-[3px] border-white/15 bg-black pl-11 pr-3 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-violet-300"
                            placeholder="persona@correo.com"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isInviting || !inviteEmail.trim()}
                          className="inline-flex min-h-14 items-center justify-center gap-2 bg-violet-300 px-6 text-sm font-black uppercase text-black transition hover:bg-[#d8ff3e] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isInviting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                          Enviar invitación
                        </button>
                      </div>
                    </label>

                    {inviteResult ? (
                      <p className="mt-3 flex items-start gap-2 border border-[#d8ff3e]/25 bg-[#d8ff3e]/10 p-3 text-sm font-bold text-[#eaff93]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {inviteResult}
                      </p>
                    ) : null}
                    {error ? (
                      <p className="mt-3 flex items-start gap-2 border border-red-400/25 bg-red-400/10 p-3 text-sm font-bold text-red-200">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                      </p>
                    ) : null}
                  </form>

                  <div className="relative mt-4">
                    <GameCallout tone="orange" icon={ShieldAlert}>
                      La invitación crea la cuenta, pero no activa membresía, acceso al gimnasio ni primer día gratis. El enlace personal vence en 24 horas.
                    </GameCallout>
                  </div>
                </div>
              </div>
            )}

            {tab === "cedula" && (
              <div className="mx-auto max-w-xl">
                <div className="text-center">
                  <GameLabel tone="lime">Ingreso rápido · búsqueda directa</GameLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                    Buscá por nombre
                  </h2>
                  <p className="mt-2 text-sm font-bold text-white/45">
                    Escribí el nombre o apellido, seleccioná a la persona y confirmá el ingreso.
                  </p>
                </div>
                <div className="mt-6">
                  <div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nombre o apellido"
                        autoComplete="off"
                        autoFocus
                        className="w-full border-[3px] border-[#d8ff3e]/50 bg-black/50 py-5 pl-12 pr-12 text-lg font-black outline-none placeholder:text-white/25 focus:border-[#d8ff3e]"
                      />
                      {isLooking && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[#d8ff3e]" />}
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                      Los resultados aparecen automáticamente mientras escribís
                    </p>
                  </div>
                  <SearchMatchList
                    matches={searchMatches}
                    onSelect={(selected) => {
                      setMember(selected);
                      setSearchMatches([]);
                      setError("");
                    }}
                    onEdit={(selected) => {
                      setEditingMemberKey(selected.normalizedName);
                      setRegName(selected.memberName);
                      setRegCedula(selected.cedula ?? "");
                      setRegPhone(selected.phone ?? "");
                      setRegEmail(selected.email ?? "");
                      setRegPlan(selected.plan || "Xtreme Mensual");
                      setRegLastPaidAt(selected.lastPaidAt ?? "");
                      setRegNextBillingDate(selected.nextBillingDate ?? "");
                      setRegPhoto(selected.photoUrl ?? "");
                      setRegCheckIn(false);
                      setSearchMatches([]);
                      setError("");
                      setTab("register");
                    }}
                    onInvoice={(selected) => {
                      setBillingMember(selected);
                      setTab("billing");
                      setError("");
                    }}
                  />
                  <MemberPreview
                    member={member}
                    error={error}
                    isCheckingIn={isCheckingIn}
                    onConfirm={() => void confirmCheckin(member || undefined, "name")}
                  />
                </div>
              </div>
            )}

            {tab === "face" && FACE_RECOGNITION_ENABLED && <FaceTerminalPanel />}

            {tab === "cameras" && <CameraWallPanel />}

            {tab === "register" && (
              <form onSubmit={(e) => void registerWalkin(e)} className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#d8ff3e]/80">
                      {editingMemberKey ? "Ficha personal" : "Alta en mostrador"}
                    </p>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-tight">
                      {editingMemberKey ? "Editar datos del socio" : "Nuevo socio"}
                    </h2>
                    <p className="mt-2 text-sm font-bold text-white/45">
                      {editingMemberKey
                        ? "Actualizá la información y guardá los cambios en la ficha personal."
                        : "Sin correo mágico. Ideal para walk-in. Opcional: foto + rostro en el acto."}
                    </p>
                    {editingMemberKey && (
                      <button type="button" onClick={resetWalkin} className="mt-3 text-[10px] font-black uppercase tracking-wide text-white/45 underline hover:text-white">
                        Cancelar edición
                      </button>
                    )}
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
                  {!editingMemberKey && <label className="flex items-center gap-2 text-sm font-bold text-white/70">
                    <input
                      type="checkbox"
                      checked={regCheckIn}
                      onChange={(e) => setRegCheckIn(e.target.checked)}
                      className="h-4 w-4 accent-[#d8ff3e]"
                    />
                    Registrar ingreso ahora
                  </label>}

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
                      editingMemberKey ? <CheckCircle2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />
                    )}
                    {editingMemberKey ? "Guardar cambios" : regCheckIn ? "Registrar e ingresar" : "Solo registrar"}
                  </button>
                </div>

                <div className="space-y-4">
                  <section className="border-[3px] border-[#d8ff3e]/45 bg-[#d8ff3e]/[0.06] p-4">
                    <GameLabel tone="lime">Membresía</GameLabel>
                    <h3 className="mt-2 text-xl font-black uppercase">Plan y vigencia</h3>
                    <div className="mt-4 grid gap-3">
                      <Field label="Plan">
                        <select value={regPlan} onChange={(e) => setRegPlan(e.target.value)} className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]">
                          <option className="text-black">Xtreme Mensual</option>
                          <option className="text-black">Pase dia</option>
                          <option className="text-black">Semanal</option>
                          <option className="text-black">Quincenal</option>
                          <option className="text-black">Trimestral</option>
                        </select>
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Fecha en que pagó"><input type="date" value={regLastPaidAt} onChange={(e) => setRegLastPaidAt(e.target.value)} className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" /></Field>
                        <Field label="Fecha de vencimiento"><input type="date" value={regNextBillingDate} onChange={(e) => setRegNextBillingDate(e.target.value)} className="w-full border border-white/15 bg-black/40 px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]" /></Field>
                      </div>
                    </div>
                  </section>

                  <section>
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
                  {regPhoto && (
                    <p className="mt-2 text-xs font-bold text-[#d8ff3e]/80">
                      Foto lista para la ficha del socio
                    </p>
                  )}
                  <p className="mt-4 text-xs font-bold leading-relaxed text-white/35">
                    Esta foto es solo para la ficha. Para que la persona pueda entrar por
                    cara, enrolá el rostro desde “Ingreso por rostro”.
                  </p>
                  </section>
                </div>
              </form>
            )}
          </div>
        </section>

        <aside className="space-y-3 sm:space-y-4">
          <div className="border-[3px] border-cyan-300/45 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]">
            <div className="flex items-center justify-between gap-3">
              <GameLabel tone="cyan">Checklist del turno</GameLabel>
              <button type="button" onClick={() => setDutiesCollapsed((current) => !current)} aria-label={dutiesCollapsed ? "Expandir checklist" : "Minimizar checklist"} className="grid h-9 w-9 place-items-center border-[3px] border-white/15 text-white/45 hover:border-cyan-300 hover:text-cyan-300">{dutiesCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
            </div>
            {!dutiesCollapsed && <div className="mt-3"><ReceptionDutiesPanel compact /></div>}
            {dutiesCollapsed && <p className="mt-2 text-xs font-bold text-white/35">Minimizado · tocá para abrir</p>}
          </div>
          <div className="border-[3px] border-amber-300/45 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]">
            <GameLabel tone="orange">Controles independientes</GameLabel>
            <div className="mt-3 grid gap-2">
              {([
                { href: "/recepcion/vip", label: "Área VIP", detail: "Clientes y cobros", icon: Crown, color: "text-amber-300" },
                { href: "/recepcion/adultos-mayores", label: "Adultos mayores", detail: "Clases y asistencia", icon: UsersRound, color: "text-cyan-300" },
                { href: "/recepcion/bronceado", label: "Bronceado", detail: "Sesiones y paquetes", icon: Sun, color: "text-orange-300" },
                { href: "/recepcion/pagos-luz", label: "Pagos de luz", detail: "Recibos y pendientes", icon: Bolt, color: "text-yellow-300" },
              ] as const).map((control) => {
                const Icon = control.icon;
                return <Link key={control.href} href={control.href} className="group flex min-h-16 items-center gap-3 border-[3px] border-white/15 bg-black/45 p-3 transition hover:border-amber-300/60"><span className={`grid h-10 w-10 shrink-0 place-items-center bg-white/5 ${control.color}`}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black uppercase leading-tight">{control.label}</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-white/35">{control.detail}</span></span><ArrowRight className="h-4 w-4 text-white/25 transition group-hover:translate-x-1 group-hover:text-amber-300" /></Link>;
              })}
            </div>
          </div>
          <div className="border-[3px] border-cyan-300/45 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]">
            <GameLabel tone="cyan" className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" /> Ahora en el gym
            </GameLabel>
            <p className="mt-2 text-4xl font-black text-[#d8ff3e]">
              {status?.currentPeople ?? 0}
              <span className="text-lg text-white/40"> / {status?.capacity ?? 85}</span>
            </p>
            <p className="mt-1 text-sm font-bold text-white/50">
              {status?.occupancyPct ?? 0}% · {status?.level ?? "-"} · hoy {status?.checkinsToday ?? 0} ingresos
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
