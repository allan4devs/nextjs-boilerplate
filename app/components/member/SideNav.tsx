"use client";

/**
 * Navegacion lateral (desktop colapsable + drawer mobile):
 * tabs del OS, perfil del socio y mini-login por cedula.
 */

import Link from "next/link";
import { ArrowRight, House, UserRound, X } from "lucide-react";
import { GameButton } from "../GameOS";
import Avatar from "./Avatar";
import { TABS } from "./constants";
import { formatCedulaInput } from "./utils";
import type { MemberOs } from "./useMemberOs";

export default function SideNav({ os }: { os: MemberOs }) {
  const {
    tab,
    setTab,
    navOpen,
    setNavOpen,
    setOsModal,
    memberName,
    currentMember,
    showLogin,
    setShowLogin,
    memberNameInput,
    setMemberNameInput,
    memberCedulaInput,
    setMemberCedulaInput,
    memberPhoneInput,
    setMemberPhoneInput,
    memberEmailInput,
    needsRegistration,
    startMemberByCedula,
    resetMember,
  } = os;

  return (
    <>
      {navOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r-[3px] border-white/15 bg-[#090909] shadow-[8px_0_0_rgba(0,0,0,.45)] transition-[width,transform] duration-300 ${
          navOpen ? "translate-x-0 lg:w-[240px]" : "-translate-x-full lg:w-[72px] lg:translate-x-0"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b-[3px] border-white/15 bg-[#d8ff3e]/10 px-3">
          <div className={navOpen ? "block" : "lg:hidden"}>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#d8ff3e]">Xtreme Gym</p>
            <p className="text-sm font-black uppercase">Member OS</p>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="grid h-10 w-10 place-items-center border-[3px] border-white/15 text-white/60 lg:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Perfil arriba del menú (no abajo del todo) */}
        <div className="border-b-[3px] border-white/15 p-2">
          {memberName ? (
            <button
              type="button"
              title="Ver perfil"
              data-tour="tab-perfil"
              onClick={() => {
                setTab("perfil");
                setNavOpen(false);
                setOsModal(null);
              }}
              className={`flex h-14 w-full items-center gap-3 border-[3px] px-2 text-left transition ${
                tab === "perfil"
                  ? "border-[#d8ff3e] bg-[#d8ff3e]/15"
                  : "border-white/10 hover:border-[#d8ff3e]/40 hover:bg-white/[.05]"
              }`}
            >
              <Avatar name={memberName} photoUrl={currentMember.photoUrl} className="h-11 w-11" textClass="text-xs" />
              <span className={`min-w-0 flex-1 ${navOpen ? "block" : "lg:hidden"}`}>
                <span className="block truncate text-xs font-black uppercase">{memberName}</span>
                <span className="text-[11px] font-bold text-[#d8ff3e]">Ver perfil</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!navOpen) {
                  setNavOpen(true);
                  setShowLogin(true);
                } else {
                  setShowLogin((value) => !value);
                }
              }}
              aria-expanded={showLogin}
              title="Entrar a mi perfil"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] px-2 text-sm font-black uppercase text-black"
            >
              <UserRound className="h-4 w-4 shrink-0" />
              <span className={navOpen ? "block" : "lg:hidden"}>Entrar a mi perfil</span>
            </button>
          )}

          {!memberName && showLogin && navOpen && (
            <form
              className="mt-3 grid gap-2 border-[3px] border-white/15 bg-black/40 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                setShowLogin(false);
                setNavOpen(false);
                void startMemberByCedula(memberCedulaInput, false, {
                  name: memberNameInput,
                  phone: memberPhoneInput,
                  email: memberEmailInput,
                });
              }}
            >
              <input
                value={memberCedulaInput}
                onChange={(event) => setMemberCedulaInput(formatCedulaInput(event.target.value))}
                placeholder="Cedula (escanear o digitar)"
                inputMode="numeric"
                autoFocus
                className="min-w-0 border-[3px] border-white/15 bg-black/45 px-4 py-3 text-center font-black tracking-widest text-white outline-none transition placeholder:tracking-normal placeholder:text-white/35 focus:border-[#d8ff3e]"
              />
              {needsRegistration && (
                <>
                  <input
                    value={memberNameInput}
                    onChange={(event) => setMemberNameInput(event.target.value)}
                    placeholder="Nombre si es nuevo"
                    className="min-w-0 border-[3px] border-white/15 bg-black/45 px-4 py-3 font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
                  />
                  <input
                    value={memberPhoneInput}
                    onChange={(event) => setMemberPhoneInput(event.target.value)}
                    placeholder="Telefono si es nuevo"
                    inputMode="tel"
                    className="border-[3px] border-white/15 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
                  />
                </>
              )}
              <GameButton type="submit" full>
                Entrar <ArrowRight className="h-4 w-4" />
              </GameButton>
            </form>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {TABS.filter((item) => item.id !== "perfil").map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tour={`tab-${item.id}`}
                title={item.label}
                onClick={() => {
                  setTab(item.id);
                  setNavOpen(false);
                  setOsModal(null);
                }}
                className={`flex h-14 w-full items-center gap-3 border-[3px] px-3 text-left text-xs font-black uppercase tracking-[.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${
                  active
                    ? "border-[#d8ff3e] bg-[#d8ff3e]/15 text-[#d8ff3e] shadow-[0_0_18px_rgba(216,255,62,0.18)]"
                    : "border-transparent text-white/50 hover:border-white/15 hover:bg-white/[.05] hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={navOpen ? "block" : "lg:hidden"}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t-[3px] border-white/15 p-2">
          <Link
            href="/"
            title="Ir al sitio Xtreme Gym"
            onClick={() => setNavOpen(false)}
            className="flex min-h-12 w-full items-center justify-center gap-3 border-[3px] border-white/10 px-2 text-xs font-black uppercase tracking-[.1em] text-white/50 transition hover:border-[#d8ff3e]/40 hover:text-white"
          >
            <House className="h-4 w-4 shrink-0" />
            <span className={navOpen ? "block" : "lg:hidden"}>Sitio web</span>
          </Link>
          {memberName && (
            <button
              type="button"
              onClick={() => {
                setNavOpen(false);
                setShowLogin(false);
                resetMember();
              }}
              title="Cerrar sesion"
              className={`mt-3 w-full border-[3px] border-red-400/25 py-2 text-xs font-black uppercase text-red-200/70 transition hover:border-red-400/50 hover:text-red-200 ${
                navOpen ? "block" : "lg:hidden"
              }`}
            >
              Cerrar sesion
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
