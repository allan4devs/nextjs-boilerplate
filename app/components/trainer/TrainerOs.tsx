"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, ArrowLeft, CheckCircle2, Dumbbell, Loader2, Lock, LogOut, RefreshCw, UserRound } from "lucide-react";
import { GameButton, GameLabel } from "@/app/components/GameOS";
import StaffThemeToggle from "@/app/components/StaffThemeToggle";
import { TRAINER_TABS } from "./constants";
import { useTrainerOs } from "./hooks/useTrainerOs";
import { TrainerOverview } from "./ui/TrainerOverview";
import { TrainerRoster } from "./ui/TrainerRoster";
import { TrainerGroupMembershipPanel } from "./ui/TrainerGroupMembershipPanel";

const TrainerPlanEditor = dynamic(() => import("./ui/TrainerPlanEditor").then((module) => module.TrainerPlanEditor));
const TrainerHistory = dynamic(() => import("./ui/TrainerHistory").then((module) => module.TrainerHistory));
const TrainerHealthRecord = dynamic(() => import("./ui/TrainerHealthRecord").then((module) => module.TrainerHealthRecord));
const TrainerGroupA = dynamic(() => import("./ui/TrainerGroupA").then((module) => module.TrainerGroupA));

export default function TrainerOs() {
  const os = useTrainerOs();

  if (os.checking && !os.authenticated) return <main className="grid min-h-screen place-items-center bg-[#050505] text-cyan-300"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin" /><p className="mt-3 text-[10px] font-black uppercase tracking-[.2em] text-white/35">Cargando Trainer OS</p></div></main>;

  if (!os.authenticated) return <TrainerLogin os={os} />;

  return <main className="min-h-screen bg-[#050505] text-white">
    <header className="sticky top-0 z-40 border-b-[3px] border-cyan-300/35 bg-[#050505]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center bg-cyan-300 text-black"><Dumbbell className="h-6 w-6" /></span><div><GameLabel tone="cyan">Trainer OS 2.0</GameLabel><h1 className="text-lg font-black uppercase sm:text-2xl">Centro de rendimiento</h1>{os.staffName && <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Sesión de {os.staffName}</p>}</div></div>
        <div className="flex flex-wrap justify-end gap-2"><StaffThemeToggle />{os.memberFocus && <button onClick={os.leaveMember} disabled={os.healthBusy || os.groupBusy} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-cyan-300/50 px-3 text-[10px] font-black uppercase text-cyan-200 transition hover:border-cyan-300"><ArrowLeft className="h-4 w-4" /> Socios</button>}<button onClick={() => void os.refresh()} disabled={os.checking} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/15 px-3 text-[10px] font-black uppercase transition hover:border-cyan-300 disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${os.checking ? "animate-spin" : ""}`} /> Actualizar</button><button onClick={() => void os.logout()} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/15 px-3 text-[10px] font-black uppercase text-white/45 transition hover:border-red-300 hover:text-red-200"><LogOut className="h-4 w-4" /> Salir</button></div>
      </div>
    </header>

    <div className="mx-auto max-w-[1680px] p-3 sm:p-4 lg:p-6">
      {!os.memberFocus && <nav aria-label="Área de trabajo del entrenador" className="my-4 flex flex-wrap gap-2">
        <GameButton variant={os.groupActive ? "ghost" : "cyan"} disabled={os.healthBusy || os.groupBusy} aria-pressed={!os.groupActive} onClick={() => os.setGroupActive(false)}>Socios y planes</GameButton>
        <GameButton variant={os.groupActive ? "cyan" : "ghost"} disabled={os.healthBusy || os.groupBusy} aria-pressed={os.groupActive} onClick={() => os.setGroupActive(true)}>Grupo A</GameButton>
      </nav>}
      {!os.memberFocus && <div hidden={!os.groupActive}>
        <TrainerGroupA active={os.groupActive} members={os.members} refreshKey={os.groupRefresh} onDirtyChange={os.setGroupDirty} onBusyChange={os.setGroupBusy} onOpenMember={os.chooseMember} />
      </div>}
      <div className={os.memberFocus ? "space-y-4" : os.groupActive ? "hidden" : "grid min-h-0 gap-4 lg:grid-cols-[330px_minmax(0,1fr)]"}>
        {!os.memberFocus && <TrainerRoster os={os} />}
        {os.memberFocus && os.selected ? <section className="min-w-0 space-y-4">
          <button type="button" onClick={os.leaveMember} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/15 px-3 text-[10px] font-black uppercase text-white/55 transition hover:border-cyan-300 hover:text-cyan-200"><ArrowLeft className="h-4 w-4" /> Volver a socios</button>
          <MemberHeader os={os} />
          {os.selected && <TrainerGroupMembershipPanel key={os.selected.memberId} member={os.selected} refreshKey={os.groupRefresh} />}
          {os.notice && <div className={`flex items-center gap-3 border-[3px] p-3 text-sm font-bold ${os.notice.tone === "success" ? "border-[#d8ff3e]/45 bg-[#d8ff3e]/10 text-[#eaff93]" : "border-red-400/45 bg-red-500/10 text-red-200"}`}>{os.notice.tone === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}{os.notice.text}</div>}
          <nav className="flex gap-2 overflow-x-auto border-[3px] border-white/10 bg-[#0c0c0c] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{TRAINER_TABS.map((entry) => <button key={entry.id} onClick={() => os.setTab(entry.id)} className={`min-h-11 shrink-0 border-[3px] px-4 text-[10px] font-black uppercase transition ${os.tab === entry.id ? "border-cyan-300 bg-cyan-300 text-black" : "border-white/10 text-white/45 hover:border-white/30"}`}>{entry.label}{entry.id === "plan" && os.dirty ? " •" : ""}</button>)}</nav>
          <TrainerHealthRecord key={os.selected.memberId} member={os.selected} active={!os.groupActive && os.tab === "health"} refreshKey={os.healthRefresh} onDirtyChange={os.setHealthDirty} onBusyChange={os.setHealthBusy} />
          {os.tab === "overview" ? <TrainerOverview os={os} /> : os.tab === "plan" ? <TrainerPlanEditor os={os} /> : os.tab === "history" ? <TrainerHistory os={os} /> : null}
        </section> : <div className="grid min-h-[480px] place-items-center border-[3px] border-dashed border-white/15 bg-white/[.02] text-center"><div><UserRound className="mx-auto h-12 w-12 text-white/20" /><p className="mt-4 font-black uppercase text-white/45">Seleccioná un socio</p><p className="mt-1 text-sm font-bold text-white/25">Su radiografía aparece acá.</p></div></div>}
      </div>
    </div>
  </main>;
}
function TrainerLogin({ os }: { os: ReturnType<typeof useTrainerOs> }) {
  return <main className="xg-os-login-shell grid bg-[#050505] text-white"><form onSubmit={(event) => void os.login(event)} className="w-full max-w-md border-[3px] border-cyan-300 bg-[#0c0c0c] p-6 shadow-[7px_7px_0_rgba(103,232,249,.18)] sm:p-8"><div className="grid h-14 w-14 place-items-center bg-cyan-300 text-black"><Dumbbell className="h-7 w-7" /></div><GameLabel tone="cyan" className="mt-5">Trainer OS 2.0</GameLabel><h1 className="mt-2 text-3xl font-black uppercase">Centro de rendimiento</h1><p className="mt-2 text-sm font-bold leading-6 text-white/45">Prescribí, seguí ejecuciones y detectá quién necesita tu atención.</p><div className="relative mt-6"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><input type="password" autoComplete="current-password" value={os.code} onChange={(event) => os.setCode(event.target.value)} placeholder="Código de entrenador" className="min-h-12 w-full border-[3px] border-white/20 bg-black/45 pl-10 pr-4 font-bold outline-none focus:border-cyan-300" /></div>{os.notice && <p className="mt-3 border border-red-400/40 bg-red-500/10 p-3 text-sm font-bold text-red-300">{os.notice.text}</p>}<GameButton type="submit" full className="mt-5" disabled={os.checking || !os.code.trim()}>{os.checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar como entrenador"}</GameButton><p className="mt-5 flex justify-center gap-5 text-xs font-bold text-white/30"><Link href="/app">Member OS</Link><Link href="/admin">Admin OS</Link></p></form></main>;
}
function MemberHeader({ os }: { os: ReturnType<typeof useTrainerOs> }) {
  const member = os.selected!;
  const signal = os.selectedSignal!;
  const tone = { lime: "border-[#d8ff3e] text-[#d8ff3e]", cyan: "border-cyan-300 text-cyan-300", orange: "border-orange-300 text-orange-300", red: "border-red-400 text-red-300", muted: "border-white/15 text-white/40" }[signal.tone];
  return <section className={`relative overflow-hidden border-[3px] bg-[#0c0c0c] p-4 ${tone}`}><div aria-hidden className="absolute -right-10 -top-20 h-48 w-48 rounded-full bg-current/10 blur-3xl" /><div className="relative flex flex-wrap items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden border-[3px] border-current/35 bg-black/35">{member.photoUrl ? <Image unoptimized src={member.photoUrl} alt="" width={64} height={64} sizes="64px" className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7" />}</span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.18em] opacity-70">Socio seleccionado</p><h2 className="truncate text-2xl font-black uppercase text-white sm:text-3xl">{member.memberName}</h2><p className="mt-1 text-sm font-bold text-white/45">Meta: {member.goal || "Sin definir"} · Coach: {member.coach || "Sin asignar"}</p>{member.trainingProgramAssignment && <p className="mt-1 text-[10px] font-black uppercase tracking-[.14em] text-cyan-300">Grupo {member.trainingProgramAssignment.programName} · {member.trainingProgramAssignment.cohort}</p>}</div><div className="border-[3px] border-current/35 bg-black/30 px-3 py-2 text-right"><p className="text-[9px] font-black uppercase opacity-60">Prioridad</p><p className="mt-1 font-black uppercase">{signal.label}</p><p className="text-[10px] font-bold text-white/40">{signal.detail}</p></div></div></section>;
}

