"use client";

/**
 * Navegacion lateral (desktop colapsable + drawer mobile):
 * tabs del OS, perfil y mini-login por cedula.
 *
 * Mobile/iPhone: el drawer respeta safe-area (notch / Dynamic Island).
 * Sin salidas al sitio público ni al centro de apps: el socio se queda en el OS.
 */

import { ArrowRight, UserRound, X } from "lucide-react";
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
    memberCedulaInput,
    setMemberCedulaInput,
    startMemberByCedula,
    resetMember,
  } = os;

  const closeNav = () => setNavOpen(false);

  return (
    <>
      {navOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={closeNav}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`xg-side-nav fixed left-0 z-50 flex w-[min(272px,88vw)] flex-col border-r-[3px] border-white/15 bg-[#090909] shadow-[8px_0_0_rgba(0,0,0,.45)] transition-[width,transform] duration-300 lg:w-[72px] ${
          navOpen
            ? "translate-x-0 lg:w-[240px]"
            : "-translate-x-full lg:w-[72px] lg:translate-x-0"
        }`}
      >
        {/* Header: en mobile queda bajo el notch; en desktop al tope del rail */}
        <div className="xg-side-nav-header flex h-14 shrink-0 items-center justify-between border-b-[3px] border-white/15 bg-[#d8ff3e]/10 px-3">
          <div className={navOpen ? "block" : "lg:hidden"}>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#d8ff3e]">
              Xtreme Gym
            </p>
            <p className="text-sm font-black uppercase">Member OS</p>
          </div>
          <button
            type="button"
            onClick={closeNav}
            className="grid h-10 w-10 place-items-center border-[3px] border-white/15 text-white/60 lg:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Perfil arriba del menú */}
        <div className="shrink-0 border-b-[3px] border-white/15 p-2">
          {memberName ? (
            <button
              type="button"
              title="Ver perfil"
              data-tour="tab-perfil-nav"
              onClick={() => {
                setTab("perfil");
                closeNav();
                setOsModal(null);
              }}
              className={`flex h-14 w-full min-w-0 items-center overflow-hidden border-[3px] text-left transition ${
                navOpen ? "gap-3 px-2" : "justify-center gap-0 px-1 lg:px-0"
              } ${
                tab === "perfil"
                  ? "border-[#d8ff3e] bg-[#d8ff3e]/15"
                  : "border-white/10 hover:border-[#d8ff3e]/40 hover:bg-white/[.05]"
              }`}
            >
              <Avatar
                name={memberName}
                photoUrl={currentMember.photoUrl}
                className={navOpen ? "h-10 w-10" : "h-9 w-9"}
                textClass="text-xs"
              />
              <span className={`min-w-0 flex-1 overflow-hidden ${navOpen ? "block" : "lg:hidden"}`}>
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
                closeNav();
                void startMemberByCedula(memberCedulaInput, false);
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
              <p className="text-[10px] font-semibold leading-snug text-white/40">
                Primera vez: enlace del correo o recepción. No se crea cuenta solo con cédula.
              </p>
              <GameButton type="submit" full>
                Entrar <ArrowRight className="h-4 w-4" />
              </GameButton>
            </form>
          )}
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3">
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
                  closeNav();
                  setOsModal(null);
                }}
                className={`flex h-12 w-full items-center gap-3 border-[3px] px-3 text-left text-xs font-black uppercase tracking-[.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] sm:h-14 ${
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

        {memberName && (
          <div className="xg-side-nav-footer shrink-0 border-t-[3px] border-white/15 p-2">
            <button
              type="button"
              onClick={() => {
                closeNav();
                setShowLogin(false);
                resetMember();
              }}
              title="Cerrar sesion"
              className={`w-full border-[3px] border-red-400/25 py-2 text-xs font-black uppercase text-red-200/70 transition hover:border-red-400/50 hover:text-red-200 ${
                navOpen ? "block" : "lg:hidden"
              }`}
            >
              Cerrar sesion
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
