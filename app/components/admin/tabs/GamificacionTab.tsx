"use client";

import {
  Flame,
  Loader2,
  Medal,
  Plus,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { Kpi } from "../ui";
import type { GamificationForms } from "../hooks/useGamificationForms";
import type { GamiData } from "../types";

export type GamificacionTabProps = {
  gami: GamiData | null;
  busy: string;
  forms: GamificationForms;
  onGamiAction: (body: Record<string, unknown>, okMessage: string) => Promise<void>;
  /** Recarga el panel tras un cambio hecho fuera de onGamiAction. */
  onReloadGami: () => void;
};

export function GamificacionTab({ gami, busy, forms, onGamiAction, onReloadGami }: GamificacionTabProps) {
  const {
    gamiMemberQ,
    setGamiMemberQ,
    selectedGamiMember,
    setSelectedGamiMember,
    grantBadgeId,
    setGrantBadgeId,
    manualBadge,
    setManualBadge,
    adjustForm,
    setAdjustForm,
  } = forms;

  return (
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
                onClick={() => onReloadGami()}
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
                        void onGamiAction(
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
                          void onGamiAction(
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
                    void onGamiAction(
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
            <h2 className="text-lg font-black uppercase">Socio - badges y ajustes</h2>
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
                    void onGamiAction(
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
                      void onGamiAction(
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
                      void onGamiAction(
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
  );
}
