"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Dumbbell,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import { CEDULA_KEY, STORAGE_KEY } from "@/app/components/member/storage/keys";

type SavedProfile = {
  memberName: string;
  cedula: string;
  phone: string;
  goal: string;
};

type VerifyState =
  | { phase: "loading" }
  | { phase: "invalid"; error: string }
  | {
      phase: "form";
      email: string;
      source: string;
      boundProfile: boolean;
      neverRegistered: boolean;
      canEditName: boolean;
      /** Datos en archivo (import / ficha) - se muestran como referencia. */
      savedProfile: SavedProfile;
    }
  | {
      phase: "done";
      memberName: string;
      accessCode: string;
      paidRegistration: boolean;
      invitedRegistration: boolean;
      freeFirstDay?: boolean;
      profileCorrected?: boolean;
      claimedExistingCedula?: boolean;
      alreadyCompleted?: boolean;
    };

function FieldHint({
  saved,
  current,
  emptyLabel = "Sin dato en archivo",
}: {
  saved: string;
  current: string;
  emptyLabel?: string;
}) {
  const savedTrim = saved.trim();
  const currentTrim = current.trim();
  if (!savedTrim) {
    return <span className="mt-1 block text-xs font-semibold text-white/35">{emptyLabel}</span>;
  }
  const changed =
    onlyDigits(savedTrim) && onlyDigits(currentTrim)
      ? onlyDigits(savedTrim) !== onlyDigits(currentTrim)
      : savedTrim.toLowerCase() !== currentTrim.toLowerCase();
  return (
    <span className="mt-1 block text-xs font-semibold leading-snug text-white/40">
      {changed ? (
        <>
          Antes en archivo: <span className="text-orange-200/90">{savedTrim}</span>
        </>
      ) : (
        <>
          En archivo: <span className="text-white/55">{savedTrim}</span>
        </>
      )}
    </span>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCedulaDisplay(value: string) {
  const digits = onlyDigits(value).slice(0, 12);
  if (digits.length <= 1) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`;
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`;
}

function formatPhoneDisplay(value: string) {
  const digits = onlyDigits(value).slice(0, 12);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

function StepRail({ active }: { active: 1 | 2 | 3 }) {
  const items = [
    { n: 1 as const, label: "Correo" },
    { n: 2 as const, label: "Datos" },
    { n: 3 as const, label: "PIN" },
  ];
  return (
    <div className="mb-6 flex items-center gap-2">
      {items.map((item, index) => {
        const done = active > item.n;
        const current = active === item.n;
        return (
          <div key={item.n} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className={`grid h-8 w-8 place-items-center text-xs font-black ${
                  done || current
                    ? "bg-[#d8ff3e] text-black"
                    : "border border-white/20 text-white/40"
                }`}
              >
                {done ? "✓" : item.n}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wide ${
                  current ? "text-[#d8ff3e]" : done ? "text-white/70" : "text-white/35"
                }`}
              >
                {item.label}
              </span>
            </div>
            {index < items.length - 1 && (
              <div
                className={`mb-4 h-0.5 flex-1 ${done ? "bg-[#d8ff3e]/70" : "bg-white/10"}`}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<VerifyState>({ phase: "loading" });
  const [memberName, setMemberName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldHints, setFieldHints] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ phase: "invalid", error: "Falta el enlace de confirmación. Pedí uno nuevo." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/xtreme/register?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const json = (await res.json()) as {
          email?: string;
          memberName?: string;
          cedula?: string;
          phone?: string;
          goal?: string;
          source?: string;
          completed?: boolean;
          accessCode?: string;
          paidRegistration?: boolean;
          invitedRegistration?: boolean;
          freeFirstDay?: boolean;
          boundProfile?: boolean;
          neverRegistered?: boolean;
          canEditName?: boolean;
          savedProfile?: Partial<SavedProfile>;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && json.completed && json.memberName) {
          setState({
            phase: "done",
            memberName: json.memberName,
            accessCode: json.accessCode || "",
            paidRegistration: Boolean(json.paidRegistration),
            invitedRegistration: Boolean(json.invitedRegistration),
            freeFirstDay: Boolean(json.freeFirstDay),
            alreadyCompleted: true,
          });
          return;
        }
        if (!res.ok || !json.email) {
          setState({
            phase: "invalid",
            error: json.error || "Este enlace no es válido o ya venció.",
          });
          return;
        }
        const saved: SavedProfile = {
          memberName: String(json.savedProfile?.memberName ?? json.memberName ?? ""),
          cedula: String(json.savedProfile?.cedula ?? json.cedula ?? ""),
          phone: String(json.savedProfile?.phone ?? json.phone ?? ""),
          goal: String(json.savedProfile?.goal ?? json.goal ?? ""),
        };
        if (json.memberName) setMemberName(json.memberName);
        else if (saved.memberName) setMemberName(saved.memberName);
        if (json.cedula) setCedula(formatCedulaDisplay(json.cedula));
        else if (saved.cedula) setCedula(formatCedulaDisplay(saved.cedula));
        if (json.phone) setPhone(formatPhoneDisplay(json.phone));
        else if (saved.phone) setPhone(formatPhoneDisplay(saved.phone));
        if (json.goal) setGoal(json.goal);
        else if (saved.goal) setGoal(saved.goal);
        setState({
          phase: "form",
          email: json.email,
          source: json.source || "app",
          boundProfile: Boolean(json.boundProfile),
          neverRegistered: json.neverRegistered !== false,
          canEditName: json.canEditName !== false,
          savedProfile: saved,
        });
      } catch {
        if (!cancelled) {
          setState({
            phase: "invalid",
            error: "No pudimos validar el enlace. Revisá tu conexión e intentá de nuevo.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sourceLabel = useMemo(() => {
    if (state.phase !== "form") return "";
    if (state.source === "paypal") return "Pago confirmado";
    if (state.source === "reception") return "Invitación de recepción";
    if (state.source === "admin") return "Activación · Xtreme Gym";
    if (state.source === "campaign") return "Activación por correo · Xtreme Gym";
    if (state.source === "primer-dia") return "Primer día gratis";
    return "Registro por correo";
  }, [state]);

  function validateClient() {
    const hints: Record<string, string> = {};
    if (!memberName.trim() || memberName.trim().length < 3) {
      hints.memberName = "Escribí tu nombre completo.";
    }
    if (onlyDigits(cedula).length < 6) {
      hints.cedula = "La cédula o documento necesita al menos 6 dígitos.";
    }
    if (onlyDigits(phone).length < 8) {
      hints.phone = "El teléfono necesita al menos 8 dígitos.";
    }
    if (!/^\d{4}$/.test(pin)) {
      hints.pin = "El PIN debe ser exactamente 4 dígitos.";
    } else if (pin === "0000" || pin === "1234") {
      hints.pin = "Elegí un PIN más seguro (evitá 0000 o 1234).";
    }
    if (pin && pin !== pinConfirm) {
      hints.pinConfirm = "Los dos PIN no coinciden.";
    }
    setFieldHints(hints);
    return Object.keys(hints).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateClient()) {
      setError("Revisá los campos marcados.");
      return;
    }
    setSubmitting(true);
    setError("");
    setErrorCode("");
    try {
      const res = await fetch("/api/xtreme/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "confirm",
          token,
          memberName: memberName.trim(),
          cedula: onlyDigits(cedula),
          phone: onlyDigits(phone),
          goal: goal.trim(),
          pin,
          pinConfirm,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        memberName?: string;
        accessCode?: string;
        paidRegistration?: boolean;
        invitedRegistration?: boolean;
        freeFirstDay?: boolean;
        profileCorrected?: boolean;
        claimedExistingCedula?: boolean;
        code?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error || "No se pudo completar el registro.");
        setErrorCode(json.code || "");
        return;
      }

      const finalName = json.memberName || memberName.trim();
      try {
        window.localStorage.setItem(STORAGE_KEY, finalName);
        window.localStorage.setItem(CEDULA_KEY, onlyDigits(cedula));
      } catch {
        // localStorage puede fallar en modo privado
      }

      setState({
        phase: "done",
        memberName: finalName,
        accessCode: json.accessCode || "",
        paidRegistration: Boolean(json.paidRegistration),
        invitedRegistration: Boolean(json.invitedRegistration),
        freeFirstDay: Boolean(json.freeFirstDay),
        profileCorrected: Boolean(json.profileCorrected),
        claimedExistingCedula: Boolean(json.claimedExistingCedula),
      });
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const pinReady = pin.length === 4 && pinConfirm.length === 4 && pin === pinConfirm;

  return (
    <main className="grid min-h-screen place-items-center bg-[#0b0b0b] px-5 py-12 text-white sm:py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center bg-[#d8ff3e] text-black">
            <Dumbbell className="h-7 w-7" />
          </span>
          <div>
            <span className="text-lg font-black uppercase tracking-[0.2em]">Xtreme Gym</span>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              Activar acceso
            </p>
          </div>
        </div>

        {state.phase === "loading" && (
          <div className="grid place-items-center border border-white/10 bg-[#111] py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" />
            <p className="mt-4 text-sm font-bold text-white/50">Validando tu enlace...</p>
          </div>
        )}

        {state.phase === "invalid" && (
          <div className="border border-red-500/30 bg-red-500/10 p-6">
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <p className="font-black uppercase">Enlace no válido</p>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{state.error}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/primer-dia#registro"
                className="inline-flex bg-[#d8ff3e] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
              >
                Pedir enlace nuevo
              </Link>
              <Link
                href="/app"
                className="inline-flex border border-white/20 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#d8ff3e]"
              >
                Ir a la app
              </Link>
            </div>
          </div>
        )}

        {state.phase === "form" && (
          <form onSubmit={submit} className="border border-white/10 bg-[#111] p-5 sm:p-6" noValidate>
            <StepRail active={2} />

            <div className="flex items-center gap-2 text-[#d8ff3e]">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-xs font-black uppercase tracking-[0.18em]">{sourceLabel}</p>
            </div>
            <h1 className="mt-3 text-3xl font-black uppercase leading-none">
              {state.boundProfile ? "Verificá tus datos" : "Completá tu perfil"}
            </h1>
            <p className="mt-2 text-sm font-semibold text-white/60">
              Correo: <span className="text-[#d8ff3e]">{state.email}</span>
            </p>

            <div className="mt-4 border border-[#d8ff3e]/25 bg-[#d8ff3e]/10 px-3 py-3 text-sm font-semibold leading-6 text-white/80">
              {state.boundProfile ||
              state.savedProfile.memberName ||
              state.savedProfile.cedula ||
              state.savedProfile.phone
                ? "Abajo ves lo que ya teníamos asociado a este correo. Podés dejarlo igual o corregirlo. Al guardar, el correo queda verificado y creás tu PIN."
                : "Completá tus datos reales y creá tu PIN. Con eso activás la app."}
            </div>

            {(state.savedProfile.memberName ||
              state.savedProfile.cedula ||
              state.savedProfile.phone) && (
              <div className="mt-4 border border-white/12 bg-black/40 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
                  Datos en archivo (solo referencia)
                </p>
                <dl className="mt-2 space-y-1.5 text-xs font-semibold text-white/65">
                  {state.savedProfile.memberName ? (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-white/35">Nombre</dt>
                      <dd>{state.savedProfile.memberName}</dd>
                    </div>
                  ) : null}
                  {state.savedProfile.cedula ? (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-white/35">Cédula</dt>
                      <dd>{formatCedulaDisplay(state.savedProfile.cedula)}</dd>
                    </div>
                  ) : null}
                  {state.savedProfile.phone ? (
                    <div className="flex gap-2">
                      <dt className="w-16 shrink-0 text-white/35">Tel</dt>
                      <dd>{formatPhoneDisplay(state.savedProfile.phone)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            )}

            <section className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/50">
                <UserRound className="h-3.5 w-3.5 text-[#d8ff3e]" />
                Confirmá o corregí
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                  Nombre completo
                </span>
                <input
                  autoComplete="name"
                  autoFocus
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  readOnly={!state.canEditName}
                  className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e] read-only:cursor-not-allowed read-only:text-white/55"
                  placeholder="Nombre y apellidos"
                />
                {fieldHints.memberName ? (
                  <span className="mt-1 block text-xs font-bold text-red-300">{fieldHints.memberName}</span>
                ) : (
                  <FieldHint saved={state.savedProfile.memberName} current={memberName} />
                )}
                {!state.canEditName && (
                  <span className="mt-1 block text-xs font-semibold text-white/40">
                    Usamos el nombre ligado a tu pago.
                  </span>
                )}
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                  Teléfono
                </span>
                <input
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                  className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e]"
                  placeholder="8898 4000"
                />
                {fieldHints.phone ? (
                  <span className="mt-1 block text-xs font-bold text-red-300">{fieldHints.phone}</span>
                ) : (
                  <FieldHint
                    saved={state.savedProfile.phone}
                    current={phone}
                    emptyLabel="Preferible con WhatsApp."
                  />
                )}
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/50">
                  Cédula / documento
                  {!state.savedProfile.cedula ? (
                    <span className="ml-2 font-semibold normal-case tracking-normal text-orange-200/90">
                      (no la teníamos - escribila)
                    </span>
                  ) : null}
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  value={cedula}
                  onChange={(e) => setCedula(formatCedulaDisplay(e.target.value))}
                  className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 font-bold outline-none focus:border-[#d8ff3e]"
                  placeholder="1-2345-6789"
                />
                {fieldHints.cedula ? (
                  <span className="mt-1 block text-xs font-bold text-red-300">{fieldHints.cedula}</span>
                ) : (
                  <FieldHint
                    saved={state.savedProfile.cedula}
                    current={cedula}
                    emptyLabel="Con esta ID + tu PIN entrás a la app."
                  />
                )}
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
            </section>

            <section className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#d8ff3e]">
                <KeyRound className="h-3.5 w-3.5" />
                Tu PIN de acceso
              </div>
              <p className="text-xs font-semibold leading-relaxed text-white/45">
                4 dígitos para proteger tu perfil. Solo se crea una vez; si lo olvidás, lo recuperás
                con este correo.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                    PIN
                  </span>
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(onlyDigits(e.target.value).slice(0, 4))}
                    className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 text-center text-xl font-black tracking-[0.4em] outline-none focus:border-[#d8ff3e]"
                    placeholder="••••"
                  />
                  {fieldHints.pin && (
                    <span className="mt-1 block text-xs font-bold text-red-300">{fieldHints.pin}</span>
                  )}
                </label>
                <label>
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                    Repetí el PIN
                  </span>
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(onlyDigits(e.target.value).slice(0, 4))}
                    className="mt-2 min-h-12 w-full border border-white/15 bg-black px-3 text-center text-xl font-black tracking-[0.4em] outline-none focus:border-[#d8ff3e]"
                    placeholder="••••"
                  />
                  {fieldHints.pinConfirm && (
                    <span className="mt-1 block text-xs font-bold text-red-300">
                      {fieldHints.pinConfirm}
                    </span>
                  )}
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="mt-3 text-xs font-bold uppercase tracking-wide text-white/45 underline-offset-2 hover:text-white hover:underline"
              >
                {showPin ? "Ocultar PIN" : "Mostrar PIN"}
              </button>

              {pinReady && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#d8ff3e]">
                  <ShieldCheck className="h-3.5 w-3.5" /> PIN listo
                </p>
              )}
            </section>

            {error && (
              <div className="mt-4 border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm font-bold text-red-300">
                <p>{error}</p>
                {(errorCode === "verified_cedula_owner" ||
                  errorCode === "contact_already_registered") && (
                  <Link
                    href="/contacto"
                    className="mt-3 inline-flex border border-red-300/40 px-3 py-2 text-xs font-black uppercase text-white transition hover:bg-white hover:text-black"
                  >
                    Contactar recepción
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#d8ff3e] px-5 py-4 text-sm font-black uppercase text-black transition hover:bg-white disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Activar cuenta y crear PIN"
              )}
            </button>
            <p className="mt-3 text-center text-[11px] font-semibold text-white/35">
              Al continuar aceptás crear tu acceso de socio en Xtreme Gym.
            </p>
          </form>
        )}

        {state.phase === "done" && (
          <div className="border border-[#d8ff3e]/30 bg-[#d8ff3e]/5 p-6 text-center">
            <StepRail active={3} />
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#d8ff3e]" />
            <h1 className="mt-4 text-3xl font-black uppercase leading-none">
              ¡Listo, {state.memberName.split(" ")[0]}!
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
              {state.alreadyCompleted
                ? "Tu cuenta ya estaba activa. Entrá a la app con tu cédula y PIN."
                : state.paidRegistration
                  ? state.claimedExistingCedula
                    ? "Unimos tu pago con tu ficha. Correo, cédula y PIN quedaron listos."
                    : "Pago, correo y PIN quedaron unidos. Ya podés entrar a la app."
                  : state.invitedRegistration
                    ? "Tu cuenta y PIN quedaron listos. Podés elegir un plan cuando quieras."
                    : state.freeFirstDay !== false
                      ? "Tu cuenta y PIN quedaron listos. Tu primer día es gratis: presentate en recepción."
                      : "Tu cuenta y PIN quedaron listos. Ya podés entrar a la app."}
            </p>

            {state.accessCode && (
              <div className="mt-5 bg-[#0b0b0b] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                  Código de ingreso en recepción
                </p>
                <p className="mt-1 text-2xl font-black tracking-[0.3em] text-[#d8ff3e]">
                  {state.accessCode}
                </p>
              </div>
            )}

            <div className="mt-5 border border-white/10 bg-black/30 px-4 py-3 text-left text-sm font-semibold text-white/65">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d8ff3e]">
                Cómo entrar a la app
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Abrí la app</li>
                <li>Ingresá tu cédula</li>
                <li>Usá el PIN que acabás de crear</li>
              </ol>
            </div>

            <Link
              href="/app"
              className="mt-6 inline-flex w-full items-center justify-center bg-[#d8ff3e] px-6 py-4 text-sm font-black uppercase text-black transition hover:bg-white sm:w-auto"
            >
              Entrar a mi app
            </Link>
            <p className="mt-4 text-xs font-semibold text-white/40">
              También te mandamos un correo de bienvenida con estos datos.
            </p>
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
