"use client";

/**
 * Xtreme Member OS — orquestador del app de socios.
 * Todo el estado vive en useMemberOs (app/components/member/useMemberOs.ts);
 * aqui solo se compone el shell (HUD, nav, dock), los tabs y los modales.
 */

import { useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { CelebrationOverlay } from "./components/gamification";
import OnboardingTour from "./components/OnboardingTour";
import { TOUR_STEPS, type TabId } from "./components/member/constants";
import { useMemberOs } from "./components/member/useMemberOs";
import PinModal from "./components/member/PinModal";
import CedulaLoginGate from "./components/member/CedulaLoginGate";
import TopHud from "./components/member/TopHud";
import SideNav from "./components/member/SideNav";
import BottomDock from "./components/member/BottomDock";
import OsModals from "./components/member/OsModals";
import ToastHost from "./components/member/Toasts";
import ResumenTab from "./components/member/tabs/ResumenTab";
import EntrenarTab from "./components/member/tabs/EntrenarTab";
import MaquinasTab from "./components/member/tabs/MaquinasTab";
import ProgresoTab from "./components/member/tabs/ProgresoTab";
import PerfilTab from "./components/member/tabs/PerfilTab";
import { useResumenViewModel } from "./components/member/view-models/useResumenViewModel";

export default function ExtremeGymSite() {
  const os = useMemberOs();
  const {
    memberName,
    memberCedulaInput,
    currentMember,
    celebration,
    setCelebration,
    effectiveStreak,
    showPin,
    pinMode,
    setShowPin,
    storeSession,
    reloadFullMember,
    loadReservations,
    resetMember,
    isLoading,
    showTour,
    finishTour,
    setTab,
    tab,
    navOpen,
    message,
    error,
    setMessage,
    setError,
  } = os;
  const resumen = useResumenViewModel(os);

  const dismissToast = useCallback(() => {
    setMessage("");
    setError("");
  }, [setMessage, setError]);

  return (
    <main className="relative min-h-screen bg-[#050505] text-white selection:bg-[#d8ff3e] selection:text-black">
      {/* Fondo ambiental del OS: rejilla HUD + glows */}
      <div aria-hidden className="xg-atmosphere" />
      {celebration && !showPin && (
        <CelebrationOverlay
          data={celebration}
          memberName={memberName || "Xtreme"}
          streak={effectiveStreak}
          onClose={() => setCelebration(null)}
        />
      )}
      {showPin && (
        <PinModal
          memberName={memberName}
          mode={pinMode}
          onChangeMember={resetMember}
          onCancel={() => {
            setShowPin(false);
            setMessage("");
          }}
          onDone={setMessage}
          onSuccess={() => {
            const cedula = memberCedulaInput || currentMember.cedula;
            storeSession(memberName, cedula);
            setShowPin(false);
            setMessage((current) => current || "Sesion protegida. Bienvenido a Xtreme.");
            // Cookie set by /api/xtreme/pin — load full profile now.
            void reloadFullMember(memberName, cedula).then(() => loadReservations(memberName));
          }}
        />
      )}

      {/* Sin sesión: login por cedula (lector de barras / teclado). */}
      {!memberName && !isLoading && !showPin && <CedulaLoginGate os={os} />}

      <OnboardingTour
        steps={TOUR_STEPS}
        open={showTour}
        onClose={finishTour}
        onGoToTab={(next) => setTab(next as TabId)}
      />

      <TopHud os={os} />
      <SideNav os={os} />
      <BottomDock os={os} />

      <section
        className={`xg-os-content relative mx-auto max-w-[1600px] px-3 py-4 transition-[padding] sm:px-6 sm:py-5 ${
          navOpen ? "lg:pl-[268px] lg:pr-10" : "lg:pl-[104px] lg:pr-10"
        }`}
      >
        {isLoading ? (
          <div className="grid min-h-[420px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#d8ff3e]" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Cargando tu perfil…
              </p>
            </div>
          </div>
        ) : (
          <div key={tab} className="space-y-3 sm:space-y-4">
            {tab === "resumen" && <ResumenTab model={resumen.model} actions={resumen.actions} />}
            {tab === "entrenar" && <EntrenarTab os={os} />}
            {tab === "maquinas" && <MaquinasTab os={os} />}
            {tab === "progreso" && <ProgresoTab os={os} />}
            {tab === "perfil" && <PerfilTab os={os} />}
          </div>
        )}
      </section>

      <footer className="xg-os-content mt-2 border-t-[3px] border-white/15 px-4 py-6 sm:px-8 lg:mt-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3">
          <Link
            href="/precios#inscripcion"
            className="inline-flex items-center gap-2 border-[3px] border-[#d8ff3e] bg-[#d8ff3e] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[3px_3px_0_rgba(216,255,62,.25)] transition hover:bg-white"
          >
            <CreditCard className="h-4 w-4" />
            Comprar o renovar plan
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-[3px] border-white/15 bg-[#0c0c0c] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white/60 shadow-[3px_3px_0_rgba(0,0,0,.5)] transition hover:border-[#d8ff3e]/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al sitio Xtreme Gym
          </Link>
        </div>
      </footer>

      {/* Feedback flotante: se desvanece solo o se cierra con click.
          Con el login abierto el error ya se muestra dentro del gate. */}
      {memberName && (
        <ToastHost message={message} error={error} onDismiss={dismissToast} />
      )}

      {/* ─── GAME OS MODALS ─── */}
      <OsModals os={os} />
    </main>
  );
}
