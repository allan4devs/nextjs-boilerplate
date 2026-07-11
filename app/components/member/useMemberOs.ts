"use client";

/**
 * Member OS — hook central de estado.
 * Sesion por cedula + PIN, datos del socio, reservas, gamificacion,
 * y todas las acciones contra /api/xtreme/*. Los componentes de UI
 * reciben el objeto `MemberOs` completo y destructuran lo que usan.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award } from "lucide-react";
import { pickPhrase } from "@/lib/xtreme/phrases";
import { STREAK_MILESTONES } from "@/lib/xtreme/gamification";
import { nextBadgeUp, phraseContextFor, type CelebrationData } from "../gamification";
import {
  ACHIEVEMENTS,
  CEDULA_KEY,
  CEDULA_MIN_DIGITS,
  DEFAULT_NOTIF_PREFS,
  GOALS,
  REMINDERS,
  SESSION_KEY,
  SESSION_TTL_MS,
  STORAGE_KEY,
  TOUR_KEY,
  TRAININGS,
  type TabId,
  type Training,
} from "./constants";
import {
  ApiError,
  formatCedulaInput,
  getWeekDates,
  initialMember,
  memberCode,
  normalizeName,
  onlyDigits,
  readJson,
  resizePhoto,
  todayIso,
} from "./utils";
import type {
  GymStatus,
  Member,
  MembersResponse,
  NextBestAction,
  NotificationPrefs,
  OsModal,
  PlanItem,
  ReservationState,
  ReservationsResponse,
} from "./types";

export type MemberOs = ReturnType<typeof useMemberOs>;

export function useMemberOs() {
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberCedulaInput, setMemberCedulaInput] = useState("");
  const [memberPhoneInput, setMemberPhoneInput] = useState("");
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberName, setMemberName] = useState("");
  /** Si la cedula no existe, pedimos nombre/telefono para alta. */
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const cedulaInputRef = useRef<HTMLInputElement | null>(null);
  const [goal, setGoal] = useState(GOALS[0]);
  const [member, setMember] = useState<Member | null>(null);
  const [leaderboard, setLeaderboard] = useState<Member[]>([]);
  const [pinMode, setPinMode] = useState<"set" | "verify" | "change">("verify");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingTrainingId, setSavingTrainingId] = useState("");
  const [reservingTrainingId, setReservingTrainingId] = useState("");
  const [reservations, setReservations] = useState<ReservationState>({});
  const [gymStatus, setGymStatus] = useState<GymStatus | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [metricNote, setMetricNote] = useState("");
  const [selectedReminder, setSelectedReminder] = useState(REMINDERS[0]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("resumen");
  const [navOpen, setNavOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [osModal, setOsModal] = useState<OsModal>(null);
  const closeOsModal = useCallback(() => setOsModal(null), []);

  const requirePinAgain = useCallback((err: unknown, fallback: string) => {
    const detail = err instanceof Error ? err.message : fallback;
    // Preferido: status/code estructurados del server; el regex queda de fallback.
    const sessionLost =
      (err instanceof ApiError && (err.status === 401 || err.code === "session_required")) ||
      /sesion requerida|session_required|ingrese su pin/i.test(detail);
    if (sessionLost) {
      window.localStorage.removeItem(SESSION_KEY);
      setPinMode("verify");
      setShowPin(true);
      setError("Su sesion vencio. Ingrese el PIN para continuar.");
      return;
    }
    setError(detail);
  }, []);

  const hasServerSession = useCallback(async (expectedName: string) => {
    try {
      const response = await fetch("/api/xtreme/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return false;
      const data = (await response.json()) as {
        authenticated?: boolean;
        member?: { memberKey?: string; memberName?: string } | null;
      };
      // memberKey es la identidad canonica (normalizedName); el nombre queda de fallback.
      const expectedKey = normalizeName(expectedName).toUpperCase();
      return Boolean(
        data.authenticated &&
          (data.member?.memberKey?.toUpperCase() === expectedKey ||
            data.member?.memberName?.toUpperCase() === expectedKey),
      );
    } catch {
      return false;
    }
  }, []);

  const unlocked = Boolean(memberName) && !showPin;
  const currentMember = member ?? initialMember(memberName);
  const completedToday = useMemo(() => {
    const doneIds = new Set(
      currentMember.workouts
        .filter((workout) => workout.completedDate === todayIso())
        .map((workout) => workout.trainingId),
    );
    return doneIds;
  }, [currentMember.workouts]);

  const recentWorkouts = [...currentMember.workouts].reverse().slice(0, 5);
  const workoutDates = useMemo(
    () => new Set(currentMember.workouts.map((workout) => workout.completedDate)),
    [currentMember.workouts],
  );
  const weekDates = useMemo(() => getWeekDates(), []);
  const gami = currentMember.gamification;
  const weekDoneCount = gami?.weekCount ?? weekDates.filter((date) => workoutDates.has(date)).length;
  const weeklyGoal = gami?.weeklyGoal ?? 4;
  const level = gami?.level?.index ?? Math.floor(currentMember.totalWorkouts / 10) + 1;
  const levelName = gami?.level?.name ?? "Novato";
  const nextMilestone = gami?.level?.nextXp ?? level * 10;
  const milestoneLeft = gami
    ? Math.max(0, (gami.level.nextXp ?? gami.xp) - gami.xp)
    : Math.max(0, nextMilestone - currentMember.totalWorkouts);
  const serverBadges = gami?.badges ?? [];
  const achievements = serverBadges.length
    ? serverBadges.map((b) => ({
        id: b.id,
        name: b.name,
        desc: b.desc,
        icon: Award,
        done: b.earned,
      }))
    : ACHIEVEMENTS.map((a) => ({ ...a, done: a.test(currentMember) }));
  const unlockedCount = achievements.filter((a) => a.done).length;
  const pinnedBadgeIds = currentMember.pinnedBadges ?? gami?.pinnedBadges ?? [];
  const notifPrefs = currentMember.notificationPrefs ?? DEFAULT_NOTIF_PREFS;
  const accessCode = memberCode(currentMember.normalizedName || memberName.toUpperCase() || "XTREME01");
  const latestMetric = currentMember.latestBodyMetric;
  const metricTrend = currentMember.bodyMetrics.slice(-12);
  const membershipTone =
    currentMember.membership.status === "expired"
      ? "border-red-400/40 bg-red-500/10 text-red-200"
      : currentMember.membership.status === "warning"
        ? "border-orange-300/40 bg-orange-300/10 text-orange-100"
        : "border-[#d8ff3e]/35 bg-[#d8ff3e]/10 text-[#efffb8]";

  // --- Gamificacion: frase del dia, proximo logro y celebraciones ---
  const trainedToday = completedToday.size > 0;
  const effectiveStreak = gami?.streak ?? currentMember.streak;
  const dayPhrase = pickPhrase(
    phraseContextFor({
      trainedToday,
      streak: effectiveStreak,
      totalWorkouts: currentMember.totalWorkouts,
      lastWorkoutDate: currentMember.lastWorkoutDate,
    }),
    memberName || "Xtreme",
    { streak: effectiveStreak },
  );
  const nextBadge = nextBadgeUp(serverBadges);
  const quickTraining =
    TRAININGS.find((t) => t.name === currentMember.favoriteTraining) ?? TRAININGS[0];

  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const prevGamiRef = useRef<{ streak: number; levelIndex: number } | null>(null);

  useEffect(() => {
    if (!gami || !unlocked) return;
    const prev = prevGamiRef.current;
    prevGamiRef.current = { streak: gami.streak, levelIndex: gami.level.index };

    const unseen = gami.badges.filter((badge) => gami.unseenBadgeIds.includes(badge.id));
    if (unseen.length) {
      setCelebration({
        title: unseen.length > 1 ? "Logros desbloqueados" : "Logro desbloqueado",
        subtitle: unseen.length > 1 ? `${unseen.length} badges nuevos` : unseen[0].name,
        phraseContext: "milestone",
        badges: unseen,
      });
      // Marcar como vistos en segundo plano (la proxima carga ya no celebra).
      void fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, action: "badgesSeen" }),
      }).catch(() => {});
      return;
    }
    if (prev && gami.level.index > prev.levelIndex) {
      setCelebration({
        title: "Subida de nivel",
        subtitle: `Nivel ${gami.level.index}: ${gami.level.name}`,
        phraseContext: "levelUp",
        badges: [],
      });
      return;
    }
    if (prev && gami.streak > prev.streak && STREAK_MILESTONES.includes(gami.streak)) {
      setCelebration({
        title: "Hito de racha",
        subtitle: `${gami.streak} dias seguidos`,
        phraseContext: "milestone",
        badges: [],
      });
    }
  }, [gami, unlocked, memberName]);

  // Tour de bienvenida: se muestra una vez por socio la primera vez que entra.
  useEffect(() => {
    if (!unlocked || showPin || isLoading || !memberName) return;
    if (typeof window === "undefined") return;
    const key = normalizeName(memberName).toUpperCase();
    let seen: string[] = [];
    try {
      seen = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    if (!Array.isArray(seen) || !seen.includes(key)) {
      setShowTour(true);
    }
  }, [unlocked, showPin, isLoading, memberName]);

  const finishTour = useCallback(
    () => {
      setShowTour(false);
      if (typeof window === "undefined" || !memberName) return;
      const key = normalizeName(memberName).toUpperCase();
      let seen: string[] = [];
      try {
        seen = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]") as string[];
      } catch {
        seen = [];
      }
      if (!Array.isArray(seen)) seen = [];
      if (!seen.includes(key)) {
        seen.push(key);
        window.localStorage.setItem(TOUR_KEY, JSON.stringify(seen.slice(-50)));
      }
    },
    [memberName],
  );

  async function updateWeeklyGoal(goalDays: number) {
    if (!unlocked) return;
    setError("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, action: "weeklyGoal", weeklyGoal: goalDays }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      setMessage(`Meta semanal: ${goalDays} dias. A cumplirla.`);
    } catch (err) {
      requirePinAgain(err, "No se pudo guardar la meta.");
    }
  }

  const storeSession = useCallback((name: string, cedula?: string) => {
    window.localStorage.setItem(STORAGE_KEY, name);
    if (cedula) window.localStorage.setItem(CEDULA_KEY, onlyDigits(cedula));
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        memberName: name,
        cedula: cedula ? onlyDigits(cedula) : undefined,
        expiresAt: Date.now() + SESSION_TTL_MS,
      }),
    );
  }, []);

  const loadReservations = useCallback(async (name: string) => {
    const params = new URLSearchParams({ memberName: name, date: todayIso() });
    const response = await fetch(`/api/xtreme/reservations?${params}`, { cache: "no-store" });
    const data = await readJson<ReservationsResponse>(response);
    setReservations(data.reservations ?? {});
  }, []);

  const loadGymStatus = useCallback(async () => {
    const response = await fetch("/api/xtreme/status", { cache: "no-store" });
    const data = await readJson<GymStatus>(response);
    setGymStatus(data);
  }, []);

  const applyMemberPayload = useCallback(
    (memberData: MembersResponse, fallbackName: string, phone = "", email = "", cedula = "") => {
      const resolved = memberData.member ?? initialMember(fallbackName);
      const name = resolved.memberName || fallbackName;
      setMember(resolved);
      setMemberName(name);
      setMemberNameInput(name);
      setGoal(resolved.goal || GOALS[0]);
      setMemberPhoneInput(resolved.phone || phone);
      setMemberEmailInput(resolved.email || email);
      if (resolved.cedula || cedula) {
        setMemberCedulaInput(formatCedulaInput(resolved.cedula || cedula));
      }
      setLeaderboard(memberData.leaderboard ?? []);
      setNextBestAction(memberData.nextBestAction ?? null);
      setWeightKg(resolved.latestBodyMetric?.weightKg ? String(resolved.latestBodyMetric.weightKg) : "");
      setWaistCm(resolved.latestBodyMetric?.waistCm ? String(resolved.latestBodyMetric.waistCm) : "");
      return name;
    },
    [],
  );

  /**
   * Login principal por cedula (lector de barras o teclado).
   * Si no existe, pide nombre+telefono para registrar y ligar la cedula.
   */
  const startMemberByCedula = useCallback(
    async (
      cedulaRaw: string,
      allowSession = true,
      contact: { name?: string; phone?: string; email?: string } = {},
    ) => {
      const digits = onlyDigits(cedulaRaw);
      if (digits.length < CEDULA_MIN_DIGITS) {
        setError(`Digite o escanee la cedula (minimo ${CEDULA_MIN_DIGITS} digitos).`);
        return;
      }

      setError("");
      setMessage("");
      setIsLoading(true);
      setMemberCedulaInput(formatCedulaInput(cedulaRaw));

      try {
        const lookupParams = new URLSearchParams({ cedula: digits });
        const lookupResponse = await fetch(`/api/xtreme/user?${lookupParams}`, { cache: "no-store" });
        const lookupData = await readJson<
          MembersResponse & { exists?: boolean; lookup?: string; cedula?: string }
        >(lookupResponse);

        const phone = contact.phone?.trim() ?? "";
        const email = contact.email?.trim() ?? "";
        const regName = normalizeName(contact.name ?? "");

        if (!lookupData.exists) {
          // Socio nuevo: necesita nombre + telefono + cedula
          if (!regName || !phone) {
            setNeedsRegistration(true);
            setShowPin(false);
            setMemberName("");
            setMember(null);
            setError(
              "Cedula no registrada. Escriba su nombre y telefono para crear el perfil, o pida alta en recepcion.",
            );
            setIsLoading(false);
            return;
          }

          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: regName,
              cedula: digits,
              phone,
              email,
              goal: goal || GOALS[0],
              favoriteTraining: "",
            }),
          });
          const createData = await readJson<MembersResponse>(createResponse);
          const name = applyMemberPayload(createData, regName, phone, email, digits);
          setNeedsRegistration(false);
          await Promise.all([loadReservations(name), loadGymStatus()]);
          setPinMode("set");
          setShowPin(true);
          return;
        }

        // Socio existente
        const name = applyMemberPayload(
          lookupData,
          lookupData.member?.memberName || "",
          phone,
          email,
          digits,
        );
        if (!name) {
          setError("No se pudo resolver el perfil de esa cedula.");
          return;
        }
        setNeedsRegistration(false);
        await Promise.all([loadReservations(name), loadGymStatus()]);

        if (allowSession) {
          // La cookie HttpOnly del server es la fuente de verdad: si sigue viva
          // para este socio, no hay que pedir PIN de nuevo (aunque localStorage
          // se haya borrado). Si no, se limpia el rastro local y va al PIN.
          if (await hasServerSession(name)) {
            storeSession(name, digits);
            setShowPin(false);
            return;
          }
          window.localStorage.removeItem(SESSION_KEY);
        }

        const pinResponse = await fetch(`/api/xtreme/pin?memberName=${encodeURIComponent(name)}`, {
          cache: "no-store",
        });
        const pinData = (await pinResponse.json()) as { hasPinSet?: boolean };
        setPinMode(pinData.hasPinSet ? "verify" : "set");
        setShowPin(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pude cargar Xtreme Gym.");
        setMemberName("");
      } finally {
        setIsLoading(false);
      }
    },
    [applyMemberPayload, goal, hasServerSession, loadGymStatus, loadReservations, storeSession],
  );

  /** @deprecated Preferir startMemberByCedula — se mantiene para rehidratacion por nombre en storage. */
  const startMember = useCallback(
    async (
      name: string,
      allowSession = true,
      contact: { phone?: string; email?: string; cedula?: string } = {},
    ) => {
      const trimmed = normalizeName(name);
      if (!trimmed) return;

      setError("");
      setMessage("");
      setIsLoading(true);
      setMemberName(trimmed);
      setMemberNameInput(trimmed);

      try {
        const params = new URLSearchParams({ memberName: trimmed });
        const memberResponse = await fetch(`/api/xtreme/user?${params}`, { cache: "no-store" });
        const memberData = await readJson<MembersResponse>(memberResponse);
        const phone = contact.phone?.trim() ?? "";
        const email = contact.email?.trim() ?? "";
        const cedula = onlyDigits(contact.cedula ?? memberData.member?.cedula ?? "");

        if (!memberData.exists && !phone) {
          setError("Perfil no encontrado. Inicie sesion con su cedula.");
          setMember(memberData.member ?? initialMember(trimmed));
          setLeaderboard(memberData.leaderboard ?? []);
          setNextBestAction(memberData.nextBestAction ?? null);
          setShowPin(false);
          setMemberName("");
          return;
        }

        if (phone || email || cedula || !memberData.exists) {
          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: trimmed,
              goal: memberData.member?.goal || goal,
              favoriteTraining: memberData.member?.favoriteTraining || "",
              phone,
              email,
              ...(cedula ? { cedula } : {}),
            }),
          });
          const createData = await readJson<MembersResponse>(createResponse);
          applyMemberPayload(createData, trimmed, phone, email, cedula);
        } else {
          applyMemberPayload(memberData, trimmed, "", "", cedula);
        }

        await Promise.all([loadReservations(trimmed), loadGymStatus()]);

        if (allowSession) {
          // Igual que en startMemberByCedula: la cookie del server manda.
          if (await hasServerSession(trimmed)) {
            storeSession(trimmed, cedula || undefined);
            setShowPin(false);
            return;
          }
          window.localStorage.removeItem(SESSION_KEY);
        }

        const pinResponse = await fetch(`/api/xtreme/pin?memberName=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        const pinData = (await pinResponse.json()) as { hasPinSet?: boolean };
        setPinMode(pinData.hasPinSet ? "verify" : "set");
        setShowPin(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pude cargar Xtreme Gym.");
      } finally {
        setIsLoading(false);
      }
    },
    [applyMemberPayload, goal, hasServerSession, loadGymStatus, loadReservations, storeSession],
  );

  // Solo al montar: rehidratar sesion por cedula (preferido) o nombre legacy.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const storedCedula = onlyDigits(window.localStorage.getItem(CEDULA_KEY) ?? "");
    const storedName = normalizeName(window.localStorage.getItem(STORAGE_KEY) ?? "");
    if (storedCedula.length >= CEDULA_MIN_DIGITS) {
      void startMemberByCedula(storedCedula, true);
    } else if (storedName) {
      void startMember(storedName, true);
    } else {
      setIsLoading(false);
    }
  }, [startMember, startMemberByCedula]);

  // Auto-focus en cedula cuando no hay sesion (listo para lector de barras).
  useEffect(() => {
    if (!memberName && !isLoading && !showPin) {
      const id = window.setTimeout(() => cedulaInputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [memberName, isLoading, showPin]);

  async function saveProfile() {
    const trimmed = normalizeName(memberName);
    if (!trimmed) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profile",
          memberName: trimmed,
          goal,
          favoriteTraining: currentMember.favoriteTraining,
          phone: memberPhoneInput,
          email: memberEmailInput,
          cedula: memberCedulaInput,
          weeklyGoal,
          notificationPrefs: notifPrefs,
          pinnedBadges: pinnedBadgeIds,
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.member?.cedula) {
        setMemberCedulaInput(formatCedulaInput(data.member.cedula));
        window.localStorage.setItem(CEDULA_KEY, onlyDigits(data.member.cedula));
      }
      setLeaderboard(data.leaderboard ?? []);
      setMessage("Perfil actualizado. Ahora si, a meterle.");
    } catch (err) {
      requirePinAgain(err, "No se pudo guardar.");
    }
  }

  async function saveProfileField(patch: Record<string, unknown>, okMessage: string) {
    const trimmed = normalizeName(memberName);
    if (!trimmed || !unlocked) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", memberName: trimmed, ...patch }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.member?.cedula) {
        setMemberCedulaInput(formatCedulaInput(data.member.cedula));
        window.localStorage.setItem(CEDULA_KEY, onlyDigits(data.member.cedula));
      }
      setLeaderboard(data.leaderboard ?? []);
      setMessage(okMessage);
    } catch (err) {
      requirePinAgain(err, "No se pudo guardar.");
    }
  }

  function togglePinnedBadge(badgeId: string) {
    if (!unlocked) return;
    const earned = serverBadges.find((b) => b.id === badgeId)?.earned;
    if (!earned) {
      setError("Solo puede fijar badges que ya gano.");
      return;
    }
    const next = pinnedBadgeIds.includes(badgeId)
      ? pinnedBadgeIds.filter((id) => id !== badgeId)
      : pinnedBadgeIds.length >= 3
        ? pinnedBadgeIds
        : [...pinnedBadgeIds, badgeId];
    if (!pinnedBadgeIds.includes(badgeId) && pinnedBadgeIds.length >= 3) {
      setError("Maximo 3 badges en el showcase.");
      return;
    }
    void saveProfileField({ pinnedBadges: next }, "Showcase de badges actualizado.");
  }

  function toggleNotifPref(key: keyof NotificationPrefs) {
    if (!unlocked) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    void saveProfileField({ notificationPrefs: next }, "Preferencias de correo guardadas.");
  }

  async function completeTraining(training: Training) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setSavingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingName: training.name,
          intensity: training.intensity,
          minutes: training.minutes,
          completedDate: todayIso(),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      await loadGymStatus();
      setMessage(`Registrado: ${training.name}. Racha viva, mae.`);
    } catch (err) {
      requirePinAgain(err, "No se pudo registrar el entreno.");
    } finally {
      setSavingTrainingId("");
    }
  }

  async function reserveTraining(training: Training) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setReservingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/reservations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingName: training.name,
          trainingDate: todayIso(),
        }),
      });
      const data = (await response.json()) as ReservationsResponse & {
        error?: string;
        code?: string;
        paymentRequired?: boolean;
        checkoutOptionId?: string;
      };
      if (!response.ok) {
        if (data.paymentRequired || response.status === 402) {
          setError(
            data.error ||
              "Necesita un plan activo o su primer dia gratis. Registrese en Primer dia o elija un plan en Precios.",
          );
          setMessage("");
          // Soft nudge: open first-day offer
          if (typeof window !== "undefined") {
            // Keep user in app; show clear next step
          }
        } else {
          throw new Error(data.error ?? "No se pudo reservar.");
        }
        if (data.reservations) setReservations(data.reservations);
        return;
      }
      setReservations(data.reservations ?? {});
      await loadGymStatus();
      setMessage(`Reservado: ${training.name}. Llegue 5 minutos antes, pura vida.`);
    } catch (err) {
      requirePinAgain(err, "No se pudo reservar.");
    } finally {
      setReservingTrainingId("");
    }
  }

  async function cancelReservation(training: Training) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setReservingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingDate: todayIso(),
        }),
      });
      const data = await readJson<ReservationsResponse>(response);
      setReservations(data.reservations ?? {});
      await loadGymStatus();
      setMessage(`Reserva cancelada: ${training.name}.`);
    } catch (err) {
      requirePinAgain(err, "No se pudo cancelar.");
    } finally {
      setReservingTrainingId("");
    }
  }

  async function saveBodyMetric() {
    if (!unlocked) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bodyMetric",
          memberName,
          weightKg: Number(weightKg),
          waistCm: Number(waistCm),
          note: metricNote,
          completedDate: todayIso(),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMetricNote("");
      setMessage("Medidas guardadas. Progreso visible, sin cuentos.");
    } catch (err) {
      requirePinAgain(err, "No se pudieron guardar las medidas.");
    }
  }

  async function togglePlanItem(item: PlanItem) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    const nextDone = !item.done;
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "planItem",
          memberName,
          itemId: item.id,
          done: nextDone,
          completedDate: todayIso(),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setMessage(nextDone ? "Sesion del plan completada. Sigalo asi." : "Sesion marcada como pendiente.");
    } catch (err) {
      requirePinAgain(err, "No se pudo actualizar el plan.");
    }
  }

  async function uploadPhoto(file: File) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setIsUploadingPhoto(true);
    try {
      const photo = await resizePhoto(file);
      const response = await fetch("/api/xtreme/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, photo }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMessage("Foto de perfil actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function activateReminder() {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setIsSendingReminder(true);
    try {
      const response = await fetch("/api/xtreme/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, message: selectedReminder }),
      });
      const data = await readJson<{ ok?: boolean; sentTo?: string }>(response);
      setMessage(`Aviso enviado a ${data.sentTo}. Revise su correo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el aviso.");
    } finally {
      setIsSendingReminder(false);
    }
  }

  function resetMember() {
    void fetch("/api/xtreme/session", {
      method: "DELETE",
      credentials: "same-origin",
    }).catch(() => {});
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(CEDULA_KEY);
    setShowPin(false);
    setMemberName("");
    setMemberNameInput("");
    setMemberCedulaInput("");
    setMemberPhoneInput("");
    setMemberEmailInput("");
    setNeedsRegistration(false);
    setMember(null);
    // Limpiar todo rastro del socio anterior (kioscos compartidos).
    setLeaderboard([]);
    setReservations({});
    setNextBestAction(null);
    setCelebration(null);
    prevGamiRef.current = null;
    setTab("resumen");
    setMessage("");
    setError("");
    window.setTimeout(() => cedulaInputRef.current?.focus(), 100);
  }

  const selectedTraining =
    osModal?.kind === "training"
      ? TRAININGS.find((t) => t.id === osModal.trainingId) ?? null
      : null;

  return {
    // inputs de sesion / registro
    memberNameInput,
    setMemberNameInput,
    memberCedulaInput,
    setMemberCedulaInput,
    memberPhoneInput,
    setMemberPhoneInput,
    memberEmailInput,
    setMemberEmailInput,
    memberName,
    needsRegistration,
    setNeedsRegistration,
    cedulaInputRef,
    // estado principal
    goal,
    setGoal,
    member,
    setMember,
    leaderboard,
    pinMode,
    setPinMode,
    showPin,
    setShowPin,
    isLoading,
    savingTrainingId,
    reservingTrainingId,
    reservations,
    gymStatus,
    weightKg,
    setWeightKg,
    waistCm,
    setWaistCm,
    metricNote,
    setMetricNote,
    selectedReminder,
    setSelectedReminder,
    isUploadingPhoto,
    isSendingReminder,
    message,
    setMessage,
    error,
    setError,
    tab,
    setTab,
    navOpen,
    setNavOpen,
    showLogin,
    setShowLogin,
    nextBestAction,
    showTour,
    setShowTour,
    osModal,
    setOsModal,
    closeOsModal,
    celebration,
    setCelebration,
    // derivados
    unlocked,
    currentMember,
    completedToday,
    recentWorkouts,
    workoutDates,
    weekDates,
    gami,
    weekDoneCount,
    weeklyGoal,
    level,
    levelName,
    milestoneLeft,
    serverBadges,
    achievements,
    unlockedCount,
    pinnedBadgeIds,
    notifPrefs,
    accessCode,
    latestMetric,
    metricTrend,
    membershipTone,
    trainedToday,
    effectiveStreak,
    dayPhrase,
    nextBadge,
    quickTraining,
    selectedTraining,
    // acciones
    finishTour,
    updateWeeklyGoal,
    storeSession,
    startMemberByCedula,
    saveProfile,
    saveProfileField,
    togglePinnedBadge,
    toggleNotifPref,
    completeTraining,
    reserveTraining,
    cancelReservation,
    saveBodyMetric,
    togglePlanItem,
    uploadPhoto,
    activateReminder,
    resetMember,
  };
}
