"use client";

import { useEffect } from "react";

/** Fire-and-forget funnel events from marketing pages. */
export default function LandingTrack({
  event = "landing_viewed",
  surface,
  cta,
}: {
  event?: "landing_viewed" | "cta_clicked";
  surface: string;
  cta?: string;
}) {
  useEffect(() => {
    let anon = "";
    try {
      anon =
        window.sessionStorage.getItem("xtreme-anon-id") ||
        (() => {
          const id = `anon-${Math.random().toString(36).slice(2, 12)}`;
          window.sessionStorage.setItem("xtreme-anon-id", id);
          return id;
        })();
    } catch {
      anon = `anon-${Date.now()}`;
    }
    void fetch("/api/xtreme/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: event,
        source: "site",
        anonymousId: anon,
        properties: { surface, cta: cta ?? null },
      }),
    }).catch(() => {});
  }, [event, surface, cta]);

  return null;
}
