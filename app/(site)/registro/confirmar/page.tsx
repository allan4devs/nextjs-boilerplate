"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Dumbbell, Loader2, XCircle } from "lucide-react";

type VerifyState =
  | { phase: "loading" }
  | { phase: "invalid"; error: string }
  | { phase: "form"; email: string; source: string }
  | { phase: "done"; memberName: string; accessCode: string; paidRegistration: boolean };

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<VerifyState>({ phase: "loading" });
  const [memberName, setMemberName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ phase: "invalid", error: "Falta el token de confirmacion." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/xtreme/register?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          email?: string;
          memberName?: string;
          source?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !json.email) {
          setState({ phase: "invalid", error: json.error || "Enlace invalido." });
          return;
        }
        if (json.memberName) setMemberName(json.memberName);
        setState({ phase: "form", email: json.email, source: json.source || "app" });
      } catch {
        if (!cancelled) setState({ phase: "invalid", error: "Error de conexion." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberName.trim() || !cedula.trim() || !phone.trim()) {
      setError("Complete nombre, cedula y telefono.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/xtreme/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", token, memberName, cedula, phone, goal }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        memberName?: string;
        accessCode?: string;
        paidRegistration?: boolean;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error || "No se pudo completar el registro.");
        return;
      }
      setState({
        phase: "done",
        memberName: json.memberName || memberName,
        accessCode: json.accessCode || "",
        paidRegistration: Boolean(json.paidRegistration),
      });
    } catch {
      setError("Error de conexion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b0b0b] px-5 py-14 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center bg-[#d8ff3e] text-black">
            <Dumbbell className="h-7 w-7" />
          </span>
          <span className="text-lg font-black uppercase tracking-[0.2em]">Xtreme Gym</span>
        </div>

        {state.phase === "loading" && (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        )}

        {state.phase === "invalid" && (
          <div className="border border-red-500/30 bg-red-500/10 p-6">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <p className="font-black uppercase">Enlace no valido</p>
            </div>
            <p className="mt-3 text-sm font-semibold text-white/70">{state.error}</p>
            <Link
              href="/primer-dia#reservar"
              className="mt-6 inline-flex bg-[#d8ff3e] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
            >
              Registrarme de nuevo
            </Link>
          </div>
        )}

        {state.phase === "form" && (
          <form onSubmit={submit} className="border border-white/10 bg-[#111] p-6">
            <div className="flex items-center gap-2 text-[#d8ff3e]">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                {state.source === "paypal" ? "Pago y correo confirmados" : "Correo confirmado"}
              </p>
            </div>
            <h1 className="mt-3 text-3xl font-black uppercase leading-none">Completá tu perfil</h1>
            <p className="mt-2 text-sm font-semibold text-white/60">{state.email}</p>

            <label className="mt-6 block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                Nombre completo
              </span>
              <input
                autoComplete="name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                readOnly={state.source === "paypal"}
                className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e] read-only:cursor-not-allowed read-only:text-white/55"
                placeholder="Nombre y apellidos"
              />
              {state.source === "paypal" && (
                <span className="mt-2 block text-xs font-semibold text-white/40">
                  Usamos el nombre ligado al pago para evitar que el acceso se asigne a otra persona.
                </span>
              )}
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                Cédula
              </span>
              <input
                inputMode="numeric"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e]"
                placeholder="1-2345-6789"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                Teléfono
              </span>
              <input
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e]"
                placeholder="8898 4000"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                Objetivo (opcional)
              </span>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e]"
                placeholder="Ganar fuerza, bajar grasa..."
              />
            </label>

            {error && (
              <p className="mt-4 border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#d8ff3e] px-5 py-4 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear mi cuenta"}
            </button>
          </form>
        )}

        {state.phase === "done" && (
          <div className="border border-[#d8ff3e]/30 bg-[#d8ff3e]/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#d8ff3e]" />
            <h1 className="mt-4 text-3xl font-black uppercase leading-none">
              ¡Listo, {state.memberName.split(" ")[0]}!
            </h1>
            <p className="mt-3 text-sm font-semibold text-white/70">
              {state.paidRegistration
                ? "Tu pago, correo y cédula quedaron unidos de forma segura. Ya podés entrar a la app y crear tu PIN."
                : "Tu cuenta quedó creada. Tu primer día es gratis: presentate en recepción con tu nombre."}
            </p>
            {state.accessCode && (
              <div className="mt-5 bg-[#0b0b0b] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                  Tu código de acceso
                </p>
                <p className="mt-1 text-2xl font-black tracking-[0.3em] text-[#d8ff3e]">
                  {state.accessCode}
                </p>
              </div>
            )}
            <Link
              href="/app"
              className="mt-6 inline-flex bg-[#d8ff3e] px-6 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
            >
              Abrir mi app
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ConfirmarRegistroPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#0b0b0b]">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </main>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
