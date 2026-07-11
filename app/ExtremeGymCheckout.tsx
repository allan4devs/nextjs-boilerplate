"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Send, ShieldCheck } from "lucide-react";

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

/** Paid-only catalog — every option requires PayPal checkout. */
const CHECKOUT_OPTIONS: CheckoutOption[] = [
  {
    id: "day-pass",
    label: "Pase del día",
    category: "Clase",
    priceCrc: 3000,
    priceLabel: "CRC 3.000",
    usdAmount: "6.00",
    note: "Un día de entrenamiento. Pago en línea con PayPal.",
  },
  {
    id: "week",
    label: "Plan semanal",
    category: "Plan",
    priceCrc: 8000,
    priceLabel: "CRC 8.000",
    usdAmount: "16.00",
    note: "Una semana para activar el hábito.",
  },
  {
    id: "fortnight",
    label: "Plan quincenal",
    category: "Plan",
    priceCrc: 13500,
    priceLabel: "CRC 13.500",
    usdAmount: "27.00",
    note: "Buen ritmo para sostener el progreso.",
  },
  {
    id: "month",
    label: "Plan mensual",
    category: "Plan",
    priceCrc: 23000,
    priceLabel: "CRC 23.000",
    usdAmount: "46.00",
    note: "La opción principal para entrenar constante.",
  },
  {
    id: "senior",
    label: "Clase adultos mayores",
    category: "Clase",
    priceCrc: 16000,
    priceLabel: "CRC 16.000",
    usdAmount: "32.00",
    note: "Tres clases por semana para bienestar y movimiento.",
  },
];

const OPTION_STYLES: Record<string, { card: string; eyebrow: string; price: string; accent: string }> = {
  "day-pass": { card: "border-emerald-950/25 bg-[#eaffc8] hover:border-emerald-950", eyebrow: "text-emerald-800", price: "text-emerald-950", accent: "bg-emerald-700" },
  week: { card: "border-sky-950/25 bg-[#dff5ff] hover:border-sky-950", eyebrow: "text-sky-800", price: "text-sky-950", accent: "bg-sky-600" },
  fortnight: { card: "border-orange-950/25 bg-[#fff0d1] hover:border-orange-950", eyebrow: "text-orange-800", price: "text-orange-950", accent: "bg-orange-600" },
  month: { card: "border-black bg-black text-white", eyebrow: "text-[#f6c400]", price: "text-[#f6c400]", accent: "bg-[#f6c400]" },
  senior: { card: "border-violet-950/25 bg-[#eee7ff] hover:border-violet-950", eyebrow: "text-violet-800", price: "text-violet-950", accent: "bg-violet-600" },
};

type FormState = {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  goal: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  goal: "",
};

export default function ExtremeGymCheckout({
  initialOption = "month",
}: {
  initialOption?: string;
}) {
  const validInitialOption = CHECKOUT_OPTIONS.some((option) => option.id === initialOption)
    ? initialOption
    : "month";
  const [selectedId, setSelectedId] = useState(validInitialOption);
  const [form, setForm] = useState<FormState>(initialForm);
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const paypalRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    checkoutRef.current = { form, formReady, selected };
  }, [form, formReady, selected]);

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
        properties: { surface: "checkout", optionId: validInitialOption },
      }),
    }).catch(() => {});
  }, [validInitialOption]);

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
                message?: string;
              };
              if (!response.ok || !result.success) throw new Error(result.message || "No se pudo confirmar el pago.");

              setStatus(`Pago confirmado. Comprobante: ${result.captureID || data.orderID}`);
              setError("");
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

  return (
    <section
      id="inscripcion"
      className="scroll-mt-20 border-y border-white/10 bg-[#f6c400] px-5 py-14 text-black sm:px-8 lg:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">
            Inscripción y pago
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
            Elegí cómo querés entrenar
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-bold text-black/60 sm:text-base">
            Seleccioná un plan y pagá en línea con PayPal. Sin reserva por correo ni WhatsApp.
          </p>
        </div>

        <div
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          role="radiogroup"
          aria-label="Opciones de inscripción"
        >
          {CHECKOUT_OPTIONS.map((option) => {
            const style = OPTION_STYLES[option.id];
            const active = selected.id === option.id;
            return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              role="radio"
              aria-checked={active}
              className={`relative flex min-h-52 overflow-hidden border-2 p-5 pt-7 text-left transition duration-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black ${style.card} ${
                active
                  ? "-translate-y-1 shadow-[7px_7px_0_rgba(0,0,0,.24)]"
                  : "hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,.14)]"
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-2 ${style.accent}`} aria-hidden="true" />
              <span className="flex w-full flex-col">
                <span className={`block text-[11px] font-black uppercase tracking-[0.2em] ${style.eyebrow}`}>
                  {option.category}
                </span>
                <span className="mt-3 block min-h-14 text-xl font-black uppercase leading-[1.05] tracking-[-0.02em]">
                  {option.label}
                </span>
                <span className="mt-3 block text-xs font-bold leading-5 opacity-60">{option.note}</span>
                <span className={`mt-5 block border-t border-current/15 pt-4 text-[1.65rem] font-black uppercase leading-none tracking-[-0.04em] ${active ? "text-[#f6c400]" : style.price}`}>
                  {option.priceLabel}
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

        <div className="mt-8 border border-black/15 bg-white p-5 text-black shadow-[0_24px_70px_-30px_rgba(0,0,0,.65)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/50">
                Seleccionado
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase">{selected.label}</h3>
              <p className="mt-1 text-sm font-bold text-black/55">
                {selected.priceLabel} · PayPal cobra USD {selected.usdAmount}
              </p>
              <p className="mt-1 text-sm font-semibold text-black/45">{selected.note}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#bd9300]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                Nombre
              </span>
              <input
                autoComplete="name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="Nombre completo"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                Teléfono
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
                Correo
              </span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="correo@ejemplo.com"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                Fecha deseada
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateForm("date", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                Horario preferido
              </span>
              <input
                value={form.time}
                onChange={(event) => updateForm("time", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="Mañana / tarde / noche"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">
                Objetivo o nota
              </span>
              <textarea
                value={form.goal}
                onChange={(event) => updateForm("goal", event.target.value)}
                className="mt-2 min-h-24 w-full border border-black/15 px-3 py-3 font-bold outline-none focus:border-black"
                placeholder="Quiero ganar fuerza, bajar grasa, empezar funcional..."
              />
            </label>
          </div>

          <div className="mt-6 border-t border-black/10 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-black/65">
              <CreditCard className="h-4 w-4" />
              Pagar con PayPal
            </div>

            {!formReady && (
              <p className="mb-3 border border-black/10 bg-black/[0.04] px-3 py-2 text-sm font-bold text-black/60">
                Complete nombre, teléfono y correo para activar el botón de pago.
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
              <p className="mt-2 text-sm font-bold text-black/50">Cargando PayPal...</p>
            )}

            <p className="mt-3 text-xs font-bold leading-5 text-black/52">
              El acceso se activa solo después del pago. PayPal procesa el cobro; recepción confirma cupo y
              activación.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm(initialForm);
              setStatus("");
              setError("");
            }}
            className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-black/50 transition hover:text-black"
          >
            <Send className="h-4 w-4" />
            Limpiar formulario
          </button>
        </div>
      </div>
    </section>
  );
}
