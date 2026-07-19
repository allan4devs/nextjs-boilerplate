"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Mail, RefreshCw } from "lucide-react";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCedulaInput(value: string) {
  const digits = onlyDigits(value).slice(0, 12);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

type FormProps = {
  source?: "primer-dia" | "app";
  className?: string;
};

/**
 * Inicio del registro: correo o cédula → enlace mágico → /registro/confirmar
 * (datos precargados de ficha/import + PIN).
 */
export default function FreeDayRegisterForm(props: FormProps) {
  return (
    <Suspense
      fallback={
        <div
          id="registro"
          className={`border border-white/10 bg-[#0e0e0e] p-6 sm:p-8 ${props.className || ""}`}
        >
          <p className="text-sm font-bold text-white/50">Cargando registro…</p>
        </div>
      }
    >
      <FreeDayRegisterFormInner {...props} />
    </Suspense>
  );
}

function FreeDayRegisterFormInner({
  source = "primer-dia",
  className = "",
}: FormProps) {
  const searchParams = useSearchParams();
  const [identity, setIdentity] = useState("");
  const [extraEmail, setExtraEmail] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [sentMasked, setSentMasked] = useState("");
  const [foundProfile, setFoundProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fromQuery =
      searchParams.get("email") ||
      searchParams.get("correo") ||
      searchParams.get("cedula") ||
      searchParams.get("identity") ||
      "";
    if (fromQuery) {
      setIdentity(looksLikeEmail(fromQuery) ? fromQuery.trim() : formatCedulaInput(fromQuery));
    }
  }, [searchParams]);

  const identityHint = useMemo(() => {
    const raw = identity.trim();
    if (!raw) return "correo o cédula";
    if (looksLikeEmail(raw)) return "correo";
    if (onlyDigits(raw).length >= 6) return "cédula";
    return "correo o cédula";
  }, [identity]);

  async function sendLink(rawIdentity: string, forcedEmail = "") {
    setError("");
    setBusy(true);
    try {
      const trimmed = rawIdentity.trim();
      const payload: Record<string, unknown> = { action: "start", source };
      if (forcedEmail.trim()) {
        payload.email = forcedEmail.trim();
        if (trimmed && !looksLikeEmail(trimmed)) payload.cedula = onlyDigits(trimmed);
      } else if (looksLikeEmail(trimmed)) {
        payload.email = trimmed;
      } else {
        payload.cedula = onlyDigits(trimmed);
      }

      const res = await fetch("/api/xtreme/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        code?: string;
        foundProfile?: boolean;
        sentToMasked?: string;
        alreadyRegistered?: boolean;
      };

      if (res.ok && json.code !== "needs_email") {
        setNeedsEmail(false);
        setSentTo(
          looksLikeEmail(trimmed)
            ? trimmed
            : forcedEmail.trim() || json.sentToMasked || "tu correo",
        );
        setSentMasked(json.sentToMasked || "");
        setFoundProfile(Boolean(json.foundProfile));
        setDone(true);
        return;
      }

      if (json.code === "needs_email") {
        setNeedsEmail(true);
        setError(json.error || "Escribí un correo para enviarte el enlace.");
        return;
      }

      if (!res.ok) throw new Error(json.error || "No se pudo enviar el correo.");
      setSentTo(looksLikeEmail(trimmed) ? trimmed : json.sentToMasked || "tu correo");
      setSentMasked(json.sentToMasked || "");
      setFoundProfile(Boolean(json.foundProfile));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsEmail) {
      await sendLink(identity, extraEmail);
      return;
    }
    await sendLink(identity);
  }

  if (done) {
    return (
      <div
        id="registro"
        className={`border border-[#d8ff3e]/35 bg-[#111] p-6 sm:p-8 ${className}`}
      >
        <div className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
          <span className="text-[#d8ff3e]">1. Correo</span>
          <span aria-hidden>→</span>
          <span className="text-[#d8ff3e]">2. Enlace</span>
          <span aria-hidden>→</span>
          <span>3. Datos y PIN</span>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#d8ff3e]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black uppercase text-white sm:text-2xl">
              Revisá tu correo
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
              Te enviamos un enlace a{" "}
              <span className="break-all text-[#d8ff3e]">
                {sentMasked || sentTo || identity}
              </span>
              . Abrilo para confirmar el correo
              {foundProfile
                ? ", revisar los datos que ya tenemos de vos"
                : ", completar tu perfil"}{" "}
              y crear tu PIN — todo en un solo paso.
            </p>

            {foundProfile && (
              <p className="mt-3 border border-[#d8ff3e]/25 bg-[#d8ff3e]/10 px-3 py-2 text-xs font-bold leading-5 text-[#d8ff3e]">
                Encontramos ficha en el gym. Al abrir el enlace vas a ver nombre, cédula y teléfono
                guardados para que los confirmés o corrijás.
              </p>
            )}

            <ol className="mt-5 space-y-2 text-sm font-semibold text-white/70">
              <li className="flex gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center bg-[#d8ff3e] text-xs font-black text-black">
                  1
                </span>
                Abrí el correo de Xtreme Gym (mirá también spam o promociones).
              </li>
              <li className="flex gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center bg-[#d8ff3e] text-xs font-black text-black">
                  2
                </span>
                Revisá o completá nombre, teléfono, cédula y tu PIN de 4 dígitos.
              </li>
              <li className="flex gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center bg-[#d8ff3e] text-xs font-black text-black">
                  3
                </span>
                Entrá a la app con cédula + PIN cuando quieras.
              </li>
            </ol>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="inline-flex min-h-12 items-center gap-2 bg-[#d8ff3e] px-5 font-black uppercase text-black transition hover:bg-white"
              >
                Ir a la app <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendLink(identity, needsEmail ? extraEmail : "")}
                className="inline-flex min-h-12 items-center gap-2 border border-white/20 px-5 font-black uppercase text-white transition hover:border-[#d8ff3e] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Reenviar enlace
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setDone(false);
                setError("");
                setFoundProfile(false);
              }}
              className="mt-4 text-xs font-bold uppercase tracking-wide text-white/45 underline-offset-2 hover:text-white hover:underline"
            >
              Usar otro correo o cédula
            </button>

            {error && (
              <p className="mt-3 text-sm font-bold text-red-300" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="registro"
      onSubmit={(e) => void onSubmit(e)}
      className={`border border-white/10 bg-[#0e0e0e] p-6 sm:p-8 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
        <span className="text-[#f6c400]">1. Correo o cédula</span>
        <span aria-hidden>→</span>
        <span>2. Enlace</span>
        <span aria-hidden>→</span>
        <span>3. Datos y PIN</span>
      </div>

      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6c400]">
        Primer día gratis
      </p>
      <h2 className="mt-2 text-2xl font-black uppercase text-white sm:text-3xl">
        Registrate sin tarjeta
      </h2>
      <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/60">
        Escribí tu correo o tu cédula. Si ya estabas en el gym (import o campaña), cargamos tus
        datos al abrir el enlace. Ahí confirmás el perfil y creás tu PIN.
      </p>

      <label className="mt-6 block">
        <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45">
          {looksLikeEmail(identity) ? (
            <Mail className="h-3.5 w-3.5" />
          ) : (
            <CreditCard className="h-3.5 w-3.5" />
          )}
          Correo o cédula
        </span>
        <input
          type="text"
          required
          autoComplete="username"
          inputMode={looksLikeEmail(identity) || !identity ? "email" : "numeric"}
          value={identity}
          onChange={(e) => {
            const next = e.target.value;
            setIdentity(looksLikeEmail(next) ? next : formatCedulaInput(next));
            setNeedsEmail(false);
            setError("");
          }}
          placeholder="tu@correo.com o 1-2345-6789"
          className="w-full border border-white/15 bg-black/40 px-4 py-3 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#f6c400]"
        />
        <span className="mt-1.5 block text-xs font-semibold text-white/35">
          Detectamos: {identityHint}
        </span>
      </label>

      {needsEmail && (
        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45">
            <Mail className="h-3.5 w-3.5" /> Correo para el enlace
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={extraEmail}
            onChange={(e) => setExtraEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full border border-[#f6c400]/40 bg-black/40 px-4 py-3 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#f6c400]"
          />
          <span className="mt-1.5 block text-xs font-semibold text-white/40">
            Tu ficha no tenía correo. Con este te mandamos el enlace de activación.
          </span>
        </label>
      )}

      {error && (
        <p className="mt-3 text-sm font-bold text-red-300" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !identity.trim() || (needsEmail && !extraEmail.trim())}
        className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black transition hover:bg-white disabled:opacity-50 sm:w-auto"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Enviar enlace de registro
      </button>

      <p className="mt-4 text-xs font-bold leading-5 text-white/40">
        El enlace vence en 1 hora. ¿Ya tenés cuenta?{" "}
        <Link href="/app" className="text-[#d8ff3e] underline-offset-2 hover:underline">
          Entrá a la app
        </Link>
        {" · "}
        <Link
          href="/precios#inscripcion"
          className="text-[#d8ff3e] underline-offset-2 hover:underline"
        >
          Ver planes
        </Link>
      </p>
    </form>
  );
}
