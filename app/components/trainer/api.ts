import type { SavePlanResponse, TrainerMember, TrainerPlan } from "./types";

async function payload<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

export async function trainerSession() {
  const response = await fetch("/api/xtreme/staff-session?surface=trainer", { cache: "no-store" });
  return payload<{ authenticated?: boolean; role?: string | null }>(response);
}

export async function loginTrainer(code: string) {
  const response = await fetch("/api/xtreme/staff-session", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surface: "trainer", code }),
  });
  return payload<{ authenticated?: boolean }>(response);
}

export async function logoutTrainer() {
  await fetch("/api/xtreme/staff-session?surface=trainer", { method: "DELETE" });
}

export async function fetchTrainerMembers() {
  const response = await fetch("/api/xtreme/trainer", { cache: "no-store" });
  if (response.status === 401) return { authenticated: false, members: [] as TrainerMember[] };
  const data = await payload<{ members?: TrainerMember[] }>(response);
  return { authenticated: true, members: data.members ?? [] };
}

export async function persistTrainerPlan(memberName: string, coachName: string, plan: TrainerPlan) {
  const response = await fetch("/api/xtreme/trainer", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberName, coachName, plan }),
  });
  return payload<SavePlanResponse>(response);
}

