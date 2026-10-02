/** Shared form contract. No server dependencies: also used by Trainer OS. */
export const PARQ_QUESTIONS = [
  { id: "heartCondition", label: "¿Un médico te ha indicado que tenés una enfermedad cardíaca y que solo debés hacer la actividad física que él recomiende?" },
  { id: "chestPainActivity", label: "¿Tenés dolor en el pecho cuando hacés actividad física?" },
  { id: "chestPainRest", label: "¿En el último mes has tenido dolor en el pecho sin hacer actividad física?" },
  { id: "balanceOrFainting", label: "¿Perdés el equilibrio por mareos o te has desmayado alguna vez?" },
  { id: "boneOrJoint", label: "¿Tenés problemas en huesos o articulaciones que podrían empeorar al aumentar la actividad física?" },
  { id: "bloodPressureMedication", label: "¿Un médico te receta medicamentos para la presión arterial o un problema cardíaco?" },
  { id: "otherReason", label: "¿Conocés otra razón por la que no deberías realizar actividad física?" },
] as const;

export type ParqQuestionId = typeof PARQ_QUESTIONS[number]["id"];
export type ParqAnswer = "yes" | "no" | null;
export type TrainerHealthData = {
  personal: {
    cedula: string; birthDate: string; age: string; sex: string; bloodType: string;
    phone: string; email: string; address: string; occupation: string;
    emergencyName: string; emergencyPhone: string; emergencyRelation: string;
  };
  conditions: string;
  medications: string;
  allergies: string;
  injuries: string;
  surgeries: string;
  restrictions: string;
  trainerNotes: string;
  parq: { date: string; answers: Record<ParqQuestionId, ParqAnswer>; notes: string };
};

export type TrainerHealthRevision = {
  version: number;
  savedAt: string;
  savedBy: string;
  staffId: string | null;
  data: TrainerHealthData;
};

export type TrainerHealthRecord = {
  memberId: string;
  memberName: string;
  version: number;
  data: TrainerHealthData;
  history: TrainerHealthRevision[];
  receptionMedicalNotes: string;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function date(value: unknown) {
  const raw = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw ? raw : "";
}

export function sanitizeTrainerHealth(value: unknown): TrainerHealthData {
  const source = object(value);
  const personal = object(source.personal);
  const parq = object(source.parq);
  const answers = object(parq.answers);
  const age = text(personal.age, 3);
  return {
    personal: {
      cedula: text(personal.cedula, 30), birthDate: date(personal.birthDate),
      age: /^\d{1,3}$/.test(age) && Number(age) <= 120 ? age : "",
      sex: text(personal.sex, 60), bloodType: text(personal.bloodType, 20),
      phone: text(personal.phone, 40), email: text(personal.email, 160),
      address: text(personal.address, 500), occupation: text(personal.occupation, 160),
      emergencyName: text(personal.emergencyName, 160), emergencyPhone: text(personal.emergencyPhone, 40),
      emergencyRelation: text(personal.emergencyRelation, 80),
    },
    conditions: text(source.conditions), medications: text(source.medications),
    allergies: text(source.allergies), injuries: text(source.injuries), surgeries: text(source.surgeries),
    restrictions: text(source.restrictions), trainerNotes: text(source.trainerNotes),
    parq: {
      date: date(parq.date), notes: text(parq.notes),
      answers: Object.fromEntries(PARQ_QUESTIONS.map(({ id }) => [id, answers[id] === "yes" || answers[id] === "no" ? answers[id] : null])) as Record<ParqQuestionId, ParqAnswer>,
    },
  };
}

export function parqSummary(data: TrainerHealthData) {
  const values = PARQ_QUESTIONS.map(({ id }) => data.parq.answers[id]);
  return { affirmative: values.filter((answer) => answer === "yes").length, unanswered: values.filter((answer) => answer === null).length };
}

/** Validate before sanitizing so invalid input never silently erases a field. */
export function validateTrainerHealth(value: unknown): string | null {
  const source = object(value);
  if (!Object.keys(source).length) return "La ficha está vacía o tiene un formato inválido.";
  const personal = object(source.personal);
  const parq = object(source.parq);
  const answers = object(parq.answers);
  const personalLimits: Record<keyof TrainerHealthData["personal"], number> = {
    cedula: 30, birthDate: 10, age: 3, sex: 60, bloodType: 20, phone: 40, email: 160,
    address: 500, occupation: 160, emergencyName: 160, emergencyPhone: 40, emergencyRelation: 80,
  };
  for (const [key, max] of Object.entries(personalLimits)) {
    const raw = personal[key];
    if (typeof raw !== "string" || raw.length > max) return "Revisá los datos personales y su longitud.";
  }
  for (const key of ["birthDate", "date"] as const) {
    const raw = key === "birthDate" ? personal.birthDate : parq.date;
    if (raw && (!date(raw) || date(raw) !== raw)) return "Usá una fecha válida en formato año-mes-día.";
  }
  if (personal.age && (!/^\d{1,3}$/.test(String(personal.age)) || Number(personal.age) > 120)) return "La edad debe estar entre 0 y 120 años.";
  for (const { id } of PARQ_QUESTIONS) {
    if (answers[id] !== null && answers[id] !== "yes" && answers[id] !== "no") return "Cada respuesta debe ser Sí, No o Sin responder.";
  }
  for (const raw of [source.conditions, source.medications, source.allergies, source.injuries, source.surgeries, source.restrictions, source.trainerNotes, parq.notes]) {
    if (typeof raw !== "string" || raw.length > 2000) return "Las notas deben ser texto de hasta 2000 caracteres.";
  }
  return null;
}
