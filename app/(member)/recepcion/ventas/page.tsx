"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, ChevronDown, Loader2, PackageOpen, Wallet, Wrench } from "lucide-react";
import ReceptionStorefront from "@/app/components/reception/ReceptionStorefront";
import SalesMonitoringPanel from "@/app/components/reception/SalesMonitoringPanel";
import CashCloseoutPanel from "@/app/components/reception/CashCloseoutPanel";
import { GameLabel } from "@/app/components/GameOS";
import StaffThemeToggle from "@/app/components/StaffThemeToggle";

type View = "sales" | "inventory" | "monitoring" | "closeout";

const VIEW_TITLE: Record<View, string> = {
  sales: "Nueva venta",
  inventory: "Inventario",
  monitoring: "Monitoreo de ventas",
  closeout: "Cierre de caja",
};

const TOOL_ITEMS = [
  { id: "inventory" as const, label: "Inventario", detail: "Existencias y precios", icon: PackageOpen },
  { id: "monitoring" as const, label: "Monitoreo", detail: "Ventas y movimientos", icon: Activity },
  { id: "closeout" as const, label: "Cierre de caja", detail: "Recaudado del día", icon: Wallet },
];

export default function ReceptionSalesPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [operatorName, setOperatorName] = useState("");
  const [view, setView] = useState<View>("sales");
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/xtreme/staff-session?surface=reception", {
          cache: "no-store",
        });
        const session = (await response.json()) as { authenticated?: boolean; staffName?: string };
        if (!cancelled) {
          setAuthenticated(response.ok && session.authenticated === true);
          setOperatorName(session.staffName ?? "");
        }
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toolsOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest("[data-tools-menu]")) setToolsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolsOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen]);

  if (authenticated === null) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#050505] text-white">
        <Loader2 className="h-9 w-9 animate-spin text-[#d8ff3e]" aria-label="Validando sesión" />
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#050505] px-4 text-white">
        <section className="max-w-md border-[3px] border-white/20 bg-[#0c0c0c] p-6 text-center shadow-[6px_6px_0_rgba(216,255,62,.16)]">
          <GameLabel tone="orange">Sesión requerida</GameLabel>
          <h1 className="mt-3 text-3xl font-black uppercase">Ingresá desde recepción</h1>
          <p className="mt-3 text-sm font-bold text-white/50">
            Esta página usa la misma sesión de recepción. Iniciá sesión ahí y luego abrí Inventario y ventas.
          </p>
          <Link href="/recepcion" className="mt-6 inline-flex min-h-12 items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-5 text-sm font-black uppercase text-black">
            <ArrowLeft className="h-4 w-4" /> Ir a recepción
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-white/20 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)]">
          <div>
            <GameLabel tone="lime">Sesión de recepción activa</GameLabel>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">{VIEW_TITLE[view]}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StaffThemeToggle />
            <div className="relative" data-tools-menu>
              <button
                type="button"
                onClick={() => setToolsOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={toolsOpen}
                className={`inline-flex min-h-11 items-center gap-2 border-[3px] px-3 text-xs font-black uppercase ${toolsOpen ? "border-[#d8ff3e] text-[#d8ff3e]" : "border-white/20 text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e]"}`}
              >
                <Wrench className="h-4 w-4" /> Herramientas <ChevronDown className={`h-4 w-4 transition ${toolsOpen ? "rotate-180" : ""}`} />
              </button>
              {toolsOpen && (
                <div role="menu" className="absolute right-0 z-30 mt-2 w-60 border-[3px] border-white/20 bg-[#0c0c0c] p-2 shadow-[6px_6px_0_rgba(0,0,0,.55)]">
                  {TOOL_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        onClick={() => { setView(item.id); setToolsOpen(false); }}
                        className={`flex w-full items-center gap-3 border-[3px] p-2 text-left ${active ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-transparent text-white/70 hover:border-white/20"}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>
                          <span className="block text-xs font-black uppercase">{item.label}</span>
                          <span className={`mt-0.5 block text-[10px] font-bold ${active ? "text-black/55" : "text-white/35"}`}>{item.detail}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Link href="/recepcion" className="inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-3 text-xs font-black uppercase text-white/65 hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e]">
              <ArrowLeft className="h-4 w-4" /> Recepción
            </Link>
          </div>
        </header>

        {view !== "sales" && (
          <button
            type="button"
            onClick={() => setView("sales")}
            className="mt-4 inline-flex min-h-12 items-center gap-2 border-[3px] border-[#d8ff3e] px-4 text-xs font-black uppercase text-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a Nueva venta
          </button>
        )}

        <section className="mt-4 min-w-0 border-[3px] border-white/20 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.55)] sm:p-6 xl:p-8">
          {view === "monitoring" ? <SalesMonitoringPanel /> : view === "closeout" ? <CashCloseoutPanel /> : <ReceptionStorefront mode={view} operatorName={operatorName} />}
        </section>
      </div>
    </main>
  );
}
