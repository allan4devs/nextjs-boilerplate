"use client";

/**
 * Pantalla de entrada sin sesion: login por cedula
 * (lector de barras USB tipo teclado, o digitada a mano).
 * Alta pública cerrada: sin enlace mágico no se crea cuenta ni PIN.
 */

import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { GameButton, GameLabel } from "../GameOS";
import { MSG } from "./constants";
import { formatCedulaInput } from "./utils";
import type { MemberOs } from "./useMemberOs";

function loginErrorHint(error: string): string | null {
  if (error === MSG.errors.cedulaNotRegistered) {
    return "Activá la cuenta con correo o cédula, o pedí el alta en recepción.";
  }
  if (error === MSG.errors.cedulaNeedsInvite) {
    return "Activá con el enlace del correo o tocá «Activar cuenta» abajo para cargar tus datos y crear el PIN.";
  }
  if (error.startsWith("Cédula incompleta")) {
    return "Escaneá el carnet o digitá todos los números.";
  }
  return null;
}

export default function CedulaLoginGate({ os }: { os: MemberOs }) {
  const {
    memberCedulaInput,
    setMemberCedulaInput,
    needsRegistration,
    setNeedsRegistration,
    cedulaInputRef,
    error,
    setError,
    startMemberByCedula,
  } = os;

  const hint = error ? loginErrorHint(error) : null;
  const showHelpLinks =
    needsRegistration ||
    error === MSG.errors.cedulaNotRegistered ||
    error === MSG.errors.cedulaNeedsInvite;
  const registerHref = memberCedulaInput
    ? `/primer-dia?cedula=${encodeURIComponent(memberCedulaInput.replace(/\D/g, ""))}#registro`
    : "/primer-dia#registro";

  return (
    <div className="xg-os-login-shell fixed inset-0 z-50 grid bg-black/90 backdrop-blur-md">
      <div aria-hidden className="xg-atmosphere" />
      <form
        className="xg-corners relative w-full max-w-[400px] overflow-hidden border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-5 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25),0_0_70px_rgba(216,255,62,0.18)] sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void startMemberByCedula(memberCedulaInput, false);
        }}
      >
        <span aria-hidden className="xg-scanline" />
        <div className="xg-glow-breathe mx-auto grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
          <CreditCard className="h-8 w-8" />
        </div>
        <GameLabel tone="lime" className="mt-4">
          Member OS · Cedula
        </GameLabel>
        <h2 className="xg-text-glow mt-2 text-2xl font-black uppercase text-white">
          Escaneá tu cédula
        </h2>
        <p className="mt-2 text-sm font-bold text-white/55">
          Escaneá o digitá · después tu PIN
        </p>

        <div className="mt-6 grid gap-2 text-left">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
              Cédula
            </span>
            <div className="relative mt-1.5">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
              <input
                ref={cedulaInputRef}
                value={memberCedulaInput}
                onChange={(event) => {
                  setMemberCedulaInput(formatCedulaInput(event.target.value));
                  setNeedsRegistration(false);
                  setError("");
                }}
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="1-2345-6789"
                className="min-h-14 w-full border-[3px] border-white/20 bg-black/50 py-3 pl-11 pr-3 text-center text-xl font-black tracking-[0.18em] text-white outline-none transition placeholder:text-sm placeholder:tracking-normal placeholder:text-white/35 focus:border-[#d8ff3e]"
              />
            </div>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 border-[3px] border-red-400/45 bg-red-500/10 px-3 py-2.5 text-left"
          >
            <p className="text-sm font-black text-red-200">{error}</p>
            {hint && (
              <p className="mt-1 text-xs font-semibold leading-snug text-red-100/70">{hint}</p>
            )}
          </div>
        )}

        <GameButton type="submit" full className="mt-4">
          Entrar <ArrowRight className="h-4 w-4" />
        </GameButton>

        {showHelpLinks ? (
          <div className="mt-4 grid gap-2">
            <Link
              href={registerHref}
              className="border-[3px] border-white/15 bg-black/40 px-3 py-2.5 text-center text-xs font-black uppercase tracking-wide text-[#d8ff3e] transition hover:border-[#d8ff3e]"
            >
              Activar cuenta · correo o cédula
            </Link>
            <Link
              href="/precios"
              className="border-[3px] border-white/10 px-3 py-2.5 text-center text-xs font-black uppercase tracking-wide text-white/55 transition hover:border-white/30 hover:text-white"
            >
              Ver planes
            </Link>
          </div>
        ) : (
          <p className="mt-3 px-1 text-xs font-semibold text-white/38">
            Primera vez: enlace del correo, cédula en registro o recepción.
          </p>
        )}

        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Ir al sitio Xtreme Gym
        </Link>
      </form>
    </div>
  );
}
