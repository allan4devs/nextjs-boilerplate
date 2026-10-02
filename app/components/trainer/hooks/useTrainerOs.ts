"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assignDefaultPrograms,
  assignMemberProgram,
  expelClassAttendee,
  fetchTrainerClasses,
  fetchTrainerClassesForDate,
  fetchTrainerMembers,
  loginTrainer,
  logoutTrainer,
  persistTrainerPlan,
  persistTrainingProgram,
  toggleClassStatus,
  trainerSession,
} from "../api";
import { DEFAULT_COACH_NAME } from "../constants";
import type {
  PlanExercisePrescription,
  PlanItem,
  TrainerFilter,
  TrainerMember,
  TrainerNotice,
  TrainerPlan,
  TrainerProgram,
  TrainerTab,
  TrainerTodayClass,
  TrainingMachine,
} from "../types";
import {
  attachPrescriptionToMachine,
  clonePlan,
  coachFor,
  createEmptyPlan,
  createPlanItem,
  createEquipmentPrescription,
  createPrescription,
  filterTrainerMembers,
  memberSignal,
  normalizeDraft,
  planFromTemplate,
  trainerStats,
  validatePlan,
} from "../utils";

export function useTrainerOs() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [staffName, setStaffName] = useState("");
  const [members, setMembers] = useState<TrainerMember[]>([]);
  const [todayClasses, setTodayClasses] = useState<TrainerTodayClass[]>([]);
  const [equipment, setEquipment] = useState<TrainingMachine[]>([]);
  const [programs, setPrograms] = useState<TrainerProgram[]>([]);
  const [agendaDate, setAgendaDate] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TrainerFilter>("attention");
  const [tab, setTab] = useState<TrainerTab>("overview");
  const [draft, setDraft] = useState<TrainerPlan>(createEmptyPlan);
  const [coachName, setCoachName] = useState(DEFAULT_COACH_NAME);
  const [notice, setNotice] = useState<TrainerNotice>(null);
  const [saving, setSaving] = useState(false);
  const [assigningPrograms, setAssigningPrograms] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [healthDirty, setHealthDirty] = useState(false);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthRefresh, setHealthRefresh] = useState(0);

  const selected = useMemo(
    () => members.find((member) => member.normalizedName === selectedKey) ?? null,
    [members, selectedKey],
  );
  const stats = useMemo(() => trainerStats(members), [members]);
  const filteredMembers = useMemo(
    () => filterTrainerMembers(members, query, filter),
    [filter, members, query],
  );
  const selectedSignal = useMemo(() => selected ? memberSignal(selected) : null, [selected]);
  const validationError = useMemo(() => validatePlan(draft), [draft]);

  const resetWorkspace = useCallback((member: TrainerMember | null) => {
    setCoachName(coachFor(member));
    setDraft(member?.trainingPlan ? clonePlan(member.trainingPlan) : createEmptyPlan());
    setDirty(false);
    setNotice(null);
  }, []);

  const load = useCallback(async (preserveSelection = true) => {
    setChecking(true);
    setNotice(null);
    try {
      const result = await fetchTrainerMembers();
      if (!result.authenticated) {
        setAuthenticated(false);
        setMembers([]);
        setTodayClasses([]);
        setEquipment([]);
        setPrograms([]);
        setAgendaDate("");
        return;
      }
      setMembers(result.members);
      setTodayClasses(result.todayClasses);
      setEquipment(result.equipment);
      setPrograms(result.programs);
      setAgendaDate(result.date);
      const priorityMember = filterTrainerMembers(result.members, "", "attention")[0] ?? result.members[0];
      setSelectedKey((current) => preserveSelection && result.members.some((member) => member.normalizedName === current)
        ? current
        : priorityMember?.normalizedName ?? "");
      setAuthenticated(true);
      return result.members;
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cargar Trainer OS." });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const session = await trainerSession();
        if (session.authenticated) {
          setStaffName(session.staffName ?? "");
          await load(false);
        }
        else setAuthenticated(false);
      } catch {
        setAuthenticated(false);
      } finally {
        setChecking(false);
      }
    })();
  }, [load]);

  const refreshAgenda = useCallback(async () => {
    try {
      const result = await fetchTrainerClasses();
      if (!result) return;
      setTodayClasses(result.todayClasses);
      setAgendaDate(result.date);
    } catch {
      // La actualización manual superior vuelve a intentar y muestra errores completos.
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setInterval(() => void refreshAgenda(), 60_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshAgenda();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [authenticated, refreshAgenda]);

  useEffect(() => {
    if (selected) resetWorkspace(selected);
    // selectedKey define intencionalmente el límite del borrador. Un refresh de
    // members no debe descartar cambios locales del entrenador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetWorkspace, selectedKey]); // selectedKey is the deliberate workspace boundary.

  useEffect(() => {
    if (!dirty && !healthDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, healthDirty]);

  const login = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setChecking(true);
    setNotice(null);
    try {
      const session = await loginTrainer(code.trim());
      setStaffName(session.staffName ?? "");
      setCode("");
      await load(false);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo iniciar sesión." });
    } finally {
      setChecking(false);
    }
  }, [code, load]);

  const logout = useCallback(async () => {
    if (healthBusy) return;
    if ((dirty || healthDirty) && !window.confirm("¿Salir y descartar los cambios sin guardar?")) return;
    await logoutTrainer();
    setAuthenticated(false);
    setStaffName("");
    setMembers([]);
    setTodayClasses([]);
    setEquipment([]);
    setPrograms([]);
    setAgendaDate("");
    setSelectedKey("");
    setDirty(false);
    setHealthDirty(false);
  }, [dirty, healthDirty, healthBusy]);

  const chooseMember = useCallback((key: string) => {
    if (key === selectedKey) return;
    if (healthBusy) return;
    if ((dirty || healthDirty) && !window.confirm("¿Cambiar de socio y descartar los cambios sin guardar?")) return;
    setHealthDirty(false);
    setSelectedKey(key);
    setTab("overview");
  }, [dirty, healthDirty, healthBusy, selectedKey]);

  const refresh = useCallback(async () => {
    if (healthBusy) return;
    if ((dirty || healthDirty) && !window.confirm("¿Actualizar y descartar los cambios sin guardar?")) return;
    const updatedMembers = await load(true);
    if (!updatedMembers) return;
    const refreshed = updatedMembers.find((member) => member.normalizedName === selectedKey) ?? updatedMembers[0] ?? null;
    if (refreshed) {
      setSelectedKey(refreshed.normalizedName);
      resetWorkspace(refreshed);
      setHealthRefresh((current) => current + 1);
    }
  }, [dirty, healthDirty, healthBusy, load, resetWorkspace, selectedKey]);

  const mutateDraft = useCallback((mutator: (current: TrainerPlan) => TrainerPlan) => {
    setDraft((current) => normalizeDraft(mutator(current)));
    setDirty(true);
    setNotice(null);
  }, []);

  const updateDraft = useCallback(<K extends keyof TrainerPlan>(field: K, value: TrainerPlan[K]) => {
    mutateDraft((current) => ({ ...current, [field]: value }));
  }, [mutateDraft]);

  const updateItem = useCallback((index: number, patch: Partial<PlanItem>) => {
    mutateDraft((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }, [mutateDraft]);

  const addItem = useCallback(() => {
    mutateDraft((current) => ({ ...current, items: [...current.items, createPlanItem()] }));
  }, [mutateDraft]);

  const deleteItem = useCallback((index: number) => {
    mutateDraft((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }, [mutateDraft]);

  const duplicateItem = useCallback((index: number) => {
    mutateDraft((current) => {
      const source = current.items[index];
      if (!source) return current;
      const copy = createPlanItem({
        ...source,
        day: `${source.day} copia`,
        done: false,
        doneDate: null,
        doneWorkoutId: null,
        prescribedExercises: (source.prescribedExercises ?? []).map((exercise) => createPrescription(exercise.machineId, exercise, equipment)),
      });
      return { ...current, items: [...current.items.slice(0, index + 1), copy, ...current.items.slice(index + 1)] };
    });
  }, [equipment, mutateDraft]);

  const moveItem = useCallback((index: number, direction: -1 | 1) => {
    mutateDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...current, items };
    });
  }, [mutateDraft]);

  const updateExercise = useCallback((itemIndex: number, exerciseIndex: number, patch: Partial<PlanExercisePrescription>) => {
    const exercises = draft.items[itemIndex]?.prescribedExercises ?? [];
    updateItem(itemIndex, { prescribedExercises: exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, ...patch } : exercise) });
  }, [draft.items, updateItem]);

  const addExercise = useCallback((itemIndex: number, assetId: string) => {
    const machine = equipment.find((entry) => entry.assetId === assetId);
    if (!machine) return;
    const exercises = draft.items[itemIndex]?.prescribedExercises ?? [];
    updateItem(itemIndex, { prescribedExercises: [...exercises, createEquipmentPrescription(machine)] });
  }, [draft.items, equipment, updateItem]);

  const selectExerciseMachine = useCallback((itemIndex: number, exerciseIndex: number, assetId: string) => {
    const machine = equipment.find((entry) => entry.assetId === assetId);
    const exercises = draft.items[itemIndex]?.prescribedExercises ?? [];
    if (!machine || !exercises[exerciseIndex]) return;
    updateItem(itemIndex, {
      prescribedExercises: exercises.map((exercise, index) => index === exerciseIndex
        ? attachPrescriptionToMachine(exercise, machine)
        : exercise),
    });
  }, [draft.items, equipment, updateItem]);

  const deleteExercise = useCallback((itemIndex: number, exerciseIndex: number) => {
    const exercises = draft.items[itemIndex]?.prescribedExercises ?? [];
    updateItem(itemIndex, { prescribedExercises: exercises.filter((_, index) => index !== exerciseIndex) });
  }, [draft.items, updateItem]);

  const applyTemplate = useCallback((templateId: string) => {
    if (dirty && draft.items.length && !window.confirm("¿Reemplazar el borrador con esta plantilla?")) return;
    const template = programs.find((entry) => entry.id === templateId);
    if (!template) return;
    setDraft(planFromTemplate(template, equipment));
    setDirty(true);
    setNotice(null);
    setTab("plan");
  }, [dirty, draft.items.length, equipment, programs]);

  const resetDraft = useCallback(() => resetWorkspace(selected), [resetWorkspace, selected]);

  const save = useCallback(async () => {
    if (!selected) return;
    const invalid = validatePlan(draft);
    if (invalid) {
      setNotice({ tone: "error", text: invalid });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const result = await persistTrainerPlan(selected.memberName, coachName, draft);
      if (result.member) {
        setMembers((current) => current.map((member) => member.normalizedName === result.member!.normalizedName ? result.member! : member));
        setDraft(clonePlan(result.member.trainingPlan ?? draft));
      }
      setDirty(false);
      setNotice({ tone: "success", text: `Plan guardado para ${selected.memberName}.` });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar el plan." });
    } finally {
      setSaving(false);
    }
  }, [coachName, draft, selected]);

  const saveGroup = useCallback(async () => {
    if (!selected?.trainingProgramAssignment) return;
    const program = programs.find((entry) => entry.id === selected.trainingProgramAssignment?.programId);
    if (!program) return;
    const invalid = validatePlan(draft);
    if (invalid) {
      setNotice({ tone: "error", text: invalid });
      return;
    }
    if (!window.confirm(`¿Actualizar ${program.name} para sus ${program.memberCount} socios? Los entrenos activos se actualizarán al terminar.`)) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await persistTrainingProgram(program.id, draft);
      const refreshed = await fetchTrainerMembers();
      if (refreshed.authenticated) {
        setMembers(refreshed.members);
        setPrograms(refreshed.programs);
        setEquipment(refreshed.equipment);
        const member = refreshed.members.find((entry) => entry.normalizedName === selected.normalizedName) ?? null;
        if (member) resetWorkspace(member);
      }
      setNotice({
        tone: "success",
        text: `${program.name} actualizado para ${result.synced} socios${result.deferred ? `; ${result.deferred} lo recibirá al terminar su entreno activo` : ""}.`,
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo actualizar el grupo." });
    } finally {
      setSaving(false);
    }
  }, [draft, programs, resetWorkspace, selected]);

  const assignDefaults = useCallback(async () => {
    if (dirty && !window.confirm("¿Asignar programas y descartar los cambios sin guardar?")) return;
    setAssigningPrograms(true);
    setNotice(null);
    try {
      const result = await assignDefaultPrograms();
      await load(true);
      setNotice({
        tone: "success",
        text: result.assigned
          ? `${result.assigned} socios recibieron un programa base automáticamente.`
          : "Todos los socios ya tienen un plan.",
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudieron repartir los programas." });
    } finally {
      setAssigningPrograms(false);
    }
  }, [dirty, load]);

  const assignProgram = useCallback(async (programId: string) => {
    if (!selected) return;
    const program = programs.find((entry) => entry.id === programId);
    if (!program) return;
    if ((selected.trainingPlan || dirty) && !window.confirm(`¿Reemplazar el plan actual de ${selected.memberName} por ${program.name}?`)) return;
    setAssigningPrograms(true);
    setNotice(null);
    try {
      const result = await assignMemberProgram(selected.normalizedName, programId);
      if (result.member) {
        setMembers((current) => current.map((member) => member.normalizedName === result.member!.normalizedName ? result.member! : member));
        resetWorkspace(result.member);
      }
      const refreshed = await fetchTrainerMembers();
      if (refreshed.authenticated) {
        setMembers(refreshed.members);
        setPrograms(refreshed.programs);
        setEquipment(refreshed.equipment);
      }
      setNotice({ tone: "success", text: `${selected.memberName} ahora entrena con ${program.name}.` });
      setTab("overview");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cambiar el programa." });
    } finally {
      setAssigningPrograms(false);
    }
  }, [dirty, programs, resetWorkspace, selected]);

  const changeAgendaDate = useCallback(async (targetDate: string) => {
    setChecking(true);
    try {
      const result = await fetchTrainerClassesForDate(targetDate);
      if (result) {
        setTodayClasses(result.todayClasses);
        setAgendaDate(result.date);
      }
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "No se pudieron cargar las clases." });
    } finally {
      setChecking(false);
    }
  }, []);

  const toggleClass = useCallback(async (trainingId: string, status: "scheduled" | "cancelled") => {
    try {
      const result = await toggleClassStatus(trainingId, agendaDate, status);
      if (result.todayClasses) setTodayClasses(result.todayClasses);
      setNotice({
        tone: "success",
        text: status === "scheduled" ? "Clase habilitada para socios." : "Clase deshabilitada/cancelada.",
      });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Error al cambiar estado de la clase." });
    }
  }, [agendaDate]);

  const expelAttendee = useCallback(async (bookingId: string) => {
    if (!window.confirm("¿Seguro que querés expulsar/remover a este socio de la clase?")) return;
    try {
      const result = await expelClassAttendee(bookingId, agendaDate);
      if (result.todayClasses) setTodayClasses(result.todayClasses);
      setNotice({ tone: "success", text: "Socio removido de la clase exitosamente." });
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Error al expulsar al socio." });
    }
  }, [agendaDate]);

  return {
    checking, authenticated, code, setCode, staffName, members, todayClasses, agendaDate,
    equipment, programs,
    selected, selectedSignal, stats,
    query, setQuery, filter, setFilter, filteredMembers, tab, setTab, draft, coachName,
    setCoachName: (value: string) => { setCoachName(value); setDirty(true); }, notice,
    saving, assigningPrograms, dirty, validationError, login, logout, refresh, chooseMember, updateDraft,
    healthDirty, setHealthDirty, healthBusy, setHealthBusy, healthRefresh,
    updateItem, addItem, deleteItem, duplicateItem, moveItem, updateExercise, addExercise, selectExerciseMachine,
    deleteExercise, applyTemplate, resetDraft, save, saveGroup, assignDefaults, assignProgram,
    changeAgendaDate, toggleClass, expelAttendee,
  };
}

export type TrainerOs = ReturnType<typeof useTrainerOs>;
