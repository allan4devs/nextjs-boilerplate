"use client";

import { useState } from "react";
import type { CampaignTrackingPayload, MemberCoverage, RecipientPreview } from "./types";

/**
 * Los tres paneles del centro de campañas tienen la misma forma —resultados,
 * si están cargando, y un buscador propio— pero responden a preguntas
 * distintas, así que cada uno es su propio hook en vez de un estado
 * compartido: filtrar la cobertura no debería tocar la lista de destinatarios.
 */

/** A quiénes le llegaría la campaña tal como está configurada. */
export function useRecipientsPanel() {
  const [recipients, setRecipients] = useState<RecipientPreview[]>([]);
  const [recipientsBusy, setRecipientsBusy] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  return {
    recipients,
    setRecipients,
    recipientsBusy,
    setRecipientsBusy,
    recipientSearch,
    setRecipientSearch,
  };
}

export type CoverageFilter = "all" | "sendable" | "missing" | "quarantined";

/** Qué socios tienen correo utilizable y cuáles están en cuarentena. */
export function useCoveragePanel() {
  const [coverage, setCoverage] = useState<MemberCoverage[] | null>(null);
  const [coverageBusy, setCoverageBusy] = useState(false);
  const [coverageSearch, setCoverageSearch] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");

  return {
    coverage,
    setCoverage,
    coverageBusy,
    setCoverageBusy,
    coverageSearch,
    setCoverageSearch,
    coverageFilter,
    setCoverageFilter,
  };
}

/** Qué pasó con una campaña ya enviada: entregas, rebotes y bajas. */
export function useTrackingPanel() {
  const [trackingCampaignId, setTrackingCampaignId] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("all");
  const [tracking, setTracking] = useState<CampaignTrackingPayload | null>(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [trackingSearch, setTrackingSearch] = useState("");

  return {
    trackingCampaignId,
    setTrackingCampaignId,
    trackingFilter,
    setTrackingFilter,
    tracking,
    setTracking,
    trackingBusy,
    setTrackingBusy,
    trackingSearch,
    setTrackingSearch,
  };
}

/** Los avisos del centro de campañas: qué está corriendo, qué salió mal o bien. */
export function useEmailFeedback() {
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  return { busy, setBusy, notice, setNotice, error, setError };
}
