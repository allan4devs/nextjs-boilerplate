"use client";

import { useRef, useState } from "react";
import type { FaceGuideStatus } from "@/app/components/ingreso/types";
import type { MemberHit } from "@/lib/xtreme/checkin/contracts";

/**
 * Estado del guiado facial del kiosco: qué se le está diciendo a la persona,
 * cuánto lleva sosteniendo la pose y a quién se parece.
 *
 * Los tres refs son deliberados y no estado: cambian dentro del loop de
 * detección (~8 veces por segundo) y re-renderizar en cada frame por ellos
 * dejaría la pantalla peleando con la cámara. Solo lo que la persona ve —la
 * etapa y la barra de progreso— es estado.
 */
export function useKioskFaceScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [faceMatches, setFaceMatches] = useState<MemberHit[]>([]);
  const [faceGuide, setFaceGuide] = useState<FaceGuideStatus>("waiting");
  const [holdProgress, setHoldProgress] = useState(0);

  /** Un escaneo en vuelo: evita disparar otro sobre el mismo frame. */
  const scanLockRef = useRef(false);
  /** Hasta cuándo no se vuelve a escanear, tras un intento. */
  const cooldownUntilRef = useRef(0);
  /** Desde cuándo hay una cara sostenida en el óvalo; null si se fue. */
  const faceSeenSinceRef = useRef<number | null>(null);

  return {
    isScanning,
    setIsScanning,
    faceMatches,
    setFaceMatches,
    faceGuide,
    setFaceGuide,
    holdProgress,
    setHoldProgress,
    scanLockRef,
    cooldownUntilRef,
    faceSeenSinceRef,
  };
}

export type KioskFaceScan = ReturnType<typeof useKioskFaceScan>;
