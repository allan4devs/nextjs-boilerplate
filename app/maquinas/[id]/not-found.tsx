import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function MachineNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid h-16 w-16 place-items-center border-[3px] border-[#d8ff3e]/40 bg-[#0c0c0c] text-[#d8ff3e] shadow-[4px_4px_0_rgba(0,0,0,0.6)]">
        <SearchX className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-[clamp(1.8rem,5vw,2.75rem)] font-black uppercase leading-none tracking-[-0.02em]">
        Esa máquina no está en el catálogo
      </h1>
      <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-white/60">
        Puede que el QR esté desactualizado o que el enlace tenga un error. Volvé al catálogo y
        buscá el equipo por zona.
      </p>
      <Link
        href="/maquinas"
        className="mt-8 inline-flex min-h-11 items-center gap-2 border-2 border-[#d8ff3e]/50 bg-[#d8ff3e]/10 px-4 text-[11px] font-black uppercase tracking-[0.1em] text-[#eaff93] transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e]/20 focus-visible:border-[#d8ff3e] focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Ver todas las máquinas
      </Link>
    </div>
  );
}
