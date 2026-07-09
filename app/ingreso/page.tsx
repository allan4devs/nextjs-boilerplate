"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  Loader2,
  Search,
  Settings,
  ShieldAlert,
  Timer,
  Trophy,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

type GymStatus = {
  date: string;
  capacity: number;
  currentPeople: number;
  occupancyPct: number;
  level: string;
  checkinsToday: number;
  uniqueCheckins: number;
  recent: {
    id: string;
    memberName: string;
    accessCode: string;
    membershipStatus: string;
    checkedInAt: string;
    method: string;
  }[];
};

type MemberHit = {
  memberName: string;
  normalizedName: string;
  goal: string;
  accessCode: string;
  plan: string;
  membershipStatus: "active" | "warning" | "expired";
  daysRemaining: number;
  streak: number;
  totalWorkouts: number;
  coach: string;
  phone: string;
  hasPin?: boolean;
};

const STATUS_LABEL = {
  active: "Activa",
  warning: "Por vencer",
  expired: "Vencida",
} as const;

const RECENT_KEY = "xtreme-ingreso-recientes";
const LAST_KEY = "xtreme-gym-member-name";
const MAX_RECENT = 4;

type RecentProfile = { memberName: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function readRecent(): RecentProfile[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (raw) return (JSON.parse(raw) as RecentProfile[]).slice(0, MAX_RECENT);
    const last = window.localStorage.getItem(LAST_KEY);
    return last ? [{ memberName: last }] : [];
  } catch {
    return [];
  }
}

function saveRecent(memberName: string) {
  try {
    const current = readRecent().filter(
      (p) => p.memberName.toUpperCase() !== memberName.toUpperCase(),
    );
    const next = [{ memberName }, ...current].slice(0, MAX_RECENT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    window.localStorage.setItem(LAST_KEY, memberName);
    return next;
  } catch {
    return [{ memberName }];
  }
}

export default function IngresoPage() {
  const [recent, setRecent] = useState<RecentProfile[]>([]);
  const [profile, setProfile] = useState<MemberHit | null>(null);
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [mode, setMode] = useState<"profile" | "search">("profile");
  const [query, setQuery] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<{
    type: "ok" | "warn" | "err";
    title: string;
    subtitle: string;
  } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/xtreme/checkin", { cache: "no-store" });
      const json = (await res.json()) as { status?: GymStatus };
      if (json.status) setStatus(json.status);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  const fetchMember = useCallback(async (opts: { q?: string; code?: string }) => {
    const params = new URLSearchParams();
    if (opts.code) params.set("code", opts.code);
    else if (opts.q) params.set("q", opts.q);
    const res = await fetch(`/api/xtreme/checkin?${params}`, { cache: "no-store" });
    const json = (await res.json()) as {
      status?: GymStatus;
      member?: MemberHit | null;
      error?: string;
    };
    if (json.status) setStatus(json.status);
    return json;
  }, []);

  // Cargar el perfil recordado (estilo "continuar como ...") al abrir.
  useEffect(() => {
    const list = readRecent();
    setRecent(list);
    void loadStatus();
    (async () => {
      if (!list.length) {
        setMode("search");
        setIsLoadingProfile(false);
        return;
      }
      try {
        const json = await fetchMember({ q: list[0].memberName });
        if (json.member) setProfile(json.member);
        else setMode("search");
      } catch {
        setMode("search");
      } finally {
        setIsLoadingProfile(false);
      }
    })();
    const id = window.setInterval(() => void loadStatus(), 15_000);
    return () => window.clearInterval(id);
  }, [loadStatus, fetchMember]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 4500);
    return () => window.clearTimeout(id);
  }, [flash]);

  async function selectProfile(name: string) {
    setError("");
    setIsLoadingProfile(true);
    try {
      const json = await fetchMember({ q: name });
      if (json.member) {
        setProfile(json.member);
        setRecent(saveRecent(json.member.memberName));
        setMode("profile");
      } else {
        setError(json.error || "Socio no encontrado.");
      }
    } catch {
      setError("Error de conexion.");
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function searchMember(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setError("");
    try {
      const digits = q.replace(/\D/g, "");
      const useCode = digits.length >= 4 && digits.length === q.replace(/\s/g, "").length;
      const json = await fetchMember(useCode ? { code: digits } : { q });
      if (!json.member) {
        setError(json.error || "Socio no encontrado.");
        return;
      }
      setProfile(json.member);
      setRecent(saveRecent(json.member.memberName));
      setMode("profile");
      setQuery("");
    } catch {
      setError("Error de conexion.");
    } finally {
      setIsSearching(false);
    }
  }

  async function confirmCheckin() {
    if (!profile) return;
    setIsCheckingIn(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName: profile.memberName,
          accessCode: profile.accessCode,
          method: "name",
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        membershipStatus?: MemberHit["membershipStatus"];
        status?: GymStatus;
        duplicate?: boolean;
      };
      if (!res.ok) {
        setError(json.error || "No se pudo registrar.");
        setFlash({ type: "err", title: "Acceso denegado", subtitle: json.error || "Error" });
        return;
      }
      if (json.status) setStatus(json.status);
      setRecent(saveRecent(profile.memberName));
      const ms = json.membershipStatus || profile.membershipStatus;
      setFlash({
        type: ms === "expired" ? "warn" : "ok",
        title: json.duplicate
          ? "Ya estabas adentro"
          : `Bienvenido, ${profile.memberName.split(" ")[0]}!`,
        subtitle: json.message || "",
      });
    } catch {
      setError("Error de conexion.");
      setFlash({ type: "err", title: "Error", subtitle: "No se pudo registrar el ingreso." });
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#0b0b0b] lg:grid lg:grid-cols-2">
      {flash && (
        <div
          className={`fixed inset-x-0 top-0 z-50 border-b px-5 py-6 text-center ${
            flash.type === "ok"
              ? "border-lime-300/40 bg-[#d8ff3e] text-black"
              : flash.type === "warn"
                ? "border-orange-300/50 bg-orange-400 text-black"
                : "border-red-400/50 bg-red-500 text-white"
          }`}
        >
          <p className="text-2xl font-black uppercase tracking-tight sm:text-4xl">{flash.title}</p>
          <p className="mt-1 text-sm font-bold opacity-80 sm:text-base">{flash.subtitle}</p>
        </div>
      )}

      {/* Panel izquierdo — marca + collage del gym (reemplaza las fotos de Facebook) */}
      <section className="relative flex flex-col justify-center px-8 py-14 sm:px-14">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-10 lg:gap-14">
          <div className="grid h-14 w-14 place-items-center bg-[#0b0b0b] text-[#d8ff3e]">
            <Dumbbell className="h-8 w-8" />
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
            Entrena
            <br />
            lo que <span className="text-[#8fbf00]">más te</span>
            <br />
            gusta<span className="text-[#8fbf00]">.</span>
          </h1>

          <GymCollage occupancyPct={status?.occupancyPct ?? 0} level={status?.level ?? "—"} />
        </div>
      </section>

      {/* Panel derecho — selector de perfil (login sin PIN) */}
      <section className="relative flex flex-col justify-center bg-white px-8 py-14 sm:px-14 lg:border-l lg:border-black/10">
        <Link
          href="/admin"
          aria-label="Admin"
          className="absolute right-6 top-6 text-black/40 transition hover:text-black"
        >
          <Settings className="h-6 w-6" />
        </Link>

        <div className="mx-auto w-full max-w-sm">
          {isLoadingProfile ? (
            <div className="grid place-items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-black/40" />
            </div>
          ) : mode === "profile" && profile ? (
            <ProfileCard
              profile={profile}
              isCheckingIn={isCheckingIn}
              error={error}
              onContinue={() => void confirmCheckin()}
              onSwitch={() => {
                setMode("search");
                setError("");
              }}
            />
          ) : (
            <SearchCard
              query={query}
              setQuery={setQuery}
              isSearching={isSearching}
              error={error}
              recent={recent}
              hasProfile={Boolean(profile)}
              onSubmit={searchMember}
              onPickRecent={(name) => void selectProfile(name)}
              onBack={() => {
                setMode("profile");
                setError("");
              }}
            />
          )}
        </div>

        <p className="mx-auto mt-10 flex w-full max-w-sm items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-black/35">
          <Dumbbell className="h-4 w-4" /> Xtreme Gym
        </p>
      </section>
    </main>
  );
}

function ProfileCard({
  profile,
  isCheckingIn,
  error,
  onContinue,
  onSwitch,
}: {
  profile: MemberHit;
  isCheckingIn: boolean;
  error: string;
  onContinue: () => void;
  onSwitch: () => void;
}) {
  const expired = profile.membershipStatus === "expired";
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid h-36 w-36 place-items-center rounded-full bg-[#0b0b0b] text-[#d8ff3e] shadow-lg ring-4 ring-[#d8ff3e]/30">
        <span className="text-5xl font-black">{initials(profile.memberName)}</span>
        {profile.streak > 0 && (
          <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-1 rounded-full bg-[#d8ff3e] px-2.5 py-1 text-xs font-black text-black">
            <Flame className="h-3.5 w-3.5" /> {profile.streak}
          </span>
        )}
      </div>

      <h2 className="mt-6 text-2xl font-black uppercase tracking-tight">{profile.memberName}</h2>
      <p className="mt-1 text-sm font-bold text-black/45">
        {STATUS_LABEL[profile.membershipStatus]}
        {profile.daysRemaining >= 0 ? ` · ${profile.daysRemaining} dias` : " · vencida"} · {profile.plan}
      </p>

      {expired && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-left text-sm font-bold text-orange-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Membresia vencida. Podes ingresar, pero pasa por recepcion.
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={isCheckingIn}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0b0b0b] px-6 py-4 text-base font-black uppercase tracking-wide text-[#d8ff3e] transition hover:bg-[#1a1a1a] disabled:opacity-50"
      >
        {isCheckingIn ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        Continuar
      </button>

      <button
        type="button"
        onClick={onSwitch}
        className="mt-3 w-full rounded-full border border-black/15 px-6 py-4 text-base font-black uppercase tracking-wide text-black/70 transition hover:border-black/30 hover:text-black"
      >
        Usar otro perfil
      </button>

      <Link
        href="/admin"
        className="mt-6 w-full rounded-full border border-[#8fbf00]/40 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#6f9800] transition hover:border-[#8fbf00] hover:text-[#5c7d00]"
      >
        Registrar nuevo socio
      </Link>
    </div>
  );
}

function SearchCard({
  query,
  setQuery,
  isSearching,
  error,
  recent,
  hasProfile,
  onSubmit,
  onPickRecent,
  onBack,
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
}) {
  return (
    <div>
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-black/[0.04] text-black/60">
          <UserRound className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">Inicia tu ingreso</h2>
        <p className="mt-1 text-sm font-bold text-black/45">
          Escribe tu nombre, telefono o codigo de socio.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. Kengie Araya o 4821 9033"
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
                  {initials(p.memberName)}
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

/** Collage tipo Facebook, pero con escenas de gym en vez de fotos de personas. */
function GymCollage({ occupancyPct, level }: { occupancyPct: number; level: string }) {
  return (
    <div className="relative mx-auto hidden aspect-[4/3] w-full max-w-md sm:block">
      {/* Tarjeta principal — sesion en curso */}
      <div className="absolute right-4 top-0 h-64 w-44 -rotate-2 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b0b0b] via-[#1c1c1c] to-[#2b2b2b] shadow-2xl">
        <div className="flex h-full flex-col justify-between p-4">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#d8ff3e] px-2.5 py-1 text-xs font-black text-black">
            <Timer className="h-3.5 w-3.5" /> 16:45
          </span>
          <Dumbbell className="h-16 w-16 self-center text-[#d8ff3e]/80" />
          <p className="text-xs font-black uppercase tracking-widest text-white/70">
            Sesion en vivo
          </p>
        </div>
      </div>

      {/* Tarjeta ocupacion */}
      <div className="absolute left-0 top-10 h-40 w-40 rotate-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#d8ff3e] to-[#8fbf00] shadow-xl">
        <div className="flex h-full flex-col justify-between p-4 text-black">
          <Activity className="h-6 w-6" />
          <div>
            <p className="text-4xl font-black leading-none">{occupancyPct}%</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wide">{level}</p>
          </div>
        </div>
      </div>

      {/* Tarjeta ranking */}
      <div className="absolute bottom-2 left-10 h-36 w-36 -rotate-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b2b2b] to-[#0b0b0b] shadow-xl">
        <div className="flex h-full flex-col justify-between p-4">
          <Trophy className="h-6 w-6 text-[#d8ff3e]" />
          <p className="text-xs font-black uppercase tracking-widest text-white/70">
            Ranking
            <br />
            semanal
          </p>
        </div>
      </div>

      {/* Badges flotantes (reemplazan los emojis de reacciones de FB) */}
      <span className="absolute left-2 top-2 grid h-12 w-12 place-items-center rounded-full bg-white shadow-lg">
        <Flame className="h-6 w-6 text-orange-500" />
      </span>
      <span className="absolute bottom-16 right-2 grid h-12 w-12 place-items-center rounded-full bg-[#d8ff3e] shadow-lg">
        <Heart className="h-6 w-6 text-black" />
      </span>
      <span className="absolute bottom-0 right-16 grid h-11 w-11 place-items-center rounded-full bg-white shadow-lg">
        <Users className="h-5 w-5 text-[#0b0b0b]" />
      </span>
    </div>
  );
}
