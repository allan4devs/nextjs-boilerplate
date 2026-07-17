"use client";

/**
 * Member OS — hook central de estado.
 * Sesion por cedula + PIN, datos del socio, reservas, gamificacion,
 * y todas las acciones contra /api/xtreme/*. Los componentes de UI
 * reciben el objeto `MemberOs` completo y destructuran lo que usan.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { STREAK_MILESTONES } from "@/lib/xtreme/gamification";
import type { CelebrationData } from "../gamification";
import {
  CEDULA_KEY,
  CEDULA_MIN_DIGITS,
  GOALS,
  MSG,
  REMINDERS,
  SESSION_KEY,
  SESSION_TTL_MS,
  STORAGE_KEY,
  TOUR_KEY,
  type TabId,
  type Training,
} from "./constants";
import {
  ApiError,
  errorText,
  formatCedulaInput,
  initialMember,
  normalizeName,
  onlyDigits,
  readJson,
  resizePhoto,
  todayIso,
} from "./utils";
import { useMemberDerivedState } from "./hooks/useMemberDerivedState";
import { useMemberLifestyle } from "./hooks/useMemberLifestyle";
import type {
  ActiveVisit,
  GymStatus,
  Member,
  MemberProfilePatch,
  MembersResponse,
  NextBestAction,
  NotificationPrefs,
  OsModal,
  PaymentHistoryResponse,
  PlanItem,
  ReservationState,
  ReservationsResponse,
  WorkoutExerciseDetail,
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
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryResponse | null>(null);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [activeVisit, setActiveVisit] = useState<ActiveVisit | null>(null);
  const [isRegisteringCheckout, setIsRegisteringCheckout] = useState(false);
  const visitReminderShownRef = useRef("");

  const requirePinAgain = useCallback((err: unknown, fallback: string) => {
    const detail = errorText(err, fallback);
    // Preferido: status/code estructurados del server; el regex queda de fallback.
    const sessionLost =
      (err instanceof ApiError && (err.status === 401 || err.code === "session_required")) ||
      /sesion requerida|session_required|ingrese su pin|ingres[aá] tu pin/i.test(detail);
    if (sessionLost) {
      window.localStorage.removeItem(SESSION_KEY);
      setPinMode("verify");
      setShowPin(true);
      setError(MSG.errors.sessionExpired);
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

  const {
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
  } = useMemberDerivedState({ member, memberName, osModal, showPin });
  const lifestyle = useMemberLifestyle({
    unlocked,
    memberName,
    setMessage,
    setError,
  });

  // --- Gamificacion: celebraciones ante cambios del servidor ---

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
        credentials: "same-origin",
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

  // Tour de bienvenida: se muestra una sola vez por socio, la primera vez que entra.
  // Fuente de verdad: `tourDoneAt` del perfil (sirve en cualquier dispositivo);
  // el localStorage es solo un espejo para no mostrarlo mientras el PATCH viaja.
  const tourSeenLocally = useCallback((name: string) => {
    if (typeof window === "undefined" || !name) return false;
    const key = normalizeName(name).toUpperCase();
    try {
      const seen = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]") as string[];
      return Array.isArray(seen) && seen.includes(key);
    } catch {
      return false;
    }
  }, []);

  const markTourSeenLocally = useCallback((name: string) => {
    if (typeof window === "undefined" || !name) return;
    const key = normalizeName(name).toUpperCase();
    let seen: string[] = [];
    try {
      seen = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    if (!Array.isArray(seen)) seen = [];
    if (seen.includes(key)) return;
    seen.push(key);
    window.localStorage.setItem(TOUR_KEY, JSON.stringify(seen.slice(-50)));
  }, []);

  /** PATCH idempotente con reintentos: si no persiste, el tour volveria a salir. */
  const persistTourDone = useCallback(async (name: string) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("/api/xtreme/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ memberName: name, action: "tourDone" }),
        });
        if (response.ok) return true;
        // 401/403: la sesion no da para persistir; reintentar no ayuda.
        if (response.status === 401 || response.status === 403) return false;
      } catch {
        // red caida: reintentar
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
    return false;
  }, []);

  /** Socio para el que ya se decidio mostrar (o no) el tour en esta carga. */
  const tourResolvedForRef = useRef("");

  useEffect(() => {
    if (!unlocked || showPin || isLoading || !memberName) return;
    if (!member) return;
    if (member.tourDone) {
      // Ya quedo en el perfil: nunca mas, y dejamos el espejo local al dia.
      markTourSeenLocally(memberName);
      tourResolvedForRef.current = memberName;
      return;
    }
    if (tourResolvedForRef.current === memberName) return;
    tourResolvedForRef.current = memberName;
    if (tourSeenLocally(memberName)) {
      // Ya lo vio en este dispositivo pero el server no se entero (PATCH fallido):
      // backfill silencioso, sin volver a mostrarlo.
      void persistTourDone(memberName).then((ok) => {
        if (ok) setMember((prev) => (prev ? { ...prev, tourDone: true } : prev));
      });
      return;
    }
    setShowTour(true);
  }, [
    unlocked,
    showPin,
    isLoading,
    memberName,
    member,
    tourSeenLocally,
    markTourSeenLocally,
    persistTourDone,
  ]);

  const finishTour = useCallback(() => {
    setShowTour(false);
    if (!memberName) return;
    tourResolvedForRef.current = memberName;
    markTourSeenLocally(memberName);
    // Optimista: aunque el PATCH tarde, no reaparece en esta sesion.
    setMember((prev) => (prev ? { ...prev, tourDone: true } : prev));
    void persistTourDone(memberName);
  }, [memberName, markTourSeenLocally, persistTourDone]);

  // Analytics: registrar la entrada al app (una vez por carga, al quedar desbloqueado).
  const appOpenTrackedRef = useRef(false);
  useEffect(() => {
    if (!unlocked || !memberName || appOpenTrackedRef.current) return;
    appOpenTrackedRef.current = true;
    void fetch("/api/xtreme/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "app_opened", memberName, source: "member_app" }),
    }).catch(() => {});
  }, [unlocked, memberName]);

  async function updateWeeklyGoal(goalDays: number) {
    if (!unlocked) return;
    setError("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ memberName, action: "weeklyGoal", weeklyGoal: goalDays }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      setMessage(MSG.ok.weeklyGoal(goalDays));
    } catch (err) {
      requirePinAgain(err, MSG.errors.saveGoal);
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

  const loadActiveVisit = useCallback(async () => {
    if (!unlocked) return;
    try {
      const response = await fetch("/api/xtreme/visit", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401 || response.status === 403) return;
      const data = await readJson<{ activeVisit: ActiveVisit | null }>(response);
      setActiveVisit(data.activeVisit);
    } catch {
      // Estado complementario: el siguiente poll o reload vuelve a intentar.
    }
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) {
      setActiveVisit(null);
      return;
    }
    void loadActiveVisit();
    const timer = window.setInterval(() => void loadActiveVisit(), 60_000);
    const refreshVisibleVisit = () => {
      if (document.visibilityState === "visible") void loadActiveVisit();
    };
    document.addEventListener("visibilitychange", refreshVisibleVisit);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisibleVisit);
    };
  }, [loadActiveVisit, unlocked]);

  useEffect(() => {
    if (!activeVisit) {
      visitReminderShownRef.current = "";
      return;
    }
    const remindAt =
      new Date(activeVisit.checkedInAt).getTime() +
      activeVisit.reminderAfterMinutes * 60_000;
    const delay = Math.max(500, remindAt - Date.now());
    const timer = window.setTimeout(() => {
      if (visitReminderShownRef.current === activeVisit.id) return;
      visitReminderShownRef.current = activeVisit.id;
      setMessage("¿Ya terminaste? Recordá registrar tu salida desde el resumen.");
    }, delay);
    return () => window.clearTimeout(timer);
  }, [activeVisit]);

  const registerCheckout = useCallback(async () => {
    if (!unlocked || !activeVisit || isRegisteringCheckout) return;
    setError("");
    setMessage("");
    setIsRegisteringCheckout(true);
    try {
      const response = await fetch("/api/xtreme/visit", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await readJson<{
        durationMinutes: number;
        activeVisit: null;
        status?: GymStatus;
      }>(response);
      setActiveVisit(null);
      if (data.status) setGymStatus(data.status);
      const duration = Math.max(0, Number(data.durationMinutes) || 0);
      setMessage(
        duration > 0
          ? `Salida registrada. Estuviste ${duration} min en Xtreme. ¡Pura vida!`
          : "Salida registrada. ¡Pura vida!",
      );
    } catch (err) {
      requirePinAgain(err, "No se pudo registrar tu salida.");
      void loadActiveVisit();
    } finally {
      setIsRegisteringCheckout(false);
    }
  }, [
    activeVisit,
    isRegisteringCheckout,
    loadActiveVisit,
    requirePinAgain,
    unlocked,
  ]);

  const fetchPayments = useCallback(async () => {
    if (!unlocked) return;
    setIsLoadingPayments(true);
    try {
      const response = await fetch("/api/xtreme/payments", {
        cache: "no-store",
        credentials: "same-origin",
      });
      // El historial es complementario. La sesión puede vencer mientras el
      // socio termina PayPal; el cobro ya quedó aplicado y un 401 acá no debe
      // convertirse en un overlay ni hacer parecer que el pago falló.
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setPaymentHistory(null);
        }
        return;
      }
      const data = (await response.json()) as PaymentHistoryResponse;
      setPaymentHistory(data);
    } catch {
      // Fallo de red silencioso: se conserva el historial anterior y la app
      // sigue operando. La próxima carga vuelve a intentarlo.
    } finally {
      setIsLoadingPayments(false);
    }
  }, [unlocked]);

  const applyMemberPayload = useCallback(
    (memberData: MembersResponse, fallbackName: string, phone = "", email = "", cedula = "") => {
      const resolved = memberData.member ?? initialMember(fallbackName);
      const name = resolved.memberName || fallbackName;
      setMember(resolved);
      setActiveVisit(memberData.activeVisit ?? null);
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

  /** After PIN/session cookie is valid, load full profile (unauth GET is bootstrap-only). */
  const reloadFullMember = useCallback(
    async (name: string, cedulaDigits?: string) => {
      const params = new URLSearchParams({ memberName: name });
      if (cedulaDigits) params.set("cedula", cedulaDigits);
      const response = await fetch(`/api/xtreme/user?${params}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await readJson<MembersResponse>(response);
      return applyMemberPayload(data, name, "", "", cedulaDigits ?? "");
    },
    [applyMemberPayload],
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
        setError(MSG.errors.cedulaTooShort(CEDULA_MIN_DIGITS));
        return;
      }

      setError("");
      setMessage("");
      setIsLoading(true);
      setMemberCedulaInput(formatCedulaInput(cedulaRaw));

      try {
        const lookupParams = new URLSearchParams({ cedula: digits });
        const lookupResponse = await fetch(`/api/xtreme/user?${lookupParams}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const lookupData = await readJson<
          MembersResponse & { exists?: boolean; lookup?: string; cedula?: string; hasPinSet?: boolean }
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
            setError(MSG.errors.cedulaNotRegistered);
            setIsLoading(false);
            return;
          }

          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
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
          await Promise.all([loadReservations(name), loadGymStatus(), fetchPayments()]);
          setPinMode("set");
          setShowPin(true);
          return;
        }

        // Socio existente — bootstrap only until PIN/session (unauth GET hides PII).
        const name = lookupData.member?.memberName || "";
        if (!name) {
          setError(MSG.errors.cedulaNoProfile);
          return;
        }
        setMemberName(name);
        setMemberNameInput(name);
        setMember(initialMember(name));
        setNeedsRegistration(false);
        await loadGymStatus();

        if (allowSession) {
          // La cookie HttpOnly del server es la fuente de verdad: si sigue viva
          // para este socio, no hay que pedir PIN de nuevo (aunque localStorage
          // se haya borrado). Si no, se limpia el rastro local y va al PIN.
          if (await hasServerSession(name)) {
            storeSession(name, digits);
            await reloadFullMember(name, digits);
            await Promise.all([loadReservations(name), fetchPayments()]);
            setShowPin(false);
            return;
          }
          window.localStorage.removeItem(SESSION_KEY);
        }

        const hasPin =
          lookupData.hasPinSet ??
          (
            (await (
              await fetch(`/api/xtreme/pin?memberName=${encodeURIComponent(name)}`, {
                cache: "no-store",
              })
            ).json()) as { hasPinSet?: boolean }
          ).hasPinSet;
        setPinMode(hasPin ? "verify" : "set");
        setShowPin(true);
      } catch (err) {
        setError(errorText(err, MSG.errors.loadApp));
        setMemberName("");
      } finally {
        setIsLoading(false);
      }
    },
    [
      applyMemberPayload,
      fetchPayments,
      goal,
      hasServerSession,
      loadGymStatus,
      loadReservations,
      reloadFullMember,
      storeSession,
    ],
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
        const memberResponse = await fetch(`/api/xtreme/user?${params}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const memberData = await readJson<
          MembersResponse & { exists?: boolean; hasPinSet?: boolean }
        >(memberResponse);
        const phone = contact.phone?.trim() ?? "";
        const email = contact.email?.trim() ?? "";
        const cedula = onlyDigits(contact.cedula ?? "");

        if (!memberData.exists && !phone) {
          setError(MSG.errors.profileNotFound);
          setMember(null);
          setLeaderboard([]);
          setNextBestAction(null);
          setShowPin(false);
          setMemberName("");
          return;
        }

        if (!memberData.exists && phone) {
          if (!cedula || cedula.length < CEDULA_MIN_DIGITS) {
            setError(MSG.errors.cedulaTooShort(CEDULA_MIN_DIGITS));
            return;
          }
          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              memberName: trimmed,
              goal: goal || GOALS[0],
              favoriteTraining: "",
              phone,
              email,
              cedula,
            }),
          });
          const createData = await readJson<MembersResponse>(createResponse);
          applyMemberPayload(createData, trimmed, phone, email, cedula);
        } else {
          setMemberName(trimmed);
          setMember(initialMember(trimmed));
        }

        await loadGymStatus();

        if (allowSession) {
          // Igual que en startMemberByCedula: la cookie del server manda.
          if (await hasServerSession(trimmed)) {
            storeSession(trimmed, cedula || undefined);
            await reloadFullMember(trimmed, cedula || undefined);
            await Promise.all([loadReservations(trimmed), fetchPayments()]);
            setShowPin(false);
            return;
          }
          window.localStorage.removeItem(SESSION_KEY);
        }

        const hasPin =
          memberData.hasPinSet ??
          (
            (await (
              await fetch(`/api/xtreme/pin?memberName=${encodeURIComponent(trimmed)}`, {
                cache: "no-store",
              })
            ).json()) as { hasPinSet?: boolean }
          ).hasPinSet;
        setPinMode(hasPin ? "verify" : "set");
        setShowPin(true);
      } catch (err) {
        setError(errorText(err, MSG.errors.loadApp));
      } finally {
        setIsLoading(false);
      }
    },
    [
      applyMemberPayload,
      fetchPayments,
      goal,
      hasServerSession,
      loadGymStatus,
      loadReservations,
      reloadFullMember,
      storeSession,
    ],
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

  // El resumen necesita el último método/período pagado para ofrecer renovación directa.
  useEffect(() => {
    if (!unlocked || !memberName) {
      setPaymentHistory(null);
      return;
    }
    void fetchPayments();
  }, [fetchPayments, memberName, unlocked]);

  function applyProfileResponse(data: MembersResponse) {
    setMember(data.member);
    if (data.member?.phone !== undefined) setMemberPhoneInput(data.member.phone || "");
    if (data.member?.email !== undefined) setMemberEmailInput(data.member.email || "");
    if (data.member?.cedula) {
      setMemberCedulaInput(formatCedulaInput(data.member.cedula));
      window.localStorage.setItem(CEDULA_KEY, onlyDigits(data.member.cedula));
    }
    if (data.leaderboard) setLeaderboard(data.leaderboard);
  }

  /** @returns true si el guardado paso (la UI usa esto para cerrar el panel). */
  async function saveProfile() {
    const trimmed = normalizeName(memberName);
    if (!trimmed || !unlocked) return false;
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
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
      applyProfileResponse(data);
      setMessage(MSG.ok.profileSaved);
      return true;
    } catch (err) {
      requirePinAgain(err, MSG.errors.saveProfile);
      return false;
    }
  }

  /** @returns true si el guardado paso (la UI usa esto para cerrar el panel). */
  async function saveProfileField(patch: MemberProfilePatch, okMessage: string) {
    const trimmed = normalizeName(memberName);
    if (!trimmed || !unlocked) return false;
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "profile", memberName: trimmed, ...patch }),
      });
      const data = await readJson<MembersResponse>(response);
      applyProfileResponse(data);
      setMessage(okMessage);
      return true;
    } catch (err) {
      requirePinAgain(err, MSG.errors.saveProfile);
      return false;
    }
  }

  function togglePinnedBadge(badgeId: string) {
    if (!unlocked) return;
    const earned = serverBadges.find((b) => b.id === badgeId)?.earned;
    if (!earned) {
      setError(MSG.errors.badgeNotEarned);
      return;
    }
    const next = pinnedBadgeIds.includes(badgeId)
      ? pinnedBadgeIds.filter((id) => id !== badgeId)
      : pinnedBadgeIds.length >= 3
        ? pinnedBadgeIds
        : [...pinnedBadgeIds, badgeId];
    if (!pinnedBadgeIds.includes(badgeId) && pinnedBadgeIds.length >= 3) {
      setError(MSG.errors.badgeShowcaseFull);
      return;
    }
    void saveProfileField({ pinnedBadges: next }, MSG.ok.badgeShowcaseSaved);
  }

  function toggleNotifPref(key: keyof NotificationPrefs) {
    if (!unlocked) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setMember((prev) => (prev ? { ...prev, notificationPrefs: next } : prev));
    void saveProfileField({ notificationPrefs: next }, MSG.ok.emailPrefsSaved);
  }

  async function completeTraining(training: Training) {
    if (!unlocked) return;
    if (
      currentMember.activePlanWorkout ||
      currentMember.trainingPlan?.items.some((item) => !item.done)
    ) {
      setTab("entrenar");
      setError("");
      setMessage("Completá primero la sesión asignada en tu plan.");
      return;
    }
    setError("");
    setMessage("");
    setSavingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
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
      setMessage(MSG.ok.trainingLogged(training.name));
    } catch (err) {
      requirePinAgain(err, MSG.errors.logTraining);
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
          setError(data.error || MSG.errors.planRequired);
          setMessage("");
          // Soft nudge: open first-day offer
          if (typeof window !== "undefined") {
            // Keep user in app; show clear next step
          }
        } else {
          throw new Error(data.error ?? MSG.errors.reserve);
        }
        if (data.reservations) setReservations(data.reservations);
        return;
      }
      setReservations(data.reservations ?? {});
      await loadGymStatus();
      setMessage(MSG.ok.reserved(training.name));
    } catch (err) {
      requirePinAgain(err, MSG.errors.reserve);
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
          trainingName: training.name,
          trainingDate: todayIso(),
        }),
      });
      const data = await readJson<ReservationsResponse>(response);
      setReservations(data.reservations ?? {});
      await loadGymStatus();
      setMessage(MSG.ok.reservationCanceled(training.name));
    } catch (err) {
      requirePinAgain(err, MSG.errors.cancelReservation);
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
        credentials: "same-origin",
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
      setMessage(MSG.ok.metricsSaved);
    } catch (err) {
      requirePinAgain(err, MSG.errors.saveMetrics);
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
        credentials: "same-origin",
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
      setMessage(nextDone ? MSG.ok.planItemDone : MSG.ok.planItemPending);
    } catch (err) {
      requirePinAgain(err, MSG.errors.updatePlan);
    }
  }

  async function startPlanWorkout(item: PlanItem) {
    if (!unlocked || item.done) return;
    setError("");
    setMessage("");
    setSavingTrainingId(`plan-${item.id}`);
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "planWorkoutStart", itemId: item.id }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setMessage(`Entreno iniciado: ${item.focus || item.day}.`);
    } catch (err) {
      requirePinAgain(err, "No se pudo iniciar el entreno del plan.");
    } finally {
      setSavingTrainingId("");
    }
  }

  async function savePlanWorkout(exercises: WorkoutExerciseDetail[]) {
    if (!unlocked) return false;
    setError("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "planWorkoutSave", exercises }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setMessage("Detalle del entreno guardado.");
      return true;
    } catch (err) {
      requirePinAgain(err, "No se pudo guardar el detalle del entreno.");
      return false;
    }
  }

  async function finishPlanWorkout(exercises: WorkoutExerciseDetail[]) {
    if (!unlocked) return false;
    setError("");
    setMessage("");
    setSavingTrainingId("plan-finish");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "planWorkoutFinish", exercises }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMessage("Entreno finalizado y sesion del plan completada.");
      return true;
    } catch (err) {
      requirePinAgain(err, "No se pudo finalizar. Confirmá que marcaste tu ingreso al gym hoy.");
      return false;
    } finally {
      setSavingTrainingId("");
    }
  }

  async function cancelPlanWorkout() {
    if (!unlocked) return;
    setError("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "planWorkoutCancel" }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setMessage("Entreno activo cancelado.");
    } catch (err) {
      requirePinAgain(err, "No se pudo cancelar el entreno.");
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
        credentials: "same-origin",
        body: JSON.stringify({ memberName, photo }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMessage(MSG.ok.photoSaved);
    } catch (err) {
      requirePinAgain(err, MSG.errors.uploadPhoto);
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
        credentials: "same-origin",
        body: JSON.stringify({ memberName, message: selectedReminder }),
      });
      const data = await readJson<{ ok?: boolean; sentTo?: string }>(response);
      setMessage(MSG.ok.reminderSent(data.sentTo ?? "tu correo"));
    } catch (err) {
      requirePinAgain(err, MSG.errors.sendReminder);
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
    setNavOpen(false);
    setShowLogin(false);
    setShowTour(false);
    setOsModal(null);
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
    setActiveVisit(null);
    setIsRegisteringCheckout(false);
    setCelebration(null);
    prevGamiRef.current = null;
    setTab("resumen");
    setMessage("");
    setError("");
    window.setTimeout(() => cedulaInputRef.current?.focus(), 100);
  }

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
    ...lifestyle,
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
    activeVisit,
    isRegisteringCheckout,
    // acciones
    finishTour,
    updateWeeklyGoal,
    storeSession,
    reloadFullMember,
    loadReservations,
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
    startPlanWorkout,
    savePlanWorkout,
    finishPlanWorkout,
    cancelPlanWorkout,
    uploadPhoto,
    activateReminder,
    loadActiveVisit,
    registerCheckout,
    resetMember,
    // payment history
    paymentHistory,
    isLoadingPayments,
    fetchPayments,
  };
}
