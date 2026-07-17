"use client";

/**
 * Vitrina de beneficios del gym dentro del Member OS:
 * zonas, VIP, training grupal, medición corporal y comodidades.
 */

import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Sparkles,
} from "lucide-react";
import { GameLabel } from "../../../GameOS";
import {
  GYM_AMENITIES,
  GYM_SERVICES,
  GYM_ZONES,
  type GymServiceBenefit,
  type GymZoneBenefit,
} from "../../catalog/gymBenefits";
import type { TabId } from "../../constants";

type Props = {
  onGoTab?: (tab: TabId) => void;
};

type BenefitTab = Extract<TabId, "entrenar" | "maquinas" | "progreso" | "perfil" | "vida">;

const TONE_BORDER: Record<string, string> = {
  lime: "border-[#d8ff3e]/40",
  cyan: "border-cyan-300/40",
  orange: "border-orange-300/40",
  yellow: "border-yellow-300/40",
  white: "border-white/20",
};

const TONE_BG: Record<string, string> = {
  lime: "from-[#d8ff3e]/15 to-transparent",
  cyan: "from-cyan-300/15 to-transparent",
  orange: "from-orange-300/15 to-transparent",
  yellow: "from-yellow-300/15 to-transparent",
  white: "from-white/10 to-transparent",
};

const TONE_TEXT: Record<string, string> = {
  lime: "text-[#d8ff3e]",
  cyan: "text-cyan-300",
  orange: "text-orange-300",
  yellow: "text-yellow-300",
  white: "text-white/70",
};

export default function GymBenefitsShowcase({ onGoTab }: Props) {
  const [openZone, setOpenZone] = useState<string | null>(null);
  const [openService, setOpenService] = useState<string | null>("medicion");

  const zone: GymZoneBenefit | undefined = GYM_ZONES.find((z) => z.id === openZone);
  const service: GymServiceBenefit | undefined = GYM_SERVICES.find((s) => s.id === openService);

  return (
    <div className="space-y-4">
      <header className="border-[3px] border-[#d8ff3e]/35 bg-gradient-to-br from-[#d8ff3e]/[0.12] to-[#0b0b0b] p-4 shadow-[5px_5px_0_rgba(0,0,0,.45)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-black/30 bg-[#d8ff3e] text-black">
            <MapPin className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <GameLabel tone="lime">Tu membresía incluye</GameLabel>
            <h2 className="mt-1 text-xl font-black uppercase leading-tight sm:text-2xl">
              Todo Xtreme, en la app
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-white/55">
              Zonas completas, VIP, training en grupos reducidos, medición corporal ligada a tu
              progreso y guías de máquinas. Tocá un cuadro y explorá.
            </p>
          </div>
        </div>
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GYM_AMENITIES.map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={item.id}
                className="inline-flex shrink-0 items-center gap-1.5 border-[3px] border-white/15 bg-black/40 px-2.5 py-2 text-[10px] font-black uppercase tracking-wide text-white/70"
              >
                <Icon className="h-3.5 w-3.5 text-[#d8ff3e]" />
                {item.label}
              </span>
            );
          })}
        </div>
      </header>

      {/* Servicios estrella: grupal, medición, guías */}
      <section>
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
          Beneficios que se sienten
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {GYM_SERVICES.map((item) => {
            const Icon = item.icon;
            const active = openService === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenService((id) => (id === item.id ? null : item.id))}
                className={`relative flex min-h-[108px] flex-col items-start justify-between border-[3px] p-3.5 text-left shadow-[4px_4px_0_rgba(0,0,0,.4)] transition active:translate-x-px active:translate-y-px ${
                  active
                    ? `${TONE_BORDER[item.tone]} bg-gradient-to-br ${TONE_BG[item.tone]}`
                    : "border-white/15 bg-[#0c0c0c] hover:border-white/30"
                }`}
              >
                {item.badge && (
                  <span className="absolute right-2 top-2 border border-white/20 bg-black/50 px-1.5 py-0.5 text-[9px] font-black uppercase text-white/65">
                    {item.badge}
                  </span>
                )}
                <span
                  className={`grid h-11 w-11 place-items-center border-2 border-black/30 ${
                    active ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-3 w-full">
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black uppercase leading-tight">{item.title}</span>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition ${active ? "rotate-90 text-[#d8ff3e]" : "text-white/30"}`}
                    />
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] font-bold text-white/40">
                    {item.text}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {service && (
          <div
            className={`xg-tab-in mt-2 border-[3px] p-4 sm:p-5 ${TONE_BORDER[service.tone]} bg-[#0c0c0c]`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#d8ff3e] text-black">
                <service.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${TONE_TEXT[service.tone]}`}>
                  Beneficio socio
                </p>
                <h3 className="mt-0.5 text-lg font-black uppercase">{service.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white/55">
                  {service.text}
                </p>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {service.highlights.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-bold text-white/70"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                  {line}
                </li>
              ))}
            </ul>
            {service.ctaTab && onGoTab && (
              <button
                type="button"
                onClick={() => onGoTab(service.ctaTab!)}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#d8ff3e] px-4 text-sm font-black uppercase text-black transition hover:bg-white sm:w-auto"
              >
                {service.ctaLabel || "Abrir en la app"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Zonas del gym */}
      <section>
        <div className="mb-2 flex items-end justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
            Zonas de entrenamiento
          </p>
          <span className="text-[10px] font-bold text-white/30">{GYM_ZONES.length} áreas</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GYM_ZONES.map((item) => {
            const Icon = item.icon;
            const active = openZone === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenZone((id) => (id === item.id ? null : item.id))}
                className={`group relative min-h-[120px] overflow-hidden border-[3px] text-left shadow-[3px_3px_0_rgba(0,0,0,.4)] transition active:translate-x-px active:translate-y-px ${
                  active ? TONE_BORDER[item.tone] : "border-white/15"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/25" />
                <div className="relative flex h-full min-h-[120px] flex-col justify-between p-3">
                  <span className="grid h-9 w-9 place-items-center border-2 border-black/40 bg-[#d8ff3e] text-black">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-[#d8ff3e]">
                      {item.eyebrow}
                    </span>
                    <span className="mt-0.5 block text-sm font-black uppercase leading-tight">
                      {item.title}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {zone && (
          <div className="xg-tab-in mt-2 overflow-hidden border-[3px] border-white/15 bg-[#0c0c0c]">
            <div
              className="relative h-28 bg-cover bg-center sm:h-36"
              style={{ backgroundImage: `url(${zone.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
                    {zone.eyebrow}
                  </p>
                  <h3 className="text-xl font-black uppercase sm:text-2xl">{zone.title}</h3>
                </div>
                <zone.icon className="h-8 w-8 text-[#d8ff3e]" />
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold leading-relaxed text-white/55">{zone.text}</p>
              <ul className="mt-3 space-y-1.5">
                {zone.details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm font-bold text-white/70">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d8ff3e]" />
                    {d}
                  </li>
                ))}
              </ul>
              {onGoTab && (
                <button
                  type="button"
                  onClick={() => onGoTab("maquinas")}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 border-[3px] border-white/20 px-4 text-xs font-black uppercase text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93]"
                >
                  Ver guía de máquinas
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <p className="text-center text-[11px] font-semibold text-white/30">
        Horario amplio · Ciudad Quesada · Tu carné y rachas viven en esta app
      </p>
    </div>
  );
}
