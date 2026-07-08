"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarCheck,
  Database,
  Flame,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Timer,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

const ADMIN_CODE_KEY = "xtreme-admin-code";

type AdminMember = {
  memberName: string;
  normalizedName: string;
  goal: string;
  favoriteTraining: string;
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  lastWorkoutDate: string | null;
  plan: string;
  membershipStatus: "active" | "warning" | "expired";
  daysRemaining: number;
  nextBillingDate: string;
  latestWeight: number | null;
  seeded: boolean;
};

type AdminData = {
  members: AdminMember[];
  totals: {
    memberCount: number;
    seededCount: number;
    activeToday: number;
    totalWorkouts: number;
    totalMinutes: number;
    avgStreak: number;
  };
  today: {
    date: string;
    capacity: number;
    currentPeople: number;
    occupancyPct: number;
    level: string;
    checkinsToday: number;
    reservationsToday: number;
    classes: { trainingId: string; trainingName: string; capacity: number; reserved: number }[];
  };
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

export default function XtremeAdminPage() {
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
      const json = (await response.json()) as { insertedMembers?: number; pin?: string; error?: string };
      if (!response.ok) throw new Error(json.error ?? "No se pudo generar el seed.");
      setMessage(
        `Listo: ${json.insertedMembers} clientes demo${wipeAll ? " (base limpiada)" : ""}. PIN de todos: ${json.pin}.`,
      );
      await load(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el seed.");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(memberName: string) {
    if (!code) return;
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

  /* ---------------- Gate ---------------- */
  if (!code) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090909] px-5 text-white">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (codeInput.trim()) void load(codeInput.trim());
          }}
          className="w-full max-w-sm border border-white/12 bg-[#101010] p-7 text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center bg-lime-300 text-black">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase">Panel Xtreme</h1>
          <p className="mt-2 text-sm font-semibold text-white/55">
            Ingresa el codigo de administrador.
          </p>
          <input
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Codigo admin"
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
          <p className="mt-4 text-xs font-semibold text-white/35">Demo: xtreme-admin</p>
        </form>
      </main>
    );
  }

  const t = data?.today;

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="border-b border-white/10 px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Xtreme Gym</p>
            <h1 className="text-3xl font-black uppercase tracking-tight sm:text-4xl">Panel de administracion</h1>
            <p className="mt-2 text-sm font-semibold text-white/55">
              Socios, rachas, minutos, membresias y ocupacion en vivo desde Mongo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              Reset + Seed
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
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
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Kpi icon={Users} label="Socios" value={`${data.totals.memberCount}`} accent="from-lime-300 to-emerald-400" />
              <Kpi icon={CalendarCheck} label="Activos hoy" value={`${data.totals.activeToday}`} accent="from-cyan-300 to-sky-500" />
              <Kpi icon={Flame} label="Racha prom." value={`${data.totals.avgStreak}`} accent="from-orange-400 to-red-500" />
              <Kpi icon={Trophy} label="Entrenos" value={`${data.totals.totalWorkouts}`} accent="from-yellow-300 to-orange-400" />
              <Kpi icon={Timer} label="Minutos" value={`${data.totals.totalMinutes}`} accent="from-fuchsia-400 to-rose-400" />
              <Kpi icon={Activity} label="Ocupacion" value={`${t?.occupancyPct ?? 0}%`} accent="from-lime-300 to-cyan-300" />
            </div>

            {t && (
              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-lime-300" />
                    <h2 className="text-lg font-black uppercase">Ocupacion y reservas de hoy</h2>
                  </div>
                  <span className="text-sm font-black uppercase text-white/55">
                    {t.currentPeople}/{t.capacity} en el gym · {t.level}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {t.classes.map((c) => {
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
            )}

            <div className="border border-white/10 bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-300" />
                  <h2 className="text-lg font-black uppercase">Socios ({data.members.length})</h2>
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-white/40">
                  {data.totals.seededCount} demo
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Socio</th>
                      <th className="px-3 py-3">Racha</th>
                      <th className="px-3 py-3">Entrenos</th>
                      <th className="px-3 py-3">Minutos</th>
                      <th className="px-3 py-3">Favorito</th>
                      <th className="px-3 py-3">Membresia</th>
                      <th className="px-3 py-3">Ultimo</th>
                      <th className="px-3 py-3">Peso</th>
                      <th className="px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((m, index) => (
                      <tr key={m.normalizedName} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                        <td className="px-5 py-3 font-black text-white/40">{index + 1}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-black uppercase">{m.memberName}</span>
                            {m.seeded && (
                              <span className="border border-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/40">
                                demo
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-white/40">{m.goal || "—"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 font-black text-orange-300">
                            <Flame className="h-3.5 w-3.5" /> {m.streak}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-black">{m.totalWorkouts}</td>
                        <td className="px-3 py-3 font-black">{m.totalMinutes}</td>
                        <td className="px-3 py-3 text-white/70">{m.favoriteTraining || "—"}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block border px-2 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[m.membershipStatus]}`}
                          >
                            {STATUS_LABEL[m.membershipStatus]}
                          </span>
                          <div className="mt-1 text-[11px] font-semibold text-white/40">
                            {m.plan} · {m.daysRemaining < 0 ? `${Math.abs(m.daysRemaining)}d vencida` : `${m.daysRemaining}d`}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-white/60">{m.lastWorkoutDate ?? "—"}</td>
                        <td className="px-3 py-3 text-white/60">{m.latestWeight ? `${m.latestWeight} kg` : "—"}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => void removeMember(m.memberName)}
                            disabled={Boolean(busy)}
                            aria-label={`Eliminar ${m.memberName}`}
                            className="grid h-8 w-8 place-items-center border border-white/10 text-white/50 transition hover:border-red-400 hover:text-red-300 disabled:opacity-40"
                          >
                            {busy === `del-${m.memberName}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!data.members.length && (
                      <tr>
                        <td colSpan={10} className="px-5 py-10 text-center text-sm font-semibold text-white/45">
                          No hay socios todavia. Toca &quot;Seed demo&quot; para generar clientes de prueba.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
