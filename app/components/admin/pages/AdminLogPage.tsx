"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useAdmin } from "../context/AdminProvider";
import { adminFetch, adminRequestError } from "../request";
import { BitacoraTab } from "../tabs/BitacoraTab";
import type { AdminData } from "../types";

export function AdminLogPage() {
  const { data } = useAdmin().data;
  const [usageSessionId, setUsageSessionId] = useState<string | null>(null);
  const [usage, setUsage] = useState<AdminData["usage"]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  const loadUsage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError("");
    try {
      const response = await adminFetch("/api/xtreme/admin/analytics", { cache: "no-store" });
      const json = (await response.json()) as {
        usage?: AdminData["usage"];
        error?: string;
      };
      if (!response.ok || !json.usage) {
        throw new Error(json.error ?? "No se pudo cargar la bitácora.");
      }
      if (requestIdRef.current === requestId) setUsage(json.usage);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(adminRequestError(err, "No se pudo cargar la bitácora."));
      }
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadUsage]);

  if (!data) return null;

  if (isLoading && !usage) {
    return (
      <div className="grid min-h-[320px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c] text-center">
        <div>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#d8ff3e]" />
          <p className="mt-3 text-xs font-black uppercase tracking-[.16em] text-white/45">
            Cargando bitácora
          </p>
        </div>
      </div>
    );
  }

  if (error && !usage) {
    return (
      <div className="border-[3px] border-red-400/45 bg-red-500/[0.08] p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-red-300" />
        <p className="mt-3 font-black uppercase text-red-100">No cargó la bitácora</p>
        <p className="mt-1 text-sm font-bold text-red-100/60">{error}</p>
        <button
          type="button"
          onClick={() => void loadUsage()}
          className="mt-4 inline-flex min-h-11 items-center gap-2 border-[3px] border-red-300/50 px-4 py-2 text-xs font-black uppercase text-red-100 transition hover:bg-red-300 hover:text-black"
        >
          <RefreshCw className="h-4 w-4" /> Reintentar
        </button>
      </div>
    );
  }

  return usage ? (
    <BitacoraTab
      data={{ ...data, usage }}
      usageSessionId={usageSessionId}
      onSelectSession={setUsageSessionId}
      onToggleSession={(id) => setUsageSessionId((current) => (current === id ? null : id))}
    />
  ) : null;
}
