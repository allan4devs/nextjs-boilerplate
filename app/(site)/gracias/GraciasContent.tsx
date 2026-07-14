"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Mail, Smartphone } from "lucide-react";
import { BUSINESS, waLink } from "../../lib/site";

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: "conversion",
      parameters: { send_to: string; transaction_id: string },
    ) => void;
  }
}

function formatUntil(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" });
}

export default function GraciasContent() {
  const params = useSearchParams();
  const plan = (params.get("plan") ?? "").trim();
  const reference = (params.get("ref") ?? "").trim();
  const until = formatUntil(params.get("until") ?? "");
  const appInviteSent = params.get("registro") === "correo";

  useEffect(() => {
    if (!reference) return;

    const sendConversion = () => {
      if (typeof window.gtag !== "function") return false;

      window.gtag("event", "conversion", {
        send_to: "AW-18319195306/ydJACN7ShNAcEKr5op9E",
        transaction_id: reference,
      });
      return true;
    };

    if (sendConversion()) return;

    const retryId = window.setInterval(() => {
      if (sendConversion()) window.clearInterval(retryId);
    }, 250);
    const timeoutId = window.setTimeout(() => window.clearInterval(retryId), 5_000);

    return () => {
      window.clearInterval(retryId);
      window.clearTimeout(timeoutId);
    };
  }, [reference]);

  const STEPS = [
    {
      icon: Mail,
      title: "Revisá tu correo",
      text: appInviteSent
        ? "Te enviamos el comprobante y otro correo con el enlace seguro para completar tu perfil."
        : "Te enviamos el comprobante del pago. Si no lo ves, revisá la carpeta de spam.",
    },
    {
      icon: Smartphone,
      title: "Entrá a tu app de socio",
      text: appInviteSent
        ? "Abrí el enlace del correo, agregá tu cédula de forma segura y después creá tu PIN."
        : "Ingresá con tu cédula, creá tu PIN de 4 dígitos y reservá clases, cuidá tu racha y seguí tu progreso.",
    },
    {
      icon: CheckCircle2,
      title: "Vení a entrenar",
      text: "Mostrá tu carné digital o tu cédula en recepción y ¡a darle! Pura vida.",
    },
  ];

  return (
    <section className="px-5 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="border border-white/10 bg-white/[0.045] p-6 text-center sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#f6c400] text-black">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.5} />
          </span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Pago confirmado</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            ¡Gracias por unirte!
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-white/58 sm:text-base">
            Tu pago se procesó correctamente y tu acceso ya quedó activo.
            {appInviteSent
              ? " También enviamos un enlace seguro para completar tu perfil; no pedimos la cédula durante el pago."
              : " En un momento te llega el comprobante al correo."}
          </p>

          {(plan || until || reference) && (
            <dl className="mx-auto mt-7 grid max-w-md gap-px overflow-hidden border border-white/10 bg-white/10 text-left">
              {plan && (
                <div className="flex items-center justify-between gap-4 bg-[#101010] px-4 py-3">
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Plan</dt>
                  <dd className="text-sm font-black uppercase text-white">{plan}</dd>
                </div>
              )}
              {until && (
                <div className="flex items-center justify-between gap-4 bg-[#101010] px-4 py-3">
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    Membresía activa hasta
                  </dt>
                  <dd className="text-sm font-black uppercase text-[#f6c400]">{until}</dd>
                </div>
              )}
              {reference && (
                <div className="flex items-center justify-between gap-4 bg-[#101010] px-4 py-3">
                  <dt className="text-xs font-black uppercase tracking-[0.14em] text-white/45">Comprobante</dt>
                  <dd className="break-all text-sm font-bold text-white/72">{reference}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/app"
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black transition hover:bg-white"
            >
              Entrar a mi app
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={waLink("Hola Xtreme Gym, acabo de pagar mi plan en línea y tengo una consulta.")}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 px-6 font-black uppercase text-white transition hover:border-white/40"
            >
              Escribir a recepción
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="border border-white/10 bg-white/[0.04] p-5">
              <step.icon className="h-6 w-6 text-[#f6c400]" />
              <h2 className="mt-3 text-sm font-black uppercase">{step.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/58">{step.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs font-bold text-white/40">
          ¿Algún problema con tu pago? Escribinos al {BUSINESS.phone}.
        </p>
      </div>
    </section>
  );
}
