"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Mail, RefreshCw } from "lucide-react";

type IdentityMode = "email" | "cedula";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Cédula tica: 9 dígitos → 2-0685-0160 (provincia-tomo-asiento). */
function formatCrCedula(value: string) {
  const digits = onlyDigits(value).slice(0, 9);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

function detectMode(value: string): IdentityMode {
  const raw = value.trim();
  if (!raw) return "email";
  if (looksLikeEmail(raw) || /[a-zA-Z]/.test(raw)) return "email";
  return "cedula";
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
  const [mode, setMode] = useState<IdentityMode>("email");
  const [email, setEmail] = useState("");
  const [cedula, setCedula] = useState("");
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
    if (!fromQuery) return;
    const nextMode = detectMode(fromQuery);
    setMode(nextMode);
    if (nextMode === "email") setEmail(fromQuery.trim());
    else setCedula(formatCrCedula(fromQuery));
  }, [searchParams]);

  const identityForResend = mode === "email" ? email : cedula;
  const canSubmit =
    mode === "email"
      ? email.trim().includes("@")
      : onlyDigits(cedula).length >= 6 && (!needsEmail || extraEmail.trim().includes("@"));

  async function sendLink(opts: {
    mode: IdentityMode;
    emailValue: string;
    cedulaValue: string;
    forcedEmail?: string;
  }) {
    setError("");
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { action: "start", source };
      const forced = (opts.forcedEmail || "").trim();

      if (opts.mode === "email") {
        payload.email = opts.emailValue.trim();
      } else {
        payload.cedula = onlyDigits(opts.cedulaValue);
        if (forced) payload.email = forced;
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
          opts.mode === "email"
            ? opts.emailValue.trim()
            : forced || json.sentToMasked || "tu correo",
        );
        setSentMasked(json.sentToMasked || "");
        setFoundProfile(Boolean(json.foundProfile));
        setDone(true);
        return;
      }

      if (json.code === "needs_email") {
        setNeedsEmail(true);
        setMode("cedula");
        setError(json.error || "Escribí un correo para enviarte el enlace.");
        return;
      }

      if (!res.ok) throw new Error(json.error || "No se pudo enviar el correo.");
      setSentTo(
        opts.mode === "email"
          ? opts.emailValue.trim()
          : json.sentToMasked || "tu correo",
      );
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
    await sendLink({
      mode,
      emailValue: email,
      cedulaValue: cedula,
      forcedEmail: needsEmail ? extraEmail : "",
    });
  }

  function switchMode(next: IdentityMode) {
    setMode(next);
    setNeedsEmail(false);
    setError("");
    if (next === "email") setExtraEmail("");
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
                {sentMasked || sentTo || identityForResend}
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
                onClick={() =>
                  void sendLink({
                    mode,
                    emailValue: email,
                    cedulaValue: cedula,
                    forcedEmail: needsEmail ? extraEmail : "",
                  })
                }
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

  const digits = onlyDigits(cedula);
  const cedulaComplete = digits.length === 9;

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
        Usá tu correo o tu cédula tica. Si ya estabas en el gym, cargamos tus datos al abrir el
        enlace. Ahí confirmás el perfil y creás tu PIN.
      </p>

      <div
        className="mt-6 grid grid-cols-2 gap-1 border border-white/10 bg-black/40 p-1"
        role="tablist"
        aria-label="Cómo te registrás"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "email"}
          onClick={() => switchMode("email")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-wide transition ${
            mode === "email"
              ? "bg-[#f6c400] text-black"
              : "text-white/55 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          Correo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "cedula"}
          onClick={() => switchMode("cedula")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-wide transition ${
            mode === "cedula"
              ? "bg-[#f6c400] text-black"
              : "text-white/55 hover:bg-white/5 hover:text-white"
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Cédula
        </button>
      </div>

      {mode === "email" ? (
        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45">
            <Mail className="h-3.5 w-3.5" />
            Correo electrónico
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="tu@correo.com"
            className="w-full border border-white/15 bg-black/40 px-4 py-3 text-base font-bold text-white outline-none placeholder:text-white/30 focus:border-[#f6c400]"
          />
          <span className="mt-1.5 block text-xs font-semibold text-white/35">
            Te mandamos el enlace a este correo.
          </span>
        </label>
      ) : (
        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-white/45">
            <CreditCard className="h-3.5 w-3.5" />
            Cédula de identidad (CR)
          </span>
          <input
            type="text"
            required
            autoComplete="off"
            inputMode="numeric"
            pattern="[0-9\-]*"
            maxLength={11}
            value={cedula}
            onChange={(e) => {
              setCedula(formatCrCedula(e.target.value));
              setNeedsEmail(false);
              setError("");
            }}
            placeholder="2-0685-0160"
            className="w-full border border-white/15 bg-black/40 px-4 py-3 font-mono text-lg font-bold tracking-wide text-white outline-none placeholder:text-white/30 focus:border-[#f6c400]"
          />
          <span className="mt-1.5 block text-xs font-semibold text-white/35">
            Formato tico:{" "}
            <span className="font-mono text-white/55"># #### ####</span>
            {" → "}
            <span className="font-mono text-[#f6c400]/80">2-0685-0160</span>
            {digits.length > 0 && (
              <>
                {" · "}
                {digits.length}/9 dígitos
                {cedulaComplete ? " ✓" : ""}
              </>
            )}
          </span>
          {/* Ayuda visual de los 3 bloques de la cédula */}
          <div
            className="mt-3 grid grid-cols-[1fr_2.2fr_2.2fr] gap-2"
            aria-hidden
          >
            {[
              { label: "Prov.", value: digits.slice(0, 1), slots: 1 },
              { label: "Tomo", value: digits.slice(1, 5), slots: 4 },
              { label: "Asiento", value: digits.slice(5, 9), slots: 4 },
            ].map((block) => (
              <div
                key={block.label}
                className="border border-white/10 bg-black/30 px-2 py-2 text-center"
              >
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/30">
                  {block.label}
                </p>
                <p className="mt-1 font-mono text-sm font-black tracking-[0.2em] text-white/80">
                  {(block.value + "·".repeat(Math.max(0, block.slots - block.value.length))).slice(
                    0,
                    block.slots,
                  )}
                </p>
              </div>
            ))}
          </div>
        </label>
      )}

      {needsEmail && mode === "cedula" && (
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
        disabled={busy || !canSubmit}
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
