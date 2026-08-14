"use client";

import {
  Activity,
  ClipboardList,
  Flame,
  Loader2,
  Pencil,
  Plus,
  Timer,
  Trophy,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import {
  CHART_LIME,
  LineTrendChart,
} from "../../charts";
import {
  STATUS_LABEL,
  STATUS_STYLES,
} from "../constants";
import type {
  AdminMember,
} from "../types";

export function UserDetailModal({
  member,
  isSuper,
  savingMetric,
  newMetric,
  onClose,
  onChangeMetric,
  onAddMetric,
  onOpenPlan,
  onOpenEdit,
  onOpenInvite,
  onRefresh,
}: {
  member: AdminMember;
  isSuper?: boolean;
  savingMetric: boolean;
  newMetric: { date: string; weightKg: string; waistCm: string; note: string };
  onClose: () => void;
  onChangeMetric: (m: { date: string; weightKg: string; waistCm: string; note: string }) => void;
  onAddMetric: () => void;
  onOpenPlan: () => void;
  onOpenEdit: () => void;
  onOpenInvite?: () => void;
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
                <span className="inline-block border-2 border-black/30 bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase">
                  {member.emailVerified ? "Registrado" : member.email ? "Sin registrar" : "Sin correo"}
                </span>
                <span className="inline-block border-2 border-black/30 bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase">
                  {member.profileClaimed || member.emailVerified ? "Ficha OK" : "Sin auditar"}
                </span>
                <span className="inline-block border-2 border-black/30 bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase">
                  {member.campaignInviteSent ? "Correo enviado" : "Sin invitar"}
                </span>
                {member.hasPin ? (
                  <span className="inline-block border-2 border-black/30 bg-black/10 px-2 py-0.5 text-[10px] font-black uppercase">
                    PIN
                  </span>
                ) : null}
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
            {isSuper && !member.emailVerified && onOpenInvite ? (
              <button
                type="button"
                onClick={onOpenInvite}
                className="inline-flex min-h-11 items-center gap-2 border-2 border-black/30 bg-black/15 px-3 py-2 text-xs font-black uppercase sm:text-sm"
              >
                <UserPlus className="h-4 w-4" /> Invitar
              </button>
            ) : null}
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
                <div className="flex justify-between"><span className="text-white/50">Telefono</span><span className="font-semibold">{member.phone || "-"}</span></div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/50 shrink-0">Email</span>
                  <span className="font-semibold truncate max-w-[200px] text-right">
                    {member.email || "-"}
                    {member.email ? (
                      <span className={`ml-2 text-[10px] font-black uppercase ${member.emailVerified ? "text-lime-300" : "text-orange-300"}`}>
                        {member.emailVerified ? "OK" : "sin verificar"}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-white/50">Coach asignado</span><span className="font-semibold">{member.coach || "-"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Objetivo</span><span className="font-semibold">{member.goal || "-"}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Entrenamiento favorito</span><span className="font-semibold">{member.favoriteTraining || "-"}</span></div>
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
                <div className="text-white/50">Inicio</div><div className="font-bold">{member.startedAt || "-"}</div>
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
                        <span className="font-bold">{it.day || `Sesión ${idx + 1}`} - {it.focus}</span>
                        <span className="text-white/50">{it.targetMinutes}min {it.done ? "✓" : ""}</span>
                      </div>
                    ))}
                    {member.trainingPlan.items.length > 4 && (
                      <div className="text-[10px] text-white/40">+ {member.trainingPlan.items.length - 4} sesiones más...</div>
                    )}
                  </div>

                  {member.trainingPlan.coachNote && (
                    <div className="mt-3 text-xs italic text-white/70 border-l-2 border-lime-300/40 pl-3">&quot;{member.trainingPlan.coachNote}&quot;</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-white/60 py-2">
                  Este usuario aun no tiene un plan de trabajo personalizado. Haz click en <span className="font-black text-lime-300">&quot;Generar plan de trabajo&quot;</span> para crear uno.
                </div>
              )}
            </div>

            {/* Body metrics tracking - key for personal trainer */}
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
                            <td className="px-3 py-2 text-xs text-white/60 truncate max-w-[200px]">{m.note || "-"}</td>
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
