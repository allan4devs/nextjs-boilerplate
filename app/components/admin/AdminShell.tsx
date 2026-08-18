"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ClipboardList,
  Database,
  DoorOpen,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameDockItem,
  GameHudPill,
  GameLabel,
} from "../GameOS";
import StaffThemeToggle from "../StaffThemeToggle";
import { ADMIN_TABS } from "./constants";
import { useAdmin } from "./context/AdminProvider";

function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    auth: { role, staffName, codeInput, setCodeInput },
    data: { data, isLoading, load },
    feedback: { busy, setBusy, error, setError, message, setMessage },
    login,
    logout,
    isBusy,
    isRestoringSession,
  } = useAdmin();

  const isSuper = data?.role === "super";
  const visibleTabs = ADMIN_TABS.filter((item) => !item.superOnly || isSuper);
  const activeTab = ADMIN_TABS.find((item) => isActiveRoute(pathname, item.href)) ?? ADMIN_TABS[0];
  const blockedRoute = Boolean(data && activeTab.superOnly && !isSuper);

  useEffect(() => {
    if (blockedRoute) router.replace("/admin");
  }, [blockedRoute, router]);

  async function seed(wipeAll: boolean) {
    if (!role) return;
    setBusy(wipeAll ? "reset" : "seed");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wipeAll }),
      });
      const json = (await response.json()) as {
        insertedMembers?: number;
        insertedPayments?: number;
        pin?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error ?? "No se pudo generar el seed.");
      setMessage(
        `Listo: ${json.insertedMembers} socios, ${json.insertedPayments ?? 0} pagos demo. PIN: ${json.pin}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el seed.");
    } finally {
      setBusy("");
    }
  }

  if (!role) {
    if (isRestoringSession) {
      return (
        <main className="xg-os-login-shell grid bg-[#050505] text-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#d8ff3e]" />
            <p className="mt-3 text-xs font-black uppercase tracking-[.18em] text-white/40">
              Recuperando sesión de admin
            </p>
          </div>
        </main>
      );
    }
    return (
      <main className="xg-os-login-shell grid bg-[#050505] text-white">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (codeInput.trim()) void login();
          }}
          className="w-full max-w-md border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-6 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-7"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
            <Lock className="h-7 w-7" />
          </div>
          <GameLabel tone="lime" className="mt-4">
            Admin OS
          </GameLabel>
          <h1 className="mt-2 text-2xl font-black uppercase">Panel Xtreme</h1>
          <p className="mt-2 text-sm font-bold text-white/55">
            Acceso para entrenadora personal y administración del gym.
          </p>
          <input
            type="password"
            autoComplete="current-password"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="Código de acceso"
            className="mt-5 min-h-12 w-full border-[3px] border-white/20 bg-black/40 px-4 py-3 text-center font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
          />
          {error && (
            <div className="mt-3 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
              {error}
            </div>
          )}
          <GameButton type="submit" full className="mt-5" disabled={isBusy}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </GameButton>
          <p className="mt-5 text-xs font-semibold text-white/35">
            Si no tenés el código, pedilo a la administración del gym.
          </p>
        </form>
      </main>
    );
  }

  const today = data?.today;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="xg-safe-top sticky top-0 z-30 border-b-[3px] border-white/15 bg-[#050505]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <GameLabel tone="lime">Xtreme · Admin OS</GameLabel>
              {isSuper ? (
                <GameChip tone="yellow">
                  <ShieldCheck className="mr-1 inline h-3 w-3" /> Super
                </GameChip>
              ) : (
                <GameChip>
                  <Shield className="mr-1 inline h-3 w-3" /> Admin
                </GameChip>
              )}
            </div>
            <h1 className="mt-1 text-xl font-black uppercase tracking-tight sm:text-3xl">
              {activeTab.label}
            </h1>
            {staffName && (
              <p className="mt-1 text-xs font-black uppercase tracking-[.16em] text-[#d8ff3e]">
                Sesión de {staffName}
              </p>
            )}
            <p className="mt-1 hidden text-sm font-bold text-white/50 sm:block">
              Panel de administración · cada herramienta tiene su propia página
            </p>
            {data && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <GameHudPill icon={Users} label="Socios" value={data.totals.memberCount} tone="lime" />
                <GameHudPill icon={DoorOpen} label="Hoy" value={data.today.checkinsToday} tone="cyan" />
                <GameHudPill icon={Activity} label="Gym" value={`${today?.occupancyPct ?? 0}%`} tone="orange" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StaffThemeToggle />
            <Link
              href="/entrenador"
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase text-cyan-200 sm:text-sm"
            >
              <ClipboardList className="h-4 w-4" /> Trainer OS
            </Link>
            <Link
              href="/recepcion"
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-3 py-2 text-xs font-black uppercase text-[#eaff93] sm:text-sm"
            >
              <DoorOpen className="h-4 w-4" /> Reception OS
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading || Boolean(busy)}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/80 disabled:opacity-50 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>
            {process.env.NODE_ENV !== "production" && (
              <>
                <button
                  type="button"
                  onClick={() => void seed(false)}
                  disabled={Boolean(busy)}
                  className="hidden min-h-11 items-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] px-3 py-2 text-xs font-black uppercase text-black disabled:opacity-50 sm:inline-flex sm:text-sm"
                >
                  {busy === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Seed
                </button>
                <button
                  type="button"
                  onClick={() => void seed(true)}
                  disabled={Boolean(busy)}
                  className="hidden min-h-11 items-center gap-2 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-200 disabled:opacity-50 md:inline-flex md:text-sm"
                >
                  {busy === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  Reset
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/60 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </section>

      <nav
        className="xg-app-dock xg-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t-[3px] border-white/20 bg-[#0a0a0a]/98 backdrop-blur-md lg:hidden"
        aria-label="Páginas de administración"
      >
        {visibleTabs.map((item) => (
          <GameDockItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={activeTab.id === item.id}
            onClick={() => router.push(item.href)}
          />
        ))}
      </nav>

      <section className="xg-os-content mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        <nav className="hidden flex-wrap gap-2 lg:flex" aria-label="Páginas de administración">
          {visibleTabs.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={activeTab.id === item.id ? "page" : undefined}
              className={`border-[3px] px-4 py-2 text-xs font-black uppercase transition ${
                activeTab.id === item.id
                  ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                  : "border-white/20 bg-[#0c0c0c] text-white/60 hover:border-white/40 hover:text-white"
              }`}
            >
              {item.id === "accesos" ? "Accesos hoy" : item.id === "gamificacion" ? "Gamificación" : item.label}
            </Link>
          ))}
        </nav>

        <div className="border-[3px] border-white/15 bg-[#0c0c0c] px-3 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] lg:hidden">
          <GameLabel tone="lime">Página activa</GameLabel>
          <p className="mt-1 text-lg font-black uppercase">{activeTab.label}</p>
        </div>

        {(message || error) && <GameCallout tone={error ? "red" : "lime"}>{error || message}</GameCallout>}

        {isLoading && !data ? (
          <div className="grid min-h-[360px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]">
            <Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" />
          </div>
        ) : data && !blockedRoute ? (
          children
        ) : null}
      </section>
    </main>
  );
}
