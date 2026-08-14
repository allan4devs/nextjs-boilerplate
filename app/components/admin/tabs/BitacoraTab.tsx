"use client";

import {
  Activity,
  ClipboardList,
  Smartphone,
  Timer,
  Users,
  Zap,
} from "lucide-react";
import {
  formatDurationMs,
} from "../helpers";
import {
  Kpi,
} from "../ui";
import type { AdminData } from "../types";

export type BitacoraTabProps = {
  data: AdminData;
  usageSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  /** Alterna la sesión abierta en el detalle. */
  onToggleSession: (id: string) => void;
};

export function BitacoraTab({ data, usageSessionId, onSelectSession, onToggleSession }: BitacoraTabProps) {
  return (
    <>
      {data.usage ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
            <Kpi
              icon={Smartphone}
              label="Sesiones"
              value={`${data.usage.sessions}`}
              accent="from-lime-300 to-emerald-400"
            />
            <Kpi
              icon={Users}
              label="Socios únicos"
              value={`${data.usage.uniqueMembers}`}
              accent="from-cyan-300 to-sky-500"
            />
            <Kpi
              icon={Timer}
              label="Duración prom."
              value={formatDurationMs(data.usage.avgDurationMs)}
              accent="from-orange-400 to-amber-500"
            />
            <Kpi
              icon={Activity}
              label="Page views"
              value={`${data.usage.totalPageViews}`}
              accent="from-fuchsia-400 to-rose-400"
            />
            <Kpi
              icon={Zap}
              label="Clicks"
              value={`${data.usage.totalClicks}`}
              accent="from-sky-300 to-blue-400"
            />
            <Kpi
              icon={ClipboardList}
              label="Acciones"
              value={`${data.usage.totalActions}`}
              accent="from-lime-300 to-cyan-300"
            />
          </div>

          <p className="text-xs font-semibold text-white/45">
            Ventana {data.usage.fromDate} → {data.usage.toDate} ·{" "}
            {data.usage.memberSessions} con socio · {data.usage.anonSessions} anónimas
            {typeof data.usage.excludedInternalSessions === "number" &&
            data.usage.excludedInternalSessions > 0
              ? ` · ${data.usage.excludedInternalSessions} internas excluidas (QA/Allan)`
              : ""}{" "}
            · mediana {formatDurationMs(data.usage.medianDurationMs)}
          </p>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="border border-white/10 bg-white/[0.04] p-5 lg:col-span-1">
              <h2 className="text-lg font-black uppercase">Páginas más usadas</h2>
              <ul className="mt-3 space-y-2">
                {data.usage.topPages.length === 0 && (
                  <li className="text-sm text-white/40">Aún no hay datos. Navegá el sitio y el app.</li>
                )}
                {data.usage.topPages.map((p) => (
                  <li
                    key={p.path}
                    className="flex items-center justify-between gap-2 border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <span className="truncate font-mono text-xs text-cyan-200">{p.path}</span>
                    <span className="shrink-0 text-xs font-black text-lime-200">
                      {p.views} · {p.sessions} ses
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-black uppercase">Tabs Member OS</h2>
              <ul className="mt-3 space-y-2">
                {data.usage.topTabs.length === 0 && (
                  <li className="text-sm text-white/40">Sin tabs todavía.</li>
                )}
                {data.usage.topTabs.map((t) => (
                  <li
                    key={t.tab}
                    className="flex items-center justify-between gap-2 border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <span className="text-sm font-black uppercase text-white/80">{t.tab}</span>
                    <span className="text-xs font-black text-lime-200">{t.views}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 text-xs font-black uppercase tracking-wide text-white/45">
                Fuentes
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.usage.bySource.map((s) => (
                  <span
                    key={s.source}
                    className="border border-white/15 bg-black/30 px-2 py-1 text-[10px] font-black uppercase text-white/70"
                  >
                    {s.source}: {s.sessions}
                  </span>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-lg font-black uppercase">Acciones / toques</h2>
              <ul className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
                {data.usage.topActions.length === 0 && (
                  <li className="text-sm text-white/40">Sin acciones todavía.</li>
                )}
                {data.usage.topActions.map((a) => (
                  <li
                    key={a.action}
                    className="flex items-center justify-between gap-2 border border-white/10 bg-black/25 px-3 py-2"
                  >
                    <span className="truncate text-xs font-semibold text-white/75">{a.action}</span>
                    <span className="shrink-0 text-xs font-black text-orange-200">{a.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-lime-300" />
                <h2 className="text-lg font-black uppercase">
                  Sesiones recientes ({data.usage.recentSessions.length})
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-black uppercase tracking-wide text-white/40">
                    <th className="px-3 py-3">Quién / fuente</th>
                    <th className="px-3 py-3">Ruta</th>
                    <th className="px-3 py-3">Duración</th>
                    <th className="px-3 py-3">Actividad</th>
                    <th className="px-3 py-3">Inicio</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.usage.recentSessions.map((s) => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className="px-3 py-3">
                        <p className="font-black uppercase text-white/90">
                          {s.memberName || "Anónimo"}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-white/40">
                          {s.source} · {s.id.slice(0, 14)}...
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-cyan-200">
                        <div>{s.entryPath || "-"}</div>
                        {s.exitPath && s.exitPath !== s.entryPath && (
                          <div className="text-white/40">→ {s.exitPath}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-black text-lime-200">
                        {formatDurationMs(s.durationMs)}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-white/60">
                        {s.pageViews} pv · {s.clicks} clk · {s.actions} act
                      </td>
                      <td className="px-3 py-3 text-xs text-white/45">
                        {new Date(s.startedAt).toLocaleString("es-CR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onToggleSession(s.id)
                          }
                          className="text-[11px] font-black uppercase text-lime-300"
                        >
                          {usageSessionId === s.id ? "Cerrar" : "Detalle"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {usageSessionId &&
              (() => {
                const s = data.usage!.recentSessions.find((x) => x.id === usageSessionId);
                if (!s) return null;
                return (
                  <div className="border-t border-white/10 bg-black/30 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black uppercase">
                          Timeline · {s.memberName || "Anónimo"}
                        </h3>
                        <p className="mt-1 font-mono text-[11px] text-white/40">{s.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectSession(null)}
                        className="text-xs font-black uppercase text-white/50"
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.topPaths.map((p) => (
                        <span
                          key={p.path}
                          className="border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] text-cyan-100"
                        >
                          {p.path} ×{p.count}
                        </span>
                      ))}
                      {s.topTabs.map((t) => (
                        <span
                          key={t.tab}
                          className="border border-lime-400/30 bg-lime-400/10 px-2 py-1 text-[10px] font-black uppercase text-lime-100"
                        >
                          tab:{t.tab} ×{t.count}
                        </span>
                      ))}
                      {s.topActions.map((a) => (
                        <span
                          key={a.action}
                          className="border border-orange-400/30 bg-orange-400/10 px-2 py-1 text-[10px] font-semibold text-orange-100"
                        >
                          {a.action} ×{a.count}
                        </span>
                      ))}
                    </div>
                    <ol className="mt-4 max-h-80 space-y-1.5 overflow-y-auto border border-white/10 bg-black/40 p-3">
                      {s.timeline.map((ev, i) => (
                        <li
                          key={`${ev.at}-${i}`}
                          className="grid grid-cols-[auto_1fr] gap-3 text-xs"
                        >
                          <span className="font-mono text-white/35">
                            {new Date(ev.at).toLocaleTimeString("es-CR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="text-white/75">
                            <span className="font-black uppercase text-lime-200/90">
                              {ev.type}
                            </span>
                            {ev.path ? ` · ${ev.path}` : ""}
                            {ev.tab ? ` · tab ${ev.tab}` : ""}
                            {ev.action ? ` · ${ev.action}` : ""}
                            {ev.label ? ` · "${ev.label}"` : ""}
                            {ev.meta && (
                              <span className="mt-1 block font-mono text-[10px] text-cyan-200/70">
                                {Object.entries(ev.meta)
                                  .map(([key, value]) => `${key}=${String(value)}`)
                                  .join(" · ")}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })()}
          </div>
        </>
      ) : (
        <div className="border border-white/10 bg-white/[0.04] p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 font-black uppercase text-white/60">Sin bitácora aún</p>
          <p className="mt-1 text-sm text-white/40">
            Los datos se generan al navegar el sitio y el Member OS.
          </p>
        </div>
      )}
    </>
  );
}
