"use client";

import { ExternalLink, HeartPulse, ShieldCheck } from "lucide-react";
import { GameButton, GameLabel } from "../../GameOS";
import type { MemberOs } from "../useMemberOs";

/** Entrada al partner: el endpoint del servidor emite el token SSO justo al tocar. */
export default function KinetiaTab({ os }: { os: MemberOs }) {
  if (!os.unlocked) {
    return (
      <div className="xg-tab-in grid min-h-[280px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c] p-6 text-center">
        <div>
          <HeartPulse className="mx-auto h-9 w-9 text-cyan-300" />
          <p className="mt-3 text-sm font-black uppercase">Kinetia</p>
          <p className="mt-2 max-w-sm text-sm font-semibold text-white/55">Desbloqueá tu sesión con el PIN para entrar a nutrición y hábitos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="xg-tab-in mx-auto max-w-3xl space-y-4">
      <section className="relative overflow-hidden border-[3px] border-cyan-300/45 bg-gradient-to-br from-cyan-300/[.14] via-[#0b0b0b] to-[#d8ff3e]/[.08] p-5 shadow-[6px_6px_0_rgba(34,211,238,.13)] sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative">
          <GameLabel tone="cyan">Nuevo partner Xtreme</GameLabel>
          <h1 className="mt-3 text-3xl font-black uppercase sm:text-5xl">Nutrición y hábitos</h1>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/60 sm:text-base">
            Entrá a Kinetia para continuar con tu acompañamiento de nutrición y bienestar. Usaremos tu sesión actual de Xtreme para que no tengás que crear otro login.
          </p>
          <a href="/api/kinesia" className="mt-6 inline-block">
            <GameButton type="button">Abrir Kinetia <ExternalLink className="h-4 w-4" /></GameButton>
          </a>
        </div>
      </section>
      <div className="flex items-start gap-3 border-2 border-white/10 bg-white/[.03] p-4 text-xs font-bold text-white/50">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#d8ff3e]" />
        <p>El acceso se genera al tocar el botón, vence rápidamente y se usa una sola vez. Kinetia recibe tus datos de socio únicamente para iniciar tu cuenta.</p>
      </div>
    </div>
  );
}
