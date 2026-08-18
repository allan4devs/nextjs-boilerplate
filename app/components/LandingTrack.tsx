"use client";

import { useEffect } from "react";
import { getAnonymousId } from "../lib/analytics/session-client";

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
    // Misma identidad anónima que usan los clics de CTA y la sesión de uso.
    const anon = getAnonymousId();
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
