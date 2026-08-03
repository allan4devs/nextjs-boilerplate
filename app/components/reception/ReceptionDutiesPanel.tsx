"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  FileBarChart,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { GameLabel } from "@/app/components/GameOS";

type Duty = {
  id: string;
  kind: "responsibility" | "daily" | "monthly";
  title: string;
  description: string;
  area: string;
  order: number;
  completed: boolean;
};

export default function ReceptionDutiesPanel() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/reception/duties", { cache: "no-store" });
      const data = (await response.json()) as { duties?: Duty[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo cargar.");
      setDuties(data.duties ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(duty: Duty) {
    const completed = !duty.completed;
    setSavingId(duty.id);
    setError("");
    setDuties((current) =>
      current.map((item) => (item.id === duty.id ? { ...item, completed } : item)),
    );
    try {
      const response = await fetch("/api/xtreme/reception/duties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: duty.id, completed }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar.");
    } catch (saveError) {
      setDuties((current) =>
        current.map((item) =>
          item.id === duty.id ? { ...item, completed: duty.completed } : item,
        ),
      );
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
    } finally {
      setSavingId("");
    }
  }

  const grouped = useMemo(
    () => ({
      responsibility: duties.filter((duty) => duty.kind === "responsibility"),
      daily: duties.filter((duty) => duty.kind === "daily"),
      monthly: duties.filter((duty) => duty.kind === "monthly"),
    }),
    [duties],
  );

  const dailyDone = grouped.daily.filter((duty) => duty.completed).length;
  const monthlyDone = grouped.monthly.filter((duty) => duty.completed).length;

  if (loading) {
    return <div className="grid min-h-72 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" /></div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <GameLabel tone="lime">Control operativo · turno de recepción</GameLabel>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Deberes y reportes</h1>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/45">
            Marcá lo completado. Los pendientes diarios empiezan de nuevo cada día y los reportes al comenzar cada mes.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/60 hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e]">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {error && <p className="mt-4 border-[3px] border-red-400/60 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ProgressCard icon={ClipboardCheck} label="Hoy" done={dailyDone} total={grouped.daily.length} tone="lime" />
        <ProgressCard icon={FileBarChart} label="Reportes del mes" done={monthlyDone} total={grouped.monthly.length} tone="cyan" />
      </div>

      <DutySection title="Cosas por hacer hoy" subtitle="Lista operativa diaria" icon={CalendarDays} duties={grouped.daily} savingId={savingId} onToggle={toggle} />
      <DutySection title="Reportes por hacer este mes" subtitle="Administración, finanzas y cumplimiento" icon={FileBarChart} duties={grouped.monthly} savingId={savingId} onToggle={toggle} />

      <section className="mt-7 border-t-[3px] border-white/15 pt-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-violet-300" />
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Alcance del puesto</p><h2 className="text-2xl font-black uppercase">Deberes y responsabilidades</h2></div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {grouped.responsibility.map((duty) => (
            <article key={duty.id} className="border-[3px] border-violet-300/25 bg-violet-300/[0.04] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">{duty.area}</p>
              <h3 className="mt-1 text-base font-black uppercase">{duty.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-white/45">{duty.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function DutySection({ title, subtitle, icon: Icon, duties, savingId, onToggle }: { title: string; subtitle: string; icon: typeof CalendarDays; duties: Duty[]; savingId: string; onToggle: (duty: Duty) => void }) {
  return (
    <section className="mt-7 border-t-[3px] border-white/15 pt-6">
      <div className="flex items-center gap-3"><Icon className="h-6 w-6 text-[#d8ff3e]" /><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">{subtitle}</p><h2 className="text-2xl font-black uppercase">{title}</h2></div></div>
      <div className="mt-4 grid gap-2">
        {duties.map((duty) => (
          <button key={duty.id} type="button" disabled={Boolean(savingId)} onClick={() => onToggle(duty)} className={`flex min-h-20 items-center gap-4 border-[3px] p-4 text-left transition disabled:cursor-wait ${duty.completed ? "border-[#d8ff3e]/55 bg-[#d8ff3e]/10" : "border-white/15 bg-black/35 hover:border-white/35"}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center border-[3px] ${duty.completed ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/25 text-transparent"}`}>{savingId === duty.id ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : <Check className="h-5 w-5" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{duty.area}</span><span className={`mt-0.5 block text-sm font-black uppercase sm:text-base ${duty.completed ? "text-white/55 line-through" : "text-white"}`}>{duty.title}</span>{duty.description && <span className="mt-1 block text-xs font-bold text-white/35">{duty.description}</span>}</span>
          </button>
        ))}
        {!duties.length && <p className="border-[3px] border-dashed border-white/15 p-6 text-center text-sm font-bold text-white/35">No hay tareas cargadas. Ejecutá el seeder desde administración.</p>}
      </div>
    </section>
  );
}

function ProgressCard({ icon: Icon, label, done, total, tone }: { icon: typeof ClipboardCheck; label: string; done: number; total: number; tone: "lime" | "cyan" }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  const color = tone === "lime" ? "text-[#d8ff3e] bg-[#d8ff3e]" : "text-cyan-300 bg-cyan-300";
  return <div className="border-[3px] border-white/15 bg-black/35 p-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Icon className={`h-5 w-5 ${color.split(" ")[0]}`} /><p className="text-xs font-black uppercase tracking-[0.16em] text-white/55">{label}</p></div><p className="text-2xl font-black">{done}/{total}</p></div><div className="mt-3 h-2 bg-white/10"><div className={`h-full ${color.split(" ")[1]}`} style={{ width: `${percent}%` }} /></div></div>;
}
