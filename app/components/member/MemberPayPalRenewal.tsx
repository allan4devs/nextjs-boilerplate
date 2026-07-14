"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { getXtremeCheckoutOption } from "@/lib/constants/checkout";

type PayPalConfig = {
  configured?: boolean;
  clientId?: string;
  currency: string;
  message?: string;
};

type RenewalResult = {
  success?: boolean;
  captureID?: string | null;
  membershipUntil?: string | null;
  message?: string;
};

type PlanOption = {
  id: "week" | "fortnight" | "month" | "senior";
  label: string;
  days: number;
  priceLabel: string;
  usdAmount: string;
  eyebrow: string;
  note: string;
  popular?: boolean;
};

function planOption(
  id: PlanOption["id"],
  details: Omit<PlanOption, "id" | "priceLabel" | "usdAmount">,
): PlanOption {
  const checkoutOption = getXtremeCheckoutOption(id);
  if (!checkoutOption) throw new Error(`El plan ${id} no existe en el catálogo de pagos.`);
  return {
    id,
    ...details,
    priceLabel: checkoutOption.priceLabel.replace(/^CRC\s+/, ""),
    usdAmount: checkoutOption.usdAmount,
  };
}

const PLAN_OPTIONS: PlanOption[] = [
  planOption("week", { label: "Semana", days: 7, eyebrow: "Activá el hábito", note: "Una semana para mantener el impulso." }),
  planOption("fortnight", { label: "Quincena", days: 15, eyebrow: "Mantené el ritmo", note: "Quince días para sostener el progreso." }),
  planOption("month", { label: "Mes", days: 30, eyebrow: "Compromiso completo", note: "La mejor opción para entrenar constante.", popular: true }),
  planOption("senior", { label: "Adultos mayores", days: 30, eyebrow: "Programa acompañado", note: "Tres clases guiadas por semana." }),
];

function defaultOption(plan: string): PlanOption["id"] {
  const normalized = plan.toLowerCase();
  if (normalized.includes("seman")) return "week";
  if (normalized.includes("quinc")) return "fortnight";
  if (normalized.includes("mayor") || normalized.includes("senior")) return "senior";
  return "month";
}

export default function MemberPayPalRenewal({
  currentPlan,
  onRenewed,
}: {
  currentPlan: string;
  onRenewed: (result: RenewalResult) => Promise<void> | void;
}) {
  const [selectedId, setSelectedId] = useState<PlanOption["id"]>(() => defaultOption(currentPlan));
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const paypalRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedId);
  const onRenewedRef = useRef(onRenewed);
  selectedRef.current = selectedId;
  onRenewedRef.current = onRenewed;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/xtreme/checkout/config", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const data = (await response.json()) as PayPalConfig;
        if (!response.ok || !data.configured || !data.clientId) {
          throw new Error(data.message || "PayPal no está disponible en este momento.");
        }
        if (!cancelled) setPaypalConfig(data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "No se pudo cargar PayPal.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paypalConfig?.clientId || !paypalRef.current) return;
    let cancelled = false;
    const container = paypalRef.current;
    const activeConfig = paypalConfig;

    async function loadPayPal() {
      try {
        const existing = document.querySelector<HTMLScriptElement>("#xtreme-paypal-sdk");
        if (!window.paypal && !existing) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.id = "xtreme-paypal-sdk";
            script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
              activeConfig.clientId ?? "",
            )}&currency=${encodeURIComponent(activeConfig.currency)}&intent=capture`;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("No se pudo cargar el módulo de PayPal."));
            document.head.appendChild(script);
          });
        } else if (existing && !window.paypal) {
          await new Promise<void>((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("No se pudo cargar PayPal.")), { once: true });
          });
        }

        if (cancelled || !window.paypal) return;
        container.innerHTML = "";
        window.paypal
          .Buttons({
            style: { layout: "vertical", shape: "rect", label: "paypal", height: 48 },
            createOrder: async () => {
              setError("");
              setStatus("Creando renovación segura...");
              const response = await fetch("/api/xtreme/checkout/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ optionId: selectedRef.current, memberCheckout: true }),
              });
              const data = (await response.json()) as { orderID?: string; message?: string };
              if (!response.ok || !data.orderID) throw new Error(data.message || "No se pudo crear la orden.");
              setStatus("Completá el pago en PayPal...");
              return data.orderID;
            },
            onApprove: async (data: { orderID?: string }) => {
              if (!data.orderID) throw new Error("PayPal no devolvió el número de orden.");
              setStatus("Aplicando la renovación...");
              const response = await fetch("/api/xtreme/checkout/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ orderID: data.orderID }),
              });
              const result = (await response.json()) as RenewalResult;
              if (!response.ok || !result.success) throw new Error(result.message || "No se pudo confirmar el pago.");

              const reference = result.captureID || data.orderID;
              if (reference && typeof window.gtag === "function") {
                window.gtag("event", "conversion", {
                  send_to: "AW-18319195306/ydJACN7ShNAcEKr5op9E",
                  transaction_id: reference,
                });
              }
              await onRenewedRef.current(result);
              setError("");
              setStatus(
                result.membershipUntil
                  ? `¡Listo! Tu plan ahora llega hasta ${result.membershipUntil}.`
                  : "¡Listo! Tu renovación quedó aplicada.",
              );
            },
            onCancel: () => setStatus("Pago cancelado. Podés intentarlo cuando querás."),
            onError: (reason: unknown) => {
              setStatus("");
              setError(reason instanceof Error ? reason.message : "Hubo un error con PayPal.");
            },
          } satisfies Record<string, unknown>)
          .render(container);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "PayPal no está disponible.");
      }
    }

    void loadPayPal();
    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [paypalConfig, selectedId]);

  const selectedOption = PLAN_OPTIONS.find((option) => option.id === selectedId) ?? PLAN_OPTIONS[2];

  return (
    <div className="mt-5 border-t-[3px] border-white/10 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d8ff3e]">Renová sin salir de la app</p>
          <h3 className="mt-2 text-2xl font-black uppercase leading-none text-white sm:text-3xl">Elegí cuánto querés sumar</h3>
          <p className="mt-2 text-xs font-bold text-white/45">Cada renovación se agrega al tiempo que todavía tenés disponible.</p>
        </div>
        <ShieldCheck className="h-8 w-8 text-[#d8ff3e]" aria-hidden="true" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Planes para renovar">
        {PLAN_OPTIONS.map((option, index) => {
          const active = selectedId === option.id;
          const featured = option.id === "month";
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setSelectedId(option.id);
                setStatus("");
                setError("");
              }}
              className={`group relative flex min-h-[17rem] overflow-hidden border-[3px] p-5 pt-7 text-left transition duration-200 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${
                featured
                  ? "border-[#f6c400] bg-[#f6c400] text-black shadow-[0_0_35px_rgba(246,196,0,.16)]"
                  : "bg-[#111] text-white"
              } ${
                active
                  ? "-translate-y-1 border-[#d8ff3e] shadow-[7px_7px_0_rgba(216,255,62,.22)]"
                  : "border-white/15 shadow-[4px_4px_0_rgba(0,0,0,.45)] hover:-translate-y-1 hover:border-white/35 hover:shadow-[7px_7px_0_rgba(0,0,0,.6)]"
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-2 ${featured ? "bg-black" : active ? "bg-[#d8ff3e]" : "bg-white/12"}`} />
              <span className="pointer-events-none absolute -right-10 top-24 h-[3px] w-44 rotate-45 bg-current opacity-[.09]" aria-hidden="true" />
              <span className="pointer-events-none absolute -right-10 top-24 h-[3px] w-44 -rotate-45 bg-current opacity-[.09]" aria-hidden="true" />

              {option.popular ? (
                <span className="absolute right-4 top-5 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white">Popular</span>
              ) : null}
              {active ? (
                <span className={`absolute right-4 ${option.popular ? "top-16" : "top-4"} grid h-7 w-7 place-items-center rounded-full ${featured ? "bg-black text-[#f6c400]" : "bg-[#d8ff3e] text-black"}`}>
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              ) : null}

              <span className="relative flex w-full flex-col">
                <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${featured ? "text-black/60" : "text-white/48"}`}>
                  0{index + 1} / {option.eyebrow}
                </span>
                <span className={`mt-4 block max-w-[80%] text-2xl font-black uppercase leading-[.95] tracking-[-0.035em] ${option.id === "senior" ? "sm:text-[1.65rem]" : "sm:text-3xl"}`}>
                  {option.label}
                </span>
                <span className={`mt-3 min-h-10 text-xs font-bold leading-5 ${featured ? "text-black/58" : "text-white/48"}`}>{option.note}</span>

                <span className="mt-5 block border-t-2 border-current/15 pt-4">
                  <span className="block text-[10px] font-black uppercase tracking-[.2em] opacity-55">CRC</span>
                  <span className="mt-1 block text-4xl font-black leading-none tracking-[-0.065em]">{option.priceLabel}</span>
                  <span className="mt-2 block text-[10px] font-black uppercase tracking-[.14em] opacity-55">{option.days} días · PayPal USD {option.usdAmount}</span>
                </span>

                <span className={`mt-5 flex min-h-12 items-center justify-center gap-2 px-3 text-xs font-black uppercase tracking-[0.04em] transition ${
                  featured
                    ? "bg-black text-white group-hover:bg-white group-hover:text-black"
                    : active
                      ? "bg-[#d8ff3e] text-black"
                      : "bg-white text-black group-hover:bg-[#d8ff3e]"
                }`}>
                  {active ? "Plan seleccionado" : "Elegir este plan"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-[3px] border-white/15 bg-[#0c0c0c] p-4 shadow-[5px_5px_0_rgba(0,0,0,.45)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">Plan seleccionado</p>
            <p className="mt-1 text-lg font-black uppercase text-white">{selectedOption.label} · CRC {selectedOption.priceLabel}</p>
            <p className="mt-1 text-xs font-bold text-white/45">Se suman {selectedOption.days} días al finalizar el pago.</p>
          </div>
          <CreditCard className="h-6 w-6 text-[#d8ff3e]" aria-hidden="true" />
        </div>

        <div className="mt-4 min-h-[120px]">
          {!paypalConfig && !error ? (
            <div className="flex items-center gap-2 py-4 text-sm font-bold text-white/50">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando PayPal...
            </div>
          ) : null}
          <div ref={paypalRef} />
        </div>
        {status ? (
          <p className="mt-2 flex items-center gap-2 border border-[#d8ff3e]/25 bg-[#d8ff3e]/10 p-3 text-sm font-bold text-[#eaff93]">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {status}
          </p>
        ) : null}
        {error ? <p className="mt-2 border border-red-300/20 bg-red-300/10 p-3 text-sm font-bold text-red-200">{error}</p> : null}
        <p className="mt-3 text-[11px] font-bold leading-5 text-white/38">El pago se procesa de forma segura con PayPal y la vigencia se actualiza automáticamente.</p>
      </div>
    </div>
  );
}
