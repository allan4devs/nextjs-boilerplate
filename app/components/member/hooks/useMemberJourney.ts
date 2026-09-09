"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JourneyPayload } from "@/lib/xtreme/member-journey";
import { readJson, errorText } from "../utils";
import type { Member } from "../types";

export function useMemberJourney({ unlocked, memberKey, revision, onMember }: { unlocked: boolean; memberKey: string; revision: string; onMember: (member: Member) => void }) {
  const [snapshot, setSnapshot] = useState<{ key: string; data: JourneyPayload } | null>(null);
  const [journeyError, setJourneyError] = useState("");
  const [journeyBusy, setJourneyBusy] = useState("");
  const [refresh, setRefresh] = useState(0);
  const lock = useRef(false);
  const identity = useRef(memberKey);
  useEffect(() => { identity.current = memberKey; }, [memberKey]);
  const journey = unlocked && snapshot?.key === memberKey ? snapshot.data : null;
  const reloadJourney = useCallback(() => setRefresh((value) => value + 1), []);

  useEffect(() => {
    if (!unlocked || !memberKey) return;
    const controller = new AbortController();
    fetch("/api/xtreme/journey", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(readJson<JourneyPayload>)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSnapshot((previous) => previous?.key === memberKey && previous.data.version > data.version ? previous : { key: memberKey, data });
        setJourneyError("");
      })
      .catch((error) => { if (!controller.signal.aborted) setJourneyError(errorText(error, "No se pudo cargar tu camino.")); });
    return () => controller.abort();
  }, [memberKey, unlocked, revision, refresh]);

  useEffect(() => {
    if (!unlocked) return;
    const onVisible = () => { if (document.visibilityState === "visible") reloadJourney(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [unlocked, reloadJourney]);

  async function updateJourney(action: string, body: Record<string, unknown> = {}) {
    if (!unlocked || !journey || lock.current) return false;
    lock.current = true;
    setJourneyBusy(action);
    setJourneyError("");
    try {
      const response = await fetch("/api/xtreme/journey", {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, action, version: journey.version }),
      });
      const { member, ...data } = await readJson<JourneyPayload & { member?: Member }>(response);
      if (identity.current !== memberKey) return false;
      if (member) onMember(member);
      setSnapshot({ key: memberKey, data });
      return true;
    } catch (error) {
      if (identity.current === memberKey) setJourneyError(errorText(error, "No se pudo guardar. Tu avance sigue disponible para reintentar."));
      return false;
    } finally {
      lock.current = false;
      setJourneyBusy("");
    }
  }
  return { journey, journeyError, journeyBusy, reloadJourney, updateJourney };
}
