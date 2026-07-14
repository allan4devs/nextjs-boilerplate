"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, HeartPulse, Send, ShieldCheck, Zap } from "lucide-react";
import { XTREME_CHECKOUT_OPTIONS } from "@/lib/constants/checkout";

type CheckoutOption = {
  id: string;
  label: string;
  category: "Plan" | "Clase";
  priceCrc: number;
  priceLabel: string;
  usdAmount: string;
  note: string;
};

type PayPalConfig = {
  configured?: boolean;
  clientId?: string;
  currency: string;
  message?: string;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: unknown) => {
        render: (container: HTMLDivElement) => Promise<void> | void;
      };
    };
  }
}

const CHECKOUT_NOTES: Record<string, string> = {
  week: "Una semana para activar el hábito.",
  fortnight: "Buen ritmo para sostener el progreso.",
  month: "La opción principal para entrenar constante.",
  senior: "Tres clases por semana para bienestar y movimiento.",
};

/** Paid-only catalog — every option requires PayPal checkout. */
const CHECKOUT_OPTIONS: CheckoutOption[] = XTREME_CHECKOUT_OPTIONS
  .filter((option) => option.id !== "day-pass")
  .map((option) => ({ ...option, note: CHECKOUT_NOTES[option.id] ?? "" }));

const MAIN_OPTION_IDS = new Set(["week", "fortnight", "month"]);
const PLAN_DAYS: Record<string, number> = { week: 7, fortnight: 15, month: 30 };
const CHECKOUT_FORM_KEY = "xtreme-checkout-form";

function perDayLabel(priceCrc: number, days: number) {
  const value = Math.round(priceCrc / days);
  return value.toLocaleString("es-CR");
}

function isValidOptionId(value: string | null | undefined) {
  return CHECKOUT_OPTIONS.some((option) => option.id === value);
}

const OPTION_STYLES: Record<string, { card: string; eyebrow: string; price: string; accent: string }> = {
  week: { card: "border-black bg-[#fff9df] text-black hover:bg-white", eyebrow: "text-black/50", price: "text-black", accent: "bg-black" },
  fortnight: { card: "border-black bg-white text-black hover:bg-[#fff9df]", eyebrow: "text-black/50", price: "text-black", accent: "bg-black" },
  month: { card: "border-black bg-black text-white", eyebrow: "text-[#f6c400]", price: "text-[#f6c400]", accent: "bg-[#f6c400]" },
  senior: { card: "border-black bg-white text-black hover:bg-[#fff9df]", eyebrow: "text-black/50", price: "text-black", accent: "bg-black" },
};

const PRICE_PERIOD: Record<string, { es: string; en: string }> = {
  week: { es: "por semana", en: "per week" },
  fortnight: { es: "por quincena", en: "per fortnight" },
  month: { es: "por mes", en: "per month" },
};

type FormState = {
  name: string;
  phone: string;
  email: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
};

export default function ExtremeGymCheckout({
  initialOption = "month",
  locale = "es",
}: {
  initialOption?: string;
  locale?: "es" | "en";
}) {
  const english = locale === "en";
  const englishOptions: Record<string, { label: string; category: string; note: string }> = {
    week: { label: "Weekly plan", category: "Plan", note: "One week to build momentum." },
    fortnight: { label: "Fortnightly plan", category: "Plan", note: "A solid rhythm for consistent progress." },
    month: { label: "Monthly plan", category: "Plan", note: "The main option for consistent training." },
    senior: { label: "Senior fitness classes", category: "Class", note: "Three weekly classes for movement and wellbeing." },
  };
  const optionText = (option: CheckoutOption) => english ? englishOptions[option.id] : option;
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");
  const resolvedInitialOption = isValidOptionId(planFromUrl)
    ? planFromUrl!
    : isValidOptionId(initialOption)
      ? initialOption
      : "month";
  const [selectedId, setSelectedId] = useState(resolvedInitialOption);
  const [form, setForm] = useState<FormState>(initialForm);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const paypalRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<{
    form: FormState;
    formReady: boolean;
    selected: CheckoutOption;
  } | null>(null);

  const selected = useMemo(
    () => CHECKOUT_OPTIONS.find((option) => option.id === selectedId) ?? CHECKOUT_OPTIONS[0],
    [selectedId],
  );

  const formReady = Boolean(form.name.trim() && form.phone.trim() && form.email.trim());
  const checkoutStep = formReady ? 3 : 2;
  const monthPerDay = perDayLabel(23000, 30);
  const weekPerDay = perDayLabel(8000, 7);
  const monthSavingsPct = Math.round((1 - 23000 / 30 / (8000 / 7)) * 100);

  useEffect(() => {
    checkoutRef.current = { form, formReady, selected };
  }, [form, formReady, selected]);

  useEffect(() => {
    if (!isValidOptionId(planFromUrl)) return;
    setSelectedId(planFromUrl!);
  }, [planFromUrl]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(CHECKOUT_FORM_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<FormState>;
      setForm({
        name: saved.name?.trim() ?? "",
        phone: saved.phone?.trim() ?? "",
        email: saved.email?.trim() ?? "",
      });
    } catch {
      // ignore corrupt cache
    }
  }, []);

  useEffect(() => {
    try {
      if (!form.name && !form.phone && !form.email) {
        window.sessionStorage.removeItem(CHECKOUT_FORM_KEY);
        return;
      }
      window.sessionStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(form));
    } catch {
      // ignore storage failures
    }
  }, [form]);

  function selectPlan(optionId: string) {
    setSelectedId(optionId);
    setStatus("");
    setError("");
    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    const anon =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("xtreme-anon-id") ||
          (() => {
            const id = `anon-${Math.random().toString(36).slice(2, 12)}`;
            window.sessionStorage.setItem("xtreme-anon-id", id);
            return id;
          })()
        : "";
    void fetch("/api/xtreme/events/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "landing_viewed",
        source: "site",
        anonymousId: anon,
        properties: { surface: "checkout", optionId: resolvedInitialOption },
      }),
    }).catch(() => {});
  }, [resolvedInitialOption]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/xtreme/checkout/config", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as PayPalConfig & { message?: string };
        if (!response.ok) throw new Error(data.message || "No se pudo cargar PayPal.");
        if (!cancelled) {
          setPaypalConfig(data);
          if (!data.configured) {
            setError(data.message || "PayPal no está disponible en este momento.");
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "PayPal no está disponible.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paypalConfig?.clientId || !paypalRef.current) return;

    let cancelled = false;
    const container = paypalRef.current;
    const activePayPalConfig = paypalConfig;
    const activeClientId = paypalConfig.clientId;
    container.innerHTML = "";

    async function loadPayPal() {
      try {
        const existing = document.querySelector<HTMLScriptElement>("#xtreme-paypal-sdk");
        if (!window.paypal && !existing) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.id = "xtreme-paypal-sdk";
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
              activeClientId,
            )}&currency=${encodeURIComponent(activePayPalConfig.currency)}&intent=capture`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("No se pudo cargar el SDK de PayPal."));
            document.body.appendChild(script);
          });
        } else if (existing && !window.paypal) {
          await new Promise<void>((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal.")), {
              once: true,
            });
          });
        }

        if (cancelled || !container || !window.paypal) return;

        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
            },
            createOrder: async () => {
              const currentCheckout = checkoutRef.current;
              setError("");
              setStatus("Creando orden segura...");

              if (!currentCheckout?.formReady) {
                throw new Error("Complete nombre, teléfono y correo antes de pagar.");
              }

              const response = await fetch("/api/xtreme/checkout/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  optionId: currentCheckout.selected.id,
                  customer: currentCheckout.form,
                }),
              });
              const data = (await response.json()) as { orderID?: string; message?: string };
              if (!response.ok || !data.orderID) throw new Error(data.message || "No se pudo crear la orden.");
              setStatus("Orden lista. Complete el pago en PayPal...");
              return data.orderID;
            },
            onApprove: async (data: { orderID?: string }) => {
              const currentCheckout = checkoutRef.current;
              if (!data.orderID) throw new Error("PayPal no devolvió número de orden.");

              if (!currentCheckout?.formReady) {
                throw new Error("Complete nombre, teléfono y correo antes de confirmar.");
              }

              setStatus("Confirmando pago...");
              const response = await fetch("/api/xtreme/checkout/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderID: data.orderID,
                  optionId: currentCheckout.selected.id,
                  customer: currentCheckout.form,
                }),
              });
              const result = (await response.json()) as {
                success?: boolean;
                captureID?: string;
                membershipUntil?: string | null;
                appInviteSent?: boolean;
                message?: string;
              };
              if (!response.ok || !result.success) throw new Error(result.message || "No se pudo confirmar el pago.");

              setStatus("Pago confirmado. Redirigiendo...");
              setError("");

              const params = new URLSearchParams();
              params.set("plan", currentCheckout.selected.label);
              const reference = result.captureID || data.orderID;
              if (reference) params.set("ref", reference);
              if (result.membershipUntil) params.set("until", result.membershipUntil);
              if (result.appInviteSent) params.set("registro", "correo");
              window.location.assign(`/gracias?${params.toString()}`);
            },
            onCancel: () => setStatus("Pago cancelado. Puede intentar de nuevo cuando quiera."),
            onError: (err: unknown) => {
              setError(err instanceof Error ? err.message : "Hubo un error con PayPal.");
              setStatus("");
            },
          } satisfies Record<string, unknown>)
          .render(container);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "PayPal no está disponible.");
          setStatus("");
        }
      }
    }

    void loadPayPal();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [paypalConfig]);

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("");
    setError("");
  }

  const TRUST_POINTS = english
    ? [
        { icon: ShieldCheck, text: "Secure PayPal checkout" },
        { icon: Zap, text: "Access active right after payment" },
        { icon: CheckCircle2, text: "No contracts or hidden fees" },
      ]
    : [
        { icon: ShieldCheck, text: "Pago seguro con PayPal" },
        { icon: Zap, text: "Acceso activo al confirmar el pago" },
        { icon: CheckCircle2, text: "Sin contratos ni cargos ocultos" },
      ];

  return (
    <section
      id="inscripcion"
      className="relative scroll-mt-20 overflow-hidden border-y border-black/20 bg-[#f6c400] px-5 py-14 text-black sm:px-8 lg:py-20"
      style={{
        backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.18) 1px, transparent 1px)",
        backgroundSize: "54px 100%",
      }}
    >
      <div className="relative mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">
            {english ? "Registration and payment" : "Inscripción y pago"}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            {english ? "Choose how you want to train" : "Elegí cómo querés entrenar"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-black/60 sm:text-base">
            {english
              ? "Pick a plan, add your details and pay with PayPal. Prefer to try first? Your first day is free."
              : "Elegí un plan, completá tus datos y pagá con PayPal. ¿Querés probar primero? Tu primer día es gratis."}
          </p>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            {TRUST_POINTS.map((point) => (
              <span
                key={point.text}
                className="inline-flex items-center gap-2 border border-black/15 bg-black/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black/70"
              >
                <point.icon className="h-3.5 w-3.5 shrink-0" />
                {point.text}
              </span>
            ))}
          </div>
        </div>

        <ol className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-black/55 sm:gap-4">
          {[
            english ? "1. Choose plan" : "1. Elegí plan",
            english ? "2. Your details" : "2. Tus datos",
            english ? "3. Pay with PayPal" : "3. Pagá con PayPal",
          ].map((label, index) => {
            const step = index + 1;
            const active = checkoutStep >= step;
            return (
              <li
                key={label}
                className={`inline-flex items-center gap-2 border px-3 py-2 ${
                  active ? "border-black bg-black text-[#f6c400]" : "border-black/20 bg-white/70 text-black/45"
                }`}
              >
                <span className="grid h-5 w-5 place-items-center bg-current/10 text-[11px]">{step}</span>
                {label}
              </li>
            );
          })}
        </ol>

        <div
          className="mt-10 grid gap-4 md:grid-cols-3"
          role="radiogroup"
          aria-label={english ? "Membership options" : "Opciones de inscripción"}
        >
          {CHECKOUT_OPTIONS.filter((option) => MAIN_OPTION_IDS.has(option.id)).map((option, index) => {
            const style = OPTION_STYLES[option.id];
            const active = selected.id === option.id;
            const price = option.priceLabel.replace("CRC ", "");
            const period = PRICE_PERIOD[option.id];
            const days = PLAN_DAYS[option.id];
            const perDay = days ? perDayLabel(option.priceCrc, days) : "";
            const featured = option.id === "month";
            return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectPlan(option.id)}
              role="radio"
              aria-checked={active}
              className={`relative flex min-h-[18rem] overflow-hidden border-[3px] p-6 pt-8 text-left transition duration-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black ${style.card} ${
                active
                  ? "-translate-y-1 shadow-[9px_9px_0_rgba(0,0,0,.28)]"
                  : "shadow-[5px_5px_0_rgba(0,0,0,.14)] hover:-translate-y-1 hover:shadow-[8px_8px_0_rgba(0,0,0,.22)]"
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-2.5 ${style.accent}`} aria-hidden="true" />
              {featured ? (
                <span className="absolute left-4 top-4 bg-black px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f6c400]">
                  {english ? `Popular · save ${monthSavingsPct}%/day` : `Popular · ahorrás ${monthSavingsPct}%/día`}
                </span>
              ) : null}
              <span className="pointer-events-none absolute -right-8 top-20 h-[3px] w-36 rotate-45 bg-current opacity-[.08]" />
              <span className="pointer-events-none absolute -right-8 top-20 h-[3px] w-36 -rotate-45 bg-current opacity-[.08]" />
              <span className="flex w-full flex-col">
                <span className={`block text-[10px] font-black uppercase tracking-[0.24em] ${style.eyebrow}`}>
                  0{index + 1} / {optionText(option).category}
                </span>
                <span className="mt-4 block text-[1.7rem] font-black uppercase leading-[.92] tracking-[-0.045em] sm:text-3xl">
                  {optionText(option).label}
                </span>
                <span className="mt-4 block min-h-10 text-xs font-bold leading-5 opacity-55">{optionText(option).note}</span>
                <span className={`mt-auto block border-t-2 border-current/15 pt-5 ${active && option.id !== "month" ? "text-black" : style.price}`}>
                  <span className="block text-[10px] font-black uppercase tracking-[.2em] opacity-55">CRC</span>
                  <span className="mt-1 block text-4xl font-black leading-none tracking-[-0.065em] sm:text-5xl">{price}</span>
                  <span className="mt-2 block text-[10px] font-black uppercase tracking-[.15em] opacity-50">
                    {english ? period?.en : period?.es}
                  </span>
                  {perDay ? (
                    <span className="mt-2 block text-[10px] font-bold uppercase tracking-[.12em] opacity-45">
                      {english ? `~CRC ${perDay}/day` : `~CRC ${perDay}/día`}
                      {featured ? (english ? ` · vs ~CRC ${weekPerDay}/day weekly` : ` · vs ~CRC ${weekPerDay}/día semanal`) : ""}
                    </span>
                  ) : null}
                </span>
              </span>
              {active && (
                <span
                  className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-[#f6c400] text-xs font-black text-black"
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </button>
            );
          })}
        </div>

        <div className="mt-12 flex items-center gap-4" aria-hidden="true">
          <span className="h-px flex-1 bg-black/35" />
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-black/55">
            {english ? "Special ways to start" : "Formas especiales de empezar"}
          </span>
          <span className="h-px flex-1 bg-black/35" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <a
            href="/primer-dia#registro"
            className="group relative overflow-hidden border-[3px] border-black bg-[#d8ff3e] p-5 text-black shadow-[6px_6px_0_rgba(0,0,0,.22)] transition hover:-translate-y-1 hover:shadow-[9px_9px_0_rgba(0,0,0,.28)] sm:p-6"
          >
            <Zap className="absolute right-5 top-5 h-7 w-7" />
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-black/55">
              {english ? "New members" : "Para conocer Xtreme"}
            </p>
            <div className="mt-3 flex items-end justify-between gap-5">
              <div>
                <h3 className="text-2xl font-black uppercase leading-none sm:text-3xl">
                  {english ? "First day free" : "Primer día gratis"}
                </h3>
                <p className="mt-2 text-sm font-bold text-black/60">
                  {english ? "Register first. No PayPal payment." : "Registrate primero. No pasa por el pago de PayPal."}
                </p>
              </div>
              <ArrowRight className="h-6 w-6 shrink-0 transition group-hover:translate-x-1" />
            </div>
          </a>

          <button
            type="button"
            onClick={() => selectPlan("senior")}
            className={`group relative overflow-hidden border-[3px] border-black p-5 text-left transition hover:-translate-y-1 sm:p-6 ${
              selected.id === "senior"
                ? "bg-black text-white shadow-[9px_9px_0_rgba(0,0,0,.28)]"
                : "bg-white text-black shadow-[6px_6px_0_rgba(0,0,0,.18)] hover:shadow-[9px_9px_0_rgba(0,0,0,.26)]"
            }`}
          >
            <HeartPulse className={`absolute right-5 top-5 h-7 w-7 ${selected.id === "senior" ? "text-[#f6c400]" : ""}`} />
            <p className="text-[10px] font-black uppercase tracking-[.22em] opacity-55">
              {english ? "Guided program" : "Programa acompañado"}
            </p>
            <div className="mt-3 flex items-end justify-between gap-5">
              <div>
                <h3 className="text-2xl font-black uppercase leading-none sm:text-3xl">
                  {english ? "Senior fitness" : "Adultos mayores"}
                </h3>
                <p className="mt-2 text-sm font-bold opacity-60">
                  {english ? "Three classes a week." : "Tres clases por semana."}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-[9px] font-black uppercase tracking-[.15em] opacity-45">CRC</span>
                <span className={`block text-2xl font-black ${selected.id === "senior" ? "text-[#f6c400]" : ""}`}>16.000</span>
              </div>
            </div>
          </button>
        </div>

        <div
          id="checkout-form"
          ref={formSectionRef}
          className="mt-8 scroll-mt-24 border border-black/15 bg-white p-5 text-black shadow-[0_24px_70px_-30px_rgba(0,0,0,.65)] sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/50">
                {english ? "Selected" : "Seleccionado"}
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase">{optionText(selected).label}</h3>
              <p className="mt-1 text-sm font-bold text-black/55">
                {selected.priceLabel} · {english ? "PayPal charges USD" : "PayPal cobra USD"} {selected.usdAmount}
              </p>
              <p className="mt-1 text-sm font-semibold text-black/45">{optionText(selected).note}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#bd9300]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                {english ? "Name" : "Nombre"}
              </span>
              <input
                autoComplete="name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder={english ? "Full name" : "Nombre completo"}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                {english ? "Phone" : "Teléfono"}
              </span>
              <input
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="8898 4000"
                required
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                {english ? "Email" : "Correo"}
              </span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder={english ? "email@example.com" : "correo@ejemplo.com"}
                required
              />
              <span className="mt-2 block text-xs font-semibold leading-5 text-black/50">
                {english
                  ? "After payment we will email you a private link to complete your ID and app access."
                  : "Después del pago enviaremos a este correo un enlace privado para completar la cédula y crear el acceso a la app. No pedimos la cédula antes de pagar."}
              </span>
            </label>
          </div>

          <div className="mt-6 border-t border-black/10 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-black/65">
              <CreditCard className="h-4 w-4" />
              {english ? "Pay with PayPal" : "Pagar con PayPal"}
            </div>

            {!formReady && (
              <p className="mb-3 border border-black/10 bg-black/[0.04] px-3 py-2 text-sm font-bold text-black/60">
                {english ? "Complete your name, phone and email to enable payment." : "Complete nombre, teléfono y correo para activar el botón de pago."}
              </p>
            )}
            {error && (
              <p className="mb-3 border border-red-500/25 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            {status && (
              <p className="mb-3 border border-emerald-500/25 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
                {status}
              </p>
            )}

            <div className={!formReady || !paypalConfig?.clientId ? "pointer-events-none opacity-45" : ""}>
              <div ref={paypalRef} className="min-h-[128px]" />
            </div>

            {!paypalConfig?.clientId && !error && (
              <p className="mt-2 text-sm font-bold text-black/50">{english ? "Loading PayPal..." : "Cargando PayPal..."}</p>
            )}

            <p className="mt-3 text-xs font-bold leading-5 text-black/52">
              {english ? "Your access is activated automatically as soon as PayPal approves the payment." : "Tu acceso se activa automáticamente apenas PayPal aprueba el pago."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm(initialForm);
              setStatus("");
              setError("");
              try {
                window.sessionStorage.removeItem(CHECKOUT_FORM_KEY);
              } catch {
                // ignore
              }
            }}
            className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-black/50 transition hover:text-black"
          >
            <Send className="h-4 w-4" />
            {english ? "Clear form" : "Limpiar formulario"}
          </button>
        </div>
      </div>
    </section>
  );
}
