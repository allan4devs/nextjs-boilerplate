"use client";

import { Dumbbell } from "lucide-react";
import { GameButton, GameModal } from "../../GameOS";
import { findMachineGuide } from "../constants";
import { MachineGuideBody } from "../ui/MachineGuideBody";

export type MachineGuideModalProps = {
  /** Máquina a explicar. `null` cierra el modal. */
  machineId: string | null;
  onClose: () => void;
};

/**
 * Ficha de una máquina: para qué sirve, cómo se usa y el video.
 *
 * Resuelve la guía a partir del id en vez de recibirla armada, así quien lo
 * abre solo necesita saber qué máquina tocó el socio.
 */
export function MachineGuideModal({ machineId, onClose }: MachineGuideModalProps) {
  const machine = machineId ? findMachineGuide(machineId) : null;

  return (
    <GameModal
      open={machineId !== null}
      onClose={onClose}
      title={machine?.name ?? "Máquina"}
      subtitle={machine ? `${machine.zone} · ${machine.level}` : undefined}
      icon={Dumbbell}
      tone="lime"
      size="lg"
      footer={
        <GameButton full onClick={onClose}>
          Entendido
        </GameButton>
      }
    >
      {machine && <MachineGuideBody key={machine.id} machine={machine} />}
    </GameModal>
  );
}
