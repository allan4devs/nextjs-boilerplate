"use client";

/**
 * PIN del socio: crear, verificar, cambiar y recuperar (OTP al correo).
 * Habla con /api/xtreme/pin y protege la sesion del Member OS.
 */

import { useCallback, useEffect, useState } from "react";
import { Delete, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { MSG } from "./constants";
import { errorText } from "./utils";

export default function PinModal({
  memberName,
  mode: initialMode,
  onSuccess,
  onChangeMember,
  onCancel,
  onDone,
}: {
  memberName: string;
  mode: "set" | "verify" | "change";
  onSuccess: () => void;
  /** Cierra sesion y vuelve al login por cedula. */
  onChangeMember: () => void;
  /** Solo en cambio de PIN: cierra el modal sin cerrar sesion. */
  onCancel?: () => void;
  onDone?: (message: string) => void;
}) {
  const [mode, setMode] = useState<"set" | "verify" | "change" | "recover">(initialMode);
  const [step, setStep] = useState<"enter" | "new" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [recoveryContact, setRecoveryContact] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetPinFlow = useCallback((nextMode: "set" | "verify" | "change" | "recover") => {
    setMode(nextMode);
    setStep("enter");
    setDigits("");
    setFirstPin("");
    setCurrentPin("");
    setOtpCode("");
    setOtpSentTo("");
    setError("");
  }, []);

  useEffect(() => {
    resetPinFlow(initialMode);
  }, [initialMode, resetPinFlow]);

  const requestOtp = useCallback(async () => {
    setOtpSending(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          memberName,
          action: "requestOtp",
          recoveryContact: recoveryContact.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        maskedEmail?: string;
        expiresInMin?: number;
      };
      if (!response.ok) throw new Error(data.error ?? MSG.errors.pinSendOtp);
      setOtpSentTo(data.maskedEmail ?? "tu correo");
      onDone?.(MSG.ok.otpSent(data.maskedEmail ?? "tu correo", data.expiresInMin ?? 15));
    } catch (err) {
      setError(errorText(err, MSG.errors.pinSendOtp));
    } finally {
      setOtpSending(false);
    }
  }, [memberName, onDone, recoveryContact]);

  const completePin = useCallback(
    async (pin: string) => {
      if (mode === "set" && step === "enter") {
        // Preferí OTP al correo; si venís del enlace mágico hay sesión y el server lo acepta sin OTP.
        setFirstPin(pin);
        setDigits("");
        setStep("confirm");
        return;
      }

      if (mode === "change" && step === "enter") {
        setCurrentPin(pin);
        setDigits("");
        setStep("new");
        return;
      }

      if (mode === "change" && step === "new") {
        setFirstPin(pin);
        setDigits("");
        setStep("confirm");
        return;
      }

      if (mode === "recover" && step === "enter") {
        if (!otpCode.trim() || otpCode.replace(/\D/g, "").length !== 6) {
          setError(MSG.errors.pinOtpMissing);
          setDigits("");
          return;
        }
        setFirstPin(pin);
        setDigits("");
        setStep("confirm");
        return;
      }

      if ((mode === "set" || mode === "change" || mode === "recover") && pin !== firstPin) {
        setError(MSG.errors.pinMismatch);
        setDigits("");
        setFirstPin("");
        setStep(mode === "change" ? "new" : "enter");
        return;
      }

      setIsLoading(true);
      try {
        const action = mode === "recover" ? "recover" : mode;
        const response = await fetch("/api/xtreme/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            memberName,
            pin,
            action,
            currentPin,
            recoveryContact,
            otp: otpCode.replace(/\D/g, "").slice(0, 6),
          }),
        });
        const data = (await response.json()) as {
          valid?: boolean;
          hasPinSet?: boolean;
          error?: string;
        };

        if (response.status === 409) {
          setMode("verify");
          setStep("enter");
          setDigits("");
          setError(MSG.errors.pinAlreadySet);
          return;
        }

        if (!response.ok) {
          if (response.status === 403 && mode === "set") {
            throw new Error(data.error ?? MSG.errors.pinSetupOtpRequired);
          }
          throw new Error(data.error ?? MSG.errors.pinValidate);
        }
        if (mode === "verify" && data.hasPinSet === false) {
          // El perfil no tiene PIN: crear uno (requiere enlace/sesión o OTP al correo).
          resetPinFlow("set");
          setError(MSG.errors.pinNotSet);
          return;
        }
        if (mode === "verify" && !data.valid) {
          setError(MSG.errors.pinWrong);
          setDigits("");
          return;
        }

        if (mode === "change") {
          onDone?.(MSG.ok.pinChanged);
        }
        if (mode === "recover") {
          onDone?.(MSG.ok.pinRecovered);
        }

        onSuccess();
      } catch (err) {
        setError(errorText(err, MSG.errors.pinValidate));
        setDigits("");
      } finally {
        setIsLoading(false);
      }
    },
    [currentPin, firstPin, memberName, mode, onDone, onSuccess, otpCode, recoveryContact, resetPinFlow, step],
  );

  const pressDigit = useCallback(
    (digit: string) => {
      if (isLoading || digits.length >= 4) return;
      const next = digits + digit;
      setDigits(next);
      setError("");
      if (next.length === 4) void completePin(next);
    },
    [completePin, digits, isLoading],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pressDigit(event.key);
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setDigits((value) => value.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pressDigit]);

  const title =
    mode === "set"
      ? step === "enter"
        ? "Creá tu PIN"
        : "Confirmá tu PIN"
      : mode === "change"
        ? step === "enter"
          ? "PIN actual"
          : step === "new"
            ? "Nuevo PIN"
            : "Confirmá PIN"
        : mode === "recover"
          ? step === "enter"
            ? "Nuevo PIN"
            : "Confirmá PIN"
          : "Ingresá tu PIN";
  const subtitle =
    mode === "set"
      ? "PIN de 4 dígitos · si te lo pide, usá el código del correo"
      : mode === "change"
        ? "Primero el PIN actual"
        : mode === "recover"
          ? "Código del correo + nuevo PIN"
          : "PIN de 4 dígitos";

  return (
    <div className="xg-os-login-shell fixed inset-0 z-50 grid bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-[360px] border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-5 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-6">
        <div className="mx-auto grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
          {mode === "set" ? <ShieldCheck className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">{memberName}</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">{title}</h2>
        <p className="mt-2 text-sm font-bold text-white/55">{subtitle}</p>

        {(mode === "recover" || mode === "set") && (
          <div className="mt-4 space-y-2 text-left">
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={otpSending}
              className="flex w-full items-center justify-center gap-2 border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-[#eaff93] transition hover:bg-[#d8ff3e] hover:text-black disabled:opacity-50"
            >
              {otpSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              {otpSentTo ? "Reenviar codigo" : "Enviar codigo al correo"}
            </button>
            {otpSentTo ? (
              <p className="text-center text-[11px] font-semibold text-white/50">
                Enviado a {otpSentTo}
              </p>
            ) : (
              <p className="text-center text-[11px] font-semibold text-white/45">
                {mode === "set" ? "Opcional si venís del enlace del correo." : "Requerido para recuperar."}
              </p>
            )}
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              className="w-full border border-white/12 bg-black/45 px-3 py-3 text-center text-sm font-bold tracking-[0.3em] text-white outline-none placeholder:tracking-normal placeholder:text-white/30 focus:border-[#d8ff3e]"
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {initialMode === "change" ? (
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93]"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={onChangeMember}
              className="border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/70 transition hover:border-red-400/50 hover:text-red-300"
            >
              Cerrar sesion
            </button>
          )}

          {initialMode === "verify" && mode !== "recover" && (
            <button
              type="button"
              onClick={() => resetPinFlow("recover")}
              className="border border-orange-300/30 px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-200 transition hover:border-orange-300 hover:text-white"
            >
              Olvide mi PIN
            </button>
          )}

          {mode === "recover" && (
            <button
              type="button"
              onClick={() => resetPinFlow("verify")}
              className="border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/60 transition hover:text-white"
            >
              Volver al PIN
            </button>
          )}
        </div>

        <div className="mt-7 flex justify-center gap-4">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-4 w-4 border-2 ${digits.length > index ? "border-[#d8ff3e] bg-[#d8ff3e]" : "border-white/30"}`}
            />
          ))}
        </div>

        <div className="mt-4 min-h-6 text-sm font-bold text-red-300">{error}</div>

        {isLoading ? (
          <Loader2 className="mx-auto mt-4 h-7 w-7 animate-spin text-[#d8ff3e]" />
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => pressDigit(digit)}
                className="grid h-14 place-items-center border-[3px] border-white/20 bg-black/40 text-xl font-black text-white transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black active:translate-y-px"
              >
                {digit}
              </button>
            ))}
            <span />
            <button
              type="button"
              onClick={() => pressDigit("0")}
              className="grid h-14 place-items-center border-[3px] border-white/20 bg-black/40 text-xl font-black text-white transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black active:translate-y-px"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setDigits((value) => value.slice(0, -1))}
              className="grid h-14 place-items-center border-[3px] border-white/20 bg-black/40 text-white transition hover:border-orange-300 hover:text-orange-200 active:translate-y-px"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
