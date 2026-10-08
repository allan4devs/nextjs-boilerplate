"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Users } from "lucide-react";
import { GameButton } from "@/app/components/GameOS";
import type { GroupDashboard } from "@/lib/xtreme/trainer-group-a-model";
import type { TrainerMember } from "../types";

export function TrainerGroupMembershipPanel({ member, refreshKey = 0 }: { member: TrainerMember; refreshKey?: number }) {
  const [data, setData] = useState<GroupDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/xtreme/trainer/group-a", { cache: "no-store" });
      const payload = await response.json() as GroupDashboard & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudieron cargar los grupos.");
      setData(payload);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los grupos.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, member.memberId, refreshKey]);

  const assignments = useMemo(() => {
    if (!data) return new Map<string, string>();
    const links = new Map(data.links.map((link) => [link.profileId, link.memberId]));
    return new Map(data.profiles
      .filter((profile) => profile.memberId === member.memberId || links.get(profile.id) === member.memberId)
      .map((profile) => [profile.groupId ?? "", profile.id]));
  }, [data, member.memberId]);

  async function changeGroup(groupId: string, profileId?: string) {
    if (!data || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = profileId
        ? { action: "remove_member", groupId, profileId, revision: 0 }
        : { action: "add_member", groupId, memberId: member.memberId, routineId: data.routines[0]?.id, revision: 0 };
      const response = await fetch("/api/xtreme/trainer/group-a", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No se pudo actualizar el grupo.");
      await load();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "No se pudo actualizar el grupo.");
      setBusy(false);
    }
  }

  return <section className="border-[3px] border-cyan-300/25 bg-[#0c0c0c] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-cyan-200"><Users className="h-4 w-4" />Grupos activos</p><p className="mt-1 text-xs text-white/45">Agregá o sacá a {member.memberName} desde esta misma ficha.</p></div>{busy && <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />}</div>
    {error && <p role="alert" className="mt-3 border border-red-400/40 bg-red-500/10 p-2 text-xs font-bold text-red-200">{error}</p>}
    {!data && !error && <p className="mt-4 text-sm text-white/50">Cargando grupos activos…</p>}
    {data && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.groups.map((group) => {
      const profileId = assignments.get(group.id);
      return <div key={group.id} className={`flex items-center justify-between gap-3 border-2 p-3 ${profileId ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/[.05]" : "border-white/10"}`}><div className="min-w-0"><p className="truncate text-sm font-black">{group.name}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">{profileId ? "Asignado" : "Disponible"}</p></div>{profileId ? <GameButton type="button" variant="ghost" disabled={busy} onClick={() => void changeGroup(group.id, profileId)}><Check className="h-4 w-4 text-[#d8ff3e]" />Quitar</GameButton> : <GameButton type="button" variant="ghost" disabled={busy} onClick={() => void changeGroup(group.id)}>Agregar</GameButton>}</div>;
    })}</div>}
  </section>;
}
