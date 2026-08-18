"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Heart, MapPin, RotateCcw, Sparkles, UtensilsCrossed } from "lucide-react";
import { INGREDIENT_GROUPS, type IngredientGroup, type IngredientTag } from "./foodData";
import { matchDishes, type DishMatch } from "./match";
import styles from "./ruleta.module.css";

type BuilderStep = 0 | 1 | 2 | 3 | 4;

const GROUP_ACCENT: Record<IngredientGroup["id"], string> = {
  protein: "#ed4c78",
  base: "#f08a5d",
  style: "#ffb84d",
  extra: "#60a5a0",
};

const FAVORITE_VARIANTS: readonly { label: string; emoji: string; tags: readonly IngredientTag[] }[] = [
  { label: "Pollo a la plancha", emoji: "🍗", tags: ["pollo", "pure", "plancha", "vegetales"] },
  { label: "Pescado a la plancha", emoji: "🐟", tags: ["pescado", "pure", "plancha", "vegetales"] },
  { label: "Pescado al ajillo", emoji: "🧄", tags: ["pescado", "pure", "ajillo", "vegetales"] },
  { label: "Pollo crispy", emoji: "✨", tags: ["pollo", "pure", "crispy", "vegetales"] },
];

function photoStyle(groupId: IngredientGroup["id"], optionIndex: number) {
  if (groupId === "style") {
    const column = optionIndex % 3;
    const row = Math.floor(optionIndex / 3);
    return {
      backgroundImage: "url('/ruleta/cooking-style-atlas.webp')",
      backgroundSize: "300% 200%",
      backgroundPosition: `${column * 50}% ${row * 100}%`,
    };
  }

  const rowByGroup = { protein: 0, base: 1, extra: 3 } as const;
  const row = rowByGroup[groupId as keyof typeof rowByGroup] ?? 0;
  return {
    backgroundImage: "url('/ruleta/ingredient-atlas.webp')",
    backgroundSize: "600% 400%",
    backgroundPosition: `${optionIndex * 20}% ${(row / 3) * 100}%`,
  };
}

function IngredientPhoto({
  groupId,
  optionIndex,
  label,
  className = "",
}: {
  groupId: IngredientGroup["id"];
  optionIndex: number;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Fotografía de ${label}`}
      className={`${styles.ingredientPhoto} block bg-cover bg-no-repeat ${className}`}
      style={photoStyle(groupId, optionIndex)}
    />
  );
}

function optionForTag(tag: IngredientTag) {
  for (const group of INGREDIENT_GROUPS) {
    const optionIndex = group.options.findIndex((option) => option.id === tag);
    if (optionIndex >= 0) return { group, option: group.options[optionIndex], optionIndex };
  }
  return null;
}

function TagChips({ tags }: { tags: readonly IngredientTag[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const found = optionForTag(tag);
        if (!found) return null;
        return (
          <span key={tag} className="rounded-full bg-[#3d2630]/5 px-2.5 py-1 text-[11px] font-bold text-[#6b4d57]">
            {found.option.emoji} {found.option.label}
          </span>
        );
      })}
    </div>
  );
}

function idealPlateName(tags: ReadonlySet<IngredientTag>) {
  const protein = tags.has("pescado") ? "Pescado" : tags.has("pollo") ? "Pollo" : "Proteína elegida";
  const style = tags.has("ajillo") ? "al ajillo" : tags.has("crispy") ? "crispy" : tags.has("plancha") ? "a la plancha" : "a tu gusto";
  const sides = [tags.has("pure") ? "puré de papa" : null, tags.has("vegetales") ? "vegetales salteados" : null].filter(Boolean);
  return `${protein} ${style}${sides.length ? ` con ${sides.join(" y ")}` : ""}`;
}

export default function PlateBuilder({ onSwitchToRoulette }: { onSwitchToRoulette: () => void }) {
  const [selected, setSelected] = useState<Set<IngredientTag>>(new Set());
  const [step, setStep] = useState<BuilderStep>(0);

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const matches = useMemo(() => matchDishes(selectedList), [selectedList]);
  const topMatches = matches.slice(0, 6);
  const activeGroup = step < 4 ? INGREDIENT_GROUPS[step as 0 | 1 | 2 | 3] : null;
  const activeSelectionCount = activeGroup?.options.filter((option) => selected.has(option.id)).length ?? 0;
  const canContinue = activeGroup?.id === "extra" || activeSelectionCount > 0;

  function toggleTag(tag: IngredientTag) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function nextStep() {
    if (!canContinue || step >= 4) return;
    setStep((step + 1) as BuilderStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    if (step === 0) return;
    setStep((step - 1) as BuilderStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseFavorite(tags: readonly IngredientTag[]) {
    setSelected(new Set(tags));
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setSelected(new Set());
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="w-full">
      <div className="mx-auto mb-7 max-w-3xl text-center lg:mx-0 lg:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff8fab]/30 bg-white/75 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#d94d73] shadow-sm backdrop-blur">
          <UtensilsCrossed className="h-4 w-4" aria-hidden="true" />
          Armá tu platillo ideal
        </div>
        <h1 className="text-balance text-4xl font-black leading-[0.95] tracking-[-0.055em] text-[#3d2630] sm:text-5xl lg:text-6xl">
          Elegí con los ojos,
          <span className="block bg-gradient-to-r from-[#ed4c78] to-[#f08a5d] bg-clip-text text-transparent">
            ingrediente por ingrediente
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-[#765c66] sm:text-lg lg:mx-0">
          Te mostramos una decisión a la vez. Tocá las fotos que más se parezcan a lo que querés comer hoy.
        </p>
      </div>

      <div className="mb-7 flex items-center gap-2" aria-label={step < 4 ? `Paso ${step + 1} de 4` : "Selección terminada"}>
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`h-2 flex-1 rounded-full transition-colors ${index <= step ? "bg-[#ed4c78]" : "bg-[#decbd1]"}`} />
        ))}
        <span className="ml-2 min-w-16 text-right text-xs font-black uppercase tracking-[0.15em] text-[#a47c89]">
          {step < 4 ? `0${step + 1} / 04` : "Listo"}
        </span>
      </div>

      {activeGroup ? (
        <section className={`${styles.builderStage} rounded-[2rem] border border-white/80 bg-white/55 p-4 shadow-[0_20px_60px_rgba(115,55,76,0.1)] backdrop-blur-sm sm:p-6 lg:p-8`}>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d94d73]">Sólo esta decisión por ahora</p>
              <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#3d2630] sm:text-4xl">{activeGroup.title}</h2>
              <p className="mt-2 text-sm font-semibold text-[#92727e]">{activeGroup.subtitle}</p>
            </div>
            {step > 0 && (
              <button type="button" onClick={previousStep} className="hidden min-h-11 items-center gap-1 rounded-full px-4 text-sm font-black text-[#84616e] hover:bg-white sm:inline-flex">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-5">
            {activeGroup.options.map((option, optionIndex) => {
              const active = selected.has(option.id);
              const accent = GROUP_ACCENT[activeGroup.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleTag(option.id)}
                  aria-pressed={active}
                  className={`${styles.ingredientCard} group relative overflow-hidden rounded-[1.5rem] border-2 bg-white text-left shadow-[0_10px_28px_rgba(72,34,48,0.1)] transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#ed4c78]`}
                  style={{ borderColor: active ? accent : "rgba(255,255,255,0.9)" }}
                >
                  <IngredientPhoto groupId={activeGroup.id} optionIndex={optionIndex} label={option.label} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105" />
                  <span className="flex min-h-16 items-center justify-between gap-2 px-4 py-3">
                    <span>
                      <span className="block text-xs font-black uppercase tracking-[0.13em] text-[#a47c89]">{option.emoji} opción</span>
                      <span className="mt-0.5 block text-base font-black leading-tight text-[#4d353e] sm:text-lg">{option.label}</span>
                    </span>
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition"
                      style={{ borderColor: accent, backgroundColor: active ? accent : "transparent", color: active ? "white" : accent }}
                    >
                      {active ? <Check className="h-5 w-5" aria-hidden="true" /> : <span className="text-xl leading-none">+</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {step === 0 && (
            <div className="mt-7 overflow-hidden rounded-[1.75rem] border border-[#ed4c78]/15 bg-[#3d2630] text-white shadow-[0_18px_45px_rgba(61,38,48,0.18)]">
              <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative min-h-64 overflow-hidden lg:order-2">
                  <Image src="/ruleta/favorite-grilled-chicken.webp" alt="Pollo a la plancha con puré de papa y vegetales salteados" fill sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3d2630]/65 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#3d2630]/55 lg:to-transparent" />
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8 lg:order-1">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#ff9bb6]">
                    <Heart className="h-4 w-4 fill-current" aria-hidden="true" /> Tu combinación favorita
                  </p>
                  <h3 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.045em] sm:text-4xl">Vegetales salteados, puré y proteína</h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-white/70">Podés entrar directo con pollo o pescado y escoger la preparación que más te provoque.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {FAVORITE_VARIANTS.map((variant) => (
                      <button
                        key={variant.label}
                        type="button"
                        onClick={() => chooseFavorite(variant.tags)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                      >
                        {variant.emoji} {variant.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-col items-center justify-between gap-4 border-t border-[#7c4358]/10 pt-5 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-sm font-black text-[#5d414b]">
                {activeSelectionCount === 0 ? "Todavía no elegís ninguna." : `${activeSelectionCount} ${activeSelectionCount === 1 ? "opción elegida" : "opciones elegidas"}.`}
              </p>
              <p className="text-xs font-medium text-[#9a7884]">Podés marcar más de una si estás entre dos antojos.</p>
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" onClick={previousStep} className="inline-flex min-h-12 items-center gap-1 rounded-full px-4 text-sm font-black text-[#84616e] hover:bg-white sm:hidden">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver
                </button>
              )}
              <button
                type="button"
                onClick={nextStep}
                disabled={!canContinue}
                className="inline-flex min-h-14 min-w-44 items-center justify-center gap-2 rounded-full bg-[#3d2630] px-6 py-4 text-sm font-black text-white shadow-[0_7px_0_#24151b] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#24151b] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
              >
                {step === 3 ? "Ver mi platillo" : "Continuar"} <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className={`${styles.builderStage} space-y-7`}>
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-[0_20px_60px_rgba(115,55,76,0.12)] backdrop-blur-sm">
            <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
              <div className="grid min-h-72 grid-cols-2 sm:grid-cols-4 lg:grid-cols-2">
                {selectedList.slice(0, 4).map((tag) => {
                  const found = optionForTag(tag);
                  return found ? (
                    <IngredientPhoto key={tag} groupId={found.group.id} optionIndex={found.optionIndex} label={found.option.label} className="min-h-36 w-full" />
                  ) : null;
                })}
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-9">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#d94d73]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Tu plato ideal
                </p>
                <h2 className="mt-3 text-balance text-3xl font-black leading-[0.96] tracking-[-0.045em] text-[#3d2630] sm:text-5xl">{idealPlateName(selected)}</h2>
                <div className="mt-5"><TagChips tags={selectedList} /></div>
                <div className="mt-7 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setStep(3)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ed4c78] px-5 py-3 text-sm font-black text-white shadow-[0_5px_0_#b72d54] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#b72d54]">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ajustar ingredientes
                  </button>
                  <button type="button" onClick={reset} className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-[#84616e] hover:bg-white">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Empezar de nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2 px-1">
              <ChevronRight className="h-5 w-5 text-[#ed4c78]" aria-hidden="true" />
              <h2 className="text-xl font-black tracking-tight text-[#3d2630] sm:text-2xl">
                {topMatches.length > 0 ? "Restaurantes con algo parecido" : "Todavía no hay un match en el catálogo"}
              </h2>
            </div>

            {topMatches.length === 0 ? (
              <div className="rounded-3xl border border-white/80 bg-white/60 p-6 text-center text-sm font-semibold text-[#896b76] backdrop-blur-sm">
                Probá otra combinación o usá la ruleta sorpresa mientras agregamos más menús de San Carlos.
                <div className="mt-3">
                  <button type="button" onClick={onSwitchToRoulette} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ed4c78] px-5 py-2.5 text-sm font-black text-white shadow-[0_5px_0_#b72d54]">
                    Probar la ruleta sorpresa
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {topMatches.map((match, index) => (
                  <MatchCard key={`${match.restaurant.name}-${match.dish.name}`} match={match} rank={index} maxScore={selectedList.length} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function MatchCard({ match, rank, maxScore }: { match: DishMatch; rank: number; maxScore: number }) {
  const percent = Math.min(100, Math.round((match.score / Math.max(1, maxScore)) * 100));

  return (
    <div className={`${styles.matchCard} flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_14px_40px_rgba(115,55,76,0.1)] backdrop-blur-sm`} style={{ animationDelay: `${rank * 70}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.15em] text-[#d94d73]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {match.restaurant.name}
          </p>
          <p className="text-xs font-semibold text-[#9a7180]">{match.restaurant.location}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#3d2630] px-2.5 py-1 text-[11px] font-black text-white">{percent}% match</span>
      </div>
      <p className="text-lg font-black leading-tight text-[#3d2630]">{match.category.emoji} {match.dish.name}</p>
      <TagChips tags={match.matchedTags} />
    </div>
  );
}
