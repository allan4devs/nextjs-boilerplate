"use client";

/**
 * Pantalla de entrada sin sesion: login por cedula
 * (lector de barras USB tipo teclado, o digitada a mano).
 * Si la cedula no existe pide nombre + telefono para el alta.
 */

import Link from "next/link";
import { ArrowLeft, ArrowRight, CreditCard } from "lucide-react";
import { GameButton, GameCallout, GameLabel } from "../GameOS";
import { formatCedulaInput } from "./utils";
import type { MemberOs } from "./useMemberOs";

export default function CedulaLoginGate({ os }: { os: MemberOs }) {
  const {
    memberNameInput,
    setMemberNameInput,
    memberCedulaInput,
    setMemberCedulaInput,
    memberPhoneInput,
    setMemberPhoneInput,
    memberEmailInput,
    setMemberEmailInput,
    needsRegistration,
    setNeedsRegistration,
    cedulaInputRef,
    error,
    setError,
    startMemberByCedula,
  } = os;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <form
        className="w-full max-w-[400px] border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-5 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void startMemberByCedula(memberCedulaInput, false, {
            name: memberNameInput,
            phone: memberPhoneInput,
            email: memberEmailInput,
          });
        }}
      >
        <div className="mx-auto grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
          <CreditCard className="h-8 w-8" />
        </div>
        <GameLabel tone="lime" className="mt-4">
          Member OS · Cedula
        </GameLabel>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">Escanee su cédula</h2>
        <p className="mt-2 text-sm font-bold text-white/55">
          Pase el carnet por el lector o digite los números. Luego confirma con su PIN.
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

          {needsRegistration && (
            <>
              <GameCallout tone="orange">
                Primera vez: complete nombre y teléfono para ligar esta cédula a su perfil.
              </GameCallout>
              <input
                value={memberNameInput}
                onChange={(event) => setMemberNameInput(event.target.value)}
                placeholder="Nombre completo"
                className="min-h-12 min-w-0 border-[3px] border-white/20 bg-black/50 px-4 py-3 font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
              />
              <input
                value={memberPhoneInput}
                onChange={(event) => setMemberPhoneInput(event.target.value)}
                placeholder="Telefono"
                inputMode="tel"
                className="min-h-12 border-[3px] border-white/15 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
              />
              <input
                value={memberEmailInput}
                onChange={(event) => setMemberEmailInput(event.target.value)}
                placeholder="Correo opcional"
                type="email"
                className="min-h-12 border-[3px] border-white/15 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
              />
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-left text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <GameButton type="submit" full className="mt-4">
          {needsRegistration ? "Crear perfil y entrar" : "Entrar"} <ArrowRight className="h-4 w-4" />
        </GameButton>
        <p className="mt-3 px-1 text-xs font-semibold text-white/38">
          Lector USB tipo teclado: escanee y el sistema recibe la cédula + Enter. Si es socio
          nuevo, se pedirá nombre y teléfono.
        </p>
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
