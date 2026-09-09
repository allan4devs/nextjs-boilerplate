/** Values transcribed from a member's report. No calculated diagnoses or inferred values. */
export const INBODY_FIELDS = [
  ["heightCm", "Estatura", "cm", 300],
  ["skeletalMuscleKg", "Masa muscular esquelética", "kg", 200],
  ["bodyFatKg", "Masa grasa corporal", "kg", 300],
  ["bodyFatPct", "Porcentaje de grasa", "%", 100],
  ["bmi", "IMC", "kg/m²", 150],
  ["totalBodyWaterL", "Agua corporal total", "L", 300],
  ["proteinKg", "Proteínas", "kg", 100],
  ["mineralsKg", "Minerales", "kg", 100],
  ["fatFreeMassKg", "Masa libre de grasa", "kg", 300],
  ["basalMetabolicRate", "Metabolismo basal", "kcal", 10000],
  ["visceralFatLevel", "Nivel de grasa visceral", "nivel", 100],
  ["visceralFatArea", "Área de grasa visceral", "cm²", 1000],
  ["waistHipRatio", "Relación cintura / cadera", "", 5],
  ["ecwRatio", "Relación agua extracelular / total", "", 1],
  ["intracellularWaterL", "Agua intracelular", "L", 200],
  ["extracellularWaterL", "Agua extracelular", "L", 200],
  ["inbodyScore", "Puntuación InBody", "puntos", 200],
  ["targetWeightKg", "Peso objetivo del reporte", "kg", 400],
  ["weightControlKg", "Control de peso", "kg", 300],
  ["fatControlKg", "Control de grasa", "kg", 300],
  ["muscleControlKg", "Control muscular", "kg", 200],
  ["phaseAngle", "Ángulo de fase", "°", 90],
] as const;

export const BODY_SEGMENTS = [
  ["rightArm", "Brazo derecho"], ["leftArm", "Brazo izquierdo"],
  ["trunk", "Tronco"], ["rightLeg", "Pierna derecha"], ["leftLeg", "Pierna izquierda"],
] as const;
export type InBodyKey = typeof INBODY_FIELDS[number][0];
export type BodySegment = typeof BODY_SEGMENTS[number][0];
export type InBodyReport = {
  values: Partial<Record<InBodyKey, number>>;
  segments: Partial<Record<BodySegment, { leanKg?: number; leanPct?: number; fatKg?: number; fatPct?: number }>>;
  additional: Array<{ label: string; value: string; unit: string }>;
  device: string;
};

export class BodyMetricValidationError extends Error {}

function numeric(value: unknown, label: string, min: number, max: number) {
  if (value === "" || value === null || value === undefined) return undefined;
  if ((typeof value !== "number" && typeof value !== "string") || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new BodyMetricValidationError(`Revisá ${label}: el valor no es válido.`);
  }
  return Number(value);
}

export function parseBodyMetric(body: Record<string, unknown>) {
  const weightKg = numeric(body.weightKg, "peso", 1, 400);
  const waistCm = numeric(body.waistCm, "cintura", 1, 300) ?? 0;
  if (weightKg === undefined) throw new BodyMetricValidationError("Ingresá tu peso en kg.");
  let inbody: InBodyReport | undefined;
  if (body.inbody !== undefined) {
    if (!body.inbody || typeof body.inbody !== "object" || Array.isArray(body.inbody)) throw new BodyMetricValidationError("Reporte InBody inválido.");
    const raw = body.inbody as Record<string, unknown>;
    for (const key of ["values", "segments"]) {
      if (raw[key] !== undefined && (!raw[key] || typeof raw[key] !== "object" || Array.isArray(raw[key]))) throw new BodyMetricValidationError("Datos del reporte inválidos.");
    }
    const inputValues = (raw.values ?? {}) as Record<string, unknown>;
    const values: InBodyReport["values"] = {};
    for (const [key, label, , max] of INBODY_FIELDS) {
      const value = numeric(inputValues[key], label, key.endsWith("ControlKg") ? -max : 0, max);
      if (value !== undefined) values[key] = value;
    }
    const segments: InBodyReport["segments"] = {};
    const inputSegments = (raw.segments ?? {}) as Record<string, Record<string, unknown>>;
    for (const [key, label] of BODY_SEGMENTS) {
      if (!inputSegments[key]) continue;
      if (typeof inputSegments[key] !== "object" || Array.isArray(inputSegments[key])) throw new BodyMetricValidationError("Análisis segmental inválido.");
      const segment: NonNullable<InBodyReport["segments"][BodySegment]> = {};
      for (const field of ["leanKg", "leanPct", "fatKg", "fatPct"] as const) {
        const value = numeric(inputSegments[key][field], label, 0, field.endsWith("Pct") ? 1000 : 300);
        if (value !== undefined) segment[field] = value;
      }
      if (Object.keys(segment).length) segments[key] = segment;
    }
    if (raw.additional !== undefined && (!Array.isArray(raw.additional) || raw.additional.length > 30)) throw new BodyMetricValidationError("Máximo 30 datos adicionales.");
    const additional = ((raw.additional ?? []) as Array<Record<string, unknown>>).map((entry) => {
      if (!entry || typeof entry !== "object") throw new BodyMetricValidationError("Dato adicional inválido.");
      const label = String(entry.label ?? "").trim().slice(0, 80);
      const value = String(entry.value ?? "").trim().slice(0, 100);
      if (!label || !value) throw new BodyMetricValidationError("Completá el nombre y valor de cada dato adicional.");
      return { label, value, unit: String(entry.unit ?? "").trim().slice(0, 20) };
    });
    if (!Object.keys(values).length && !Object.keys(segments).length && !additional.length) throw new BodyMetricValidationError("Agregá los datos de tu reporte o guardá solo el peso.");
    inbody = { values, segments, additional, device: String(raw.device ?? "").trim().slice(0, 80) };
  }
  return { weightKg, waistCm, note: String(body.note ?? "").trim().slice(0, 500), ...(inbody ? { inbody } : {}) };
}
