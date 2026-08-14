"use client";

import type { FilterOption } from "../constants";

/** Tono del chip activo; cada familia de filtros usa el suyo para distinguirse. */
export type FilterTone = "lime" | "cyan" | "orange" | "violet";

const ACTIVE_TONE_CLASSES: Record<FilterTone, string> = {
  lime: "border-lime-300 bg-lime-300 text-black",
  cyan: "border-cyan-300 bg-cyan-300 text-black",
  orange: "border-orange-300 bg-orange-300 text-black",
  violet: "border-violet-300 bg-violet-300 text-black",
};

export type FilterChipRowProps<T extends string> = {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Conteo por opción; la opción "all" nunca lo muestra. */
  counts?: Partial<Record<T, number>>;
  activeTone?: FilterTone;
};

/**
 * Fila de chips de filtro, genérica sobre el id de la opción para que cada
 * familia (membresía, registro, ficha, invitación) conserve su propio tipo y
 * el `onChange` no acepte ids de otra familia.
 *
 * Sin `memo` a propósito: los consumidores le pasan `counts` como objeto
 * literal, así que una comparación superficial fallaría siempre y solo
 * agregaría trabajo.
 */
export function FilterChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  counts,
  activeTone = "lime",
}: FilterChipRowProps<T>) {
  const activeClass = ACTIVE_TONE_CLASSES[activeTone];

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-white/40 sm:w-24">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const count = counts?.[option.id];
          const countSuffix = option.id !== ("all" as T) && count != null ? ` (${count})` : "";
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`border px-2.5 py-1.5 text-[10px] font-black uppercase ${
                value === option.id ? activeClass : "border-white/15 text-white/60"
              }`}
            >
              {option.label}
              {countSuffix}
            </button>
          );
        })}
      </div>
    </div>
  );
}
