"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

/**
 * Start free first-day registration: email → magic link → /registro/confirmar.
 */
export default function FreeDayRegisterForm({
  source = "primer-dia",
  className = "",
}: {
  source?: "primer-dia" | "app";
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/xtreme/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", email: email.trim(), source }),
      });
      const json = (await res.json()) as {
        error?: string;
        message?: string;
        devToken?: string;
      };
      if (!res.ok) throw new Error(json.error || "No se pudo enviar el correo.");
      setDone(true);
      if (json.devToken) setDevToken(json.devToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        id="registro"
        className={`border border-[#f6c400]/40 bg-[#111] p-6 sm:p-8 ${className}`}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#d8ff3e]" />
          <div>
            <h2 className="text-xl font-black uppercase text-white">Revise su correo</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/65">
              Le enviamos un enlace para confirmar su cuenta y activar el{" "}
              <strong className="text-white">primer día gratis</strong>. Después configure su PIN
              en la app.
            </p>
            {devToken && (
              <p className="mt-4 text-xs font-bold text-amber-300/90">
                Dev (sin Resend):{" "}
                <Link
                  href={`/registro/confirmar?token=${encodeURIComponent(devToken)}`}
                  className="underline"
                >
                  abrir confirmación
                </Link>
              </p>
            )}
            <Link
              href="/app"
              className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#d8ff3e] px-5 font-black uppercase text-black"
            >
              Ir a la app <ArrowRight className="h-4 w-4" />
            </Link>
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
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6c400]">
        Primer día gratis
      </p>
      <h2 className="mt-2 text-2xl font-black uppercase text-white sm:text-3xl">
        Registrate sin tarjeta
      </h2>
      <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/60">
        Dejanos tu correo, confirmá el enlace y presentate en el gym. Un día completo para conocer
        Xtreme. Después elegís tu plan en línea o en recepción.
      </p>

      <label className="mt-6 block">
        <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45">
          <Mail className="h-3.5 w-3.5" /> Correo
        </span>
        <input
          type="email"
          required
          autoComplete="email"
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
        disabled={busy}
        className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black transition hover:bg-white disabled:opacity-50 sm:w-auto"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        Enviar enlace gratis
      </button>

      <p className="mt-4 text-xs font-bold text-white/40">
        ¿Ya sabés tu plan?{" "}
        <Link href="/precios#inscripcion" className="text-[#d8ff3e] underline-offset-2 hover:underline">
          Ver planes
        </Link>
      </p>
    </form>
  );
}
