"use client";

import {
  Loader2,
  ScanFace,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  initialsOf,
} from "@/app/lib/memberName";
import type {
  RecentProfile,
} from "../types";

export function SearchCard({
  query,
  setQuery,
  isSearching,
  error,
  recent,
  hasProfile,
  onSubmit,
  onPickRecent,
  onBack,
  onFace,
}: {
  query: string;
  setQuery: (v: string) => void;
  isSearching: boolean;
  error: string;
  recent: RecentProfile[];
  hasProfile: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onPickRecent: (name: string) => void;
  onBack: () => void;
  onFace: () => void;
}) {
  return (
    <div>
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-black/[0.04] text-black/60">
          <UserRound className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">Inicia tu ingreso</h2>
        <p className="mt-1 text-sm font-bold text-black/45">
          Escribí tu nombre, cédula (con o sin guiones), teléfono o el código de 8 dígitos de la app.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. Kengie Araya o 1-2345-6789"
            autoFocus
            className="w-full rounded-full border border-black/15 bg-white py-4 pl-12 pr-4 text-base font-bold text-black outline-none placeholder:text-black/30 focus:border-[#8fbf00]"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0b] px-6 py-4 text-base font-black uppercase tracking-wide text-[#d8ff3e] transition hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar mi perfil"}
        </button>
      </form>

      <button
        type="button"
        onClick={onFace}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-black/15 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-black/70 transition hover:border-black/30 hover:text-black"
      >
        <ScanFace className="h-4 w-4" /> Preferir camara / rostro
      </button>

      {recent.length > 0 && (
        <div className="mt-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/40">
            Perfiles recientes
          </p>
          <div className="mt-3 space-y-2">
            {recent.map((p) => (
              <button
                key={p.memberName}
                type="button"
                onClick={() => onPickRecent(p.memberName)}
                className="flex w-full items-center gap-3 rounded-full border border-black/10 bg-black/[0.02] px-3 py-2.5 text-left transition hover:border-[#8fbf00]/50 hover:bg-[#d8ff3e]/10"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0b0b0b] text-sm font-black text-[#d8ff3e]">
                  {initialsOf(p.memberName)}
                </span>
                <span className="truncate text-sm font-black uppercase text-black/80">
                  {p.memberName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasProfile && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full text-center text-sm font-black uppercase tracking-wide text-black/40 transition hover:text-black/70"
        >
          Volver
        </button>
      )}
    </div>
  );
}

/** Collage tipo Facebook, pero con escenas de gym. */
