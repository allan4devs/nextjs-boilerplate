"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { MemberSortKey, SortDirection } from "../types";

export type SortableMemberHeaderProps = {
  label: string;
  sortKey: MemberSortKey;
  activeKey: MemberSortKey;
  direction: SortDirection;
  onSort: (key: MemberSortKey) => void;
  className?: string;
};

/**
 * Encabezado ordenable del padrón. Memoizado: son siete por tabla y el
 * `onSort` que reciben es estable (`useCallback`), así que solo se repintan
 * los dos que cambian de estado al reordenar.
 */
export const SortableMemberHeader = memo(function SortableMemberHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "px-3 py-3",
}: SortableMemberHeaderProps) {
  const active = sortKey === activeKey;
  const SortIcon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      className={className}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-white ${
          active ? "text-lime-200" : "text-white/40"
        }`}
      >
        {label}
        <SortIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
});
