"use client";

import { useMemo, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { XTREME_CHECKOUT_OPTIONS } from "@/lib/constants/checkout";
import { BUSINESS } from "@/lib/constants/business";

type FormState = { name: string; phone: string; email: string };
type CheckoutOption = (typeof XTREME_CHECKOUT_OPTIONS)[number];
const INITIAL_FORM: FormState = { name: "", phone: "", email: "" };
const PUBLIC_OPTIONS = new Set(["week", "fortnight", "month", "senior"]);
const MEMBER_OPTIONS = new Set(["day-pass", "week", "fortnight", "month"]);
const PLAN_DAYS: Record<string, number> = { "day-pass": 1, week: 7, fortnight: 15, month: 30 };

export type CheckoutSuccess = { optionId: string; optionLabel: string };

function whatsappHref(option: CheckoutOption, form: FormState, memberCheckout: boolean) {
  const text = [`Hola Xtreme Gym, quiero consultar ${option.label} (${option.priceLabel}).`, memberCheckout ? "Escribo desde Member OS." : "", form.name ? `Nombre: ${form.name}.` : "", form.phone ? `Teléfono: ${form.phone}.` : "", form.email ? `Correo: ${form.email}.` : ""].filter(Boolean).join(" ");
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;
}

function perDay(option: CheckoutOption) {
  const days = PLAN_DAYS[option.id];
  return days ? `CRC ${Math.round(option.priceCrc / days).toLocaleString("es-CR")} por día` : "Consultar disponibilidad";
}

export default function ExtremeGymCheckout({ initialOption = "month", locale = "es", compact = false, memberCheckout = false, memberCustomer }: { initialOption?: string; locale?: "es" | "en"; compact?: boolean; memberCheckout?: boolean; memberCustomer?: Partial<FormState>; onSuccess?: (result: CheckoutSuccess) => void | Promise<void> }) {
  const english = locale === "en";
  const searchParams = useSearchParams();
  const options = useMemo(() => XTREME_CHECKOUT_OPTIONS.filter((option) => (memberCheckout ? MEMBER_OPTIONS : PUBLIC_OPTIONS).has(option.id)), [memberCheckout]);
  const requested = searchParams.get("plan") || initialOption;
  const [selectedId, setSelectedId] = useState(() => options.some((option) => option.id === requested) ? requested : "month");
  const [form, setForm] = useState<FormState>(() => ({ ...INITIAL_FORM, ...memberCustomer }));
  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  if (!selected) return null;
  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const message = english ? "Online payments are currently unavailable. Message us on WhatsApp and reception will help you finish your membership." : "Los pagos en línea están temporalmente deshabilitados. Escribinos por WhatsApp y recepción te ayuda a terminar la inscripción.";

  return <section id="inscripcion" className={memberCheckout ? "relative text-white" : compact ? "relative overflow-hidden border-y border-white/10 bg-transparent px-5 py-8 text-white sm:px-8 lg:py-10" : "relative overflow-hidden border-y border-black/20 bg-[#f6c400] px-5 py-14 text-black sm:px-8 lg:py-20"}>
    <div className={memberCheckout ? "relative" : "relative mx-auto max-w-7xl"}>
      {!memberCheckout && <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[.22em] opacity-60">{english ? "Membership by WhatsApp" : "Inscripción por WhatsApp"}</p><h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">{english ? "Choose a plan" : "Elegí tu plan"}</h2><p className="mx-auto mt-3 max-w-xl text-sm font-bold opacity-70">{message}</p></div>}
      <div className={`mt-${memberCheckout ? "0" : "8"} grid gap-3 sm:grid-cols-2 ${memberCheckout ? "lg:grid-cols-4" : "xl:grid-cols-4"}`}>{options.map((option) => { const active = selected.id === option.id; const label = english ? option.id === "week" ? "Weekly plan" : option.id === "fortnight" ? "Fortnightly plan" : option.id === "month" ? "Monthly plan" : option.label : option.label; return <button key={option.id} type="button" onClick={() => setSelectedId(option.id)} aria-pressed={active} className={`relative flex min-h-44 flex-col border-2 p-5 text-left transition ${active ? "border-[#f6c400] bg-[#f6c400] text-black" : "border-white/15 bg-[#101010] text-white hover:border-[#f6c400]/70"}`}><span className="text-[10px] font-black uppercase tracking-[.2em] opacity-60">{option.category}</span><span className="mt-5 text-xl font-black uppercase leading-none">{label}</span><span className="mt-4 text-3xl font-black">{option.priceLabel}</span><span className="mt-auto flex items-center justify-between border-t border-current/20 pt-3 text-[10px] font-black uppercase">{active ? (english ? "Selected" : "Seleccionado") : (english ? "Choose" : "Elegir")}<ArrowRight className="h-4 w-4" /></span></button>; })}</div>
      <div className={`mx-auto mt-6 max-w-3xl border-2 border-white/15 bg-white p-5 text-black sm:p-7 ${memberCheckout ? "shadow-none" : "shadow-[0_24px_70px_-30px_rgba(0,0,0,.65)]"}`}><p className="text-xs font-black uppercase tracking-[.16em] text-black/50">{english ? "Selected plan" : "Plan seleccionado"}</p><h3 className="mt-2 text-2xl font-black uppercase">{selected.label}</h3><p className="mt-1 text-sm font-bold text-black/55">{selected.priceLabel} · {perDay(selected)}</p>
        {!memberCheckout && <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-black uppercase tracking-[.12em] text-black/50">Nombre<input value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-2 min-h-11 w-full border border-black/15 px-3 text-sm font-bold outline-none focus:border-black" placeholder="Nombre completo" /></label><label className="text-xs font-black uppercase tracking-[.12em] text-black/50">WhatsApp<input value={form.phone} onChange={(event) => update("phone", event.target.value)} className="mt-2 min-h-11 w-full border border-black/15 px-3 text-sm font-bold outline-none focus:border-black" placeholder="8898 4000" /></label><label className="text-xs font-black uppercase tracking-[.12em] text-black/50 sm:col-span-2">Correo (opcional)<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="mt-2 min-h-11 w-full border border-black/15 px-3 text-sm font-bold outline-none focus:border-black" placeholder="correo@ejemplo.com" /></label></div>}
        {memberCheckout && <p className="mt-4 text-sm font-bold text-black/60">{form.name || "Tu cuenta de Member OS"}. La membresía se coordina directamente con recepción.</p>}
        <a href={whatsappHref(selected, form, memberCheckout)} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#25d366] px-5 text-sm font-black uppercase text-black transition hover:bg-[#1ebe5d]"><MessageCircle className="h-5 w-5" />{english ? "Continue on WhatsApp" : "Continuar por WhatsApp"}</a><p className="mt-3 text-center text-xs font-bold leading-5 text-black/50">{message}</p>
      </div>
    </div>
  </section>;
}
