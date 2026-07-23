"use client";

/**
 * Tab Progreso - inventario de logros, medidas corporales con
 * graficos de tendencia, leaderboard e historial (ingresos + entrenos).
 */

import { Award, ChevronRight, Flame, Lock, Medal, Ruler, Target } from "lucide-react";
import { CHART_CYAN, CHART_LIME, LineTrendChart } from "../../charts";
import { GameLabel } from "../../GameOS";
import { BadgeGallery } from "../../gamification";
import { VisitHistoryList, WorkoutHistoryList } from "../ActivityHistory";
import Avatar from "../Avatar";
import type { MemberOs } from "../useMemberOs";

export default function ProgresoTab({ os }: { os: MemberOs }) {
  const {
    unlocked,
    achievements,
    unlockedCount,
    serverBadges,
    setOsModal,
    weightKg,
    setWeightKg,
    waistCm,
    setWaistCm,
    metricNote,
    setMetricNote,
    saveBodyMetric,
    latestMetric,
    metricTrend,
    leaderboard,
    currentMember,
    visitHistory,
    totalVisits,
    isLoadingVisitHistory,
  } = os;

  return (
    <div className="xg-tab-in space-y-3 sm:space-y-4">
      <div className="border-[3px] border-[#d8ff3e]/35 bg-gradient-to-br from-[#d8ff3e]/[0.1] to-transparent p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center bg-[#d8ff3e] text-black">
            <Ruler className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <GameLabel tone="lime">Beneficio de socio</GameLabel>
            <p className="mt-1 text-sm font-black uppercase leading-tight">
              Medición corporal + curva en la app
            </p>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/50">
              Medite en el consultorio sin costo y cargá peso y cintura acá. Tu historial queda
              ligado a la racha y a tu meta - no se pierde en un papel.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOsModal({ kind: "badges" })}
        className="flex w-full items-center gap-3 border-[3px] border-yellow-300/45 bg-yellow-300/[0.07] p-4 text-left shadow-[4px_4px_0_rgba(253,224,71,0.15)]"
      >
        <span className="grid h-12 w-12 place-items-center border-2 border-black/20 bg-yellow-300 text-black">
          <Award className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <GameLabel tone="yellow">Inventario de logros</GameLabel>
          <p className="text-lg font-black uppercase">
            {unlockedCount}/{achievements.length} desbloqueados
          </p>
          <p className="text-[11px] font-bold text-white/45">Tocá para abrir el modal completo</p>
        </div>
        <ChevronRight className="h-5 w-5 text-yellow-300" />
      </button>

      <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-4">
        <GameLabel tone="white" className="mb-3">
          Vista rápida
        </GameLabel>
        {serverBadges.length ? (
          <div className="max-h-[280px] overflow-y-auto">
            <BadgeGallery badges={serverBadges.slice(0, 6)} />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {achievements.slice(0, 6).map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 border-[3px] p-3 ${
                    a.done
                      ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/10"
                      : "border-white/15 bg-black/30"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center ${
                      a.done ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/40"
                    }`}
                  >
                    {a.done ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase">{a.name}</p>
                    <p className="truncate text-xs font-bold text-white/40">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Ruler className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-black uppercase">Progreso corporal</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Peso kg</span>
              <input
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                inputMode="decimal"
                className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-cyan-300"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Cintura cm</span>
              <input
                value={waistCm}
                onChange={(event) => setWaistCm(event.target.value)}
                inputMode="decimal"
                className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-cyan-300"
              />
            </label>
          </div>
          <input
            value={metricNote}
            onChange={(event) => setMetricNote(event.target.value)}
            placeholder="Nota opcional"
            className="mt-3 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300"
          />
          <button
            type="button"
            onClick={saveBodyMetric}
            disabled={!unlocked}
            className="mt-3 w-full bg-cyan-300 px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
          >
            Guardar medidas
          </button>
          <p className="mt-3 text-sm font-semibold text-white/45">
            Ultimo registro: {latestMetric ? `${latestMetric.weightKg} kg - ${latestMetric.waistCm} cm` : "sin medidas aun"}
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-[#d8ff3e]" />
            <h2 className="text-lg font-black uppercase">Evolucion corporal</h2>
          </div>
          {metricTrend.length ? (
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Peso (kg)</p>
                <div className="mt-2 border border-white/10 bg-black/25 p-3">
                  <LineTrendChart
                    data={metricTrend.map((m) => ({ date: m.date, value: m.weightKg }))}
                    unit="kg"
                    color={CHART_LIME}
                    height={150}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Cintura (cm)</p>
                <div className="mt-2 border border-white/10 bg-black/25 p-3">
                  <LineTrendChart
                    data={metricTrend.map((m) => ({ date: m.date, value: m.waistCm }))}
                    unit="cm"
                    color={CHART_CYAN}
                    height={150}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid h-40 place-items-center border border-white/10 bg-black/25 text-sm font-semibold text-white/40">
              Guardá tu primera medida para ver evolución.
            </div>
          )}
          <p className="mt-3 text-sm font-semibold text-white/45">
            Peso y cintura por fecha. Pasá el cursor para ver cada registro.
          </p>
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-3">
          <Medal className="h-5 w-5 text-orange-300" />
          <h2 className="text-lg font-black uppercase">Leaderboard</h2>
        </div>
        <div className="mt-5 space-y-3">
          {leaderboard.length ? (
            leaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.normalizedName || entry.memberName} className="flex items-center gap-3 border border-white/10 bg-black/20 p-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center font-black ${index === 0 ? "bg-orange-300 text-black" : "bg-white/10 text-white"}`}>
                  {index + 1}
                </span>
                <Avatar name={entry.memberName} photoUrl={entry.photoUrl} className="h-9 w-9" textClass="text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black uppercase">{entry.memberName}</p>
                  <p className="text-xs font-semibold text-white/45">
                    {entry.streak} dias - {entry.totalWorkouts} entrenos
                  </p>
                </div>
                <Flame className="h-5 w-5 text-orange-300" />
              </div>
            ))
          ) : (
            <p className="text-sm font-semibold text-white/45">El ranking aparece cuando alguien marque entrenos.</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <VisitHistoryList
          visits={unlocked ? visitHistory : []}
          totalVisits={unlocked ? totalVisits : 0}
          loading={unlocked && isLoadingVisitHistory && visitHistory.length === 0}
        />
        <WorkoutHistoryList workouts={unlocked ? currentMember.workouts : []} />
      </div>
    </div>
  );
}
