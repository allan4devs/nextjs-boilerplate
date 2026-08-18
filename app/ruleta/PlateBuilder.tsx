"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Dice5,
  Heart,
  History,
  ListPlus,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { INGREDIENT_GROUPS, type IngredientGroup, type IngredientTag } from "./foodData";
import { matchDishes, type DishMatch } from "./match";
import { type SavedCandidate, useFoodPreferences } from "./useFoodPreferences";
import styles from "./ruleta.module.css";

type BuilderStep = 0 | 1 | 2 | 3 | 4;
type PossibleDish = SavedCandidate;

const GROUP_ACCENT: Record<IngredientGroup["id"], string> = {
  protein: "#ed4c78",
  base: "#f08a5d",
  style: "#ffb84d",
  extra: "#60a5a0",
};

const FAVORITE_VARIANTS: readonly {
  id: string;
  label: string;
  emoji: string;
  tags: readonly IngredientTag[];
}[] = [
  {
    id: "pollo-plancha-favorito",
    label: "Pollo a la plancha",
    emoji: "🍗",
    tags: ["pollo", "pure", "plancha", "vegetales", "brocoli", "coliflor", "papa"],
  },
  {
    id: "pescado-plancha-favorito",
    label: "Pescado a la plancha",
    emoji: "🐟",
    tags: ["pescado", "pure", "plancha", "vegetales", "brocoli", "coliflor", "papa"],
  },
  {
    id: "pescado-ajillo-favorito",
    label: "Pescado al ajillo",
    emoji: "🧄",
    tags: ["pescado", "pure", "ajillo", "vegetales", "brocoli", "coliflor", "papa"],
  },
  {
    id: "pollo-crispy-favorito",
    label: "Pollo crispy",
    emoji: "✨",
    tags: ["pollo", "pure", "crispy", "vegetales", "brocoli", "coliflor", "papa"],
  },
];

const SEAFOOD_SOUP_TAGS = ["pescado", "casero", "vegetales", "papa"] as const satisfies readonly IngredientTag[];
const SPECIAL_VEGETABLE_CELLS: Partial<Record<IngredientTag, readonly [number, number]>> = {
  brocoli: [0, 0],
  coliflor: [1, 0],
  papa: [0, 1],
};

function favoriteFoodStyle(column: number, row: number) {
  return {
    backgroundImage: "url('/ruleta/favorite-food-atlas.webp')",
    backgroundSize: "200% 200%",
    backgroundPosition: `${column * 100}% ${row * 100}%`,
  };
}

function photoStyle(groupId: IngredientGroup["id"], optionIndex: number, tag: IngredientTag) {
  const specialCell = SPECIAL_VEGETABLE_CELLS[tag];
  if (specialCell) return favoriteFoodStyle(specialCell[0], specialCell[1]);

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
  const extraAtlasOrder: readonly IngredientTag[] = [
    "queso-extra",
    "frijoles",
    "aguacate",
    "salsa-especial",
    "vegetales",
    "para-compartir",
  ];
  const atlasIndex = groupId === "extra" ? Math.max(0, extraAtlasOrder.indexOf(tag)) : optionIndex;
  const row = rowByGroup[groupId as keyof typeof rowByGroup] ?? 0;
  return {
    backgroundImage: "url('/ruleta/ingredient-atlas.webp')",
    backgroundSize: "600% 400%",
    backgroundPosition: `${atlasIndex * 20}% ${(row / 3) * 100}%`,
  };
}

function IngredientPhoto({
  groupId,
  optionIndex,
  tag,
  label,
  className = "",
}: {
  groupId: IngredientGroup["id"];
  optionIndex: number;
  tag: IngredientTag;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Fotografía de ${label}`}
      className={`${styles.ingredientPhoto} block bg-cover bg-no-repeat ${className}`}
      style={photoStyle(groupId, optionIndex, tag)}
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
  const style = tags.has("ajillo")
    ? "al ajillo"
    : tags.has("crispy")
      ? "crispy"
      : tags.has("plancha")
        ? "a la plancha"
        : "a tu gusto";
  const favoriteVegetables = [tags.has("brocoli") ? "brócoli" : null, tags.has("coliflor") ? "coliflor" : null]
    .filter(Boolean)
    .join(" y ");
  const sides = [
    tags.has("pure") ? "puré de papa" : null,
    favoriteVegetables || (tags.has("vegetales") ? "vegetales salteados" : null),
  ].filter(Boolean);
  return `${protein} ${style}${sides.length ? ` con ${sides.join(" y ")}` : ""}`;
}

function candidateKey(match: DishMatch) {
  return `${match.restaurant.name}::${match.dish.name}`;
}

function clampWeight(weight: number) {
  return Math.min(100, Math.max(5, Math.round(weight)));
}

export default function PlateBuilder({ onSwitchToRoulette }: { onSwitchToRoulette: () => void }) {
  const [selected, setSelected] = useState<Set<IngredientTag>>(new Set());
  const [step, setStep] = useState<BuilderStep>(0);
  const [candidateOverrides, setCandidateOverrides] = useState<Record<string, PossibleDish>>({});
  const [removedCandidateKeys, setRemovedCandidateKeys] = useState<Set<string>>(new Set());
  const [decisionKey, setDecisionKey] = useState<string | null>(null);
  const [lastOrdered, setLastOrdered] = useState<PossibleDish | null>(null);
  const [favoriteChoice, setFavoriteChoice] = useState<string | null>(null);
  const { summary, syncState, recordEvent, refresh } = useFoodPreferences();

  const possibleDishes = useMemo(() => {
    const merged = new Map((summary?.candidates ?? []).map((candidate) => [candidate.candidateKey, candidate]));
    for (const candidate of Object.values(candidateOverrides)) merged.set(candidate.candidateKey, candidate);
    for (const key of removedCandidateKeys) merged.delete(key);
    return Array.from(merged.values());
  }, [candidateOverrides, removedCandidateKeys, summary?.candidates]);

  const selectedList = useMemo(() => Array.from(selected), [selected]);
  const matches = useMemo(() => matchDishes(selectedList), [selectedList]);
  const topMatches = matches.slice(0, 8);
  const activeGroup = step < 4 ? INGREDIENT_GROUPS[step as 0 | 1 | 2 | 3] : null;
  const activeSelectionCount = activeGroup?.options.filter((option) => selected.has(option.id)).length ?? 0;
  const canContinue = activeGroup?.id === "extra" || activeSelectionCount > 0;

  function toggleTag(tag: IngredientTag) {
    const willSelect = !selected.has(tag);
    setFavoriteChoice(null);
    setSelected((previous) => {
      const next = new Set(previous);
      if (willSelect) next.add(tag);
      else next.delete(tag);
      return next;
    });
    void recordEvent({ type: "ingredient_toggled", tag, selected: willSelect });
  }

  function nextStep() {
    if (!canContinue || step >= 4) return;
    const next = (step + 1) as BuilderStep;
    setStep(next);
    if (next === 4) void recordEvent({ type: "builder_completed", selectedTags: selectedList });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    if (step === 0) return;
    setStep((step - 1) as BuilderStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseFavorite(favoriteId: string, tags: readonly IngredientTag[]) {
    setSelected(new Set(tags));
    setFavoriteChoice(favoriteId);
    setStep(4);
    void recordEvent({ type: "favorite_selected", favoriteId, selectedTags: tags });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setSelected(new Set());
    setStep(0);
    setDecisionKey(null);
    setFavoriteChoice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function initialWeightFor(match: DishMatch) {
    const matchPercent = match.score / Math.max(1, selectedList.length);
    const tagHistory = match.dish.tags.reduce((total, tag) => total + (summary?.tagAffinity[tag] ?? 0), 0);
    const orderHistory = summary?.dishAffinity[candidateKey(match)] ?? 0;
    return clampWeight(40 + matchPercent * 45 + Math.min(10, tagHistory) + Math.min(15, orderHistory * 5));
  }

  function addPossibleDish(match: DishMatch) {
    const key = candidateKey(match);
    if (possibleDishes.some((candidate) => candidate.candidateKey === key)) return;
    const candidate: PossibleDish = {
      candidateKey: key,
      restaurant: match.restaurant.name,
      location: match.restaurant.location,
      dish: match.dish.name,
      categoryEmoji: match.category.emoji,
      weight: initialWeightFor(match),
    };
    setCandidateOverrides((current) => ({ ...current, [key]: candidate }));
    setRemovedCandidateKeys((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
    void recordEvent({
      type: "candidate_added",
      ...candidate,
      initialWeight: candidate.weight,
      selectedTags: selectedList,
    });
  }

  function adjustProbability(key: string, delta: number) {
    const candidate = possibleDishes.find((item) => item.candidateKey === key);
    if (!candidate) return;
    const nextWeight = clampWeight(candidate.weight + delta);
    setCandidateOverrides((current) => ({ ...current, [key]: { ...candidate, weight: nextWeight } }));
    void recordEvent({ type: "probability_adjusted", candidateKey: key, nextWeight, delta });
  }

  function removePossibleDish(key: string) {
    setRemovedCandidateKeys((current) => new Set(current).add(key));
    setCandidateOverrides((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (decisionKey === key) setDecisionKey(null);
    void recordEvent({ type: "candidate_removed", candidateKey: key });
  }

  function decideWeighted() {
    if (possibleDishes.length === 0) return;
    const totalWeight = possibleDishes.reduce((total, candidate) => total + candidate.weight, 0);
    let marker = Math.random() * totalWeight;
    const chosen = possibleDishes.find((candidate) => {
      marker -= candidate.weight;
      return marker <= 0;
    }) ?? possibleDishes[possibleDishes.length - 1];
    setDecisionKey(chosen.candidateKey);
    void recordEvent({ type: "decision_made", ...chosen, selectedTags: selectedList });
  }

  async function confirmOrder(candidate: PossibleDish) {
    const saved = await recordEvent({ type: "dish_ordered", ...candidate, selectedTags: selectedList });
    if (saved) {
      setLastOrdered(candidate);
      await refresh();
    }
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
            guardá varias posibilidades
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-[#765c66] sm:text-lg lg:mx-0">
          Primero armamos el antojo. Después agregás platos a una lista y decidís con probabilidades que podés ajustar.
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
                  <IngredientPhoto groupId={activeGroup.id} optionIndex={optionIndex} tag={option.id} label={option.label} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105" />
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

          {step === 0 && <MainFavorites onChoose={chooseFavorite} />}

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
                {step === 3 ? "Buscar platillos" : "Continuar"} <ChevronRight className="h-5 w-5" aria-hidden="true" />
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
                    <IngredientPhoto key={tag} groupId={found.group.id} optionIndex={found.optionIndex} tag={tag} label={found.option.label} className="min-h-36 w-full" />
                  ) : null;
                })}
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-9">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#d94d73]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Tu plato ideal
                </p>
                <h2 className="mt-3 text-balance text-3xl font-black leading-[0.96] tracking-[-0.045em] text-[#3d2630] sm:text-5xl">
                  {favoriteChoice === "sopa-mariscos-favorita" ? "Sopa de mariscos casera" : idealPlateName(selected)}
                </h2>
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

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div>
              <div className="mb-4 flex items-center gap-2 px-1">
                <ListPlus className="h-5 w-5 text-[#ed4c78]" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-black tracking-tight text-[#3d2630] sm:text-2xl">
                    {topMatches.length > 0 ? "Agregá los que sí te tentarían" : "Todavía no hay un match en el catálogo"}
                  </h2>
                  <p className="text-xs font-semibold text-[#92727e]">Nada se decide hasta que esté en “Posibles platillos”.</p>
                </div>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  {topMatches.map((match, index) => {
                    const key = candidateKey(match);
                    return (
                      <MatchCard
                        key={key}
                        match={match}
                        rank={index}
                        maxScore={selectedList.length}
                        initialWeight={initialWeightFor(match)}
                        added={possibleDishes.some((candidate) => candidate.candidateKey === key)}
                        onAdd={() => addPossibleDish(match)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <CandidateSidebar
              candidates={possibleDishes}
              decisionKey={decisionKey}
              lastOrdered={lastOrdered}
              syncState={syncState}
              summary={summary}
              onAdjust={adjustProbability}
              onRemove={removePossibleDish}
              onDecide={decideWeighted}
              onConfirmOrder={confirmOrder}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function MainFavorites({ onChoose }: { onChoose: (id: string, tags: readonly IngredientTag[]) => void }) {
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h3 className="flex items-center gap-2 text-lg font-black text-[#4d303b]">
          <Heart className="h-5 w-5 fill-[#ed4c78] text-[#ed4c78]" aria-hidden="true" /> Favoritos de ella
        </h3>
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a47c89]">Atajo directo</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[1.75rem] border border-[#ed4c78]/15 bg-[#3d2630] text-white shadow-[0_18px_45px_rgba(61,38,48,0.18)]">
          <div className="grid h-full sm:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-64 overflow-hidden sm:order-2">
              <Image src="/ruleta/favorite-grilled-chicken.webp" alt="Pollo a la plancha con puré de papa, brócoli y coliflor" fill sizes="(max-width: 1024px) 100vw, 38vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#3d2630]/65 via-transparent to-transparent sm:bg-gradient-to-r sm:from-[#3d2630]/55 sm:to-transparent" />
            </div>
            <div className="flex flex-col justify-center p-6 sm:order-1 sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff9bb6]">Puré + vegetales salteados</p>
              <h3 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.045em]">Brócoli, coliflor y papa</h3>
              <p className="mt-3 text-sm leading-6 text-white/70">Con pollo o pescado: plancha, ajillo o crispy.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {FAVORITE_VARIANTS.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onChoose(variant.id, variant.tags)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    {variant.emoji} {variant.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChoose("sopa-mariscos-favorita", SEAFOOD_SOUP_TAGS)}
          className="group overflow-hidden rounded-[1.75rem] border-2 border-white/80 bg-white text-left shadow-[0_18px_45px_rgba(61,38,48,0.12)] transition hover:-translate-y-1"
        >
          <span className="block aspect-[16/9] bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-105" style={favoriteFoodStyle(1, 1)} role="img" aria-label="Sopa de mariscos con camarones, pescado y mejillones" />
          <span className="flex items-center justify-between gap-3 p-5">
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#d94d73]">Favorito especial</span>
              <span className="mt-1 block text-2xl font-black leading-none text-[#3d2630]">Sopa de mariscos</span>
              <span className="mt-2 block text-xs font-semibold text-[#92727e]">Tocá para buscar opciones parecidas</span>
            </span>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ed4c78] text-xl text-white shadow-[0_5px_0_#b72d54]">→</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  rank,
  maxScore,
  initialWeight,
  added,
  onAdd,
}: {
  match: DishMatch;
  rank: number;
  maxScore: number;
  initialWeight: number;
  added: boolean;
  onAdd: () => void;
}) {
  const percent = Math.min(100, Math.round((match.score / Math.max(1, maxScore)) * 100));

  return (
    <article className={`${styles.matchCard} flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_14px_40px_rgba(115,55,76,0.1)] backdrop-blur-sm`} style={{ animationDelay: `${rank * 70}ms` }}>
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
      <button
        type="button"
        onClick={onAdd}
        disabled={added}
        className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#ed4c78] px-4 py-3 text-sm font-black text-white shadow-[0_5px_0_#b72d54] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#b72d54] disabled:bg-[#60a5a0] disabled:shadow-[0_5px_0_#397b77]"
      >
        {added ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ListPlus className="h-4 w-4" aria-hidden="true" />}
        {added ? "Ya está en posibles" : `Agregar · afinidad ${initialWeight}`}
      </button>
    </article>
  );
}

function CandidateSidebar({
  candidates,
  decisionKey,
  lastOrdered,
  syncState,
  summary,
  onAdjust,
  onRemove,
  onDecide,
  onConfirmOrder,
}: {
  candidates: PossibleDish[];
  decisionKey: string | null;
  lastOrdered: PossibleDish | null;
  syncState: "loading" | "saved" | "offline";
  summary: ReturnType<typeof useFoodPreferences>["summary"];
  onAdjust: (key: string, delta: number) => void;
  onRemove: (key: string) => void;
  onDecide: () => void;
  onConfirmOrder: (candidate: PossibleDish) => void;
}) {
  const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  const chosen = candidates.find((candidate) => candidate.candidateKey === decisionKey) ?? null;

  return (
    <aside className={`${styles.candidateSidebar} overflow-hidden rounded-[1.75rem] border border-[#3d2630]/10 bg-[#3d2630] text-white shadow-[0_22px_55px_rgba(61,38,48,0.22)] xl:sticky xl:top-6`}>
      <div className="border-b border-white/10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9bb6]">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Tu decisión
            </p>
            <h2 className="mt-1 text-2xl font-black">Posibles platillos</h2>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black">{candidates.length}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/60">Subí lo que más provoca y bajá lo que hoy no convence.</p>
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4">
        {candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-center">
            <ListPlus className="mx-auto h-7 w-7 text-[#ff9bb6]" aria-hidden="true" />
            <p className="mt-2 text-sm font-black">La lista está vacía</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Agregá dos o más platos para comparar probabilidades.</p>
          </div>
        ) : (
          candidates.map((candidate) => {
            const probability = totalWeight ? Math.round((candidate.weight / totalWeight) * 100) : 0;
            const selected = candidate.candidateKey === decisionKey;
            return (
              <div key={candidate.candidateKey} className={`rounded-2xl border p-3 transition ${selected ? "border-[#ff9bb6] bg-[#ff9bb6]/15" : "border-white/10 bg-white/[0.06]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#ffb4c8]">{candidate.restaurant}</p>
                    <p className="mt-0.5 text-sm font-black leading-tight">{candidate.categoryEmoji} {candidate.dish}</p>
                  </div>
                  <button type="button" onClick={() => onRemove(candidate.candidateKey)} aria-label={`Quitar ${candidate.dish}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ff8fab] to-[#ffd166] transition-[width] duration-300" style={{ width: `${probability}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#ffd6e1]">{probability}% probable</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onAdjust(candidate.candidateKey, -10)} aria-label={`Bajar probabilidad de ${candidate.dish}`} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-7 text-center text-[11px] font-black text-white/55">{candidate.weight}</span>
                    <button type="button" onClick={() => onAdjust(candidate.candidateKey, 10)} aria-label={`Subir probabilidad de ${candidate.dish}`} className="grid h-9 w-9 place-items-center rounded-full bg-[#ed4c78] transition hover:bg-[#ff668f]">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        {chosen && (
          <div className={`${styles.decisionReveal} mb-3 rounded-2xl bg-[#fff3d0] p-4 text-[#3d2630]`}>
            <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#c05b73]">Hoy gana</p>
            <p className="mt-1 text-xl font-black leading-tight">{chosen.categoryEmoji} {chosen.dish}</p>
            <p className="mt-1 text-xs font-bold text-[#87616f]">de {chosen.restaurant}</p>
            <button type="button" onClick={() => onConfirmOrder(chosen)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3d2630] px-4 text-sm font-black text-white shadow-[0_4px_0_#211319]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Esto pedimos
            </button>
          </div>
        )}

        {lastOrdered && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#74d4b7]/25 bg-[#74d4b7]/10 px-3 py-2.5 text-xs text-[#baf4df]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span><strong>Guardado:</strong> {lastOrdered.dish} de {lastOrdered.restaurant}.</span>
          </div>
        )}

        <button type="button" onClick={onDecide} disabled={candidates.length === 0} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#ed4c78] px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_#a9284b] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_#a9284b] disabled:cursor-not-allowed disabled:opacity-35">
          <Dice5 className="h-5 w-5" aria-hidden="true" /> Decidir con estas probabilidades
        </button>

        <div className="mt-4 rounded-2xl bg-white/[0.06] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white/55">
              <History className="h-3.5 w-3.5" aria-hidden="true" /> Historial de pedidos
            </p>
            <span className={`flex items-center gap-1 text-[10px] font-bold ${syncState === "offline" ? "text-[#ffb4b4]" : "text-[#a5e9d4]"}`}>
              {syncState === "offline" ? <CloudOff className="h-3 w-3" aria-hidden="true" /> : <Cloud className="h-3 w-3" aria-hidden="true" />}
              {syncState === "loading" ? "Cargando" : syncState === "offline" ? "Sin sincronizar" : "Mongo guardado"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center">
            {[
              ["Hoy", summary?.orderCounts.day ?? 0],
              ["Semana", summary?.orderCounts.week ?? 0],
              ["Mes", summary?.orderCounts.month ?? 0],
            ].map(([label, count]) => (
              <div key={label} className="rounded-lg bg-black/15 px-1 py-2">
                <strong className="block text-base leading-none">{count}</strong>
                <span className="mt-1 block text-[9px] font-bold uppercase text-white/45">{label}</span>
              </div>
            ))}
          </div>
          {summary?.recentOrders.length ? (
            <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
              {summary.recentOrders.slice(0, 3).map((order, index) => (
                <p key={`${order.dayKey}-${order.restaurant}-${order.dish}-${index}`} className="truncate text-[10px] font-semibold text-white/55">
                  {order.dayKey} · <span className="text-white/80">{order.dish}</span> · {order.restaurant}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
