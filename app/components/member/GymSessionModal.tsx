"use client";

import { useEffect, useState } from "react";
import { Check, Dumbbell, Loader2, LogIn, LogOut, Timer, X } from "lucide-react";
import { GameButton, GameModal } from "../GameOS";
import { FREE_WORKOUT } from "./constants";
import type { MemberOs } from "./useMemberOs";

const WORKOUT_TYPES = [
  "Pesas",
  "Máquinas",
  "Cardio",
  "Funcional",
  "Pierna",
  "Tren superior",
] as const;

function durationLabel(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (!hours) return `${rest} min`;
  return `${hours} h${rest ? ` ${rest} min` : ""}`;
}

function liveDurationLabel(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(hours ? 2 : 1, "0")}:${String(seconds).padStart(2, "0")}`;
}

function LiveTime({ checkedInAt, initialMinutes }: { checkedInAt: string; initialMinutes: number }) {
  const [seconds, setSeconds] = useState(initialMinutes * 60);

  useEffect(() => {
    const refresh = () => {
      setSeconds(Math.max(0, Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 1_000)));
    };
    refresh();
    const timer = window.setInterval(refresh, 1_000);
    return () => window.clearInterval(timer);
  }, [checkedInAt]);

  return (
    <div className="border-[3px] border-[#d8ff3e] bg-[#d8ff3e]/8 p-5 text-center">
      <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#d8ff3e]">
        Tiempo en el gym
      </p>
      <p className="mt-2 text-5xl font-black tabular-nums text-white">{liveDurationLabel(seconds)}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[.18em] text-white/35">
        {seconds >= 3_600 ? "horas : minutos : segundos" : "minutos : segundos"}
      </p>
      <p className="mt-2 text-xs font-bold text-white/45">Tu ingreso está activo</p>
    </div>
  );
}

export default function GymSessionModal({ os }: { os: MemberOs }) {
  const {
    osModal,
    closeOsModal,
    activeVisit,
    registerCheckin,
    isRegisteringCheckin,
    registerCheckout,
    isRegisteringCheckout,
    completeTraining,
    savingTrainingId,
    trainedToday,
    unlocked,
  } = os;

  const open = osModal?.kind === "gym-session";
  const [wantsWorkout, setWantsWorkout] = useState(false);
  const [workoutType, setWorkoutType] = useState<(typeof WORKOUT_TYPES)[number] | "">("");
  const [finishedMinutes, setFinishedMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setWantsWorkout(false);
    setWorkoutType("");
    setFinishedMinutes(null);
  }, [open]);

  if (!open) return null;

  const saveAndCheckout = async () => {
    if (!unlocked || !activeVisit) return;
    if (wantsWorkout && !trainedToday) {
      const minutes = Math.max(1, activeVisit.elapsedMinutes);
      const saved = await completeTraining(
        { ...FREE_WORKOUT, name: workoutType || "Entreno", minutes, intensity: "Registrado" },
        {
          minutes,
          activities: workoutType ? [workoutType] : [],
          allowWithPendingPlan: true,
        },
      );
      if (!saved) return;
    }
    const duration = await registerCheckout();
    if (duration !== null) setFinishedMinutes(duration);
  };

  const busy = Boolean(savingTrainingId) || isRegisteringCheckout;

  if (finishedMinutes !== null) {
    return (
      <GameModal
        open
        onClose={closeOsModal}
        title="Salida registrada"
        subtitle="Eso es todo"
        icon={Check}
        tone="lime"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="border-[3px] border-[#d8ff3e] bg-[#d8ff3e]/10 p-6">
            <Timer className="mx-auto h-7 w-7 text-[#d8ff3e]" />
            <p className="mt-3 text-[10px] font-black uppercase tracking-[.18em] text-white/45">
              Estuviste
            </p>
            <p className="mt-1 text-5xl font-black text-white">{durationLabel(finishedMinutes)}</p>
          </div>
          <GameButton full variant="lime" onClick={closeOsModal}>
            <Check className="h-4 w-4" /> Listo
          </GameButton>
        </div>
      </GameModal>
    );
  }

  if (!activeVisit) {
    return (
      <GameModal
        open
        onClose={closeOsModal}
        title="Marcar ingreso"
        subtitle="Un toque y listo"
        icon={LogIn}
        tone="lime"
        size="sm"
      >
        <div className="space-y-4">
          <div className="border-[3px] border-white/12 bg-black/30 p-5 text-center">
            <LogIn className="mx-auto h-10 w-10 text-[#d8ff3e]" />
            <p className="mt-3 text-xl font-black uppercase">¿Entraste al gym?</p>
            <p className="mt-2 text-sm font-bold text-white/45">
              Se guarda la hora y empieza a contar tu tiempo.
            </p>
          </div>
          <GameButton
            full
            variant="lime"
            disabled={isRegisteringCheckin}
            onClick={() => void registerCheckin()}
          >
            {isRegisteringCheckin ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isRegisteringCheckin ? "Marcando..." : "Sí, marcar ingreso"}
          </GameButton>
          <button
            type="button"
            onClick={closeOsModal}
            className="flex min-h-11 w-full items-center justify-center gap-2 text-xs font-black uppercase text-white/45 hover:text-white"
          >
            <X className="h-4 w-4" /> Cerrar
          </button>
        </div>
      </GameModal>
    );
  }

  return (
    <GameModal
      open
      onClose={closeOsModal}
      title="Marcar salida"
      subtitle="Revisá el tiempo y salí"
      icon={LogOut}
      tone="orange"
      size="sm"
    >
      <div className="space-y-4">
        <LiveTime
          checkedInAt={activeVisit.checkedInAt}
          initialMinutes={activeVisit.elapsedMinutes}
        />

        {!trainedToday && (
          <div className="border-[2px] border-white/12 p-3">
            <p className="mb-2 text-xs font-black uppercase text-white">¿Entrenaste?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWantsWorkout(true)}
                className={`min-h-12 border-[2px] text-xs font-black uppercase ${
                  wantsWorkout
                    ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                    : "border-white/15 text-white/60"
                }`}
              >
                Sí, entrené
              </button>
              <button
                type="button"
                onClick={() => {
                  setWantsWorkout(false);
                  setWorkoutType("");
                }}
                className={`min-h-12 border-[2px] text-xs font-black uppercase ${
                  !wantsWorkout
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-white/60"
                }`}
              >
                No
              </button>
            </div>

            {wantsWorkout && (
              <div className="mt-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-white/45">
                  Elegí qué entrenaste
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {WORKOUT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkoutType(type)}
                      className={`min-h-11 border-[2px] px-2 text-[11px] font-black uppercase ${
                        workoutType === type
                          ? "border-[#d8ff3e] bg-[#d8ff3e]/12 text-[#d8ff3e]"
                          : "border-white/12 text-white/55"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <GameButton
          full
          variant="orange"
          disabled={busy || (wantsWorkout && !workoutType)}
          onClick={() => void saveAndCheckout()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {busy ? "Marcando salida..." : "Marcar salida"}
        </GameButton>
        <button
          type="button"
          onClick={closeOsModal}
          className="flex min-h-11 w-full items-center justify-center gap-2 text-xs font-black uppercase text-white/45 hover:text-white"
        >
          <X className="h-4 w-4" /> Cerrar
        </button>
      </div>
    </GameModal>
  );
}
