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
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";

const ADMIN_CODE_KEY = "xtreme-admin-code";

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
  coach: string;
  notes: string;
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
  revenue?: Revenue;
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
  coach: string;
  notes: string;
  plan: string;
  nextBillingDate: string;
  startedAt: string;
};

type Tab = "resumen" | "socios" | "accesos" | "ingresos";

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
    <div className="border border-white/10 bg-white/[0.04] p-4">
      <div className={`mb-3 grid h-9 w-9 place-items-center bg-gradient-to-br ${accent} text-black`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</div>
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
      className={`border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
        active
          ? "border-lime-300 bg-lime-300 text-black"
          : "border-white/15 text-white/70 hover:border-lime-300/50 hover:text-lime-200"
      }`}
    >
      {children}
    </button>
  );
}

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
  const [detailMember, setDetailMember] = useState<AdminMember | null>(null);
  const [savingMetric, setSavingMetric] = useState(false);
  const [newMetric, setNewMetric] = useState({ date: "", weightKg: "", waistCm: "", note: "" });
  const [paymentForm, setPaymentForm] = useState({
    customerName: "",
    amountCrc: "",
    optionLabel: "Plan mensual",
    category: "Plan",
    method: "cash",
    note: "",
    extendMembership: true,
    extendDays: "30",
  });

  const load = useCallback(async (adminCode: string) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        headers: { "x-xtreme-admin": adminCode },
        cache: "no-store",
      });
      if (response.status === 401) {
        setError("Codigo incorrecto.");
        setCode("");
        window.localStorage.removeItem(ADMIN_CODE_KEY);
        return;
      }
      const json = (await response.json()) as AdminData & { error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar.");
      setData(json);
      setCode(adminCode);
      window.localStorage.setItem(ADMIN_CODE_KEY, adminCode);
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
    const stored = window.localStorage.getItem(ADMIN_CODE_KEY);
    if (stored) void load(stored);
  }, [load]);

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

  async function seed(wipeAll: boolean) {
    if (!code) return;
    setBusy(wipeAll ? "reset" : "seed");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
      setError("Ingresa peso y medida de cintura validos.");
      return;
    }
    setSavingMetric(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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
    setBusy("payment");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
        body: JSON.stringify({
          action: "payment",
          customerName: paymentForm.customerName,
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
      setPaymentForm((f) => ({ ...f, customerName: "", amountCrc: "", note: "" }));
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
        headers: { "Content-Type": "application/json", "x-xtreme-admin": code },
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

  function logout() {
    setCode("");
    setData(null);
    window.localStorage.removeItem(ADMIN_CODE_KEY);
  }

  if (!code) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090909] px-5 text-white">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (codeInput.trim()) void load(codeInput.trim());
          }}
          className="w-full max-w-md border border-white/12 bg-[#101010] p-7 text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center bg-lime-300 text-black">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase">Panel Xtreme</h1>
          <p className="mt-2 text-sm font-semibold text-white/55">
            Acceso para entrenadora personal y administracion del gym.
          </p>
          <input
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Codigo de acceso"
            className="mt-5 w-full border border-white/12 bg-black/40 px-4 py-3 text-center font-bold text-white outline-none transition placeholder:text-white/35 focus:border-lime-300"
          />
          {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-lime-300 px-5 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </button>
          <div className="mt-5 space-y-1 text-left text-xs font-semibold text-white/35">
            <p>Admin: <span className="text-white/55">xtreme-admin</span></p>
            <p>Super admin (ingresos): <span className="text-white/55">xtreme-super</span></p>
          </div>
        </form>
      </main>
    );
  }

  const t = data?.today;
  const isSuper = data?.role === "super";

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="border-b border-white/10 px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Xtreme Gym</p>
              {isSuper ? (
                <span className="inline-flex items-center gap-1 border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200">
                  <ShieldCheck className="h-3 w-3" /> Super admin
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 border border-white/15 px-2 py-0.5 text-[10px] font-black uppercase text-white/50">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">Panel de administracion</h1>
            <p className="mt-2 text-sm font-semibold text-white/55">
              Panel de la entrenadora personal · gestiona usuarios, genera planes de trabajo y sigue el progreso. {isSuper ? " (Super admin: ingresos completos)" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/ingreso"
              className="inline-flex items-center gap-2 border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-black uppercase text-cyan-100 transition hover:bg-cyan-300/20"
            >
              <DoorOpen className="h-4 w-4" /> Pantalla ingreso
            </Link>
            <button
              type="button"
              onClick={() => void load(code)}
              disabled={isLoading || Boolean(busy)}
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-sm font-black uppercase text-white/80 transition hover:border-lime-300 hover:text-lime-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refrescar
            </button>
            <button
              type="button"
              onClick={() => void seed(false)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 bg-lime-300 px-4 py-2.5 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
            >
              {busy === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Seed demo
            </button>
            <button
              type="button"
              onClick={() => void seed(true)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-black uppercase text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Reset
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-2.5 text-sm font-black uppercase text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "resumen"} onClick={() => setTab("resumen")}>
            Resumen
          </TabButton>
          <TabButton active={tab === "socios"} onClick={() => setTab("socios")}>
            Socios
          </TabButton>
          <TabButton active={tab === "accesos"} onClick={() => setTab("accesos")}>
            Accesos hoy
          </TabButton>
          {isSuper && (
            <TabButton active={tab === "ingresos"} onClick={() => setTab("ingresos")}>
              Ingresos
            </TabButton>
          )}
        </div>

        {(message || error) && (
          <div
            className={`border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-400/40 bg-red-500/10 text-red-200"
                : "border-lime-300/40 bg-lime-300/10 text-lime-200"
            }`}
          >
            {error || message}
          </div>
        )}

        {isLoading && !data ? (
          <div className="grid min-h-[360px] place-items-center border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-8 w-8 animate-spin text-lime-300" />
          </div>
        ) : data ? (
          <>
            {tab === "resumen" && (
              <>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <Kpi icon={Users} label="Socios" value={`${data.totals.memberCount}`} accent="from-lime-300 to-emerald-400" />
                  <Kpi icon={CalendarCheck} label="Activos hoy" value={`${data.totals.activeToday}`} accent="from-cyan-300 to-sky-500" />
                  <Kpi icon={DoorOpen} label="Ingresos hoy" value={`${data.today.checkinsToday}`} accent="from-sky-300 to-blue-400" />
                  <Kpi icon={Flame} label="Racha prom." value={`${data.totals.avgStreak}`} accent="from-orange-400 to-red-500" />
                  <Kpi icon={ClipboardList} label="Con plan" value={`${data.totals.withPlan}`} accent="from-fuchsia-400 to-rose-400" />
                  <Kpi icon={Activity} label="Ocupacion" value={`${t?.occupancyPct ?? 0}%`} accent="from-lime-300 to-cyan-300" />
                </div>

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
                  <Link href="/ingreso" className="text-xs font-black uppercase text-cyan-300 hover:underline">
                    Abrir kiosk →
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
                            Nadie ha ingresado hoy. Usa la pantalla /ingreso o el boton de puerta en socios.
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
                      <input
                        value={paymentForm.customerName}
                        onChange={(e) => setPaymentForm((f) => ({ ...f, customerName: e.target.value }))}
                        placeholder="Nombre del cliente"
                        className="border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold outline-none focus:border-lime-300 sm:col-span-2"
                      />
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
                        <option value="paypal">PayPal</option>
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
                        disabled={busy === "payment"}
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
          </>
        ) : null}
      </section>

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
    "w-full border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-lime-300";

  function setItem(id: string, patch: Partial<PlanItem>) {
    onChange({ ...draft, items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-3xl border border-white/12 bg-[#0d0d0d] text-white">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-lime-300" />
            <div>
              <h2 className="text-lg font-black uppercase leading-tight">Plan personalizado</h2>
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">{member.memberName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/10 text-white/60">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div className="border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-white/55">
              <span>Avance</span>
              <span className="text-lime-300">
                {doneItems}/{draft.items.length} · {progressPct}%
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full border border-white/10 bg-black/45">
              <div className="h-full bg-lime-300" style={{ width: `${progressPct}%` }} />
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
        <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button type="button" onClick={onClose} className="border border-white/15 px-4 py-2.5 text-sm font-black uppercase text-white/70">
            Cancelar
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-lime-300 px-5 py-2.5 text-sm font-black uppercase text-black disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
            Guardar plan
          </button>
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
    "w-full border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-lime-300";

  return (
    <div className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-xl border border-white/12 bg-[#0d0d0d] text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-lime-300" />
            <div>
              <h2 className="text-lg font-black uppercase">Perfil personalizado</h2>
              <p className="text-xs font-bold uppercase text-white/45">{member.accessCode}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto px-6 py-5 sm:grid-cols-2">
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
            <div className="border border-white/10 bg-black/25 p-3 text-center">
              <Timer className="mx-auto h-4 w-4 text-white/40" />
              <p className="mt-1 text-lg font-black">{member.totalMinutes}</p>
              <p className="text-[10px] font-bold uppercase text-white/40">Minutos</p>
            </div>
            <div className="border border-white/10 bg-black/25 p-3 text-center">
              <Flame className="mx-auto h-4 w-4 text-orange-300" />
              <p className="mt-1 text-lg font-black">{member.streak}</p>
              <p className="text-[10px] font-bold uppercase text-white/40">Racha</p>
            </div>
            <div className="border border-white/10 bg-black/25 p-3 text-center">
              <Activity className="mx-auto h-4 w-4 text-lime-300" />
              <p className="mt-1 text-lg font-black">{member.latestWeight ? `${member.latestWeight}` : "—"}</p>
              <p className="text-[10px] font-bold uppercase text-white/40">Peso kg</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
          <button type="button" onClick={onClose} className="border border-white/15 px-4 py-2.5 text-sm font-black uppercase text-white/70">
            Cancelar
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-lime-300 px-5 py-2.5 text-sm font-black uppercase text-black disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Guardar perfil
          </button>
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
    "w-full border border-white/12 bg-black/40 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-lime-300";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-start overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm sm:place-items-center">
      <div className="w-full max-w-5xl border border-white/10 bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center bg-lime-300/10 text-lime-300 border border-lime-300/30">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">{member.memberName}</h2>
                <span className={`inline-block border px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLES[member.membershipStatus]}`}>
                  {STATUS_LABEL[member.membershipStatus]}
                </span>
                {member.seeded && <span className="border border-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/40">demo</span>}
              </div>
              <div className="mt-0.5 text-xs font-mono tracking-[2px] text-cyan-200/90">{member.accessCode}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPlan}
              className="inline-flex items-center gap-2 bg-lime-300 px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white"
            >
              <ClipboardList className="h-4 w-4" />
              {hasPlan ? "Editar plan de trabajo" : "Generar plan de trabajo"}
            </button>
            <button
              type="button"
              onClick={onOpenEdit}
              className="inline-flex items-center gap-2 border border-white/15 px-4 py-2 text-sm font-black uppercase text-white/80 transition hover:border-lime-300 hover:text-lime-200"
            >
              <Pencil className="h-4 w-4" /> Editar perfil
            </button>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/10 text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-5">
          {/* LEFT: Key info + contact + stats */}
          <div className="lg:col-span-2 space-y-5">
            <div className="border border-white/10 bg-white/[0.02] p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white/45 mb-3">Informacion del socio</div>
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
