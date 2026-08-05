"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GameLabel } from "@/app/components/GameOS";
import StaffThemeToggle from "@/app/components/StaffThemeToggle";
import ReceptionControlsPanel, { type ReceptionControlKind } from "./ReceptionControlsPanel";

const TITLES: Record<ReceptionControlKind, string> = {
  vip: "Control del área VIP",
  seniors: "Control de adultos mayores",
  tanning: "Control de bronceado",
  electricity: "Control de pagos de luz",
};

export default function ReceptionControlPage({ kind }: { kind: ReceptionControlKind }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/xtreme/staff-session?surface=reception", { cache: "no-store" });
        const session = (await response.json()) as { authenticated?: boolean };
        if (!cancelled) setAuthenticated(response.ok && session.authenticated === true);
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (authenticated === null) {
    return <main className="grid min-h-[70vh] place-items-center bg-[#050505] text-white"><Loader2 className="h-9 w-9 animate-spin text-[#d8ff3e]" aria-label="Validando sesión" /></main>;
  }

  if (!authenticated) {
    return <main className="grid min-h-[70vh] place-items-center bg-[#050505] px-4 text-white"><section className="max-w-md border-[3px] border-white/20 bg-[#0c0c0c] p-6 text-center shadow-[6px_6px_0_rgba(216,255,62,.16)]"><GameLabel tone="orange">Sesión requerida</GameLabel><h1 className="mt-3 text-3xl font-black uppercase">Ingresá desde recepción</h1><p className="mt-3 text-sm font-bold text-white/50">Esta página usa la misma sesión de Reception OS.</p><Link href="/recepcion" className="mt-6 inline-flex min-h-12 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-5 text-sm font-black uppercase text-black"><ArrowLeft className="h-4 w-4" /> Ir a recepción</Link></section></main>;
  }

  return <main className="min-h-screen bg-[#050505] px-3 py-4 text-white sm:px-6 sm:py-6"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-white/20 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]"><div><GameLabel tone="lime">Sesión de recepción activa</GameLabel><h1 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">{TITLES[kind]}</h1></div><div className="flex items-center gap-2"><StaffThemeToggle /><Link href="/recepcion" className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e]"><ArrowLeft className="h-4 w-4" /> Volver a recepción</Link></div></header><section className="mt-4 border-[3px] border-white/20 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)] sm:p-6"><ReceptionControlsPanel initialKind={kind} single /></section></div></main>;
}
