"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PROFILE_KEY = "xtreme_food_profile_id";

export type SavedCandidate = {
  candidateKey: string;
  restaurant: string;
  location: string;
  dish: string;
  categoryEmoji: string;
  weight: number;
};

export type FoodPreferenceSummary = {
  candidates: SavedCandidate[];
  recentOrders: { restaurant: string; dish: string; dayKey: string }[];
  orderCounts: { day: number; week: number; month: number };
  tagAffinity: Record<string, number>;
  dishAffinity: Record<string, number>;
};

export type FoodPreferenceEvent = {
  type:
    | "ingredient_toggled"
    | "favorite_selected"
    | "builder_completed"
    | "candidate_added"
    | "probability_adjusted"
    | "candidate_removed"
    | "decision_made"
    | "roulette_choice"
    | "dish_ordered";
  tag?: string;
  selected?: boolean;
  favoriteId?: string;
  selectedTags?: readonly string[];
  candidateKey?: string;
  restaurant?: string;
  location?: string;
  dish?: string;
  categoryEmoji?: string;
  initialWeight?: number;
  nextWeight?: number;
  delta?: number;
  selectionStage?: "category" | "restaurant" | "dish";
  choiceLabel?: string;
  choiceMethod?: "button" | "roulette";
};

function getProfileId() {
  const existing = window.localStorage.getItem(PROFILE_KEY)?.trim();
  if (existing) return existing;
  const created = window.crypto.randomUUID();
  window.localStorage.setItem(PROFILE_KEY, created);
  return created;
}

export function useFoodPreferences() {
  const profileId = useRef("");
  const [summary, setSummary] = useState<FoodPreferenceSummary | null>(null);
  const [syncState, setSyncState] = useState<"loading" | "saved" | "offline">("loading");

  const refresh = useCallback(async () => {
    try {
      profileId.current ||= getProfileId();
      const response = await fetch(`/api/xtreme/food-preferences?profileId=${encodeURIComponent(profileId.current)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as FoodPreferenceSummary & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo cargar.");
      setSummary(data);
      setSyncState("saved");
    } catch {
      setSyncState("offline");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const recordEvent = useCallback(async (event: FoodPreferenceEvent) => {
    try {
      profileId.current ||= getProfileId();
      const response = await fetch("/api/xtreme/food-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profileId.current, ...event }),
        keepalive: true,
      });
      if (!response.ok) throw new Error("No se pudo guardar.");
      setSyncState("saved");
      return true;
    } catch {
      setSyncState("offline");
      return false;
    }
  }, []);

  return { summary, syncState, recordEvent, refresh };
}
