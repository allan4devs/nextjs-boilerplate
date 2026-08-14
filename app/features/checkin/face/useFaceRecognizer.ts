"use client";

/**
 * Estado del reconocimiento facial en recepción.
 *
 * La comparación corre en el navegador contra un paquete de plantillas que se
 * baja una vez: un escaneo cada medio segundo contra el servidor sería lento y
 * caro, y el mostrador necesita respuesta inmediata mientras la persona todavía
 * está parada frente a la cámara.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  FACE_AUTO_COOLDOWN_MS,
  FACE_AUTO_MARGIN,
  FACE_AUTO_SIMILARITY,
  FACE_BUNDLE_TTL_MS,
  FACE_ENROLL_ATTEMPTS_PER_SAMPLE,
  FACE_ENROLL_POSE_PAUSE_MS,
  FACE_ENROLL_RETRY_MS,
  FACE_ENROLL_SAMPLES,
  FACE_MATCH_LIMIT,
  FACE_MIN_ENROLL_QUALITY,
  FACE_MIN_SIMILARITY,
  FACE_SCAN_INTERVAL_MS,
} from "@/lib/xtreme/face/config";
import {
  matchMargin,
  prepareFaceTemplates,
  rankPreparedFaceMatches,
  type FaceMatch,
  type FaceTemplateEntry,
  type PreparedFaceTemplate,
} from "@/lib/xtreme/face/descriptor";
import type { MemberHit } from "@/lib/xtreme/checkin/contracts";
import { captureFaceCrop, loadFaceEngine, scanFaceFrame } from "./humanRecognizer";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

export type FaceCandidate = FaceMatch & { member: MemberHit | null };

export type EnrollProgress = { memberName: string; captured: number; total: number } | null;

const FACE_ENDPOINT = "/api/xtreme/face";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

type FaceActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * POST al endpoint de rostros. Devuelve el error ya traducido en vez de tirar:
 * recepción siempre necesita un texto que mostrar, y distinguir "el servidor
 * dijo que no" de "no hubo red" cambia lo que la persona del mostrador hace.
 */
async function postFaceAction<T>(
  payload: Record<string, unknown>,
  messages: { rejected: string; offline: string },
): Promise<FaceActionResult<T>> {
  try {
    const res = await fetch(FACE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: json.error || messages.rejected };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: messages.offline };
  }
}

type UseFaceRecognizerArgs = {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  /** El tab está visible: fuera de él no se carga el motor ni se escanea. */
  active: boolean;
  roster: MemberHit[];
  onAutoCheckin: (member: MemberHit, similarity: number) => void | Promise<void>;
};

export function useFaceRecognizer({
  videoRef,
  cameraOn,
  active,
  roster,
  onAutoCheckin,
}: UseFaceRecognizerArgs) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("idle");
  const [engineError, setEngineError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [quality, setQuality] = useState(0);
  const [candidates, setCandidates] = useState<FaceCandidate[]>([]);
  const [enrolledSamples, setEnrolledSamples] = useState(0);
  const [enrollProgress, setEnrollProgress] = useState<EnrollProgress>(null);
  const [enrollError, setEnrollError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  /** Padrón ya decodificado: se compara contra esto en cada frame. */
  const templatesRef = useRef<PreparedFaceTemplate[]>([]);
  const bundleAtRef = useRef(0);
  const rosterRef = useRef(roster);
  const enrollingRef = useRef(false);
  const lastAutoRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const onAutoCheckinRef = useRef(onAutoCheckin);

  // Los refs se sincronizan después del commit y no durante el render: el bucle
  // de escaneo es asíncrono y solo debe ver props que React ya dio por buenas.
  useEffect(() => {
    rosterRef.current = roster;
  }, [roster]);
  useEffect(() => {
    onAutoCheckinRef.current = onAutoCheckin;
  }, [onAutoCheckin]);

  const memberFor = useCallback((normalizedName: string) => {
    return rosterRef.current.find((hit) => hit.normalizedName === normalizedName) ?? null;
  }, []);

  const refreshBundle = useCallback(async (force = false) => {
    const fresh = Date.now() - bundleAtRef.current < FACE_BUNDLE_TTL_MS;
    if (!force && fresh && templatesRef.current.length) return;
    try {
      const res = await fetch(`${FACE_ENDPOINT}?bundle=1`, { cache: "no-store" });
      const json = (await res.json()) as {
        templates?: FaceTemplateEntry[];
        enabled?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "No se pudo cargar el padrón de rostros.");
      // Se decodifica una vez acá y no en cada frame del bucle de escaneo.
      templatesRef.current = prepareFaceTemplates(json.templates ?? []);
      bundleAtRef.current = Date.now();
      setEnrolledSamples(templatesRef.current.length);
    } catch (cause) {
      setEngineError(errorMessage(cause, "No se pudo cargar el padrón de rostros."));
    }
  }, []);

  // Carga del motor y del padrón al abrir el tab.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setEngineStatus((current) => (current === "ready" ? current : "loading"));
    setEngineError("");
    void (async () => {
      try {
        await Promise.all([loadFaceEngine(), refreshBundle(true)]);
        if (!cancelled) setEngineStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setEngineStatus("error");
        setEngineError(
          `No se pudo cargar el reconocedor facial${
            cause instanceof Error && cause.message ? `: ${cause.message}` : "."
          }`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, refreshBundle, reloadToken]);

  /** Reintento manual tras un fallo de descarga de modelos o del padrón. */
  const retry = useCallback(() => {
    setEngineError("");
    setReloadToken((token) => token + 1);
  }, []);

  /** Sin rostro utilizable no hay candidatos; se conserva el arreglo vacío
   * anterior para no re-renderizar el panel dos veces por segundo. */
  const clearMatches = useCallback(() => {
    setQuality(0);
    setCandidates((current) => (current.length ? [] : current));
  }, []);

  /** Un frame: detecta, compara y decide si el match alcanza para ingresar solo. */
  const readOnce = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const scan = await scanFaceFrame(video);
    if (scan.kind !== "face") {
      setFeedback(scan.kind === "rejected" ? scan.rejection.issue : "Buscando un rostro…");
      clearMatches();
      return;
    }

    const { reading } = scan;
    setQuality(reading.quality);

    const ranked = rankPreparedFaceMatches(templatesRef.current, reading.descriptor, {
      minSimilarity: FACE_MIN_SIMILARITY,
      limit: FACE_MATCH_LIMIT,
    });

    if (!ranked.length) {
      setCandidates((current) => (current.length ? [] : current));
      setFeedback(
        templatesRef.current.length
          ? "Rostro sin coincidencias · usá el nombre o enrolá a la persona"
          : "Todavía no hay rostros enrolados",
      );
      return;
    }

    const withMembers: FaceCandidate[] = ranked.map((match) => ({
      ...match,
      member: memberFor(match.normalizedName),
    }));
    setCandidates(withMembers);

    const best = withMembers[0];
    setFeedback(
      `${best.member?.memberName || best.memberName} · ${Math.round(best.similarity * 100)}%`,
    );

    // Auto-ingreso solo si además de parecerse mucho, le saca distancia clara al
    // segundo: dos personas parecidas alternándose es peor que pedir confirmación.
    const confident =
      best.similarity >= FACE_AUTO_SIMILARITY && matchMargin(ranked) >= FACE_AUTO_MARGIN;
    if (!confident || !best.member) return;

    const now = Date.now();
    const repeat =
      lastAutoRef.current.key === best.normalizedName &&
      now - lastAutoRef.current.at < FACE_AUTO_COOLDOWN_MS;
    if (repeat) return;

    lastAutoRef.current = { key: best.normalizedName, at: now };
    await onAutoCheckinRef.current(best.member, best.similarity);
  }, [clearMatches, memberFor, videoRef]);

  // Bucle de escaneo continuo mientras el tab y la cámara estén vivos.
  useEffect(() => {
    if (!active || !cameraOn || engineStatus !== "ready") {
      setScanning(false);
      return;
    }
    let cancelled = false;
    let timer = 0;
    setScanning(true);

    const tick = async () => {
      if (cancelled) return;
      if (!enrollingRef.current) {
        try {
          await readOnce();
        } catch {
          /* un frame fallido no corta el bucle */
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, FACE_SCAN_INTERVAL_MS);
    };
    timer = window.setTimeout(tick, FACE_SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setScanning(false);
    };
  }, [active, cameraOn, engineStatus, readOnce]);

  /**
   * Captura varias muestras del mismo socio (ángulos y expresiones distintas)
   * porque una sola foto de frente falla apenas la persona llega con gorra,
   * lentes o de lado.
   */
  const enroll = useCallback(
    async (member: MemberHit) => {
      const video = videoRef.current;
      if (!video) {
        setEnrollError("Activá la cámara primero.");
        return false;
      }
      enrollingRef.current = true;
      setEnrollError("");
      setEnrollProgress({ memberName: member.memberName, captured: 0, total: FACE_ENROLL_SAMPLES });

      try {
        let captured = 0;
        let attempts = 0;
        let photoSent = false;
        const maxAttempts = FACE_ENROLL_SAMPLES * FACE_ENROLL_ATTEMPTS_PER_SAMPLE;

        while (captured < FACE_ENROLL_SAMPLES && attempts < maxAttempts) {
          attempts += 1;
          const scan = await scanFaceFrame(video);

          if (scan.kind !== "face" || scan.reading.quality < FACE_MIN_ENROLL_QUALITY) {
            setFeedback(
              scan.kind === "rejected" ? scan.rejection.issue : "Acomodá el rostro en el cuadro",
            );
            await delay(FACE_ENROLL_RETRY_MS);
            continue;
          }

          // La foto de la ficha se manda una sola vez, con la primera muestra buena.
          const photoUrl = photoSent ? "" : captureFaceCrop(video, scan.reading.box);
          const saved = await postFaceAction(
            {
              action: "enroll",
              memberKey: member.normalizedName,
              memberName: member.memberName,
              descriptor: scan.reading.descriptor,
              quality: scan.reading.quality,
              ...(photoUrl ? { photoUrl } : {}),
            },
            {
              rejected: "No se pudo guardar el rostro.",
              offline: "Error de conexión al enrolar el rostro.",
            },
          );
          if (!saved.ok) {
            setEnrollError(saved.error);
            return false;
          }

          if (photoUrl) photoSent = true;
          captured += 1;
          setEnrollProgress({
            memberName: member.memberName,
            captured,
            total: FACE_ENROLL_SAMPLES,
          });
          setFeedback(
            captured < FACE_ENROLL_SAMPLES
              ? `Muestra ${captured} de ${FACE_ENROLL_SAMPLES} · girá levemente la cara`
              : "Rostro enrolado",
          );
          // Pausa entre muestras: sirve para que la pose cambie de verdad y no
          // se guarden tres capturas casi idénticas del mismo frame.
          await delay(FACE_ENROLL_POSE_PAUSE_MS);
        }

        if (captured < FACE_ENROLL_SAMPLES) {
          setEnrollError(
            `Solo se pudieron guardar ${captured} de ${FACE_ENROLL_SAMPLES} muestras. Mejorá la luz y repetí.`,
          );
          return false;
        }

        await refreshBundle(true);
        return true;
      } catch (cause) {
        setEnrollError(errorMessage(cause, "No se pudo completar el enrolamiento del rostro."));
        return false;
      } finally {
        enrollingRef.current = false;
        setEnrollProgress(null);
      }
    },
    [refreshBundle, videoRef],
  );

  const forget = useCallback(
    async (member: MemberHit) => {
      setEnrollError("");
      const removed = await postFaceAction(
        { action: "forget", memberKey: member.normalizedName },
        {
          rejected: "No se pudo borrar el rostro.",
          offline: "Error de conexión al borrar el rostro.",
        },
      );
      if (!removed.ok) {
        setEnrollError(removed.error);
        return false;
      }
      await refreshBundle(true);
      return true;
    },
    [refreshBundle],
  );

  return {
    engineStatus,
    engineError,
    feedback,
    quality,
    candidates,
    scanning,
    enrolledSamples,
    enrollProgress,
    enrollError,
    enroll,
    forget,
    refreshBundle,
    retry,
  };
}
