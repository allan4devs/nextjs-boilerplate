"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";

/**
 * Inicio del registro: correo → enlace mágico → /registro/confirmar (datos + PIN).
 */
export default function FreeDayRegisterForm({
  source = "primer-dia",
  className = "",
}: {
  source?: "primer-dia" | "app";
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function sendLink(targetEmail: string) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/xtreme/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", email: targetEmail.trim(), source }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error || "No se pudo enviar el correo.");
      setSentTo(targetEmail.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendLink(email);
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
              <span className="break-all text-[#d8ff3e]">{sentTo || email}</span>.
              Abrilo para confirmar el correo, completar tu perfil y crear tu PIN — todo en un
              solo paso.
            </p>

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
                Completá nombre, teléfono, cédula y tu PIN de 4 dígitos.
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
                onClick={() => void sendLink(sentTo || email)}
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
              }}
              className="mt-4 text-xs font-bold uppercase tracking-wide text-white/45 underline-offset-2 hover:text-white hover:underline"
            >
              Usar otro correo
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
        <span className="text-[#f6c400]">1. Correo</span>
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
        Dejanos tu correo. Te mandamos un enlace para confirmar, completar tu perfil y crear tu
        PIN. Después presentate en el gym: un día completo para conocer Xtreme.
      </p>

      <label className="mt-6 block">
        <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45">
          <Mail className="h-3.5 w-3.5" /> Correo
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full border border-white/15 bg-black/40 px-4 py-3 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#f6c400]"
        />
      </label>

      {error && (
        <p className="mt-3 text-sm font-bold text-red-300" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !email.trim()}
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
