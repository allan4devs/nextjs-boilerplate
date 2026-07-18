"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, CreditCard, LogIn, MapPin, MessageCircle, UserPlus } from "lucide-react";
import { BUSINESS } from "@/lib/constants/business";

const REASONS = [
  ["too_many", "Recibo demasiados correos"],
  ["not_relevant", "El contenido no me resulta relevante"],
  ["prefer_app", "Prefiero revisar todo desde la app"],
  ["no_longer_member", "Ya no entreno en Xtreme Gym"],
  ["price", "El precio no se ajusta a mi situación"],
  ["schedule", "Los horarios no me funcionan"],
  ["moved_away", "Me mudé o vivo lejos"],
  ["health", "Por salud, lesión o una situación personal"],
  ["bad_experience", "Tuve una mala experiencia"],
  ["temporary_break", "Solo necesito una pausa por ahora"],
  ["other", "Otro motivo"],
] as const;

const RETURN_ACTIONS = [
  {
    href: "/app",
    title: "Entrar a mi cuenta",
    detail: "Abrí la app y retomá desde donde quedaste.",
    icon: LogIn,
  },
  {
    href: "/primer-dia#registro",
    title: "Crear o retomar registro",
    detail: "Pedí un enlace nuevo si el anterior venció.",
    icon: UserPlus,
  },
  {
    href: "/precios#inscripcion",
    title: "Activar un plan",
    detail: "Elegí semana, quincena o mes en línea.",
    icon: CreditCard,
  },
] as const;

export default function EmailPreferencesClient({ token }: { token: string }) {
  const [reason, setReason] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function unsubscribe() {
    if (!reason) {
      setError("Selecciona un motivo para ayudarnos a mejorar.");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/xtreme/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason, feedback }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la preferencia.");
      setStatus("done");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "No se pudo guardar la preferencia.");
    }
  }

  return (
    <section className="min-h-[75vh] bg-[#0b0b0b] px-5 py-16 text-white sm:px-8">
      <div className="mx-auto max-w-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">
          Preferencias de correo
        </p>
        {status === "done" ? (
          <>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
              Tu decisión quedó guardada.
            </h1>
            <p className="mt-5 font-semibold leading-7 text-white/65">
              Ya desactivamos los recordatorios, novedades y mensajes de motivación. Aún podés
              recibir recibos, confirmaciones y avisos de seguridad cuando sean necesarios.
            </p>
            <p className="mt-4 font-semibold leading-7 text-white/65">
              Gracias por contarnos el motivo. El equipo administrativo recibió tu respuesta para
              poder mejorar. Si decidís volver, siempre serás bienvenido.
            </p>
            <ReturnActions />
          </>
        ) : (
          <>
            <h1 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
              Lo sentimos si te vas.
            </h1>
            <p className="mt-5 font-semibold leading-7 text-white/65">
              Si querés volver, elegí una opción y seguí de inmediato. Si preferís no regresar,
              podés dejar de recibir todos los avisos opcionales y contarnos el motivo.
            </p>
            <ReturnActions />
            <div className="mt-8 border-t border-white/10 pt-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
                No quiero regresar o recibir más correos
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
                Elegí una razón. La recibirá el equipo administrativo; no intentaremos enviarte
                más campañas ni mensajes opcionales.
              </p>
            </div>
            <div className="mt-7 grid gap-2">
              {REASONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReason(value)}
                  className={
                    "border px-4 py-3 text-left text-sm font-bold transition " +
                    (reason === value
                      ? "border-[#f6c400] bg-[#f6c400]/10 text-[#ffe47a]"
                      : "border-white/10 bg-black/20 text-white/65 hover:border-white/30")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-5 block">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                ¿Qué podríamos haber hecho mejor? (opcional)
              </span>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value.slice(0, 500))}
                rows={4}
                className="mt-2 w-full resize-none border border-white/10 bg-black/30 p-3 font-semibold text-white outline-none focus:border-[#f6c400]"
              />
            </label>
            {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
            <button
              type="button"
              onClick={() => void unsubscribe()}
              disabled={status === "saving" || !token}
              className="mt-5 w-full bg-[#f6c400] px-5 py-4 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
            >
              {status === "saving" ? "Guardando..." : "Confirmar que no quiero más correos"}
            </button>
            <Link
              href="/app"
              className="mt-3 block border border-white/15 px-5 py-3 text-center text-sm font-black uppercase text-white/70"
            >
              Prefiero mantenerlos
            </Link>
          </>
        )}

        <div className="mt-8 grid gap-2 border-t border-white/10 pt-6 sm:grid-cols-3">
          <a href={BUSINESS.maps} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-white/65 hover:text-[#f6c400]">
            <MapPin className="h-4 w-4" /> Como llegar
          </a>
          <a href={"https://wa.me/" + BUSINESS.whatsapp} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-white/65 hover:text-[#f6c400]">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a href={BUSINESS.social.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-white/65 hover:text-[#f6c400]">
            <Camera className="h-4 w-4" /> Instagram
          </a>
        </div>
      </div>
    </section>
  );
}

function ReturnActions() {
  return (
    <div className="mt-7 grid gap-3 sm:grid-cols-3">
      {RETURN_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group border border-[#f6c400]/35 bg-[#f6c400]/[0.07] p-4 transition hover:border-[#f6c400] hover:bg-[#f6c400]/15"
          >
            <Icon className="h-5 w-5 text-[#f6c400]" />
            <span className="mt-3 block text-sm font-black uppercase text-white">
              {action.title}
            </span>
            <span className="mt-2 block text-xs font-semibold leading-5 text-white/50">
              {action.detail}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
