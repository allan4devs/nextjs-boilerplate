"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CreditCard, MessageCircle, Send, ShieldCheck, Zap } from "lucide-react";
import { XTREME_CHECKOUT_OPTIONS } from "@/lib/constants/checkout";
import { BUSINESS } from "@/lib/constants/business";

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
  "day-pass": "Un día de acceso · ideal para reservar una clase hoy.",
  week: "Una semana para activar el hábito.",
  fortnight: "Buen ritmo para sostener el progreso.",
  month: "La opción principal para entrenar constante.",
  senior: "Tres clases por semana para bienestar y movimiento.",
};

/** Paid catalog. Pase del día solo en Member OS (reservas sin plan). */
function buildCheckoutOptions(includeDayPass: boolean): CheckoutOption[] {
  return XTREME_CHECKOUT_OPTIONS
    .filter((option) => includeDayPass || option.id !== "day-pass")
    .map((option) => ({ ...option, note: CHECKOUT_NOTES[option.id] ?? "" }));
}

const MAIN_OPTION_IDS = new Set(["week", "fortnight", "month"]);
const MEMBER_OPTION_IDS = new Set(["day-pass", "week", "fortnight", "month"]);
const PLAN_DAYS: Record<string, number> = { "day-pass": 1, week: 7, fortnight: 15, month: 30 };
const CHECKOUT_FORM_KEY = "xtreme-checkout-form";
const GROUP_CLASS_LINK =
  "https://wa.me/" +
  BUSINESS.whatsapp +
  "?text=" +
  encodeURIComponent("Hola Xtreme Gym, quiero consultar disponibilidad para las clases grupales de ₡45.000.");

function perDayLabel(priceCrc: number, days: number) {
  const value = Math.round(priceCrc / days);
  return value.toLocaleString("es-CR");
}

function isValidOptionId(value: string | null | undefined, options: CheckoutOption[]) {
  return options.some((option) => option.id === value);
}

const PRICE_PERIOD: Record<string, { es: string; en: string }> = {
  "day-pass": { es: "por día", en: "per day" },
  week: { es: "por semana", en: "per week" },
  fortnight: { es: "por quincena", en: "per fortnight" },
  month: { es: "por mes", en: "per month" },
};

type FormState = {
  name: string;
  phone: string;
  email: string;
};

export type CheckoutSuccess = {
  captureID?: string;
  membershipUntil?: string | null;
  optionId: string;
  optionLabel: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
};

export default function ExtremeGymCheckout({
  initialOption = "month",
  locale = "es",
  compact = false,
  memberCheckout = false,
  memberCustomer,
  onSuccess,
}: {
  initialOption?: string;
  locale?: "es" | "en";
  compact?: boolean;
  memberCheckout?: boolean;
  memberCustomer?: Partial<FormState>;
  onSuccess?: (result: CheckoutSuccess) => void | Promise<void>;
}) {
  const english = locale === "en";
  const CHECKOUT_OPTIONS = useMemo(
    () => buildCheckoutOptions(memberCheckout),
    [memberCheckout],
  );
  const englishOptions: Record<string, { label: string; category: string; note: string }> = {
    "day-pass": {
      label: "Day pass",
      category: "Class",
      note: "One day of access - great to book a class today.",
    },
    week: { label: "Weekly plan", category: "Plan", note: "One week to build momentum." },
    fortnight: { label: "Fortnightly plan", category: "Plan", note: "A solid rhythm for consistent progress." },
    month: { label: "Monthly plan", category: "Plan", note: "The main option for consistent training." },
    senior: { label: "Senior fitness classes", category: "Class", note: "Three weekly classes for movement and wellbeing." },
  };
  const optionText = (option: CheckoutOption) => english ? englishOptions[option.id] : option;
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");
  const resolvedInitialOption = isValidOptionId(planFromUrl, CHECKOUT_OPTIONS)
    ? planFromUrl!
    : isValidOptionId(initialOption, CHECKOUT_OPTIONS)
      ? initialOption
      : memberCheckout
        ? "day-pass"
        : "month";
  const [selectedId, setSelectedId] = useState(resolvedInitialOption);
  const [form, setForm] = useState<FormState>(() => ({
    name: memberCustomer?.name ?? "",
    phone: memberCustomer?.phone ?? "",
    email: memberCustomer?.email ?? "",
  }));
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<CheckoutSuccess | null>(null);
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

  const formReady = memberCheckout
    ? Boolean(form.name.trim())
    : Boolean(form.name.trim() && form.phone.trim() && form.email.trim());
  const checkoutStep = formReady ? 3 : 2;
  const monthSavingsPct = Math.round((1 - 23000 / 30 / (8000 / 7)) * 100);

  useEffect(() => {
    checkoutRef.current = { form, formReady, selected };
  }, [form, formReady, selected]);

  useEffect(() => {
    if (!isValidOptionId(planFromUrl, CHECKOUT_OPTIONS)) return;
    setSelectedId(planFromUrl!);
  }, [CHECKOUT_OPTIONS, planFromUrl]);

  useEffect(() => {
    if (memberCheckout) return;
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
  }, [memberCheckout]);

  useEffect(() => {
    if (memberCheckout) return;
    try {
      if (!form.name && !form.phone && !form.email) {
        window.sessionStorage.removeItem(CHECKOUT_FORM_KEY);
        return;
      }
      window.sessionStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(form));
    } catch {
      // ignore storage failures
    }
  }, [form, memberCheckout]);

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
        source: memberCheckout ? "member_app" : "site",
        anonymousId: anon,
        properties: { surface: "checkout", optionId: resolvedInitialOption },
      }),
    }).catch(() => {});
  }, [memberCheckout, resolvedInitialOption]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/xtreme/checkout/config", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as PayPalConfig & { message?: string };
        if (!response.ok) throw new Error(data.message || "No se pudo cargar el pago en línea.");
        if (!cancelled) {
          setPaypalConfig(data);
          if (!data.configured) {
            setError(data.message || "El pago en línea no está disponible en este momento.");
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "El pago en línea no está disponible.");
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
            script.onerror = () => reject(new Error("No se pudo cargar el pago en línea."));
            document.body.appendChild(script);
          });
        } else if (existing && !window.paypal) {
          await new Promise<void>((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("No se pudo cargar el pago en línea.")), {
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
                throw new Error("Completá nombre, teléfono y correo antes de pagar.");
              }

              const response = await fetch("/api/xtreme/checkout/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  optionId: currentCheckout.selected.id,
                  customer: currentCheckout.form,
                  memberCheckout,
                }),
              });
              const data = (await response.json()) as { orderID?: string; message?: string };
              if (!response.ok || !data.orderID) throw new Error(data.message || "No se pudo crear la orden.");
              setStatus("Orden lista. Completá el pago en línea...");
              return data.orderID;
            },
            onApprove: async (data: { orderID?: string }) => {
              const currentCheckout = checkoutRef.current;
              if (!data.orderID) throw new Error("No se recibió el número de orden del pago en línea.");

              if (!currentCheckout?.formReady) {
                throw new Error("Completá nombre, teléfono y correo antes de confirmar.");
              }

              setStatus("Confirmando el pago...");
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

              setStatus(memberCheckout ? "Pago confirmado. Actualizando tu membresía..." : "Pago confirmado. Redirigiendo...");
              setError("");

              if (memberCheckout) {
                const completedCheckout = {
                  captureID: result.captureID,
                  membershipUntil: result.membershipUntil,
                  optionId: currentCheckout.selected.id,
                  optionLabel: currentCheckout.selected.label,
                } satisfies CheckoutSuccess;
                setCompleted(completedCheckout);
                try {
                  await onSuccess?.(completedCheckout);
                  setStatus("Pago confirmado. Tu membresía ya está actualizada.");
                } catch {
                  setStatus("Pago confirmado. La membresía se actualizará al volver a abrir la app.");
                }
                return;
              }

              const params = new URLSearchParams();
              params.set("plan", currentCheckout.selected.label);
              const reference = result.captureID || data.orderID;
              if (reference) params.set("ref", reference);
              if (result.membershipUntil) params.set("until", result.membershipUntil);
              if (result.appInviteSent) params.set("registro", "correo");
              window.location.assign(`/gracias?${params.toString()}`);
            },
            onCancel: () => setStatus("Pago cancelado. Podés intentar de nuevo cuando quieras."),
            onError: (err: unknown) => {
              setError(err instanceof Error ? err.message : "Hubo un error con el pago en línea.");
              setStatus("");
            },
          } satisfies Record<string, unknown>)
          .render(container);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "El pago en línea no está disponible.");
          setStatus("");
        }
      }
    }

    void loadPayPal();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [memberCheckout, onSuccess, paypalConfig]);

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("");
    setError("");
  }

  const TRUST_POINTS = english
    ? [
        { icon: ShieldCheck, text: "Secure online checkout" },
        { icon: Zap, text: "Access active right after payment" },
        { icon: CheckCircle2, text: "No contracts or hidden fees" },
      ]
    : [
        { icon: ShieldCheck, text: "Pago seguro en línea" },
        { icon: Zap, text: "Acceso activo al confirmar el pago" },
        { icon: CheckCircle2, text: "Sin contratos ni cargos ocultos" },
      ];

  return (
    <section
      id="inscripcion"
      className={
        memberCheckout
          ? "relative text-white"
          : compact
            ? "relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-transparent px-5 py-8 text-white sm:px-8 lg:py-10"
            : "relative scroll-mt-20 overflow-hidden border-y border-black/20 bg-[#f6c400] px-5 py-14 text-black sm:px-8 lg:py-20"
      }
      style={
        memberCheckout || compact
          ? undefined
          : {
              backgroundImage: "linear-gradient(90deg, rgba(0,0,0,.18) 1px, transparent 1px)",
              backgroundSize: "54px 100%",
            }
      }
    >
      <div className={memberCheckout ? "relative" : compact ? "relative mx-auto max-w-7xl" : "relative mx-auto max-w-5xl"}>
        {!compact ? (
          <>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">
            {english ? "Registration and payment" : "Inscripción y pago"}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            {english ? "Choose how you want to train" : "Elegí cómo querés entrenar"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-black/60 sm:text-base">
            {english
              ? "Pick a plan, add your details and pay online. Prefer to try first? Your first day is free."
              : "Elegí un plan, completá tus datos y pagá en línea. ¿Querés probar primero? Tu primer día es gratis."}
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
            english ? "3. Pay online" : "3. Pagá en línea",
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
          </>
        ) : null}

        <div className={memberCheckout ? "grid gap-3 sm:grid-cols-2" : compact ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"}>
          {CHECKOUT_OPTIONS.filter((option) =>
            (memberCheckout ? MEMBER_OPTION_IDS : MAIN_OPTION_IDS).has(option.id),
          ).map((option) => {
            const active = selected.id === option.id;
            const featured = option.id === "month";
            const price = option.priceLabel.replace("CRC ", "");
            const period = PRICE_PERIOD[option.id];
            const days = PLAN_DAYS[option.id];
            const perDay = days ? perDayLabel(option.priceCrc, days) : "";

            return (
              <button
                key={option.id}
                type="button"
                disabled={Boolean(completed)}
                onClick={() => selectPlan(option.id)}
                aria-pressed={active}
                className={[
                  `relative flex ${memberCheckout ? "min-h-[11rem]" : "min-h-[15rem]"} flex-col border-2 p-5 text-left transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#f6c400]`,
                  featured
                    ? "border-[#f6c400] bg-[#f6c400] text-black"
                    : active
                      ? "border-[#f6c400] bg-[#151515] text-white shadow-[0_16px_45px_-26px_rgba(246,196,0,.9)]"
                      : "border-white/15 bg-[#101010] text-white hover:border-[#f6c400]/70 hover:bg-[#151515]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-55">
                    {english ? period?.en : period?.es}
                  </span>
                  {featured ? (
                    <span className="bg-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f6c400]">
                      {english ? "Best value" : "Mejor precio"}
                    </span>
                  ) : null}
                </div>

                <span className="mt-5 block text-xl font-black uppercase leading-none">
                  {optionText(option).label}
                </span>
                <span className="mt-5 block text-[10px] font-black uppercase tracking-[0.18em] opacity-50">CRC</span>
                <span className="mt-1 block text-4xl font-black leading-none tracking-[-0.055em] sm:text-5xl">
                  {price}
                </span>
                <span className="mt-2 text-xs font-bold opacity-55">
                  {english ? "~CRC " + perDay + "/day" : "~CRC " + perDay + "/día"}
                  {featured ? (english ? " · save " + monthSavingsPct + "%" : " · ahorrás " + monthSavingsPct + "%") : ""}
                </span>

                <span className={[
                  "mt-auto flex items-center justify-between border-t pt-4 text-xs font-black uppercase tracking-[0.12em]",
                  featured ? "border-black/20" : "border-white/15",
                ].join(" ")}>
                  {active ? (english ? "Selected" : "Seleccionado") : (english ? "Choose plan" : "Elegir plan")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            );
          })}

          {!memberCheckout && <a
            href={GROUP_CLASS_LINK}
            target="_blank"
            rel="noreferrer"
            className="relative flex min-h-[15rem] flex-col border-2 border-white/15 bg-[#151515] p-5 text-left text-white transition hover:border-[#f6c400] hover:bg-[#1b1b1b] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#f6c400]"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                {english ? "Monthly · limited spots" : "Mensual · cupo limitado"}
              </span>
              <MessageCircle className="h-5 w-5 text-[#f6c400]" />
            </div>
            <span className="mt-5 block text-xl font-black uppercase leading-none">
              {english ? "Small-group training" : "Clase grupal"}
            </span>
            <span className="mt-5 block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">CRC</span>
            <span className="mt-1 block text-4xl font-black leading-none tracking-[-0.055em] text-[#f6c400] sm:text-5xl">
              45.000
            </span>
            <span className="mt-2 text-xs font-bold text-white/55">
              {english ? "Coach guidance · groups of up to 6" : "Entrenador · grupos de hasta 6"}
            </span>
            <span className="mt-auto flex items-center justify-between border-t border-white/15 pt-4 text-xs font-black uppercase tracking-[0.12em] text-[#f6c400]">
              {english ? "Check availability" : "Consultar cupo"}
              <ArrowRight className="h-4 w-4" />
            </span>
          </a>}
        </div>

        {!memberCheckout && <><div className="mx-auto mt-8 flex max-w-5xl items-center gap-4" aria-hidden="true">
          <span className={compact ? "h-px flex-1 bg-white/15" : "h-px flex-1 bg-black/25"} />
          <span className={compact ? "text-[10px] font-black uppercase tracking-[.2em] text-white/40" : "text-[10px] font-black uppercase tracking-[.2em] text-black/50"}>
            {english ? "Other ways to start" : "Otras formas de empezar"}
          </span>
          <span className={compact ? "h-px flex-1 bg-white/15" : "h-px flex-1 bg-black/25"} />
        </div>

        <div className="mx-auto mt-4 grid max-w-5xl gap-3 md:grid-cols-2">
          <a
            href="/primer-dia#registro"
            className="group flex items-center justify-between gap-5 border-2 border-white bg-white p-5 text-black transition hover:border-[#f6c400] hover:bg-[#f6c400]"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-black/45">
                {english ? "New members" : "Para conocer Xtreme"}
              </p>
              <h3 className="mt-2 text-xl font-black uppercase leading-none">
                {english ? "First day free" : "Primer día gratis"}
              </h3>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
          </a>

          <button
            type="button"
            onClick={() => selectPlan("senior")}
            className={[
              "flex items-center justify-between gap-5 border-2 p-5 text-left transition",
              selected.id === "senior"
                ? "border-[#f6c400] bg-[#151515] text-white"
                : compact
                  ? "border-white/20 bg-white/10 text-white hover:border-[#f6c400]"
                  : "border-black/20 bg-white text-black hover:border-black",
            ].join(" ")}
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] opacity-45">
                {english ? "Three classes per week" : "Tres clases por semana"}
              </p>
              <h3 className="mt-2 text-xl font-black uppercase leading-none">
                {english ? "Senior fitness" : "Adultos mayores"}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-[9px] font-black uppercase tracking-[.14em] opacity-45">CRC</span>
              <span className="block text-2xl font-black text-[#f6c400]">16.000</span>
            </div>
          </button>
        </div></>}
        <div
          id="checkout-form"
          ref={formSectionRef}
          className="mx-auto mt-8 max-w-5xl scroll-mt-24 border-2 border-white/15 bg-white p-5 text-black shadow-[0_24px_70px_-30px_rgba(0,0,0,.65)] sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/50">
                {english ? "Selected" : "Seleccionado"}
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase">{optionText(selected).label}</h3>
              <p className="mt-1 text-sm font-bold text-black/55">
                {selected.priceLabel} · {english ? "Charged in USD" : "Cobro en USD"} {selected.usdAmount}
              </p>
              <p className="mt-1 text-sm font-semibold text-black/45">{optionText(selected).note}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#bd9300]" />
          </div>

          {memberCheckout ? (
            <div className="mt-5 border border-black/10 bg-black/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Pago ligado a tu sesión</p>
              <p className="mt-2 font-black uppercase">{form.name}</p>
              <p className="mt-1 text-sm font-semibold text-black/55">
                {[form.email, form.phone].filter(Boolean).join(" · ") || "Usaremos los datos verificados de tu perfil."}
              </p>
            </div>
          ) : <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
          </div>}

          <div className="mt-6 border-t border-black/10 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-black/65">
              <CreditCard className="h-4 w-4" />
              {english ? "Pay online" : "Pagar en línea"}
            </div>

            {completed ? (
              <div className="border-2 border-emerald-600 bg-emerald-50 p-5 text-emerald-900">
                <CheckCircle2 className="h-8 w-8" />
                <p className="mt-3 text-lg font-black uppercase">Pago confirmado</p>
                <p className="mt-1 text-sm font-bold">
                  {completed.optionLabel}
                  {completed.membershipUntil ? ` · activo hasta ${completed.membershipUntil}` : ""}
                </p>
                <p className="mt-2 text-sm font-semibold">{status}</p>
              </div>
            ) : <>{!formReady && (
              <p className="mb-3 border border-black/10 bg-black/[0.04] px-3 py-2 text-sm font-bold text-black/60">
                {memberCheckout
                  ? "No pudimos identificar el socio de esta sesión."
                  : english
                    ? "Enter your name, phone and email to enable payment."
                    : "Completá nombre, teléfono y correo para activar el botón de pago."}
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
              <p className="mt-2 text-sm font-bold text-black/50">
                {english ? "Loading online payment..." : "Cargando pago en línea..."}
              </p>
            )}

            <p className="mt-3 text-xs font-bold leading-5 text-black/52">
              {english
                ? "Your access is activated automatically as soon as the online payment is approved."
                : "Tu acceso se activa automáticamente apenas se confirma el pago en línea."}
            </p>
            <p className="mt-2 text-[11px] font-semibold leading-5 text-black/45">
              {english ? (
                <>
                  By paying you accept our{" "}
                  <a href="/terminos" className="underline underline-offset-2">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href="/privacidad" className="underline underline-offset-2">
                    Privacy Policy
                  </a>
                  .
                </>
              ) : (
                <>
                  Al pagar aceptás las{" "}
                  <a href="/terminos" className="underline underline-offset-2">
                    Condiciones de uso
                  </a>{" "}
                  y la{" "}
                  <a href="/privacidad" className="underline underline-offset-2">
                    Privacidad
                  </a>
                  . Normas del gym en{" "}
                  <a href="/normas" className="underline underline-offset-2">
                    /normas
                  </a>
                  .
                </>
              )}
            </p>
            </>}
          </div>

          {!memberCheckout && <button
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
          </button>}
        </div>
      </div>
    </section>
  );
}
