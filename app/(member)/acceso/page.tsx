"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  DoorOpen,
  Dumbbell,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import type { StaffRole } from "@/lib/xtreme/shared";

type StaffSurface = "admin" | "reception" | "ingreso" | "trainer";
type StaffState = Record<StaffSurface, { authenticated: boolean; role: StaffRole | null }>;

const STAFF_SYSTEMS: Array<{
  id: StaffSurface;
  name: string;
  description: string;
  href: string;
  icon: typeof Shield;
  tone: string;
}> = [
  { id: "admin", name: "Admin OS", description: "Socios, pagos, métricas y configuración.", href: "/admin", icon: Shield, tone: "border-violet-300/45 text-violet-200" },
  { id: "reception", name: "Reception OS", description: "Check-in, atención y operación diaria.", href: "/recepcion", icon: Users, tone: "border-cyan-300/45 text-cyan-200" },
  { id: "ingreso", name: "Ingreso OS", description: "Modo rápido para la puerta del gimnasio.", href: "/ingreso", icon: DoorOpen, tone: "border-orange-300/45 text-orange-200" },
  { id: "trainer", name: "Trainer OS", description: "Planes y seguimiento de entrenamientos.", href: "/entrenador", icon: Dumbbell, tone: "border-[#d8ff3e]/45 text-[#eaff93]" },
];

const EMPTY_STAFF: StaffState = {
  admin: { authenticated: false, role: null },
  reception: { authenticated: false, role: null },
  ingreso: { authenticated: false, role: null },
  trainer: { authenticated: false, role: null },
};

function roleAllows(role: StaffRole | null, surface: StaffSurface) {
  if (!role) return false;
  if (surface === "trainer") return role === "trainer";
  if (surface === "admin") return role === "admin" || role === "super";
  return role === "reception" || role === "admin" || role === "super";
}

export default function AccessHubPage() {
  const [staff, setStaff] = useState<StaffState>(EMPTY_STAFF);
  const [memberActive, setMemberActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<StaffSurface | null>(null);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [memberResponse, ...staffResponses] = await Promise.all([
        fetch("/api/xtreme/session", { cache: "no-store" }),
        ...STAFF_SYSTEMS.map((system) =>
          fetch(`/api/xtreme/staff-session?surface=${system.id}`, { cache: "no-store" }),
        ),
      ]);
      const memberJson = (await memberResponse.json()) as { authenticated?: boolean };
      const nextStaff = { ...EMPTY_STAFF };
      await Promise.all(
        staffResponses.map(async (response, index) => {
          const json = (await response.json()) as { authenticated?: boolean; role?: StaffRole | null };
          const surface = STAFF_SYSTEMS[index].id;
          nextStaff[surface] = {
            authenticated: Boolean(json.authenticated),
            role: json.role ?? null,
          };
        }),
      );
      setMemberActive(Boolean(memberJson.authenticated));
      setStaff(nextStaff);
    } catch {
      setError("No pudimos revisar tus accesos. Intentá actualizar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const activeRoles = useMemo(
    () => Array.from(new Set(Object.values(staff).filter((entry) => entry.authenticated).map((entry) => entry.role).filter(Boolean))) as StaffRole[],
    [staff],
  );

  async function openStaffSystem(surface: StaffSurface, href: string) {
    if (staff[surface].authenticated) {
      window.location.href = href;
      return;
    }
    const canBridge = activeRoles.some((role) => roleAllows(role, surface));
    if (!canBridge) {
      window.location.href = href;
      return;
    }

    setOpening(surface);
    setError("");
    try {
      const response = await fetch("/api/xtreme/staff-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSurface: surface }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error || "No se pudo abrir el sistema.");
      window.location.href = href;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el sistema.");
      setOpening(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-6 text-white sm:px-6 sm:py-10">
      <div aria-hidden className="xg-atmosphere" />
      <div className="relative mx-auto max-w-6xl">
        <header className="border-[3px] border-[#d8ff3e]/45 bg-[#0b0b0b] p-5 shadow-[7px_7px_0_rgba(216,255,62,.12)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#d8ff3e]">Xtreme · Centro de sistemas</p>
              <h1 className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-5xl">¿A dónde querés entrar?</h1>
              <p className="mt-3 max-w-2xl text-sm font-bold text-white/45">Tus sesiones activas aparecen primero. Si tu rol permite otra área, la abrimos sin pedirte el código otra vez.</p>
            </div>
            <button type="button" onClick={() => void loadSessions()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/15 px-3 text-[10px] font-black uppercase text-white/55 transition hover:border-white/35 hover:text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase">
            {memberActive && <span className="inline-flex items-center gap-1.5 bg-[#d8ff3e] px-3 py-2 text-black"><Check className="h-3.5 w-3.5" /> Socio conectado</span>}
            {activeRoles.map((role) => <span key={role} className="inline-flex items-center gap-1.5 border-2 border-white/15 px-3 py-2 text-white/65"><Check className="h-3.5 w-3.5 text-[#d8ff3e]" /> {role}</span>)}
            {!loading && !memberActive && activeRoles.length === 0 && <span className="border-2 border-orange-300/30 px-3 py-2 text-orange-200/70">Elegí un sistema para iniciar sesión</span>}
          </div>
        </header>

        {error && <p className="mt-4 border-[3px] border-red-400/45 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

        <section className="mt-5 grid gap-3 md:grid-cols-2">
          <article className="border-[3px] border-[#d8ff3e]/45 bg-gradient-to-br from-[#d8ff3e]/[.09] to-[#0b0b0b] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><Smartphone className="h-8 w-8 text-[#d8ff3e]" />{memberActive && <span className="bg-[#d8ff3e] px-2 py-1 text-[9px] font-black uppercase text-black">Sesión activa</span>}</div>
            <h2 className="mt-5 text-2xl font-black uppercase">Member OS</h2>
            <p className="mt-2 text-sm font-bold text-white/45">Entrenos, progreso, membresía y comunidad.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/app" className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#d8ff3e] px-3 text-xs font-black uppercase text-black">Abrir app <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/app/comunidad" className="inline-flex min-h-12 items-center justify-center gap-2 border-[3px] border-white/15 px-3 text-xs font-black uppercase text-white/65">Comunidad</Link>
            </div>
          </article>

          {STAFF_SYSTEMS.map((system) => {
            const Icon = system.icon;
            const active = staff[system.id].authenticated;
            const canBridge = !active && activeRoles.some((role) => roleAllows(role, system.id));
            return (
              <article key={system.id} className={`border-[3px] bg-[#0b0b0b] p-5 sm:p-6 ${system.tone}`}>
                <div className="flex items-start justify-between gap-3"><Icon className="h-8 w-8" />{active ? <span className="bg-white px-2 py-1 text-[9px] font-black uppercase text-black">Sesión activa</span> : canBridge ? <span className="border-2 border-current/30 px-2 py-1 text-[9px] font-black uppercase">Permitido por tu rol</span> : null}</div>
                <h2 className="mt-5 text-2xl font-black uppercase text-white">{system.name}</h2>
                <p className="mt-2 text-sm font-bold text-white/45">{system.description}</p>
                <button type="button" onClick={() => void openStaffSystem(system.id, system.href)} disabled={opening !== null} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-white px-4 text-xs font-black uppercase text-black transition hover:bg-[#d8ff3e] disabled:opacity-50">
                  {opening === system.id ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? "Abrir sistema" : canBridge ? "Entrar con mi sesión" : "Ingresar código"}
                  {opening !== system.id && <ArrowRight className="h-4 w-4" />}
                </button>
              </article>
            );
          })}
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 text-xs font-bold text-white/35">
          <span>Las opciones cambian automáticamente según la sesión conectada.</span>
          <Link href="/" className="inline-flex items-center gap-2 font-black uppercase text-white/60 hover:text-white"><LayoutDashboard className="h-4 w-4" /> Volver al sitio</Link>
        </footer>
      </div>
    </main>
  );
}

