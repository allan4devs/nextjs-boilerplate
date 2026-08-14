"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bolt,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  DoorOpen,
  IdCard,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  ReceiptText,
  ScanFace,
  Search,
  ShieldAlert,
  Sun,
  Send,
  UserPlus,
  Users,
  UsersRound,
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
import FaceRecognitionPanel from "../../components/reception/FaceRecognitionPanel";
import { Avatar, MemberPreview } from "../../components/reception/MemberCards";
import StaffThemeToggle from "../../components/StaffThemeToggle";
import { MEMBERSHIP_STATUS_LABELS } from "@/app/features/checkin/constants";
import { useUserCamera } from "@/app/features/checkin/hooks/useUserCamera";
import { memberLookupToSearchParams } from "@/app/lib/memberLookup";
import type { GymStatus, MemberHit } from "@/lib/xtreme/checkin/contracts";
import { FACE_RECOGNITION_ENABLED } from "@/lib/xtreme/face/config";

type RecentCheckin = {
  id: string;
  memberName: string;
  accessCode: string;
  method: string;
  membershipStatus: string;
  checkedInAt: string;
  by: string;
};

type ActiveVisit = {
  id: string;
  memberName: string;
  normalizedName: string;
  cedula?: string;
  photoUrl?: string;
  membershipStatus: string;
  checkedInAt: string;
};

type Tab = "empty" | "inside" | "cedula" | "face" | "register" | "invite" | "chat" | "billing";

function formatTime(value: string | Date) {
  try {
    return new Date(value).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
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
  const [staffName, setStaffName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [tab, setTab] = useState<Tab>("cedula");
  const [dutiesCollapsed, setDutiesCollapsed] = useState(false);
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [recent, setRecent] = useState<RecentCheckin[]>([]);
  const [inside, setInside] = useState<ActiveVisit[]>([]);
  const [roster, setRoster] = useState<MemberHit[]>([]);
  const [checkoutQuery, setCheckoutQuery] = useState("");
  const [checkingOutId, setCheckingOutId] = useState("");

  const [query, setQuery] = useState("");
  const [member, setMember] = useState<MemberHit | null>(null);
  const [billingMember, setBillingMember] = useState<MemberHit | null>(null);
  const [searchMatches, setSearchMatches] = useState<MemberHit[]>([]);
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
  const [regLastPaidAt, setRegLastPaidAt] = useState("");
  const [regNextBillingDate, setRegNextBillingDate] = useState("");
  const [regPhoto, setRegPhoto] = useState("");
  const [regCheckIn, setRegCheckIn] = useState(true);
  const [editingMemberKey, setEditingMemberKey] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  // Cámara del alta en mostrador. El ingreso por rostro maneja la suya dentro
  // de FaceRecognitionPanel, que la enciende y apaga con su propio ciclo de vida.
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
        if (json.members) setRoster(json.members);
      } catch {
        /* poll soft-fail */
      }
    },
    [unlocked],
  );

  async function unlock(e?: React.FormEvent) {
    e?.preventDefault();
    const code = adminCode.trim();
    if (!code) return;
    setIsUnlocking(true);
    setUnlockError("");
    try {
      const loginRes = await fetch("/api/xtreme/staff-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "reception", code }),
      });
      const loginJson = (await loginRes.json()) as { error?: string; role?: string; staffName?: string | null };
      if (!loginRes.ok) {
        setUnlockError(loginJson.error || "Codigo incorrecto.");
        return;
      }
      const res = await fetch("/api/xtreme/reception", { cache: "no-store" });
      const json = (await res.json()) as {
        status?: GymStatus;
        recent?: RecentCheckin[];
        inside?: ActiveVisit[];
        error?: string;
      };
      if (!res.ok) {
        setUnlockError(json.error || "Codigo incorrecto.");
        return;
      }
      setAdminCode(loginJson.role || "reception");
      setStaffName(loginJson.staffName ?? "");
      setUnlocked(true);
      if (json.status) setStatus(json.status);
      if (json.recent) setRecent(json.recent);
      if (json.inside) setInside(json.inside);
    } catch {
      setUnlockError("Error de conexion.");
    } finally {
      setIsUnlocking(false);
    }
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
  }, []);

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
  }, [flash]);

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
    [],
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
  }, [query, unlocked, tab, lookupMember]);

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
      setRegName("");
      setRegCedula("");
      setRegPhone("");
      setRegEmail("");
      setRegLastPaidAt("");
      setRegNextBillingDate("");
      setRegPhoto("");
      setEditingMemberKey("");
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
    await fetch("/api/xtreme/staff-session?surface=reception", { method: "DELETE" });
    setUnlocked(false);
    setAdminCode("");
    setStaffName("");
    setMember(null);
    setInside([]);
    setRoster([]);
    setRecent([]);
    setTab("cedula");
  }

  if (!unlocked) {
    return (
      <main className="xg-os-login-shell grid bg-[#050505] text-white">
        <div className="w-full max-w-md">
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
                Cedula, registro, chat y herramientas de recepcion. Esta sesion es independiente
                del modo ingreso y de administracion.
              </p>
              <label className="mt-6 block text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                Codigo de staff
              </label>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  autoFocus
                  placeholder="Codigo de recepcion"
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
              <p className="mt-4 flex justify-center gap-4 text-center text-xs font-bold text-white/35">
                <Link href="/admin" className="hover:text-white/70">
                  Panel admin
                </Link>
              </p>
            </form>
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
            {FACE_RECOGNITION_ENABLED && <SidePanelAction active={tab === "face"} icon={ScanFace} label="Ingreso por rostro" detail="Cámara y enrolamiento" onClick={() => setTab("face")} />}
          </div>
          <div className="mt-3 grid gap-2 border-t-[3px] border-white/10 pt-3">
            <Link href="/recepcion/ventas" className="flex min-h-12 items-center justify-between border-[3px] border-[#d8ff3e]/45 px-3 text-xs font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black"><span>Ventas e inventario</span><ArrowRight className="h-4 w-4" /></Link>
            <Link href="/admin" className="flex min-h-12 items-center justify-between border-[3px] border-white/15 px-3 text-xs font-black uppercase text-white/50 hover:border-white/35 hover:text-white"><span>Administración</span><ArrowRight className="h-4 w-4" /></Link>
          </div>
        </aside>

        <section className="min-w-0 border-[3px] border-white/20 bg-[#0c0c0c] shadow-[4px_4px_0_rgba(0,0,0,.55)]">
          <header className="flex min-h-14 items-center justify-between gap-3 border-b-[3px] border-white/15 px-4 py-3">
            <div><GameLabel tone="cyan">Panel central</GameLabel><p className="mt-1 text-sm font-black uppercase">{{ cedula: "Buscar persona", inside: "Personas adentro", register: "Registrar persona", invite: "Invitar a la app", chat: "Chat de recepción", face: "Ingreso por rostro", billing: "Facturar", empty: "Panel minimizado" }[tab]}</p></div>
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

            {tab === "face" && FACE_RECOGNITION_ENABLED && (
              <FaceRecognitionPanel
                roster={roster}
                member={member}
                isCheckingIn={isCheckingIn}
                onSelectMember={(selected) => {
                  setMember(selected);
                  setError("");
                }}
                onCheckin={(selected, method) => confirmCheckin(selected, method)}
                onRosterChanged={() => void loadPanel(true)}
              />
            )}

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
                      <button type="button" onClick={() => { setEditingMemberKey(""); setRegName(""); setRegCedula(""); setRegPhone(""); setRegEmail(""); setRegPhoto(""); setRegPlan("Xtreme Mensual"); setRegLastPaidAt(""); setRegNextBillingDate(""); setRegCheckIn(true); }} className="mt-3 text-[10px] font-black uppercase tracking-wide text-white/45 underline hover:text-white">
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

function SearchMatchList({
  matches,
  onSelect,
  onEdit,
  onInvoice,
}: {
  matches: MemberHit[];
  onSelect: (member: MemberHit) => void;
  onEdit: (member: MemberHit) => void;
  onInvoice: (member: MemberHit) => void;
}) {
  if (!matches.length) return null;
  return (
    <div className="mt-3 border-[3px] border-cyan-300/35 bg-cyan-300/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
        {matches.length} personas encontradas · seleccioná una
      </p>
      <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {matches.map((candidate) => (
          <article
            key={candidate.normalizedName}
            className="flex min-w-0 flex-wrap items-center gap-4 border-[3px] border-white/15 bg-black/50 p-4"
          >
            <div className="scale-110"><Avatar name={candidate.memberName} photoUrl={candidate.photoUrl} /></div>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black uppercase leading-tight text-white sm:text-lg">
                {candidate.memberName}
              </span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {candidate.plan && <span className="bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/55">{candidate.plan}</span>}
                <span className={`px-2 py-1 text-[10px] font-black uppercase ${candidate.membershipStatus === "expired" ? "bg-orange-400/15 text-orange-200" : "bg-[#d8ff3e]/15 text-[#d8ff3e]"}`}>
                  {MEMBERSHIP_STATUS_LABELS[candidate.membershipStatus] ?? candidate.membershipStatus}
                </span>
                {candidate.cedula && <span className="bg-white/5 px-2 py-1 text-[10px] font-bold text-white/35">Céd. {candidate.cedula}</span>}
              </span>
            </span>
            <span className="flex shrink-0 gap-2">
              <button type="button" onClick={() => onInvoice(candidate)} className="inline-flex min-h-10 items-center gap-1.5 border-[3px] border-orange-300/50 px-3 text-[10px] font-black uppercase text-orange-200 hover:bg-orange-300 hover:text-black">
                <ReceiptText className="h-3.5 w-3.5" /> Facturar
              </button>
              <button type="button" onClick={() => onEdit(candidate)} className="inline-flex min-h-10 items-center gap-1.5 border-[3px] border-cyan-300/45 px-3 text-[10px] font-black uppercase text-cyan-200 hover:bg-cyan-300 hover:text-black">
                <Pencil className="h-3.5 w-3.5" /> Editar datos
              </button>
              <button type="button" onClick={() => onSelect(candidate)} className="min-h-10 border-[3px] border-[#d8ff3e]/45 px-3 text-[10px] font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black">
                Seleccionar
              </button>
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function InsideRoster({
  visits,
  query,
  onQueryChange,
  checkingOutId,
  onCheckout,
}: {
  visits: ActiveVisit[];
  query: string;
  onQueryChange: (value: string) => void;
  checkingOutId: string;
  onCheckout: (visit: ActiveVisit) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const queryDigits = query.replace(/\D/g, "");
  const filtered = visits.filter((visit) => {
    if (!normalizedQuery) return true;
    const nameMatch = visit.memberName.toLocaleLowerCase("es").includes(normalizedQuery);
    const cedulaMatch = Boolean(
      queryDigits && String(visit.cedula || "").replace(/\D/g, "").includes(queryDigits),
    );
    return nameMatch || cedulaMatch;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <GameLabel tone="lime">Control de salida</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Personas dentro · {visits.length}
          </h2>
          <p className="mt-2 text-sm font-bold text-white/45">
            Buscá por nombre o cédula y marcá la salida desde la lista.
          </p>
        </div>
      </div>

      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          inputMode="search"
          autoComplete="off"
          placeholder="Nombre o número de cédula"
          className="min-h-14 w-full border-[3px] border-white/20 bg-black/50 pl-12 pr-4 text-base font-black text-white outline-none placeholder:text-white/25 focus:border-[#d8ff3e]"
        />
      </label>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((visit) => {
          const minutes = Math.max(
            0,
            Math.round((now - new Date(visit.checkedInAt).getTime()) / 60_000),
          );
          const busy = checkingOutId === visit.id;
          return (
            <li
              key={visit.id}
              className="flex min-w-0 flex-col border-[3px] border-white/15 bg-black/45 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={visit.memberName} photoUrl={visit.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black uppercase">{visit.memberName}</p>
                  <p className="mt-0.5 text-xs font-bold text-white/40">
                    {visit.cedula ? `Céd. ${visit.cedula} · ` : ""}
                    Entrada {formatTime(visit.checkedInAt)} · {minutes} min
                  </p>
                </div>
                <GameChip tone={visit.membershipStatus === "expired" ? "orange" : "lime"}>
                  Dentro
                </GameChip>
              </div>
              <button
                type="button"
                disabled={Boolean(checkingOutId)}
                onClick={() => onCheckout(visit)}
                className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-orange-300 bg-orange-300/10 px-4 text-sm font-black uppercase text-orange-200 transition hover:bg-orange-300 hover:text-black disabled:cursor-wait disabled:opacity-45"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                Marcar salida
              </button>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="border-[3px] border-dashed border-white/15 px-4 py-10 text-center text-sm font-bold text-white/35 md:col-span-2">
            {visits.length
              ? "No hay una persona dentro que coincida con la búsqueda."
              : "No hay personas registradas dentro del gimnasio."}
          </li>
        )}
      </ul>
    </div>
  );
}

function SidePanelAction({
  active,
  icon: Icon,
  label,
  detail,
  badge = 0,
  onClick,
}: {
  active: boolean;
  icon: typeof IdCard;
  label: string;
  detail: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-16 w-full items-center gap-3 border-[3px] p-3 text-left transition ${
        active
          ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
          : "border-white/15 bg-black/45 text-white hover:border-violet-300/60"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center ${active ? "bg-black/15" : "bg-violet-300/10 text-violet-200"}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black uppercase leading-tight">{label}</span>
        <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-wide ${active ? "text-black/55" : badge ? "text-orange-300" : "text-white/35"}`}>
          {detail}
        </span>
      </span>
      {badge > 0 && (
        <span className={`grid h-7 min-w-7 place-items-center px-1 text-xs font-black ${active ? "bg-black text-[#d8ff3e]" : "bg-red-500 text-white"}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
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
