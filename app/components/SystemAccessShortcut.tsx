"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

function isInternalSurface(pathname: string) {
  return ["/app", "/admin", "/recepcion", "/ingreso", "/entrenador"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isMemberOs(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/**
 * Atajo flotante a /acceso.
 * En Member OS mobile NO se muestra: el selector de sistemas vive en el sidebar
 * (evita chocar con notch / controles del iPhone).
 * En desktop y en superficies staff sigue visible, con safe-area.
 */
export default function SystemAccessShortcut() {
  const pathname = usePathname() || "";
  if (pathname === "/acceso" || !isInternalSurface(pathname)) return null;

  // Mobile Member OS: sistemas van en el drawer (SideNav). Solo desktop.
  if (isMemberOs(pathname)) {
    return (
      <Link
        href="/acceso"
        aria-label="Abrir centro de sistemas"
        title="Todos los sistemas"
        className="xg-system-shortcut fixed right-3 z-[80] hidden h-11 items-center gap-2 border-[3px] border-[#d8ff3e]/60 bg-black/90 px-3 text-[10px] font-black uppercase tracking-[.12em] text-[#d8ff3e] shadow-[4px_4px_0_rgba(0,0,0,.5)] backdrop-blur transition hover:border-white hover:text-white lg:inline-flex sm:right-4"
      >
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span>Sistemas</span>
      </Link>
    );
  }

  // Staff: visible en mobile también, pero más abajo (safe-area) para no picar el notch.
  return (
    <Link
      href="/acceso"
      aria-label="Abrir centro de sistemas"
      title="Todos los sistemas"
      className="xg-system-shortcut fixed right-3 z-[80] inline-flex h-11 items-center gap-2 border-[3px] border-[#d8ff3e]/60 bg-black/90 px-3 text-[10px] font-black uppercase tracking-[.12em] text-[#d8ff3e] shadow-[4px_4px_0_rgba(0,0,0,.5)] backdrop-blur transition hover:border-white hover:text-white sm:right-4"
    >
      <LayoutGrid className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Sistemas</span>
    </Link>
  );
}
