"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  HabitId,
  LifestyleChallengeId,
  MemberLifestyle,
} from "../types";
import { errorText, readJson } from "../utils";

const EMPTY: MemberLifestyle = {
  today: null,
  recent: [],
  goals: [],
  personalRecords: [],
  joinedChallenges: [],
  feedback: [],
};

type Options = {
  unlocked: boolean;
  memberName: string;
  setMessage: (message: string) => void;
  setError: (message: string) => void;
};

/**
 * Vida Xtreme: hábitos y wellness.
 * No requiere plan de membresía - solo sesión desbloqueada (cédula + PIN).
 */
export function useMemberLifestyle({ unlocked, memberName, setMessage, setError }: Options) {
  const [lifestyle, setLifestyle] = useState<MemberLifestyle>(EMPTY);
  const [isLoadingLifestyle, setIsLoadingLifestyle] = useState(false);
  const [lifestyleBusy, setLifestyleBusy] = useState("");
  const [lifestyleLoadError, setLifestyleLoadError] = useState("");

  const loadLifestyle = useCallback(async () => {
    if (!unlocked || !memberName) {
      setLifestyle(EMPTY);
      setLifestyleLoadError("");
      setIsLoadingLifestyle(false);
      return;
    }
    setIsLoadingLifestyle(true);
    setLifestyleLoadError("");
    try {
      const response = await fetch("/api/xtreme/lifestyle", {
        cache: "no-store",
        credentials: "same-origin",
      });
      setLifestyle(await readJson<MemberLifestyle>(response));
    } catch (error) {
      // No bloquear la pestaña: el socio puede seguir usando defaults y reintentar.
      setLifestyleLoadError(errorText(error, "No se pudo cargar Vida Xtreme."));
      setLifestyle(EMPTY);
    } finally {
      setIsLoadingLifestyle(false);
    }
  }, [memberName, unlocked]);

  useEffect(() => {
    void loadLifestyle();
  }, [loadLifestyle]);

  const mutateLifestyle = useCallback(
    async (busy: string, body: Record<string, unknown>, success: string) => {
      if (!unlocked) {
        setError("Desbloqueá tu sesión con el PIN para guardar en Vida.");
        return false;
      }
      setLifestyleBusy(busy);
      setError("");
      try {
        const response = await fetch("/api/xtreme/lifestyle", {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setLifestyle(await readJson<MemberLifestyle>(response));
        setLifestyleLoadError("");
        setMessage(success);
        return true;
      } catch (error) {
        setError(errorText(error, "No se pudo guardar el cambio."));
        return false;
      } finally {
        setLifestyleBusy("");
      }
    },
    [setError, setMessage, unlocked],
  );

  return {
    lifestyle,
    isLoadingLifestyle,
    lifestyleBusy,
    lifestyleLoadError,
    loadLifestyle,
    saveDailyWellness: (data: {
      energy: number;
      mood: number;
      soreness: number;
      sleepHours: number;
      waterCups: number;
      steps: number;
      note: string;
    }) => mutateLifestyle("daily", { action: "daily", ...data }, "Check-in diario guardado."),
    toggleLifestyleHabit: (habit: HabitId) =>
      mutateLifestyle(`habit-${habit}`, { action: "habit", habit }, "Hábito actualizado."),
    toggleLifestyleChallenge: (id: LifestyleChallengeId) =>
      mutateLifestyle(`challenge-${id}`, { action: "challengeToggle", id }, "Reto actualizado."),
    addLifestyleGoal: (data: { title: string; target: number; unit: string; deadline: string }) =>
      mutateLifestyle("goal-add", { action: "goalAdd", ...data }, "Meta creada."),
    updateLifestyleGoal: (id: string, progress: number) =>
      mutateLifestyle(`goal-${id}`, { action: "goalProgress", id, progress }, "Progreso actualizado."),
    deleteLifestyleGoal: (id: string) =>
      mutateLifestyle(`goal-${id}`, { action: "goalDelete", id }, "Meta eliminada."),
    addPersonalRecord: (data: { exercise: string; value: number; unit: string; achievedOn: string }) =>
      mutateLifestyle("record-add", { action: "recordAdd", ...data }, "Nuevo récord guardado."),
    deletePersonalRecord: (id: string) =>
      mutateLifestyle(`record-${id}`, { action: "recordDelete", id }, "Récord eliminado."),
    sendVisitFeedback: (data: { rating: number; category: string; message: string }) =>
      mutateLifestyle("feedback", { action: "feedback", ...data }, "Gracias. Tu opinión quedó registrada."),
  };
}
