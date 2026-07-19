"use client";

/**
 * Toast del Member OS - reemplaza el callout inline que empujaba el contenido.
 * Flota abajo (sobre el dock), se desvanece solo y se puede cerrar con click.
 * Los errores duran mas porque suelen pedir una accion del socio.
 */

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";

const OK_MS = 4200;
const ERROR_MS = 9000;
const LEAVE_MS = 220;

export type ToastHostProps = {
  message: string;
  error: string;
  onDismiss: () => void;
};

export default function ToastHost({ message, error, onDismiss }: ToastHostProps) {
  const isError = Boolean(error);
  const text = error || message;
  if (!text) return null;
  // key = texto: cada aviso nuevo remonta el toast y reinicia su temporizador.
  return <Toast key={text} text={text} isError={isError} onDismiss={onDismiss} />;
}

function Toast({
  text,
  isError,
  onDismiss,
}: {
  text: string;
  isError: boolean;
  onDismiss: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onDismiss, LEAVE_MS);
  }, [onDismiss]);

  useEffect(() => {
    const life = isError ? ERROR_MS : OK_MS;
    const fadeOut = window.setTimeout(() => setLeaving(true), life);
    const remove = window.setTimeout(onDismiss, life + LEAVE_MS);
    return () => {
      window.clearTimeout(fadeOut);
      window.clearTimeout(remove);
    };
  }, [isError, onDismiss]);

  const Icon = isError ? TriangleAlert : CircleCheck;

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-0 bottom-[88px] z-[80] flex justify-center px-3 lg:bottom-6 lg:justify-end lg:px-8"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className={`${leaving ? "xg-toast-out" : "xg-toast-in"} pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden border-[3px] p-3.5 text-left shadow-[5px_5px_0_rgba(0,0,0,.55)] backdrop-blur-md sm:p-4 ${
          isError
            ? "border-red-400/70 bg-[#1a0b0b]/95 text-red-100"
            : "border-[#d8ff3e] bg-[#12160a]/95 text-[#eaff93]"
        }`}
      >
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${isError ? "text-red-300" : "text-[#d8ff3e]"}`}
        />
        <span className="min-w-0 flex-1 text-sm font-bold leading-snug">{text}</span>
        <X className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
        <span
          aria-hidden
          style={{ animationDuration: `${isError ? ERROR_MS : OK_MS}ms` }}
          className={`xg-toast-bar absolute inset-x-0 bottom-0 h-[3px] ${
            isError ? "bg-red-400/60" : "bg-[#d8ff3e]"
          }`}
        />
      </button>
    </div>
  );
}
