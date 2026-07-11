"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Mail, MessageCircle, Send, ShieldCheck } from "lucide-react";

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

const CHECKOUT_OPTIONS: CheckoutOption[] = [
  {
    id: "day-pass",
    label: "Primer día gratis",
    category: "Clase",
    priceCrc: 0,
    priceLabel: "Gratis",
    usdAmount: "0.00",
    note: "Registrate en la app y entrená tu primer día gratis.",
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
    note: "Buen ritmo para sostener el proceso.",
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

const BUSINESS_EMAIL = "xtremegymadm@gmail.com";
const BUSINESS_WHATSAPP = "50688984000";

function waLink(message: string) {
  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function mailtoLink(form: FormState, selected: CheckoutOption) {
  const subject = `Formulario Xtreme Gym - ${selected.label}`;
  const body = [
    "Hola Xtreme Gym, quiero enviar mi formulario desde la landing.",
    "",
    `Nombre: ${form.name || "-"}`,
    `Teléfono: ${form.phone || "-"}`,
    `Correo: ${form.email || "-"}`,
    `Opción: ${selected.label}`,
    `Monto publicado: ${selected.priceLabel}`,
    `Fecha deseada: ${form.date || "-"}`,
    `Horario preferido: ${form.time || "-"}`,
    `Objetivo: ${form.goal || "-"}`,
    "",
    "Por favor me confirman disponibilidad, condiciones y activación.",
  ].join("\n");

  return `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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
  const [registering, setRegistering] = useState(false);
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

  /** Free options (primer día gratis) are activated by app registration, not PayPal. */
  const isFree = selected.priceCrc <= 0;

  const formReady = Boolean(form.name.trim() && form.phone.trim() && form.email.trim());
  // El registro gratis ahora es double opt-in: solo hace falta el correo.
  const emailReady = Boolean(form.email.trim());

  useEffect(() => {
    checkoutRef.current = { form, formReady, selected };
  }, [form, formReady, selected]);

  // Landing funnel events
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

  const whatsappMessage = useMemo(
    () =>
      [
        `Hola Xtreme Gym, quiero reservar/pagar: ${selected.label}.`,
        `Nombre: ${form.name || "-"}`,
        `Teléfono: ${form.phone || "-"}`,
        `Correo: ${form.email || "-"}`,
        `Fecha: ${form.date || "-"}`,
        `Horario: ${form.time || "-"}`,
        `Objetivo: ${form.goal || "-"}`,
      ].join("\n"),
    [form, selected.label],
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/xtreme/checkout/config", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as PayPalConfig & { message?: string };
        if (!response.ok) throw new Error(data.message || "No se pudo cargar PayPal.");
        if (!cancelled) {
          setPaypalConfig(data);
          if (!data.configured) setError(data.message || "PayPal no está configurado.");
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
    // Free options don't render the PayPal button — registration activates them.
    if (isFree || !paypalConfig?.clientId || !paypalRef.current) return;

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
            existing.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal.")), { once: true });
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
              return data.orderID;
            },
            onApprove: async (data: { orderID?: string }) => {
              const currentCheckout = checkoutRef.current;
              if (!data.orderID) throw new Error("PayPal no devolvió número de orden.");

              if (!currentCheckout?.formReady) throw new Error("Complete nombre, teléfono y correo antes de confirmar.");

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
            onCancel: () => setStatus("Pago cancelado antes de confirmar."),
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
  }, [paypalConfig, isFree]);

  function updateForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus("");
    setError("");
  }

  async function registerFreeDay() {
    if (!emailReady) {
      setError("Ingrese su correo para registrarse.");
      return;
    }
    setError("");
    setRegistering(true);
    setStatus("Enviando el correo de confirmación...");
    try {
      const response = await fetch("/api/xtreme/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, source: "primer-dia" }),
      });
      const data = (await response.json()) as { error?: string; devToken?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo completar el registro.");
      // En dev, sin correo configurado, la API devuelve el link para continuar.
      if (data.devToken) {
        setStatus("Correo no configurado (dev). Continúe aquí para completar su perfil.");
        window.location.href = `/registro/confirmar?token=${encodeURIComponent(data.devToken)}`;
        return;
      }
      setStatus("¡Revisá tu correo! Te enviamos un enlace para confirmar tu cuenta y completar tu perfil.");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "No se pudo completar el registro.");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <section id="inscripcion" className="border-y border-white/10 bg-[#f6c400] px-5 py-20 text-black sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">Inscripción y pago</p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
            Envíe el formulario y pague desde aquí.
          </h2>
          <p className="mt-5 text-base font-bold leading-8 text-black/68">
            Complete sus datos, elija plan o clase y pague por PayPal. El formulario también puede enviarse por correo o WhatsApp para que recepción confirme detalles.
          </p>

          <div className="mt-7 grid gap-3">
            {CHECKOUT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedId(option.id)}
                className={`grid gap-2 border p-4 text-left transition sm:grid-cols-[1fr_auto] sm:items-center ${
                  selected.id === option.id
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-black hover:border-black/45"
                }`}
              >
                <span>
                  <span className="block text-xs font-black uppercase tracking-[0.16em] opacity-60">{option.category}</span>
                  <span className="mt-1 block text-xl font-black uppercase">{option.label}</span>
                  <span className="mt-1 block text-sm font-bold opacity-70">{option.note}</span>
                </span>
                <span className="text-2xl font-black uppercase">{option.priceLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-black/15 bg-white p-5 text-black shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/50">Seleccionado</p>
              <h3 className="mt-2 text-2xl font-black uppercase">{selected.label}</h3>
              <p className="mt-1 text-sm font-bold text-black/55">
                {isFree ? `${selected.priceLabel} · registrate en la app` : `${selected.priceLabel} · PayPal cobra USD ${selected.usdAmount}`}
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#bd9300]" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Nombre</span>
              <input
                autoComplete="name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="Nombre completo"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Teléfono</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="8898 4000"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Correo</span>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="correo@ejemplo.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Fecha deseada</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateForm("date", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Horario preferido</span>
              <input
                value={form.time}
                onChange={(event) => updateForm("time", event.target.value)}
                className="mt-2 min-h-12 w-full border border-black/15 px-3 font-bold outline-none focus:border-black"
                placeholder="Mañana / tarde / noche"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-black/50">Objetivo o nota</span>
              <textarea
                value={form.goal}
                onChange={(event) => updateForm("goal", event.target.value)}
                className="mt-2 min-h-24 w-full border border-black/15 px-3 py-3 font-bold outline-none focus:border-black"
                placeholder="Quiero ganar fuerza, bajar grasa, empezar funcional..."
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={mailtoLink(form, selected)}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-black px-4 text-sm font-black uppercase text-white transition hover:bg-[#f6c400] hover:text-black"
            >
              <Mail className="h-4 w-4" />
              Enviar correo
            </a>
            <a
              href={waLink(whatsappMessage)}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-black/15 px-4 text-sm font-black uppercase text-black transition hover:bg-black hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          {isFree ? (
            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-black/65">
                <ShieldCheck className="h-4 w-4" />
                Registrarme gratis
              </div>
              {!emailReady && (
                <p className="mb-3 border border-black/10 bg-black/[0.04] px-3 py-2 text-sm font-bold text-black/60">
                  Ingrese su correo. Le enviaremos un enlace para confirmar la cuenta y completar nombre, cédula y teléfono.
                </p>
              )}
              {error && <p className="mb-3 border border-red-500/25 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
              {status && <p className="mb-3 border border-emerald-500/25 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{status}</p>}
              <button
                type="button"
                disabled={!emailReady || registering}
                onClick={registerFreeDay}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-black px-4 text-sm font-black uppercase text-white transition hover:bg-[#bd9300] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {registering ? "Enviando..." : "Registrarme con mi correo"}
              </button>
              <p className="mt-3 text-xs font-bold leading-5 text-black/52">
                Sin tarjeta ni pago. Confirmás tu correo, completás tus datos y presentás tu nombre en recepción. Después elegís tu plan.
              </p>
            </div>
          ) : (
            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase text-black/65">
                <CreditCard className="h-4 w-4" />
                Pagar con PayPal
              </div>
              {!formReady && (
                <p className="mb-3 border border-black/10 bg-black/[0.04] px-3 py-2 text-sm font-bold text-black/60">
                  Complete nombre, teléfono y correo para activar el pago.
                </p>
              )}
              {error && <p className="mb-3 border border-red-500/25 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p>}
              {status && <p className="mb-3 border border-emerald-500/25 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">{status}</p>}
              <div className={!formReady ? "pointer-events-none opacity-45" : ""}>
                <div ref={paypalRef} className="min-h-[128px]" />
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-black/52">
                Pagos procesados por PayPal. Recepción confirma activación, cupos y cualquier condición vigente.
              </p>
            </div>
          )}

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
