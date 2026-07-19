"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DoorOpen,
  Dumbbell,
  LayoutDashboard,
  LayoutGrid,
  Shield,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

export type SystemLinkItem = {
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

/** Catálogo de superficies del ecosistema Xtreme (Member + staff). */
export const SYSTEM_LINKS: SystemLinkItem[] = [
  {
    href: "/app",
    label: "Member OS",
    short: "Socios",
    icon: Smartphone,
    match: (p) => p === "/app" || p.startsWith("/app/"),
  },
  {
    href: "/recepcion",
    label: "Recepción",
    short: "Mostrador",
    icon: Users,
    match: (p) => p === "/recepcion" || p.startsWith("/recepcion/"),
  },
  {
    href: "/ingreso",
    label: "Ingreso",
    short: "Puerta",
    icon: DoorOpen,
    match: (p) => p === "/ingreso" || p.startsWith("/ingreso/"),
  },
  {
    href: "/entrenador",
    label: "Entrenador",
    short: "Coach",
    icon: Dumbbell,
    match: (p) => p === "/entrenador" || p.startsWith("/entrenador/"),
  },
  {
    href: "/admin",
    label: "Admin",
    short: "Ops",
    icon: Shield,
    match: (p) => p === "/admin" || p.startsWith("/admin/"),
  },
  {
    href: "/acceso",
    label: "Centro de sistemas",
    short: "Todos",
    icon: LayoutGrid,
    match: (p) => p === "/acceso",
  },
];

/**
 * Lista compacta de sistemas con iconos - para sidebar mobile / menús internos.
 */
export default function SystemLinks({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  /** true = solo icono + etiqueta corta (rail colapsado desktop). */
  compact?: boolean;
}) {
  const pathname = usePathname() || "";

  return (
    <div className="space-y-1">
      {!compact && (
        <p className="px-1 pb-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
          Sistemas
        </p>
      )}
      {SYSTEM_LINKS.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            onClick={() => onNavigate?.()}
            className={`flex min-h-11 w-full items-center gap-2.5 border-[2px] px-2.5 text-left transition ${
              active
                ? "border-[#d8ff3e]/70 bg-[#d8ff3e]/12 text-[#eaff93]"
                : "border-transparent text-white/55 hover:border-white/15 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center border ${
                active ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/15" : "border-white/12 bg-black/40"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            {compact ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-black uppercase tracking-wide">
                  {item.label}
                </span>
                <span className="block truncate text-[10px] font-semibold text-white/35">
                  {item.short}
                </span>
              </span>
            )}
            {active && !compact && (
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0 text-[#d8ff3e]" aria-hidden />
            )}
          </Link>
        );
      })}
    </div>
  );
}
