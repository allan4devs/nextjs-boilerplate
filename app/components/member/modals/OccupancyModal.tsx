"use client";

import { Users } from "lucide-react";
import { GameModal } from "../../GameOS";
import type { GymStatus } from "../types";

export type OccupancyModalProps = {
  open: boolean;
  onClose: () => void;
  gymStatus: GymStatus | null;
};

/** Cuánta gente hay ahora en el gym, para decidir si venir ya o esperar un rato. */
export function OccupancyModal({ open, onClose, gymStatus }: OccupancyModalProps) {
  return (
    <GameModal
      open={open}
      onClose={onClose}
      title={gymStatus?.level ?? "Cargando"}
      subtitle="Ocupación del gym"
      icon={Users}
      tone="cyan"
      size="sm"
    >
      <div className="space-y-4">
        <div className="h-4 border-[3px] border-white/15 bg-black/45">
          <div
            className="h-full bg-cyan-300 transition-all"
            style={{ width: `${gymStatus?.occupancyPct ?? 0}%` }}
          />
        </div>
        <p className="text-sm font-bold text-white/60">
          {gymStatus
            ? `${gymStatus.currentPeople}/${gymStatus.capacity} personas · reservas hoy: ${gymStatus.reservationsToday}`
            : "Leyendo el gym en vivo."}
        </p>
      </div>
    </GameModal>
  );
}
