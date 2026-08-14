"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  LogOut,
  Search,
} from "lucide-react";
import {
  GameChip,
  GameLabel,
} from "../../GameOS";
import { Avatar } from "../MemberCards";
import type {
  ActiveVisit,
} from "../types";
import { formatTime } from "../helpers";

export function InsideRoster({
  visits,
  query,
  onQueryChange,
  checkingOutId,
  onCheckout,
}: {
  visits: ActiveVisit[];
  query: string;
  onQueryChange: (value: string) => void;
  checkingOutId: string;
  onCheckout: (visit: ActiveVisit) => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const queryDigits = query.replace(/\D/g, "");
  const filtered = visits.filter((visit) => {
    if (!normalizedQuery) return true;
    const nameMatch = visit.memberName.toLocaleLowerCase("es").includes(normalizedQuery);
    const cedulaMatch = Boolean(
      queryDigits && String(visit.cedula || "").replace(/\D/g, "").includes(queryDigits),
    );
    return nameMatch || cedulaMatch;
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <GameLabel tone="lime">Control de salida</GameLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Personas dentro · {visits.length}
          </h2>
          <p className="mt-2 text-sm font-bold text-white/45">
            Buscá por nombre o cédula y marcá la salida desde la lista.
          </p>
        </div>
      </div>

      <label className="relative mt-5 block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          inputMode="search"
          autoComplete="off"
          placeholder="Nombre o número de cédula"
          className="min-h-14 w-full border-[3px] border-white/20 bg-black/50 pl-12 pr-4 text-base font-black text-white outline-none placeholder:text-white/25 focus:border-[#d8ff3e]"
        />
      </label>

      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((visit) => {
          const minutes = Math.max(
            0,
            Math.round((now - new Date(visit.checkedInAt).getTime()) / 60_000),
          );
          const busy = checkingOutId === visit.id;
          return (
            <li
              key={visit.id}
              className="flex min-w-0 flex-col border-[3px] border-white/15 bg-black/45 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={visit.memberName} photoUrl={visit.photoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black uppercase">{visit.memberName}</p>
                  <p className="mt-0.5 text-xs font-bold text-white/40">
                    {visit.cedula ? `Céd. ${visit.cedula} · ` : ""}
                    Entrada {formatTime(visit.checkedInAt)} · {minutes} min
                  </p>
                </div>
                <GameChip tone={visit.membershipStatus === "expired" ? "orange" : "lime"}>
                  Dentro
                </GameChip>
              </div>
              <button
                type="button"
                disabled={Boolean(checkingOutId)}
                onClick={() => onCheckout(visit)}
                className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-orange-300 bg-orange-300/10 px-4 text-sm font-black uppercase text-orange-200 transition hover:bg-orange-300 hover:text-black disabled:cursor-wait disabled:opacity-45"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                Marcar salida
              </button>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="border-[3px] border-dashed border-white/15 px-4 py-10 text-center text-sm font-bold text-white/35 md:col-span-2">
            {visits.length
              ? "No hay una persona dentro que coincida con la búsqueda."
              : "No hay personas registradas dentro del gimnasio."}
          </li>
        )}
      </ul>
    </div>
  );
}
