"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Database,
  DoorOpen,
  Flame,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Medal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { BarTrendChart, CHART_CYAN, CHART_LIME, LineTrendChart } from "../../components/charts";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameDockItem,
  GameHudPill,
  GameLabel,
} from "../../components/GameOS";

type PlanItem = {
  id: string;
  day: string;
  focus: string;
  exercises: string;
  targetMinutes: number;
  done: boolean;
  doneDate: string | null;
};

type TrainingPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  doneItems: number;
  totalItems: number;
  progressPct: number;
  updatedAt: string | null;
};

type AdminMember = {
  memberName: string;
  normalizedName: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  cedula?: string;
  coach: string;
  notes: string;
  photoUrl: string;
  accessCode: string;
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  lastWorkoutDate: string | null;
  plan: string;
  membershipStatus: "active" | "warning" | "expired";
  daysRemaining: number;
  nextBillingDate: string;
  startedAt: string;
  latestWeight: number | null;
  latestWaist: number | null;
  trainingPlan: TrainingPlan | null;
  seeded: boolean;
  // Rich info for personal trainer detailed view
  bodyMetrics?: Array<{
    id?: string;
    date: string;
    weightKg: number;
    waistCm: number;
    note?: string;
  }>;
  recentWorkouts?: Array<{
    id?: string;
    completedDate: string;
    trainingName: string;
    minutes: number;
    intensity?: string;
  }>;
};

type CheckinRow = {
  id: string;
  memberName: string;
  accessCode: string;
  method: string;
  membershipStatus: string;
  checkedInAt: string;
  by: string;
  note: string;
};

type PaymentRow = {
  id: string;
  customerName: string;
  memberName: string;
  optionLabel: string;
  category: string;
  amountCrc: number;
  amountUsd: number;
  method: string;
  status: string;
  date: string;
  note: string;
  paypalCaptureId: string | null;
  recordedBy: string;
};

type Revenue = {
  today: { count: number; crc: number; usd: number };
  week: { count: number; crc: number; usd: number };
  month: { count: number; crc: number; usd: number };
  all: { count: number; crc: number; usd: number };
  daily: { date: string; crc: number; count: number }[];
  byOption: { optionId: string; label: string; count: number; crc: number }[];
  byMethod: { method: string; count: number; crc: number }[];
  recent: PaymentRow[];
};

type AdminData = {
  role: "admin" | "super";
  members: AdminMember[];
  totals: {
    memberCount: number;
    seededCount: number;
    activeToday: number;
    totalWorkouts: number;
    totalMinutes: number;
    avgStreak: number;
    withPlan: number;
    expiringSoon: number;
    expired: number;
    activeMemberships: number;
  };
  today: {
    date: string;
    capacity: number;
    currentPeople: number;
    occupancyPct: number;
    level: string;
    checkinsToday: number;
    uniqueCheckins: number;
    reservationsToday: number;
    classes: { trainingId: string; trainingName: string; capacity: number; reserved: number }[];
  };
  checkins: CheckinRow[];
  checkinSeries: { date: string; checkins: number; unique: number }[];
  revenue?: Revenue;
  growth?: {
    windowDays: number;
    fromDate: string;
    toDate: string;
    dayPasses: number;
    plansSold: number;
    checkoutsStarted: number;
    paymentsCompleted: number;
    firstCheckins: number;
    membershipsStarted: number;
    renewalsCompleted: number;
    referralsRedeemed: number;
    referralsRewarded: number;
    appOpens: number;
    appOpenMembers: number;
    appOpenSeries: Array<{ date: string; opens: number; unique: number }>;
    dayPassToVisit: { dayPasses: number; visited: number; ratePct: number };
    dayPassToPlan: {
      dayPasses: number;
      converted1d: number;
      converted3d: number;
      converted7d: number;
      rate7dPct: number;
    };
    d7Retention: { newMembers: number; returned: number; ratePct: number };
    recentEvents: Array<{
      type: string;
      memberId?: string;
      occurredAt: string;
      properties: Record<string, string | number | boolean | null>;
    }>;
  } | null;
  system?: {
    lifecycle: { status: string; startedAt: Date; finishedAt?: Date; summary?: unknown } | null;
    lifecycleStale?: boolean;
    checkedAt: string;
  } | null;
  opsAlerts?: Array<{
    fingerprint: string;
    kind: string;
    severity: "warning" | "critical";
    title: string;
    detail: string;
    count: number;
    createdAt: string;
    lastSeenAt: string;
    context?: Record<string, string | number | boolean | null>;
  }>;
};

type PlanDraft = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
};

type MemberDraft = {
  displayName: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  cedula: string;
  coach: string;
  notes: string;
  plan: string;
  nextBillingDate: string;
  startedAt: string;
};

type QuickPlanOptionId = "week" | "fortnight" | "month" | "quarter";

const QUICK_PLAN_OPTIONS: Array<{
  id: QuickPlanOptionId;
  label: string;
  days: number;
  detail: string;
}> = [
  { id: "week", label: "Semanal", days: 7, detail: "Acceso completo por 7 dias" },
  { id: "fortnight", label: "Quincenal", days: 15, detail: "Acceso completo por 15 dias" },
  { id: "month", label: "Mensual", days: 30, detail: "Acceso completo por 30 dias" },
  { id: "quarter", label: "Trimestral", days: 90, detail: "Acceso completo por 90 dias" },
];

type Tab = "resumen" | "socios" | "accesos" | "ingresos" | "gamificacion";

type GamiBadge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  source: "catalog" | "manual";
  active: boolean;
  secret: boolean;
};

type GamiMember = {
  memberName: string;
  normalizedName: string;
  streak: number;
  weeksStreak: number;
  weeklyGoal: number;
  freezesBanked: number;
  freezesBonus: number;
  xp: number;
  xpBonus: number;
  levelName: string;
  levelIndex: number;
  earnedBadgeCount: number;
  earnedBadges: { badgeId: string; earnedAt: string; seen: boolean }[];
  totalWorkouts: number;
  lastWorkoutDate: string | null;
};

type GamiData = {
  badges: GamiBadge[];
  analytics: {
    memberCount: number;
    weeklyActiveMembers: number;
    avgStreak: number;
    totalBadgesEarned: number;
    streakDistribution: Record<string, number>;
    badgeEarnCounts: { badgeId: string; name: string; tier: string; count: number }[];
  };
  members: GamiMember[];
  audit: {
    id: string;
    at: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
  }[];
};

const STATUS_STYLES: Record<AdminMember["membershipStatus"], string> = {
  active: "border-lime-300/40 bg-lime-300/10 text-lime-200",
  warning: "border-orange-300/40 bg-orange-300/10 text-orange-200",
  expired: "border-red-400/40 bg-red-500/10 text-red-200",
};

const STATUS_LABEL: Record<AdminMember["membershipStatus"], string> = {
  active: "Activa",
  warning: "Por vencer",
  expired: "Vencida",
};

function money(crc: number) {
  return `CRC ${crc.toLocaleString("es-CR")}`;
}

function makeItem(): PlanItem {
  return {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    day: "",
    focus: "",
    exercises: "",
    targetMinutes: 45,
    done: false,
    doneDate: null,
  };
}

function draftFromMember(member: AdminMember): PlanDraft {
  const plan = member.trainingPlan;
  if (!plan) {
    return {
      title: `Plan de ${member.memberName.split(" ")[0]}`,
      objective: member.goal || "",
      coachNote: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      weeklySessions: 3,
      items: [makeItem(), makeItem(), makeItem()],
    };
  }
  return {
    title: plan.title,
    objective: plan.objective,
    coachNote: plan.coachNote,
    startDate: plan.startDate,
    endDate: plan.endDate,
    weeklySessions: plan.weeklySessions,
    items: plan.items.length ? plan.items.map((i) => ({ ...i })) : [makeItem()],
  };
}

function memberDraftFrom(member: AdminMember): MemberDraft {
  return {
    displayName: member.memberName,
    goal: member.goal,
    favoriteTraining: member.favoriteTraining,
    phone: member.phone,
    email: member.email,
    cedula: member.cedula ?? "",
    coach: member.coach,
    notes: member.notes,
    plan: member.plan === "—" ? "Xtreme Mensual" : member.plan,
    nextBillingDate: member.nextBillingDate,
    startedAt: member.startedAt || new Date().toISOString().slice(0, 10),
  };
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="border-[3px] border-white/20 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] sm:p-4">
      <div
        className={`mb-2 grid h-10 w-10 place-items-center border-2 border-black/30 bg-gradient-to-br ${accent} text-black`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="truncate text-2xl font-black leading-none text-white sm:text-3xl">{value}</div>
      <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 border-[3px] px-3 py-2 text-xs font-black uppercase tracking-wide transition sm:px-4 ${
        active
          ? "border-[#d8ff3e] bg-[#d8ff3e] text-black shadow-[3px_3px_0_rgba(216,255,62,0.35)]"
          : "border-white/20 bg-black/30 text-white/70 hover:border-[#d8ff3e]/50 hover:text-[#eaff93]"
      }`}
    >
      {children}
    </button>
  );
}

const ADMIN_TABS = [
  { id: "resumen" as const, label: "Resumen", icon: Activity },
  { id: "socios" as const, label: "Socios", icon: Users },
  { id: "accesos" as const, label: "Accesos", icon: DoorOpen },
  { id: "gamificacion" as const, label: "Game", icon: Trophy },
  { id: "ingresos" as const, label: "Ingresos", icon: Banknote, superOnly: true },
];

export default function XtremeAdminPage() {
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("resumen");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "warning" | "expired">("all");
  const [planMember, setPlanMember] = useState<AdminMember | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanDraft | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [quickPlanMember, setQuickPlanMember] = useState<AdminMember | null>(null);
  const [quickPlanOption, setQuickPlanOption] = useState<QuickPlanOptionId>("month");
  const [grantingQuickPlan, setGrantingQuickPlan] = useState(false);
  const [detailMember, setDetailMember] = useState<AdminMember | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [newMetric, setNewMetric] = useState({ date: "", weightKg: "", waistCm: "", note: "" });
  const [paymentForm, setPaymentForm] = useState({
    amountCrc: "",
    optionLabel: "Plan mensual",
    category: "Plan",
    method: "cash",
    note: "",
    extendMembership: true,
    extendDays: "30",
  });
  const [paymentMemberQuery, setPaymentMemberQuery] = useState("");
  const [selectedPaymentMember, setSelectedPaymentMember] = useState<AdminMember | null>(null);
  const [gami, setGami] = useState<GamiData | null>(null);
  const [gamiMemberQ, setGamiMemberQ] = useState("");
  const [selectedGamiMember, setSelectedGamiMember] = useState("");
  const [grantBadgeId, setGrantBadgeId] = useState("");
  const [manualBadge, setManualBadge] = useState({
    name: "",
    description: "",
    tier: "gold",
    icon: "Medal",
  });
  const [adjustForm, setAdjustForm] = useState({ xpBonus: "0", freezesBonus: "0", weeklyGoal: "4" });

  const load = useCallback(async (_sessionMarker: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin", { cache: "no-store" });
      if (response.status === 401) {
        setError("Codigo incorrecto.");
        setCode("");
        setData(null);
        return;
      }
      const json = (await response.json()) as AdminData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar.");
      setData(json);
      setCode(json.role);
      if (json.role !== "super") {
        setTab((current) => (current === "ingresos" ? "resumen" : current));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/xtreme/staff-session?surface=admin", { cache: "no-store" });
      const session = (await response.json()) as { authenticated?: boolean };
      if (session.authenticated) await load("session");
    })();
  }, [load]);

  async function login() {
    const accessCode = codeInput.trim();
    if (!accessCode) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/staff-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "admin", code: accessCode }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "Codigo incorrecto.");
      setCodeInput("");
      await load("session");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resolveOperationalAlert(fingerprint: string) {
    setBusy(`ops:${fingerprint}`);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolveOpsAlert", fingerprint }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error || "No se pudo resolver la alerta.");
      setData((current) =>
        current
          ? { ...current, opsAlerts: current.opsAlerts?.filter((alert) => alert.fingerprint !== fingerprint) }
          : current,
      );
      setMessage("Alerta marcada como resuelta.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver la alerta.");
    } finally {
      setBusy("");
    }
  }

  const loadGami = useCallback(async (_sessionMarker: string) => {
    try {
      const response = await fetch("/api/xtreme/admin/gamification", {
        cache: "no-store",
      });
      const json = (await response.json()) as GamiData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar gamificacion.");
      setGami(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando gamificacion.");
    }
  }, []);

  useEffect(() => {
    if (code && tab === "gamificacion") void loadGami(code);
  }, [code, tab, loadGami]);

  async function gamiAction(body: Record<string, unknown>, okMessage: string) {
    if (!code) return;
    setBusy("gami");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin/gamification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo procesar.");
      setMessage(okMessage);
      await loadGami(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de gamificacion.");
    } finally {
      setBusy("");
    }
  }

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toUpperCase();
    return data.members.filter((m) => {
      if (statusFilter !== "all" && m.membershipStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        m.memberName.toUpperCase().includes(q) ||
        m.accessCode.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        m.phone.includes(q) ||
        m.coach.toUpperCase().includes(q) ||
        m.goal.toUpperCase().includes(q) ||
        m.plan.toUpperCase().includes(q)
      );
    });
  }, [data, query, statusFilter]);

  const paymentMemberMatches = useMemo(() => {
    if (!data || selectedPaymentMember) return [];
    const q = paymentMemberQuery.trim().toUpperCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return data.members
      .filter((member) =>
        member.memberName.toUpperCase().includes(q) ||
        member.normalizedName.includes(q) ||
        member.email.toUpperCase().includes(q) ||
        member.phone.includes(digits || q) ||
        Boolean(digits && String(member.cedula || "").replace(/\D/g, "").includes(digits)) ||
        Boolean(digits && member.accessCode.replace(/\s/g, "").includes(digits)),
      )
      .slice(0, 8);
  }, [data, paymentMemberQuery, selectedPaymentMember]);

  async function seed(wipeAll: boolean) {
    if (!code) return;
    setBusy(wipeAll ? "reset" : "seed");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wipeAll }),
      });
      const json = (await response.json()) as {
        insertedMembers?: number;
        insertedPayments?: number;
        pin?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "No se pudo generar el seed.");
      setMessage(
        `Listo: ${json.insertedMembers} socios, ${json.insertedPayments ?? 0} pagos demo. PIN: ${json.pin}.`,
      );
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el seed.");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(memberName: string) {
    if (!code || !window.confirm(`Eliminar socio ${memberName}?`)) return;
    setBusy(`del-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo eliminar.");
      setMessage(`Eliminado: ${memberName}.`);
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setBusy("");
    }
  }

  async function adminCheckin(memberName: string) {
    if (!code) return;
    setBusy(`in-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", memberName }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; duplicate?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar ingreso.");
      setMessage(json.duplicate ? `${memberName}: ya tenia ingreso reciente.` : `Ingreso OK: ${memberName}.`);
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de ingreso.");
    } finally {
      setBusy("");
    }
  }

  async function sendReminder(memberName: string) {
    if (!code) return;
    setBusy(`mail-${memberName}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notify", memberName }),
      });
      const json = (await response.json()) as { ok?: boolean; sentTo?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo enviar el recordatorio.");
      setMessage(`Recordatorio enviado a ${json.sentTo}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recordatorio.");
    } finally {
      setBusy("");
    }
  }

  async function notifyExpiring() {
    if (!code) return;
    setBusy("notify-all");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notifyExpiring" }),
      });
      const json = (await response.json()) as { ok?: boolean; sent?: number; eligible?: number; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudieron enviar los recordatorios.");
      setMessage(`Recordatorios enviados: ${json.sent}/${json.eligible} socios con correo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar recordatorios.");
    } finally {
      setBusy("");
    }
  }

  function openPlan(member: AdminMember) {
    setPlanMember(member);
    setPlanDraft(draftFromMember(member));
    setError("");
    setMessage("");
  }

  function openEdit(member: AdminMember) {
    setEditMember(member);
    setMemberDraft(memberDraftFrom(member));
    setError("");
    setMessage("");
  }

  function openQuickPlan(member: AdminMember) {
    if (data?.role !== "super") return;
    setQuickPlanMember(member);
    setQuickPlanOption("month");
    setError("");
    setMessage("");
  }

  async function grantQuickPlan() {
    if (!code || data?.role !== "super" || !quickPlanMember) return;
    setGrantingQuickPlan(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quickPlan",
          memberName: quickPlanMember.memberName,
          optionId: quickPlanOption,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        plan?: string;
        endsOn?: string;
        error?: string;
      };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "No se pudo otorgar el plan.");
      setMessage(`${json.plan} activado para ${quickPlanMember.memberName} hasta ${json.endsOn}.`);
      setQuickPlanMember(null);
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al otorgar el plan.");
    } finally {
      setGrantingQuickPlan(false);
    }
  }

  function openDetail(member: AdminMember) {
    setDetailMember(member);
    setNewMetric({
      date: new Date().toISOString().slice(0, 10),
      weightKg: member.latestWeight ? String(member.latestWeight) : "",
      waistCm: member.latestWaist ? String(member.latestWaist) : "",
      note: "",
    });
    setError("");
    setMessage("");
  }

  function closeDetail() {
    setDetailMember(null);
    setNewMetric({ date: "", weightKg: "", waistCm: "", note: "" });
  }

  async function savePlan() {
    if (!code || !planMember || !planDraft) return;
    if (!planDraft.title.trim()) {
      setError("El plan necesita un titulo.");
      return;
    }
    setSavingPlan(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", memberName: planMember.memberName, plan: planDraft }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar el plan.");
      setMessage(`Plan guardado para ${planMember.memberName}.`);
      setPlanMember(null);
      setPlanDraft(null);
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  async function saveMember() {
    if (!code || !editMember || !memberDraft) return;
    setSavingMember(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "member",
          memberName: editMember.memberName,
          ...memberDraft,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar.");
      setMessage(`Perfil actualizado: ${memberDraft.displayName || editMember.memberName}.`);
      setEditMember(null);
      setMemberDraft(null);
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar perfil.");
    } finally {
      setSavingMember(false);
    }
  }

  async function addBodyMetric() {
    if (!code || !detailMember) return;
    const weight = parseFloat(newMetric.weightKg);
    const waist = parseFloat(newMetric.waistCm);
    if (!weight || !waist) {
      setError("Ingresá peso y medida de cintura válidos.");
      return;
    }
    setSavingMetric(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "metric",
          memberName: detailMember.memberName,
          date: newMetric.date || undefined,
          weightKg: weight,
          waistCm: waist,
          note: newMetric.note.trim(),
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo guardar la metrica.");
      setMessage(`Metrica registrada para ${detailMember.memberName}.`);
      // Refresh and update detail
      await load(code);
      // Re-open with fresh data (the list will have updated member)
      // We close detail after save for simplicity, user can re-open
      closeDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar metrica.");
    } finally {
      setSavingMetric(false);
    }
  }

  async function toggleItem(memberName: string, item: PlanItem) {
    if (!code) return;
    const nextDone = !item.done;
    setPlanDraft((draft) =>
      draft
        ? {
            ...draft,
            items: draft.items.map((i) =>
              i.id === item.id
                ? { ...i, done: nextDone, doneDate: nextDone ? new Date().toISOString().slice(0, 10) : null }
                : i,
            ),
          }
        : draft,
    );
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, itemId: item.id, done: nextDone }),
      });
      if (!response.ok) throw new Error();
      await load(code);
    } catch {
      setPlanDraft((draft) =>
        draft
          ? { ...draft, items: draft.items.map((i) => (i.id === item.id ? { ...i, done: item.done, doneDate: item.doneDate } : i)) }
          : draft,
      );
      setError("No se pudo actualizar el avance.");
    }
  }

  async function savePayment() {
    if (!code) return;
    if (!selectedPaymentMember) {
      setError("Seleccioná un socio registrado antes de guardar el pago.");
      return;
    }
    setBusy("payment");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment",
          memberKey: selectedPaymentMember.normalizedName,
          amountCrc: Number(paymentForm.amountCrc),
          optionLabel: paymentForm.optionLabel,
          optionId: paymentForm.optionLabel.toLowerCase().replace(/\s+/g, "-"),
          category: paymentForm.category,
          method: paymentForm.method,
          note: paymentForm.note,
          extendMembership: paymentForm.extendMembership && paymentForm.category === "Plan",
          extendDays: Number(paymentForm.extendDays) || 30,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo registrar el pago.");
      setMessage("Pago registrado.");
      setPaymentForm((f) => ({ ...f, amountCrc: "", note: "" }));
      setSelectedPaymentMember(null);
      setPaymentMemberQuery("");
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar pago.");
    } finally {
      setBusy("");
    }
  }

  async function deletePayment(paymentId: string) {
    if (!code || !window.confirm("Eliminar este pago del registro?")) return;
    setBusy(`pay-${paymentId}`);
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (!response.ok) throw new Error("No se pudo eliminar.");
      setMessage("Pago eliminado.");
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar pago.");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    await fetch("/api/xtreme/staff-session?surface=admin", { method: "DELETE" });
    setCode("");
    setData(null);
  }

  if (!code) {
    return (
      <main className="xg-os-login-shell grid bg-[#050505] text-white">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (codeInput.trim()) void login();
          }}
          className="w-full max-w-md border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-7"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
            <Lock className="h-7 w-7" />
          </div>
          <GameLabel tone="lime" className="mt-4">
            Admin OS
          </GameLabel>
          <h1 className="mt-2 text-2xl font-black uppercase">Panel Xtreme</h1>
          <p className="mt-2 text-sm font-bold text-white/55">
            Acceso para entrenadora personal y administracion del gym.
          </p>
          <input
            type="password"
            autoComplete="current-password"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Codigo de acceso"
            className="mt-5 min-h-12 w-full border-[3px] border-white/20 bg-black/40 px-4 py-3 text-center font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
          />
          {error && (
            <div className="mt-3 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
              {error}
            </div>
          )}
          <GameButton type="submit" full className="mt-5" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </GameButton>
          <p className="mt-5 text-xs font-semibold text-white/35">
            Si no tiene el codigo, pidalo a la administracion del gym.
          </p>
        </form>
      </main>
    );
  }

  const t = data?.today;
  const isSuper = data?.role === "super";
  const visibleTabs = ADMIN_TABS.filter((item) => !item.superOnly || isSuper);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="xg-safe-top sticky top-0 z-30 border-b-[3px] border-white/15 bg-[#050505]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <GameLabel tone="lime">Xtreme · Admin OS</GameLabel>
              {isSuper ? (
                <GameChip tone="yellow">
                  <ShieldCheck className="mr-1 inline h-3 w-3" /> Super
                </GameChip>
              ) : (
                <GameChip>
                  <Shield className="mr-1 inline h-3 w-3" /> Admin
                </GameChip>
              )}
            </div>
            <h1 className="mt-1 text-xl font-black uppercase tracking-tight sm:text-3xl">
              Panel de administracion
            </h1>
            <p className="mt-1 hidden text-sm font-bold text-white/50 sm:block">
              Socios, planes, accesos y progreso · toca paneles y modales
              {isSuper ? " · super: ingresos" : ""}
            </p>
            {data && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <GameHudPill icon={Users} label="Socios" value={data.totals.memberCount} tone="lime" />
                <GameHudPill icon={DoorOpen} label="Hoy" value={data.today.checkinsToday} tone="cyan" />
                <GameHudPill
                  icon={Activity}
                  label="Gym"
                  value={`${t?.occupancyPct ?? 0}%`}
                  tone="orange"
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/entrenador"
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase text-cyan-200 sm:text-sm"
            >
              <ClipboardList className="h-4 w-4" /> Trainer OS
            </Link>
            <Link
              href="/recepcion"
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-3 py-2 text-xs font-black uppercase text-[#eaff93] sm:text-sm"
            >
              <DoorOpen className="h-4 w-4" /> Reception OS
            </Link>
            <button
              type="button"
              onClick={() => void load(code)}
              disabled={isLoading || Boolean(busy)}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/80 disabled:opacity-50 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
            {process.env.NODE_ENV !== "production" && (
              <>
                <button
                  type="button"
                  onClick={() => void seed(false)}
                  disabled={Boolean(busy)}
                  className="hidden min-h-11 items-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] px-3 py-2 text-xs font-black uppercase text-black disabled:opacity-50 sm:inline-flex sm:text-sm"
                >
                  {busy === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Seed
                </button>
                <button
                  type="button"
                  onClick={() => void seed(true)}
                  disabled={Boolean(busy)}
                  className="hidden min-h-11 items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-200 disabled:opacity-50 md:inline-flex md:text-sm"
                >
                  {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  Reset
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/60 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </section>

      {/* Mobile dock */}
      <nav
        className="xg-app-dock xg-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t-[3px] border-white/20 bg-[#0a0a0a]/98 backdrop-blur-md lg:hidden"
        aria-label="Zonas admin"
      >
        {visibleTabs.map((item) => (
          <GameDockItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={tab === item.id}
            onClick={() => setTab(item.id)}
          />
        ))}
      </nav>

      <section className="xg-os-content mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        <div className="hidden flex-wrap gap-2 lg:flex">
          {visibleTabs.map((item) => (
            <TabButton key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
              {item.id === "accesos" ? "Accesos hoy" : item.id === "gamificacion" ? "Gamificacion" : item.label}
            </TabButton>
          ))}
        </div>

        <div className="border-[3px] border-white/15 bg-[#0c0c0c] px-3 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] lg:hidden">
          <GameLabel tone="lime">Zona activa</GameLabel>
          <p className="mt-1 text-lg font-black uppercase">
            {visibleTabs.find((item) => item.id === tab)?.label ?? tab}
          </p>
        </div>

        {(message || error) && (
          <GameCallout tone={error ? "red" : "lime"}>{error || message}</GameCallout>
        )}

        {isLoading && !data ? (
          <div className="grid min-h-[360px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]">
            <Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" />
          </div>
        ) : data ? (
          <>
            {tab === "resumen" && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                  <Kpi icon={Users} label="Socios" value={`${data.totals.memberCount}`} accent="from-lime-300 to-emerald-400" />
                  <Kpi icon={CalendarCheck} label="Activos hoy" value={`${data.totals.activeToday}`} accent="from-cyan-300 to-sky-500" />
                  <Kpi icon={DoorOpen} label="Ingresos hoy" value={`${data.today.checkinsToday}`} accent="from-sky-300 to-blue-400" />
                  <Kpi icon={Flame} label="Racha prom." value={`${data.totals.avgStreak}`} accent="from-orange-400 to-red-500" />
                  <Kpi icon={ClipboardList} label="Con plan" value={`${data.totals.withPlan}`} accent="from-fuchsia-400 to-rose-400" />
                  <Kpi icon={Activity} label="Ocupacion" value={`${t?.occupancyPct ?? 0}%`} accent="from-lime-300 to-cyan-300" />
                </div>

                {data.opsAlerts && data.opsAlerts.length > 0 && (
                  <div className="mt-4 border-[3px] border-red-400/45 bg-red-500/[0.08] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-300" />
                      <div>
                        <h2 className="text-lg font-black uppercase text-red-100">Atención operativa</h2>
                        <p className="mt-1 text-xs font-bold text-white/48">
                          {data.opsAlerts.length} incidente{data.opsAlerts.length === 1 ? "" : "s"} abierto{data.opsAlerts.length === 1 ? "" : "s"}. Los críticos también se enviaron al correo del administrador.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {data.opsAlerts.slice(0, 5).map((alert) => (
                        <div
                          key={alert.fingerprint}
                          className={`border p-3 ${
                            alert.severity === "critical"
                              ? "border-red-300/35 bg-red-400/10"
                              : "border-orange-300/30 bg-orange-300/[0.07]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black uppercase text-white">{alert.title}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                                {alert.count > 1 ? `${alert.count} veces · ` : ""}
                                {new Date(alert.lastSeenAt).toLocaleString("es-CR")}
                              </span>
                              <button
                                type="button"
                                disabled={busy === `ops:${alert.fingerprint}`}
                                onClick={() => void resolveOperationalAlert(alert.fingerprint)}
                                className="border border-white/15 px-2 py-1 text-[10px] font-black uppercase text-white/55 transition hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e] disabled:opacity-40"
                              >
                                {busy === `ops:${alert.fingerprint}` ? "Guardando" : "Resolver"}
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-xs font-bold leading-5 text-white/52">{alert.detail}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.growth && (
                  <div className="border border-lime-300/25 bg-lime-300/[0.05] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-lime-300" />
                        <div>
                          <h2 className="text-lg font-black uppercase">Crecimiento (30 días)</h2>
                          <p className="text-xs font-semibold text-white/45">
                            {data.growth.fromDate} → {data.growth.toDate} · embudo desde eventos
                          </p>
                        </div>
                      </div>
                      {data.system && (
                        <span className={`border px-3 py-1.5 text-[11px] font-black uppercase ${
                          data.system.lifecycleStale
                            ? "border-red-300/40 bg-red-400/10 text-red-200"
                            : "border-white/10 bg-black/30 text-white/55"
                        }`}>
                          Cron: {data.system.lifecycleStale ? "atrasado" : data.system.lifecycle?.status || "sin ejecución"}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="border border-white/10 bg-black/25 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Pase → visita ≤48h</p>
                        <p className="mt-2 text-2xl font-black text-lime-200">{data.growth.dayPassToVisit.ratePct}%</p>
                        <p className="mt-1 text-xs font-bold text-white/40">
                          {data.growth.dayPassToVisit.visited}/{data.growth.dayPassToVisit.dayPasses} pases
                        </p>
                      </div>
                      <div className="border border-white/10 bg-black/25 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Pase → plan ≤7d</p>
                        <p className="mt-2 text-2xl font-black text-cyan-200">{data.growth.dayPassToPlan.rate7dPct}%</p>
                        <p className="mt-1 text-xs font-bold text-white/40">
                          1d {data.growth.dayPassToPlan.converted1d} · 3d {data.growth.dayPassToPlan.converted3d} · 7d{" "}
                          {data.growth.dayPassToPlan.converted7d}
                        </p>
                      </div>
                      <div className="border border-white/10 bg-black/25 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Retención D7</p>
                        <p className="mt-2 text-2xl font-black text-orange-200">{data.growth.d7Retention.ratePct}%</p>
                        <p className="mt-1 text-xs font-bold text-white/40">
                          {data.growth.d7Retention.returned}/{data.growth.d7Retention.newMembers} volvieron
                        </p>
                      </div>
                      <div className="border border-white/10 bg-black/25 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/45">Referidos</p>
                        <p className="mt-2 text-2xl font-black text-fuchsia-200">
                          {data.growth.referralsRewarded}
                          <span className="text-base text-white/40"> / {data.growth.referralsRedeemed}</span>
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/40">recompensados / canjeados</p>
                      </div>
                      <div className="border border-white/10 bg-black/25 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/45">App abierta</p>
                        <p className="mt-2 text-2xl font-black text-sky-200">
                          {data.growth.appOpens ?? 0}
                          <span className="text-base text-white/40"> / {data.growth.appOpenMembers ?? 0}</span>
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/40">entradas / socios distintos</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-center text-xs font-bold text-white/55">
                      <div className="border border-white/10 bg-black/20 px-2 py-2">Checkout {data.growth.checkoutsStarted}</div>
                      <div className="border border-white/10 bg-black/20 px-2 py-2">Pagos {data.growth.paymentsCompleted}</div>
                      <div className="border border-white/10 bg-black/20 px-2 py-2">Pases {data.growth.dayPasses}</div>
                      <div className="border border-white/10 bg-black/20 px-2 py-2">Planes {data.growth.plansSold}</div>
                      <div className="border border-white/10 bg-black/20 px-2 py-2">1er ingreso {data.growth.firstCheckins}</div>
                      <div className="border border-white/10 bg-black/20 px-2 py-2">Renovaciones {data.growth.renewalsCompleted}</div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="border border-white/10 bg-white/[0.04] p-5 lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-lime-300" />
                        <h2 className="text-lg font-black uppercase">Ocupacion y clases</h2>
                      </div>
                      <span className="text-sm font-black uppercase text-white/55">
                        {t?.currentPeople}/{t?.capacity} · {t?.level}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {t?.classes.map((c) => {
                        const pct = Math.min(100, Math.round((c.reserved / c.capacity) * 100));
                        return (
                          <div key={c.trainingId} className="border border-white/10 bg-black/25 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-black uppercase">{c.trainingName}</p>
                              <span className="text-sm font-black text-lime-300">
                                {c.reserved}/{c.capacity}
                              </span>
                            </div>
                            <div className="mt-3 h-2.5 border border-white/10 bg-black/45">
                              <div
                                className={`h-full ${pct >= 90 ? "bg-red-400" : pct >= 60 ? "bg-orange-300" : "bg-lime-300"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-white/10 bg-white/[0.04] p-5">
                      <h2 className="text-sm font-black uppercase text-white/70">Membresias</h2>
                      <div className="mt-4 space-y-3 text-sm font-bold">
                        <div className="flex justify-between text-lime-200">
                          <span>Activas</span>
                          <span>{data.totals.activeMemberships}</span>
                        </div>
                        <div className="flex justify-between text-orange-200">
                          <span>Por vencer</span>
                          <span>{data.totals.expiringSoon}</span>
                        </div>
                        <div className="flex justify-between text-red-200">
                          <span>Vencidas</span>
                          <span>{data.totals.expired}</span>
                        </div>
                        <div className="flex justify-between text-white/50">
                          <span>Demo seed</span>
                          <span>{data.totals.seededCount}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void notifyExpiring()}
                        disabled={Boolean(busy) || data.totals.expiringSoon + data.totals.expired === 0}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-orange-300/40 bg-orange-300/10 px-3 py-2.5 text-xs font-black uppercase text-orange-200 transition hover:bg-orange-300/20 disabled:opacity-40"
                      >
                        {busy === "notify-all" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        Recordar renovacion por correo
                      </button>
                    </div>
                    {isSuper && data.revenue && (
                      <div className="border border-amber-300/30 bg-amber-300/[0.06] p-5">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5 text-amber-300" />
                          <h2 className="text-sm font-black uppercase text-amber-100">Ingresos hoy</h2>
                        </div>
                        <p className="mt-3 text-2xl font-black text-white">{money(data.revenue.today.crc)}</p>
                        <p className="mt-1 text-xs font-bold text-white/50">
                          {data.revenue.today.count} pagos · mes {money(data.revenue.month.crc)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab("ingresos")}
                          className="mt-4 text-xs font-black uppercase text-amber-200 underline-offset-2 hover:underline"
                        >
                          Ver detalle →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-3">
                      <DoorOpen className="h-5 w-5 text-cyan-300" />
                      <h2 className="text-lg font-black uppercase">Ingresos al gym — ultimos 7 dias</h2>
                    </div>
                    <div className="mt-4 border border-white/10 bg-black/25 p-3">
                      <BarTrendChart
                        data={(data.checkinSeries ?? []).map((d) => ({ date: d.date, value: d.checkins }))}
                        unit="ingresos"
                        color={CHART_CYAN}
                        height={160}
                      />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-white/45">
                      Check-ins registrados por día (kiosk + panel). Pasá el cursor para el detalle.
                    </p>
                  </div>

                  <div className="border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-lime-300" />
                      <h2 className="text-lg font-black uppercase">Entradas al app — ultimos 7 dias</h2>
                    </div>
                    <div className="mt-4 border border-white/10 bg-black/25 p-3">
                      <BarTrendChart
                        data={(data.growth?.appOpenSeries ?? []).map((d) => ({ date: d.date, value: d.opens }))}
                        unit="entradas"
                        color={CHART_LIME}
                        height={160}
                      />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-white/45">
                      Veces que los socios abrieron el Member OS por dia (evento app_opened).
                    </p>
                  </div>
                </div>

                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-orange-300" />
                      <h2 className="text-lg font-black uppercase">Top rachas</h2>
                    </div>
                    <button type="button" onClick={() => setTab("socios")} className="text-xs font-black uppercase text-lime-300">
                      Ver todos
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data.members.slice(0, 6).map((m, i) => (
                      <div key={m.normalizedName} className="flex items-center justify-between border border-white/10 bg-black/25 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase">
                            #{i + 1} {m.memberName}
                          </p>
                          <p className="text-[11px] font-semibold text-white/40">{m.goal || m.plan}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 font-black text-orange-300">
                          <Flame className="h-3.5 w-3.5" /> {m.streak}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "socios" && (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar nombre, codigo, telefono, coach..."
                      className="w-full border border-white/12 bg-black/40 py-2.5 pl-10 pr-3 text-sm font-semibold text-white outline-none focus:border-lime-300"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["all", "active", "warning", "expired"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        className={`border px-3 py-2 text-[11px] font-black uppercase ${
                          statusFilter === s
                            ? "border-lime-300 bg-lime-300 text-black"
                            : "border-white/15 text-white/60"
                        }`}
                      >
                        {s === "all" ? "Todos" : STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-white/10 bg-white/[0.04]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-orange-300" />
                      <h2 className="text-lg font-black uppercase">
                        Socios ({filteredMembers.length}/{data.members.length})
                      </h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                          <th className="px-5 py-3">Socio</th>
                          <th className="px-3 py-3">Contacto</th>
                          <th className="px-3 py-3">Racha</th>
                          <th className="px-3 py-3">Coach</th>
                          <th className="px-3 py-3">Membresia</th>
                          <th className="px-3 py-3">Codigo</th>
                          <th className="px-3 py-3">Plan</th>
                          <th className="px-3 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => (
                          <tr key={m.normalizedName} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                            <td
                              className="px-5 py-3 cursor-pointer"
                              onClick={() => openDetail(m)}
                              title="Ver informacion completa del usuario"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-black uppercase underline decoration-white/30 decoration-1 underline-offset-2 hover:text-lime-200">{m.memberName}</span>
                                {m.seeded && (
                                  <span className="border border-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/40">
                                    demo
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-white/40">{m.goal || "Sin objetivo"}</span>
                              {m.notes && (
                                <p className="mt-1 max-w-[220px] truncate text-[11px] text-white/30">{m.notes}</p>
                              )}
                              <span className="mt-1 inline-block text-[10px] font-black uppercase tracking-wide text-lime-300/70">Click para mas info →</span>
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold text-white/55">
                              <div>{m.phone || "—"}</div>
                              <div className="truncate max-w-[140px]">{m.email || "—"}</div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center gap-1 font-black text-orange-300">
                                <Flame className="h-3.5 w-3.5" /> {m.streak}
                              </span>
                              <div className="text-[11px] text-white/40">
                                {m.totalWorkouts} ent · {m.totalMinutes} min
                              </div>
                            </td>
                            <td className="px-3 py-3 text-white/70">{m.coach || "—"}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-block border px-2 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[m.membershipStatus]}`}>
                                {STATUS_LABEL[m.membershipStatus]}
                              </span>
                              <div className="mt-1 text-[11px] font-semibold text-white/40">
                                {m.plan} · {m.daysRemaining < 0 ? `${Math.abs(m.daysRemaining)}d vencida` : `${m.daysRemaining}d`}
                              </div>
                              {data.role === "super" && (
                                <button
                                  type="button"
                                  onClick={() => openQuickPlan(m)}
                                  className="mt-2 inline-flex min-h-8 items-center gap-1.5 border border-[#d8ff3e]/45 bg-[#d8ff3e]/10 px-2 text-[10px] font-black uppercase text-[#eaff93] transition hover:bg-[#d8ff3e] hover:text-black"
                                >
                                  <Zap className="h-3.5 w-3.5" /> Dar plan
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs font-bold tracking-wider text-cyan-200">
                              {m.accessCode}
                            </td>
                            <td className="px-3 py-3">
                              {m.trainingPlan ? (
                                <button type="button" onClick={() => openPlan(m)} className="min-w-[120px] text-left">
                                  <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase text-lime-200">
                                    <span className="truncate">{m.trainingPlan.title}</span>
                                    <span className="shrink-0 text-white/50">
                                      {m.trainingPlan.doneItems}/{m.trainingPlan.totalItems}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-2 w-full border border-white/10 bg-black/45">
                                    <div className="h-full bg-lime-300" style={{ width: `${m.trainingPlan.progressPct}%` }} />
                                  </div>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openPlan(m)}
                                  className="inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-[11px] font-black uppercase text-white/70 transition hover:border-lime-300 hover:text-lime-200"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Plan
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEdit(m)}
                                  title="Editar perfil"
                                  className="grid h-8 w-8 place-items-center border border-white/10 text-white/60 transition hover:border-lime-300 hover:text-lime-200"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void sendReminder(m.memberName)}
                                  disabled={Boolean(busy) || !m.email}
                                  title={
                                    m.email
                                      ? "Enviar recordatorio de membresia por correo"
                                      : "Sin correo registrado"
                                  }
                                  className="grid h-8 w-8 place-items-center border border-white/10 text-white/60 transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-40"
                                >
                                  {busy === `mail-${m.memberName}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Mail className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void adminCheckin(m.memberName)}
                                  disabled={Boolean(busy)}
                                  title="Registrar ingreso"
                                  className="grid h-8 w-8 place-items-center border border-white/10 text-white/60 transition hover:border-cyan-300 hover:text-cyan-200 disabled:opacity-40"
                                >
                                  {busy === `in-${m.memberName}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <DoorOpen className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void removeMember(m.memberName)}
                                  disabled={Boolean(busy)}
                                  title="Eliminar"
                                  className="grid h-8 w-8 place-items-center border border-white/10 text-white/50 transition hover:border-red-400 hover:text-red-300 disabled:opacity-40"
                                >
                                  {busy === `del-${m.memberName}` ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredMembers.length && (
                          <tr>
                            <td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                              Sin resultados. Ajusta el filtro o genera seed demo.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === "accesos" && (
              <div className="border border-white/10 bg-white/[0.04]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="h-5 w-5 text-cyan-300" />
                    <h2 className="text-lg font-black uppercase">
                      Ingresos de hoy ({data.checkins.length})
                    </h2>
                  </div>
                  <Link href="/recepcion" className="text-xs font-black uppercase text-cyan-300 hover:underline">
                    Reception OS →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                        <th className="px-5 py-3">Hora</th>
                        <th className="px-3 py-3">Socio</th>
                        <th className="px-3 py-3">Codigo</th>
                        <th className="px-3 py-3">Metodo</th>
                        <th className="px-3 py-3">Membresia</th>
                        <th className="px-3 py-3">Via</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.checkins.map((c) => (
                        <tr key={c.id} className="border-b border-white/[0.06]">
                          <td className="px-5 py-3 font-mono text-xs text-white/60">
                            {new Date(c.checkedInAt).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-3 font-black uppercase">{c.memberName}</td>
                          <td className="px-3 py-3 font-mono text-xs tracking-wider text-cyan-200">{c.accessCode}</td>
                          <td className="px-3 py-3 text-white/60">{c.method}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`border px-2 py-0.5 text-[10px] font-black uppercase ${
                                STATUS_STYLES[(c.membershipStatus as AdminMember["membershipStatus"]) || "active"] ||
                                STATUS_STYLES.active
                              }`}
                            >
                              {STATUS_LABEL[(c.membershipStatus as AdminMember["membershipStatus"]) || "active"] ||
                                c.membershipStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-white/50">{c.by}</td>
                        </tr>
                      ))}
                      {!data.checkins.length && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                            Nadie ha ingresado hoy. Usa Reception OS (/recepcion) o el boton de puerta en socios.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "ingresos" && isSuper && data.revenue && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Kpi icon={Banknote} label="Hoy" value={money(data.revenue.today.crc)} accent="from-amber-300 to-yellow-400" />
                  <Kpi icon={TrendingUp} label="7 dias" value={money(data.revenue.week.crc)} accent="from-lime-300 to-emerald-400" />
                  <Kpi icon={CreditCard} label="Mes" value={money(data.revenue.month.crc)} accent="from-cyan-300 to-sky-500" />
                  <Kpi icon={Trophy} label="Pagos mes" value={`${data.revenue.month.count}`} accent="from-fuchsia-400 to-rose-400" />
                </div>

                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-lime-300" />
                    <h2 className="text-lg font-black uppercase">Ingresos por dia — ultimos 14 dias</h2>
                  </div>
                  <div className="mt-4 border border-white/10 bg-black/25 p-3">
                    <BarTrendChart
                      data={(data.revenue.daily ?? []).map((d) => ({ date: d.date, value: d.crc }))}
                      unit="CRC"
                      color={CHART_LIME}
                      height={170}
                      compactValue={(v) =>
                        v >= 1000 ? `${(v / 1000).toLocaleString("es-CR", { maximumFractionDigits: 1 })}k` : `${v}`
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-sm font-black uppercase text-white/70">Por producto (mes)</h2>
                    <div className="mt-4 space-y-3">
                      {data.revenue.byOption.map((o) => (
                        <div key={o.optionId} className="flex items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-2.5">
                          <div>
                            <p className="text-sm font-black uppercase">{o.label}</p>
                            <p className="text-[11px] text-white/40">{o.count} pagos</p>
                          </div>
                          <span className="font-black text-amber-200">{money(o.crc)}</span>
                        </div>
                      ))}
                      {!data.revenue.byOption.length && (
                        <p className="text-sm font-semibold text-white/40">Sin pagos este mes.</p>
                      )}
                    </div>
                  </div>
                  <div className="border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-sm font-black uppercase text-white/70">Registrar pago manual</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="relative sm:col-span-2">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                          Socio registrado
                        </p>
                        {selectedPaymentMember ? (
                          <div className="flex items-center gap-3 border border-lime-300/60 bg-lime-300/10 p-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center bg-lime-300 font-black text-black">
                              <CheckCircle2 className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black uppercase">
                                {selectedPaymentMember.memberName}
                              </p>
                              <p className="truncate text-xs font-semibold text-white/45">
                                {selectedPaymentMember.cedula
                                  ? `Céd. ${selectedPaymentMember.cedula} · `
                                  : ""}
                                {selectedPaymentMember.email || selectedPaymentMember.accessCode}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPaymentMember(null);
                                setPaymentMemberQuery("");
                              }}
                              className="grid h-10 w-10 shrink-0 place-items-center border border-white/15 text-white/55 hover:border-white/40 hover:text-white"
                              aria-label="Cambiar socio"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                              <input
                                value={paymentMemberQuery}
                                onChange={(event) => setPaymentMemberQuery(event.target.value)}
                                placeholder="Buscar nombre, cédula, correo o código"
                                autoComplete="off"
                                className="min-h-12 w-full border border-white/12 bg-black/40 pl-10 pr-3 text-sm font-semibold outline-none focus:border-lime-300"
                              />
                            </div>
                            {paymentMemberQuery.trim() && (
                              <div className="xg-mobile-scroll absolute inset-x-0 top-full z-20 max-h-64 overflow-y-auto border border-white/15 bg-[#111] shadow-2xl">
                                {paymentMemberMatches.map((member) => (
                                  <button
                                    key={member.normalizedName}
                                    type="button"
                                    onClick={() => {
                                      setSelectedPaymentMember(member);
                                      setPaymentMemberQuery(member.memberName);
                                      setError("");
                                    }}
                                    className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-2 text-left transition last:border-b-0 hover:bg-lime-300/10"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-black uppercase">
                                        {member.memberName}
                                      </span>
                                      <span className="block truncate text-xs font-semibold text-white/40">
                                        {member.cedula ? `Céd. ${member.cedula} · ` : ""}
                                        {member.email || member.phone || member.accessCode}
                                      </span>
                                    </span>
                                    <GameChip tone={member.membershipStatus === "expired" ? "orange" : "lime"}>
                                      {member.membershipStatus === "expired" ? "Vencido" : member.plan || "Socio"}
                                    </GameChip>
                                  </button>
                                ))}
                                {!paymentMemberMatches.length && (
                                  <p className="px-3 py-5 text-center text-sm font-semibold text-white/40">
                                    No encontramos un socio registrado.
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <input
                        value={paymentForm.amountCrc}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, amountCrc: e.target.value }))}
                        placeholder="Monto CRC"
                        type="number"
                        className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                      />
                      <select
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                        className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="sinpe">SINPE</option>
                        <option value="transfer">Transferencia</option>
                        <option value="paypal">En línea</option>
                        <option value="other">Otro</option>
                      </select>
                      <input
                        value={paymentForm.optionLabel}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, optionLabel: e.target.value }))}
                        placeholder="Concepto"
                        className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                      />
                      <select
                        value={paymentForm.category}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, category: e.target.value }))}
                        className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                      >
                        <option value="Plan">Plan</option>
                        <option value="Clase">Clase</option>
                        <option value="Otro">Otro</option>
                      </select>
                      <input
                        value={paymentForm.note}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Nota"
                        className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300 sm:col-span-2"
                      />
                      <label className="flex items-center gap-2 text-xs font-bold text-white/60 sm:col-span-2">
                        <input
                          type="checkbox"
                          checked={paymentForm.extendMembership}
                          onChange={(e) => setPaymentForm((f) => ({ ...f, extendMembership: e.target.checked }))}
                        />
                        Extender membresia
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={paymentForm.extendDays}
                          onChange={(e) => setPaymentForm((f) => ({ ...f, extendDays: e.target.value }))}
                          className="w-16 border border-white/12 bg-black/40 px-2 py-1 text-sm"
                        />
                        dias
                      </label>
                      <button
                        type="button"
                        onClick={() => void savePayment()}
                        disabled={busy === "payment" || !selectedPaymentMember}
                        className="inline-flex items-center justify-center gap-2 bg-amber-300 px-4 py-2.5 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50 sm:col-span-2"
                      >
                        {busy === "payment" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                        Guardar pago
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-white/10 bg-white/[0.04]">
                  <div className="border-b border-white/10 px-5 py-4">
                    <h2 className="text-lg font-black uppercase">Ultimos pagos</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-3 py-3">Cliente</th>
                          <th className="px-3 py-3">Concepto</th>
                          <th className="px-3 py-3">Metodo</th>
                          <th className="px-3 py-3">Monto</th>
                          <th className="px-3 py-3">Origen</th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.revenue.recent.map((p) => (
                          <tr key={p.id} className="border-b border-white/[0.06]">
                            <td className="px-5 py-3 text-white/60">{p.date}</td>
                            <td className="px-3 py-3 font-black uppercase">{p.customerName}</td>
                            <td className="px-3 py-3">
                              <div>{p.optionLabel}</div>
                              <div className="text-[11px] text-white/40">{p.category}</div>
                            </td>
                            <td className="px-3 py-3 uppercase text-white/60">{p.method}</td>
                            <td className="px-3 py-3 font-black text-amber-200">{money(p.amountCrc)}</td>
                            <td className="px-3 py-3 text-xs text-white/40">{p.recordedBy}</td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => void deletePayment(p.id)}
                                className="grid h-8 w-8 place-items-center border border-white/10 text-white/40 hover:border-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!data.revenue.recent.length && (
                          <tr>
                            <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                              Sin pagos. Usa seed demo o registra uno manual.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === "gamificacion" && (
              <div className="space-y-6">
                {!gami ? (
                  <div className="grid min-h-[240px] place-items-center border border-white/10 bg-white/[0.03]">
                    <Loader2 className="h-8 w-8 animate-spin text-lime-300" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Kpi
                        icon={Users}
                        label="Activos 7d"
                        value={`${gami.analytics.weeklyActiveMembers}`}
                        accent="from-lime-300 to-emerald-400"
                      />
                      <Kpi
                        icon={Flame}
                        label="Racha prom."
                        value={`${gami.analytics.avgStreak}`}
                        accent="from-orange-400 to-red-500"
                      />
                      <Kpi
                        icon={Trophy}
                        label="Badges dados"
                        value={`${gami.analytics.totalBadgesEarned}`}
                        accent="from-amber-300 to-yellow-400"
                      />
                      <Kpi
                        icon={Medal}
                        label="Catalogo"
                        value={`${gami.badges.filter((b) => b.active).length}`}
                        accent="from-fuchsia-400 to-rose-400"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="border border-white/10 bg-white/[0.04] p-5">
                        <h2 className="text-sm font-black uppercase text-white/70">
                          Distribucion de rachas
                        </h2>
                        <div className="mt-4 space-y-2">
                          {Object.entries(gami.analytics.streakDistribution).map(([bucket, count]) => (
                            <div
                              key={bucket}
                              className="flex items-center justify-between border border-white/10 bg-black/25 px-3 py-2 text-sm"
                            >
                              <span className="font-bold text-white/60">{bucket} dias</span>
                              <span className="font-black text-lime-200">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border border-white/10 bg-white/[0.04] p-5">
                        <h2 className="text-sm font-black uppercase text-white/70">
                          Badges mas ganados
                        </h2>
                        <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                          {gami.analytics.badgeEarnCounts.slice(0, 10).map((b) => (
                            <div
                              key={b.badgeId}
                              className="flex items-center justify-between border border-white/10 bg-black/25 px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="font-black uppercase">{b.name}</p>
                                <p className="text-[11px] text-white/40">{b.tier}</p>
                              </div>
                              <span className="font-black text-amber-200">{b.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black uppercase">Catalogo de badges</h2>
                        <button
                          type="button"
                          onClick={() => code && void loadGami(code)}
                          className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-black uppercase text-white/70"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Refrescar
                        </button>
                      </div>
                      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                        {gami.badges.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/25 px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="font-black uppercase text-white">
                                {b.name}{" "}
                                <span className="text-[10px] font-bold text-white/40">
                                  {b.tier} · {b.source}
                                  {b.secret ? " · secreto" : ""}
                                </span>
                              </p>
                              <p className="text-xs text-white/45">{b.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={busy === "gami"}
                                onClick={() =>
                                  void gamiAction(
                                    { action: "toggleBadge", id: b.id, active: !b.active },
                                    b.active ? `Desactivado: ${b.name}` : `Activado: ${b.name}`,
                                  )
                                }
                                className={`border px-3 py-1.5 text-[11px] font-black uppercase ${
                                  b.active
                                    ? "border-lime-300/40 text-lime-200"
                                    : "border-white/20 text-white/40"
                                }`}
                              >
                                {b.active ? "Activo" : "Off"}
                              </button>
                              {b.source === "manual" && (
                                <button
                                  type="button"
                                  disabled={busy === "gami"}
                                  onClick={() =>
                                    void gamiAction(
                                      { action: "deleteBadge", id: b.id },
                                      `Eliminado: ${b.name}`,
                                    )
                                  }
                                  className="border border-red-400/30 px-3 py-1.5 text-[11px] font-black uppercase text-red-300"
                                >
                                  Borrar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <h3 className="text-sm font-black uppercase text-white/70">
                          Crear badge manual
                        </h3>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <input
                            value={manualBadge.name}
                            onChange={(e) => setManualBadge((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Nombre"
                            className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                          />
                          <select
                            value={manualBadge.tier}
                            onChange={(e) => setManualBadge((f) => ({ ...f, tier: e.target.value }))}
                            className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                          >
                            <option value="bronze">Bronze</option>
                            <option value="silver">Silver</option>
                            <option value="gold">Gold</option>
                            <option value="platinum">Platinum</option>
                          </select>
                          <input
                            value={manualBadge.description}
                            onChange={(e) =>
                              setManualBadge((f) => ({ ...f, description: e.target.value }))
                            }
                            placeholder="Descripcion"
                            className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300 sm:col-span-2"
                          />
                          <button
                            type="button"
                            disabled={busy === "gami" || !manualBadge.name.trim()}
                            onClick={() => {
                              void gamiAction(
                                {
                                  action: "upsertBadge",
                                  name: manualBadge.name,
                                  description: manualBadge.description,
                                  tier: manualBadge.tier,
                                  icon: manualBadge.icon,
                                  active: true,
                                },
                                `Badge creado: ${manualBadge.name}`,
                              ).then(() =>
                                setManualBadge({ name: "", description: "", tier: "gold", icon: "Medal" }),
                              );
                            }}
                            className="inline-flex items-center justify-center gap-2 bg-lime-300 px-4 py-2 text-sm font-black uppercase text-black disabled:opacity-45 sm:col-span-2"
                          >
                            <Plus className="h-4 w-4" /> Crear badge manual
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-white/10 bg-white/[0.04] p-5">
                      <h2 className="text-lg font-black uppercase">Socio — badges y ajustes</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                          value={gamiMemberQ}
                          onChange={(e) => setGamiMemberQ(e.target.value)}
                          placeholder="Buscar socio..."
                          className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300 sm:col-span-2"
                        />
                        <select
                          value={selectedGamiMember}
                          onChange={(e) => {
                            const name = e.target.value;
                            setSelectedGamiMember(name);
                            const m = gami.members.find((x) => x.memberName === name);
                            if (m) {
                              setAdjustForm({
                                xpBonus: String(m.xpBonus ?? 0),
                                freezesBonus: String(m.freezesBonus ?? 0),
                                weeklyGoal: String(m.weeklyGoal ?? 4),
                              });
                            }
                          }}
                          className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300 sm:col-span-2"
                        >
                          <option value="">Seleccionar socio</option>
                          {gami.members
                            .filter((m) =>
                              !gamiMemberQ.trim()
                                ? true
                                : m.memberName.toUpperCase().includes(gamiMemberQ.trim().toUpperCase()),
                            )
                            .slice(0, 80)
                            .map((m) => (
                              <option key={m.normalizedName} value={m.memberName}>
                                {m.memberName} · {m.levelName} · racha {m.streak} · {m.xp} XP
                              </option>
                            ))}
                        </select>
                      </div>

                      {selectedGamiMember && (
                        <>
                          {(() => {
                            const m = gami.members.find((x) => x.memberName === selectedGamiMember);
                            if (!m) return null;
                            return (
                              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                <div className="border border-white/10 bg-black/25 p-3">
                                  <p className="text-[10px] font-black uppercase text-white/40">Racha</p>
                                  <p className="text-xl font-black text-orange-200">{m.streak}</p>
                                </div>
                                <div className="border border-white/10 bg-black/25 p-3">
                                  <p className="text-[10px] font-black uppercase text-white/40">Freezes</p>
                                  <p className="text-xl font-black text-cyan-200">{m.freezesBanked}</p>
                                </div>
                                <div className="border border-white/10 bg-black/25 p-3">
                                  <p className="text-[10px] font-black uppercase text-white/40">XP</p>
                                  <p className="text-xl font-black text-lime-200">{m.xp}</p>
                                </div>
                                <div className="border border-white/10 bg-black/25 p-3">
                                  <p className="text-[10px] font-black uppercase text-white/40">Badges</p>
                                  <p className="text-xl font-black text-amber-200">{m.earnedBadgeCount}</p>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-white/45">XP bonus</span>
                              <input
                                type="number"
                                value={adjustForm.xpBonus}
                                onChange={(e) => setAdjustForm((f) => ({ ...f, xpBonus: e.target.value }))}
                                className="mt-1 w-full border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-white/45">
                                Freezes bonus
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={adjustForm.freezesBonus}
                                onChange={(e) =>
                                  setAdjustForm((f) => ({ ...f, freezesBonus: e.target.value }))
                                }
                                className="mt-1 w-full border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[11px] font-black uppercase text-white/45">
                                Meta semanal
                              </span>
                              <input
                                type="number"
                                min={2}
                                max={7}
                                value={adjustForm.weeklyGoal}
                                onChange={(e) =>
                                  setAdjustForm((f) => ({ ...f, weeklyGoal: e.target.value }))
                                }
                                className="mt-1 w-full border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            disabled={busy === "gami"}
                            onClick={() =>
                              void gamiAction(
                                {
                                  action: "adjustMember",
                                  memberName: selectedGamiMember,
                                  xpBonus: Number(adjustForm.xpBonus) || 0,
                                  freezesBonus: Number(adjustForm.freezesBonus) || 0,
                                  weeklyGoal: Number(adjustForm.weeklyGoal) || 4,
                                },
                                `Ajustes guardados: ${selectedGamiMember}`,
                              )
                            }
                            className="mt-3 bg-lime-300 px-4 py-2.5 text-sm font-black uppercase text-black disabled:opacity-45"
                          >
                            Guardar ajustes
                          </button>

                          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                            <select
                              value={grantBadgeId}
                              onChange={(e) => setGrantBadgeId(e.target.value)}
                              className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300"
                            >
                              <option value="">Badge a otorgar / revocar</option>
                              {gami.badges
                                .filter((b) => b.active)
                                .map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name} ({b.id})
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={busy === "gami" || !grantBadgeId}
                              onClick={() =>
                                void gamiAction(
                                  {
                                    action: "grantBadge",
                                    memberName: selectedGamiMember,
                                    badgeId: grantBadgeId,
                                  },
                                  `Badge otorgado a ${selectedGamiMember}`,
                                )
                              }
                              className="border border-lime-300/40 px-4 py-2 text-xs font-black uppercase text-lime-200 disabled:opacity-45"
                            >
                              Otorgar
                            </button>
                            <button
                              type="button"
                              disabled={busy === "gami" || !grantBadgeId}
                              onClick={() =>
                                void gamiAction(
                                  {
                                    action: "revokeBadge",
                                    memberName: selectedGamiMember,
                                    badgeId: grantBadgeId,
                                  },
                                  `Badge revocado de ${selectedGamiMember}`,
                                )
                              }
                              className="border border-red-400/30 px-4 py-2 text-xs font-black uppercase text-red-300 disabled:opacity-45"
                            >
                              Revocar
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="border border-white/10 bg-white/[0.04] p-5">
                      <h2 className="text-lg font-black uppercase">Audit log</h2>
                      <p className="mt-1 text-xs font-semibold text-white/45">
                        Ultimas mutaciones de admin (perfil, pagos, badges, ajustes).
                      </p>
                      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                        {gami.audit.map((a) => (
                          <div
                            key={a.id}
                            className="border border-white/10 bg-black/25 px-3 py-2.5 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-black uppercase text-lime-200">{a.action}</span>
                              <span className="text-[11px] text-white/40">
                                {a.at ? new Date(a.at).toLocaleString("es-CR") : ""} · {a.actorRole}
                              </span>
                            </div>
                            <p className="mt-1 text-white/70">{a.summary}</p>
                            <p className="text-[11px] text-white/35">
                              {a.targetType}: {a.targetId}
                            </p>
                          </div>
                        ))}
                        {!gami.audit.length && (
                          <p className="text-sm font-semibold text-white/40">
                            Sin eventos aun. Las mutaciones de admin se registran aqui.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
      </section>

      {quickPlanMember && data?.role === "super" && (
        <QuickPlanModal
          member={quickPlanMember}
          option={quickPlanOption}
          saving={grantingQuickPlan}
          onOptionChange={setQuickPlanOption}
          onClose={() => setQuickPlanMember(null)}
          onConfirm={() => void grantQuickPlan()}
        />
      )}

      {planMember && planDraft && (
        <PlanModal
          member={planMember}
          draft={planDraft}
          saving={savingPlan}
          onClose={() => {
            setPlanMember(null);
            setPlanDraft(null);
          }}
          onChange={setPlanDraft}
          onSave={() => void savePlan()}
          onToggleItem={(item) => void toggleItem(planMember.memberName, item)}
        />
      )}

      {editMember && memberDraft && (
        <MemberModal
          member={editMember}
          draft={memberDraft}
          saving={savingMember}
          onClose={() => {
            setEditMember(null);
            setMemberDraft(null);
          }}
          onChange={setMemberDraft}
          onSave={() => void saveMember()}
        />
      )}

      {detailMember && (
        <UserDetailModal
          member={detailMember}
          savingMetric={savingMetric}
          newMetric={newMetric}
          onClose={closeDetail}
          onChangeMetric={setNewMetric}
          onAddMetric={() => void addBodyMetric()}
          onOpenPlan={() => {
            closeDetail();
            // small delay so state updates
            setTimeout(() => openPlan(detailMember), 50);
          }}
          onOpenEdit={() => {
            closeDetail();
            setTimeout(() => openEdit(detailMember), 50);
          }}
          onRefresh={() => code && void load(code)}
        />
      )}
    </main>
  );
}

function QuickPlanModal({
  member,
  option,
  saving,
  onOptionChange,
  onClose,
  onConfirm,
}: {
  member: AdminMember;
  option: QuickPlanOptionId;
  saving: boolean;
  onOptionChange: (option: QuickPlanOptionId) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const selected = QUICK_PLAN_OPTIONS.find((item) => item.id === option) ?? QUICK_PLAN_OPTIONS[2];
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/85 px-3 py-6 backdrop-blur-sm">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <section className="relative w-full max-w-lg border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-4 text-white shadow-[7px_7px_0_rgba(216,255,62,.2)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <GameLabel tone="lime">Solo super admin</GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase">Dar acceso rapido</h2>
            <p className="mt-1 text-sm font-bold text-white/50">{member.memberName}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center border-[2px] border-white/15 text-white/55 hover:border-white/40 hover:text-white" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {QUICK_PLAN_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOptionChange(item.id)}
              className={`min-h-24 border-[3px] p-3 text-left transition ${option === item.id ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/15 bg-black/30 text-white hover:border-[#d8ff3e]/45"}`}
            >
              <span className="block text-lg font-black uppercase">{item.label}</span>
              <span className={`mt-1 block text-xs font-bold ${option === item.id ? "text-black/55" : "text-white/40"}`}>{item.detail}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <GameCallout tone="lime">
            Si la membresia sigue activa, los {selected.days} dias se suman al vencimiento actual. Si esta vencida, empiezan hoy.
          </GameCallout>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-12 flex-1 border-[3px] border-white/15 px-4 text-xs font-black uppercase text-white/60 disabled:opacity-40">
            Cancelar
          </button>
          <GameButton onClick={onConfirm} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Activar {selected.label}
          </GameButton>
        </div>
      </section>
    </div>
  );
}

function PlanModal({
  member,
  draft,
  saving,
  onClose,
  onChange,
  onSave,
  onToggleItem,
}: {
  member: AdminMember;
  draft: PlanDraft;
  saving: boolean;
  onClose: () => void;
  onChange: (draft: PlanDraft) => void;
  onSave: () => void;
  onToggleItem: (item: PlanItem) => void;
}) {
  const doneItems = draft.items.filter((i) => i.done).length;
  const progressPct = draft.items.length ? Math.round((doneItems / draft.items.length) * 100) : 0;
  const inputClass =
    "min-h-11 w-full border-[3px] border-white/20 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]";

  function setItem(id: string, patch: Partial<PlanItem>) {
    onChange({ ...draft, items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }

  return (
    <div className="xg-game-modal fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/80 sm:place-items-center sm:px-4 sm:py-8">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="xg-game-modal-panel relative w-full max-w-3xl border-[3px] border-[#d8ff3e] bg-[#0c0c0c] text-white shadow-[6px_6px_0_rgba(216,255,62,0.2)]">
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-black/25 bg-[#d8ff3e] px-4 py-3 text-black sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black uppercase leading-tight sm:text-lg">Plan personalizado</h2>
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-black/65">{member.memberName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center border-2 border-black/30 bg-black/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-3 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          <div className="border-[3px] border-white/15 bg-black/40 p-3 sm:p-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/55 sm:text-xs">
              <span>Avance</span>
              <span className="border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-2 py-0.5 text-[#eaff93]">
                {doneItems}/{draft.items.length} · {progressPct}%
              </span>
            </div>
            <div className="mt-3 h-3 w-full border-[3px] border-white/15 bg-black/45">
              <div className="h-full bg-[#d8ff3e]" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Titulo</span>
              <input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Objetivo</span>
              <input value={draft.objective} onChange={(e) => onChange({ ...draft, objective: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Inicio</span>
              <input type="date" value={draft.startDate} onChange={(e) => onChange({ ...draft, startDate: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Fin</span>
              <input type="date" value={draft.endDate} onChange={(e) => onChange({ ...draft, endDate: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Sesiones / sem</span>
              <input type="number" min={0} max={14} value={draft.weeklySessions} onChange={(e) => onChange({ ...draft, weeklySessions: Number(e.target.value) })} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Nota coach</span>
              <textarea value={draft.coachNote} onChange={(e) => onChange({ ...draft, coachNote: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
            </label>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-white/70">Sesiones</h3>
              <button type="button" onClick={() => onChange({ ...draft, items: [...draft.items, makeItem()] })} className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-1.5 text-xs font-black uppercase">
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            {draft.items.map((item, index) => (
              <div key={item.id} className={`border p-3 ${item.done ? "border-lime-300/40 bg-lime-300/[0.06]" : "border-white/10 bg-black/25"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onToggleItem(item)} className={`grid h-7 w-7 place-items-center border ${item.done ? "border-lime-300 bg-lime-300 text-black" : "border-white/20 text-white/40"}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-black uppercase text-white/45">Sesion {index + 1}</span>
                  </div>
                  <button type="button" onClick={() => onChange({ ...draft, items: draft.items.filter((i) => i.id !== item.id) })} className="grid h-7 w-7 place-items-center border border-white/10 text-white/40">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_120px]">
                  <input value={item.day} onChange={(e) => setItem(item.id, { day: e.target.value })} placeholder="Dia" className={inputClass} />
                  <input value={item.focus} onChange={(e) => setItem(item.id, { focus: e.target.value })} placeholder="Enfoque" className={inputClass} />
                  <input type="number" value={item.targetMinutes} onChange={(e) => setItem(item.id, { targetMinutes: Number(e.target.value) })} className={inputClass} />
                </div>
                <textarea value={item.exercises} onChange={(e) => setItem(item.id, { exercises: e.target.value })} rows={2} placeholder="Ejercicios..." className={`${inputClass} mt-2 resize-none`} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t-[3px] border-white/15 bg-black/40 px-3 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <GameButton variant="ghost" full className="sm:w-auto" onClick={onClose}>
            Cancelar
          </GameButton>
          <GameButton full className="sm:w-auto" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            Guardar plan
          </GameButton>
        </div>
      </div>
    </div>
  );
}

function MemberModal({
  member,
  draft,
  saving,
  onClose,
  onChange,
  onSave,
}: {
  member: AdminMember;
  draft: MemberDraft;
  saving: boolean;
  onClose: () => void;
  onChange: (draft: MemberDraft) => void;
  onSave: () => void;
}) {
  const inputClass =
    "min-h-11 w-full border-[3px] border-white/20 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]";

  return (
    <div className="xg-game-modal fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-black/80 sm:place-items-center sm:px-4 sm:py-8">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="xg-game-modal-panel relative w-full max-w-xl border-[3px] border-[#d8ff3e] bg-[#0c0c0c] text-white shadow-[6px_6px_0_rgba(216,255,62,0.2)]">
        <div className="flex items-center justify-between border-b-[3px] border-black/25 bg-[#d8ff3e] px-4 py-3 text-black sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-black/30 bg-black/15">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-black uppercase sm:text-lg">Perfil personalizado</h2>
              <p className="truncate text-[11px] font-bold uppercase text-black/65">{member.accessCode}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center border-2 border-black/30 bg-black/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto px-3 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Nombre</span>
            <input value={draft.displayName} onChange={(e) => onChange({ ...draft, displayName: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Telefono</span>
            <input value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Email</span>
            <input value={draft.email} onChange={(e) => onChange({ ...draft, email: e.target.value })} className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">
              Cedula (lector / app)
            </span>
            <input
              value={draft.cedula}
              onChange={(e) => onChange({ ...draft, cedula: e.target.value.replace(/[^\d-]/g, "").slice(0, 20) })}
              inputMode="numeric"
              placeholder="1-2345-6789"
              className={`${inputClass} text-center font-black tracking-widest`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Objetivo</span>
            <input value={draft.goal} onChange={(e) => onChange({ ...draft, goal: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Coach</span>
            <input value={draft.coach} onChange={(e) => onChange({ ...draft, coach: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Favorito</span>
            <input value={draft.favoriteTraining} onChange={(e) => onChange({ ...draft, favoriteTraining: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Plan membresia</span>
            <input value={draft.plan} onChange={(e) => onChange({ ...draft, plan: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Inicio</span>
            <input type="date" value={draft.startedAt} onChange={(e) => onChange({ ...draft, startedAt: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Proximo cobro</span>
            <input type="date" value={draft.nextBillingDate} onChange={(e) => onChange({ ...draft, nextBillingDate: e.target.value })} className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-black uppercase text-white/45">Notas internas</span>
            <textarea value={draft.notes} onChange={(e) => onChange({ ...draft, notes: e.target.value })} rows={3} placeholder="Lesiones, preferencias, horario..." className={`${inputClass} resize-none`} />
          </label>
          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div className="border-[3px] border-white/15 bg-black/30 p-3 text-center">
              <Timer className="mx-auto h-4 w-4 text-white/40" />
              <p className="mt-1 text-lg font-black">{member.totalMinutes}</p>
              <p className="text-[10px] font-black uppercase text-white/40">Minutos</p>
            </div>
            <div className="border-[3px] border-orange-300/40 bg-black/30 p-3 text-center">
              <Flame className="mx-auto h-4 w-4 text-orange-300" />
              <p className="mt-1 text-lg font-black">{member.streak}</p>
              <p className="text-[10px] font-black uppercase text-white/40">Racha</p>
            </div>
            <div className="border-[3px] border-[#d8ff3e]/40 bg-black/30 p-3 text-center">
              <Activity className="mx-auto h-4 w-4 text-[#d8ff3e]" />
              <p className="mt-1 text-lg font-black">{member.latestWeight ? `${member.latestWeight}` : "—"}</p>
              <p className="text-[10px] font-black uppercase text-white/40">Peso kg</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t-[3px] border-white/15 bg-black/40 px-3 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <GameButton variant="ghost" full className="sm:w-auto" onClick={onClose}>
            Cancelar
          </GameButton>
          <GameButton full className="sm:w-auto" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Guardar perfil
          </GameButton>
        </div>
      </div>
    </div>
  );
}

function UserDetailModal({
  member,
  savingMetric,
  newMetric,
  onClose,
  onChangeMetric,
  onAddMetric,
  onOpenPlan,
  onOpenEdit,
  onRefresh,
}: {
  member: AdminMember;
  savingMetric: boolean;
  newMetric: { date: string; weightKg: string; waistCm: string; note: string };
  onClose: () => void;
  onChangeMetric: (m: { date: string; weightKg: string; waistCm: string; note: string }) => void;
  onAddMetric: () => void;
  onOpenPlan: () => void;
  onOpenEdit: () => void;
  onRefresh: () => void;
}) {
  const metrics = member.bodyMetrics ?? [];
  const workouts = member.recentWorkouts ?? [];
  const hasPlan = !!member.trainingPlan;

  const inputClass =
    "min-h-11 w-full border-[3px] border-white/20 bg-black/40 px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#d8ff3e]";

  return (
    <div className="xg-game-modal fixed inset-0 z-[60] grid place-items-end overflow-y-auto bg-black/85 sm:place-items-center sm:px-4 sm:py-6">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="xg-game-modal-panel relative w-full max-w-5xl border-[3px] border-[#d8ff3e] bg-[#0c0c0c] text-white shadow-[6px_6px_0_rgba(216,255,62,0.2)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black/25 bg-[#d8ff3e] px-3 py-3 text-black sm:px-6 sm:py-4">
          <div className="flex items-center gap-4">
            {member.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.photoUrl}
                alt={member.memberName}
                className="h-12 w-12 border-2 border-black/30 object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center border-2 border-black/30 bg-black/15 text-black">
                <UserRound className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-black uppercase tracking-tight sm:text-2xl">
                  {member.memberName}
                </h2>
                <span className="inline-block border-2 border-black/30 bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase">
                  {STATUS_LABEL[member.membershipStatus]}
                </span>
                {member.seeded && (
                  <span className="border-2 border-black/25 px-1.5 py-0.5 text-[9px] font-black uppercase text-black/55">
                    demo
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs font-mono font-bold tracking-[2px] text-black/65">
                {member.accessCode}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenPlan}
              className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-black/15 px-3 py-2 text-xs font-black uppercase sm:text-sm"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">{hasPlan ? "Editar plan" : "Generar plan"}</span>
              <span className="sm:hidden">Plan</span>
            </button>
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-black/15 px-3 py-2 text-xs font-black uppercase sm:text-sm"
            >
              <Pencil className="h-4 w-4" /> Perfil
            </button>
            <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center border-2 border-black/30 bg-black/10">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid max-h-[75vh] gap-3 overflow-y-auto p-3 sm:gap-6 sm:p-6 lg:grid-cols-5">
          {/* LEFT: Key info + contact + stats */}
          <div className="space-y-3 sm:space-y-5 lg:col-span-2">
            <div className="border-[3px] border-white/15 bg-black/30 p-3 sm:p-5">
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Informacion del socio</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Telefono</span><span className="font-semibold">{member.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Email</span><span className="font-semibold truncate max-w-[200px]">{member.email || "—"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Coach asignado</span><span className="font-semibold">{member.coach || "—"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Objetivo</span><span className="font-semibold">{member.goal || "—"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Entrenamiento favorito</span><span className="font-semibold">{member.favoriteTraining || "—"}</span></div>
              </div>
              {member.notes && (
                <div className="mt-4 border-t border-white/10 pt-3 text-xs">
                  <div className="font-black uppercase text-white/45 mb-1">Notas</div>
                  <p className="text-white/80 leading-snug">{member.notes}</p>
                </div>
              )}
            </div>

            {/* Membership */}
            <div className="border border-white/10 bg-white/[0.02] p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45 mb-3">Membresia</div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-white/50">Plan</div><div className="font-bold">{member.plan}</div>
                <div className="text-white/50">Estado</div><div><span className={`inline-block px-2 py-px text-xs font-black border ${STATUS_STYLES[member.membershipStatus]}`}>{STATUS_LABEL[member.membershipStatus]}</span></div>
                <div className="text-white/50">Dias restantes</div><div className="font-bold">{member.daysRemaining} dias</div>
                <div className="text-white/50">Proximo cobro</div><div className="font-bold">{member.nextBillingDate}</div>
                <div className="text-white/50">Inicio</div><div className="font-bold">{member.startedAt || "—"}</div>
              </div>
            </div>

            {/* Big stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-white/10 bg-white/[0.02] p-4 text-center">
                <Flame className="mx-auto mb-1 h-5 w-5 text-orange-300" />
                <div className="text-3xl font-black">{member.streak}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Racha actual</div>
              </div>
              <div className="border border-white/10 bg-white/[0.02] p-4 text-center">
                <Activity className="mx-auto mb-1 h-5 w-5 text-lime-300" />
                <div className="text-3xl font-black">{member.totalWorkouts}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Entrenamientos</div>
              </div>
              <div className="border border-white/10 bg-white/[0.02] p-4 text-center">
                <Timer className="mx-auto mb-1 h-5 w-5 text-sky-300" />
                <div className="text-3xl font-black">{member.totalMinutes}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/40">Minutos totales</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Progress + Plan + History */}
          <div className="lg:col-span-3 space-y-6">
            {/* Training Plan summary + action */}
            <div className="border border-lime-300/30 bg-lime-300/[0.03] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-lime-300" />
                  <div className="text-sm font-black uppercase tracking-wide text-lime-200">Plan de trabajo</div>
                </div>
                <button
                  onClick={onOpenPlan}
                  className="text-xs font-black uppercase border border-lime-300/60 px-3 py-1.5 hover:bg-lime-300 hover:text-black transition"
                >
                  {hasPlan ? "EDITAR PLAN" : "CREAR PLAN AHORA"}
                </button>
              </div>

              {hasPlan && member.trainingPlan ? (
                <div>
                  <div className="font-black text-lg">{member.trainingPlan.title}</div>
                  <div className="text-sm text-white/60">{member.trainingPlan.objective}</div>

                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <div>Progreso: <span className="font-black text-lime-300">{member.trainingPlan.doneItems}/{member.trainingPlan.totalItems}</span> ({member.trainingPlan.progressPct}%)</div>
                    <div className="flex-1 h-1.5 bg-white/10"><div className="h-1.5 bg-lime-300" style={{width: `${member.trainingPlan.progressPct}%`}} /></div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm">
                    {member.trainingPlan.items.slice(0, 4).map((it, idx) => (
                      <div key={idx} className={`flex justify-between border px-3 py-1.5 text-xs ${it.done ? "border-lime-300/40 bg-lime-300/5" : "border-white/10"}`}>
                        <span className="font-bold">{it.day || `Sesión ${idx + 1}`} — {it.focus}</span>
                        <span className="text-white/50">{it.targetMinutes}min {it.done ? "✓" : ""}</span>
                      </div>
                    ))}
                    {member.trainingPlan.items.length > 4 && (
                      <div className="text-[10px] text-white/40">+ {member.trainingPlan.items.length - 4} sesiones más...</div>
                    )}
                  </div>

                  {member.trainingPlan.coachNote && (
                    <div className="mt-3 text-xs italic text-white/70 border-l-2 border-lime-300/40 pl-3">“{member.trainingPlan.coachNote}”</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/60 py-2">
                  Este usuario aun no tiene un plan de trabajo personalizado. Haz click en <span className="font-black text-lime-300">&quot;Generar plan de trabajo&quot;</span> para crear uno.
                </div>
              )}
            </div>

            {/* Body metrics tracking — key for personal trainer */}
            <div className="border border-white/10 bg-white/[0.015] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide">Seguimiento corporal</div>
                  <div className="text-[11px] text-white/45">Registra peso y cintura para ver el progreso real</div>
                </div>
                <button onClick={onRefresh} className="text-xs border px-2 py-1 border-white/15 hover:border-lime-300/70">Actualizar</button>
              </div>

              {/* Add new measurement form */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                <input type="date" value={newMetric.date} onChange={(e) => onChangeMetric({ ...newMetric, date: e.target.value })} className={inputClass} />
                <input type="number" step="0.1" placeholder="Peso kg" value={newMetric.weightKg} onChange={(e) => onChangeMetric({ ...newMetric, weightKg: e.target.value })} className={inputClass} />
                <input type="number" placeholder="Cintura cm" value={newMetric.waistCm} onChange={(e) => onChangeMetric({ ...newMetric, waistCm: e.target.value })} className={inputClass} />
                <input placeholder="Nota (opcional)" value={newMetric.note} onChange={(e) => onChangeMetric({ ...newMetric, note: e.target.value })} className={`${inputClass} sm:col-span-1`} />
                <button
                  type="button"
                  onClick={onAddMetric}
                  disabled={savingMetric}
                  className="sm:col-span-1 inline-flex items-center justify-center gap-2 border border-lime-300/70 bg-lime-300/10 px-3 text-sm font-black uppercase text-lime-200 hover:bg-lime-300 hover:text-black disabled:opacity-50"
                >
                  {savingMetric ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Guardar
                </button>
              </div>

              {metrics.length >= 2 && (
                <div className="mb-4 border border-white/10 bg-black/25 p-3">
                  <div className="text-xs font-black uppercase text-white/40 mb-1">Peso (kg)</div>
                  <LineTrendChart
                    data={metrics.map((m) => ({ date: m.date, value: m.weightKg }))}
                    unit="kg"
                    color={CHART_LIME}
                    height={140}
                  />
                </div>
              )}

              {/* History table */}
              <div>
                <div className="text-xs font-black uppercase text-white/40 mb-2">Historial de medidas ({metrics.length})</div>
                {metrics.length > 0 ? (
                  <div className="overflow-x-auto text-sm border border-white/10">
                    <table className="w-full min-w-[520px]">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-[10px] uppercase text-white/40">
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Peso (kg)</th>
                          <th className="px-3 py-2">Cintura (cm)</th>
                          <th className="px-3 py-2">Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...metrics].reverse().slice(0, 8).map((m, i) => (
                          <tr key={i} className="border-b border-white/[0.06] last:border-0">
                            <td className="px-3 py-2 font-mono text-xs">{m.date}</td>
                            <td className="px-3 py-2 font-bold">{m.weightKg}</td>
                            <td className="px-3 py-2 font-bold">{m.waistCm}</td>
                            <td className="px-3 py-2 text-xs text-white/60 truncate max-w-[200px]">{m.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-xs text-white/40 py-3 border border-dashed border-white/10 text-center">Sin medidas registradas aun. Agrega la primera arriba.</div>
                )}
                {metrics.length > 8 && <div className="text-[10px] text-white/40 mt-1">Mostrando ultimas 8 de {metrics.length}</div>}
              </div>
            </div>

            {/* Recent workouts */}
            <div className="border border-white/10 bg-white/[0.015] p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-orange-300" />
                <div className="text-sm font-black uppercase tracking-wide">Historial reciente de entrenamientos</div>
              </div>
              {workouts.length > 0 ? (
                <div className="space-y-1.5 text-sm">
                  {workouts.map((w, idx) => (
                    <div key={idx} className="flex justify-between border border-white/10 bg-black/30 px-3 py-2">
                      <div>
                        <span className="font-bold">{w.completedDate}</span> · {w.trainingName}
                      </div>
                      <div className="font-mono text-xs text-white/60">{w.minutes} min {w.intensity ? `· ${w.intensity}` : ""}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-white/40">Aun no hay registros de entrenamientos en el historial.</div>
              )}
              <div className="mt-2 text-[10px] text-white/40">Totales: {member.totalWorkouts} entrenos / {member.totalMinutes} minutos</div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between text-xs text-white/50">
          <div>
            Haz click en el nombre del usuario en la tabla de socios para abrir esta vista detallada.
          </div>
          <button onClick={onClose} className="border border-white/15 px-4 py-1.5 font-black uppercase">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
