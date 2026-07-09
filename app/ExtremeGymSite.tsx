"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  CalendarCheck,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Delete,
  Dumbbell,
  Flame,
  Goal,
  Loader2,
  Lock,
  Medal,
  QrCode,
  Ruler,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Video,
  Zap,
} from "lucide-react";

const STORAGE_KEY = "xtreme-gym-member-name";
const SESSION_KEY = "xtreme-gym-session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TRAININGS = [
  {
    id: "fuerza-total",
    name: "Fuerza Total",
    coach: "Coach Xtreme",
    time: "5:30 AM",
    minutes: 55,
    intensity: "Pesado",
    slots: 8,
    focus: "Pierna, pecho y espalda",
    color: "from-red-500 to-orange-400",
    icon: Dumbbell,
  },
  {
    id: "hiit-quemador",
    name: "HIIT Quemador",
    coach: "Funcional",
    time: "6:00 PM",
    minutes: 35,
    intensity: "Alta",
    slots: 12,
    focus: "Cardio, core y velocidad",
    color: "from-lime-400 to-emerald-400",
    icon: Zap,
  },
  {
    id: "glute-lab",
    name: "Glute Lab",
    coach: "Zona lower",
    time: "7:00 PM",
    minutes: 45,
    intensity: "Media",
    slots: 10,
    focus: "Gluteo, femoral y estabilidad",
    color: "from-fuchsia-500 to-rose-400",
    icon: Activity,
  },
  {
    id: "xtreme-core",
    name: "Xtreme Core",
    coach: "Circuito",
    time: "Sabado 8:00 AM",
    minutes: 40,
    intensity: "Control",
    slots: 15,
    focus: "Abdomen, movilidad y postura",
    color: "from-sky-400 to-cyan-300",
    icon: Goal,
  },
];

const GOALS = ["Ganar fuerza", "Bajar grasa", "Ser constante", "Volver al ritmo"];

const ROUTINES = [
  {
    name: "Base Fuerza Xtreme",
    level: "Intermedio",
    exercises: ["Sentadilla 4x8", "Press banca 4x8", "Remo 3x10"],
    video: "Video coach",
  },
  {
    name: "Quemador 30",
    level: "Alta intensidad",
    exercises: ["Air bike 8x30s", "Burpees 4x12", "Plancha 3x45s"],
    video: "Video HIIT",
  },
  {
    name: "Lower Lab",
    level: "Control",
    exercises: ["Hip thrust 4x10", "Peso muerto rumano 3x10", "Abduccion 3x15"],
    video: "Video tecnica",
  },
];

const MACHINE_GUIDE = [
  {
    id: "leg-press",
    name: "Prensa de pierna",
    zone: "Pierna",
    level: "Base",
    muscles: ["Cuadriceps", "Gluteo", "Femoral"],
    setup: "Espalda completa apoyada, pies al ancho de hombros y rodillas alineadas con los pies.",
    tips: ["Baje controlado sin despegar la cadera", "Empuje con todo el pie", "No bloquee las rodillas arriba"],
    mistakes: ["Rodillas hacia adentro", "Rango corto sin control", "Levantar la cadera del asiento"],
    starter: "3 series de 10 a 12 reps con peso que pueda controlar.",
    accent: "from-yellow-300 to-orange-400",
  },
  {
    id: "chest-press",
    name: "Press de pecho",
    zone: "Pecho",
    level: "Base",
    muscles: ["Pecho", "Triceps", "Hombro frontal"],
    setup: "Ajuste el asiento para que las agarraderas queden a media altura del pecho.",
    tips: ["Mantenga escapulas atras", "Empuje sin despegar la espalda", "Regrese lento hasta sentir estiramiento"],
    mistakes: ["Subir los hombros", "Rebotar el peso", "Abrir demasiado los codos"],
    starter: "3 series de 8 a 12 reps, descansando 60 a 90 segundos.",
    accent: "from-red-400 to-rose-500",
  },
  {
    id: "lat-pulldown",
    name: "Jalon al pecho",
    zone: "Espalda",
    level: "Base",
    muscles: ["Dorsal", "Biceps", "Espalda media"],
    setup: "Asegure las piernas, pecho alto y agarre un poco mas ancho que hombros.",
    tips: ["Jale hacia la parte alta del pecho", "Piense en bajar los codos", "Controle el regreso sin soltar tension"],
    mistakes: ["Jalar detras de la nuca", "Usar impulso del torso", "Encoger los hombros"],
    starter: "3 series de 10 reps con pausa corta abajo.",
    accent: "from-sky-300 to-cyan-500",
  },
  {
    id: "seated-row",
    name: "Remo sentado",
    zone: "Espalda",
    level: "Intermedio",
    muscles: ["Espalda media", "Dorsal", "Biceps"],
    setup: "Pecho firme, columna neutral y agarre con brazos estirados sin redondear la espalda.",
    tips: ["Lleve los codos atras", "Apriete espalda un segundo", "Vuelva lento al inicio"],
    mistakes: ["Balancear el cuerpo", "Redondear la espalda", "Jalar solo con brazos"],
    starter: "3 series de 10 a 12 reps con tempo controlado.",
    accent: "from-cyan-300 to-blue-500",
  },
  {
    id: "leg-curl",
    name: "Curl femoral",
    zone: "Pierna",
    level: "Base",
    muscles: ["Femoral", "Pantorrilla", "Gluteo estabilizador"],
    setup: "Alinee la rodilla con el eje de la maquina y el rodillo sobre la parte baja de la pierna.",
    tips: ["Contraiga atras sin arquear la espalda", "No deje caer el peso", "Use rango completo"],
    mistakes: ["Levantar la cadera", "Mover muy rapido", "Peso excesivo"],
    starter: "3 series de 12 reps, perfecto para cerrar pierna.",
    accent: "from-lime-300 to-emerald-500",
  },
  {
    id: "cable-station",
    name: "Polea ajustable",
    zone: "Full body",
    level: "Versatil",
    muscles: ["Core", "Hombros", "Brazos", "Gluteo"],
    setup: "Ajuste la polea segun el ejercicio y mantenga una postura estable antes de iniciar.",
    tips: ["Empiece liviano para sentir trayectoria", "Mantenga abdomen firme", "Evite tirones bruscos"],
    mistakes: ["Perder postura", "Cambiar angulo a mitad de repeticion", "Usar impulso"],
    starter: "2 a 4 series de 12 reps segun el ejercicio elegido.",
    accent: "from-fuchsia-400 to-purple-500",
  },
];

const GUIDE_WORKOUTS = [
  {
    goal: "Primer dia",
    steps: ["Prensa 3x10", "Press pecho 3x10", "Jalon 3x10", "Curl femoral 2x12"],
  },
  {
    goal: "Fuerza base",
    steps: ["Prensa 4x8", "Remo sentado 4x8", "Press pecho 4x8", "Polea core 3x12"],
  },
  {
    goal: "Control tecnico",
    steps: ["Jalon 3x12 lento", "Curl femoral 3x12", "Remo sentado 3x10", "Polea 3x15"],
  },
];

const REMINDERS = [
  "Tu clase reservada es en 1 hora.",
  "No rompas la racha: hoy toca aunque sea suave.",
  "Tu membresia vence pronto, pasate por recepcion.",
];

const TABS = [
  { id: "resumen", label: "Resumen", icon: Activity },
  { id: "entrenar", label: "Entrenar", icon: Dumbbell },
  { id: "maquinas", label: "Maquinas", icon: ShieldCheck },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "perfil", label: "Perfil", icon: UserRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Workout = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: string;
};

type Member = {
  memberName: string;
  normalizedName: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  workouts: Workout[];
  streak: number;
  totalWorkouts: number;
  totalMinutes: number;
  lastWorkoutDate: string | null;
  membership: {
    plan: string;
    status: "active" | "warning" | "expired";
    nextBillingDate: string;
    startedAt: string;
    daysRemaining: number;
  };
  bodyMetrics: BodyMetric[];
  latestBodyMetric: BodyMetric | null;
  trainingPlan: MemberPlan | null;
};

type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  waistCm: number;
  note: string;
};

type PlanItem = {
  id: string;
  day: string;
  focus: string;
  exercises: string;
  targetMinutes: number;
  done: boolean;
  doneDate: string | null;
};

type MemberPlan = {
  title: string;
  objective: string;
  coachNote: string;
  startDate: string;
  endDate: string;
  weeklySessions: number;
  items: PlanItem[];
  doneItems: number;
  totalItems: number;
  progressPct: number;
};

type MembersResponse = {
  member: Member | null;
  leaderboard: Member[];
  exists?: boolean;
  error?: string;
  duplicate?: {
    memberName: string;
    phone: string;
    email: string;
  };
};

type ReservationState = Record<
  string,
  {
    reserved: number;
    capacity: number;
    remaining: number;
    isMine: boolean;
  }
>;

type ReservationsResponse = {
  date: string;
  reservations: ReservationState;
  error?: string;
};

type GymStatus = {
  capacity: number;
  currentPeople: number;
  occupancyPct: number;
  level: string;
  checkinsToday: number;
  reservationsToday: number;
  updatedAt: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - day + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function dayLabel(date: string) {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const index = getWeekDates().indexOf(date);
  return labels[index] ?? "";
}

function initialMember(name = ""): Member {
  return {
    memberName: name,
    normalizedName: name.toUpperCase(),
    goal: "",
    favoriteTraining: "",
    phone: "",
    email: "",
    workouts: [],
    streak: 0,
    totalWorkouts: 0,
    totalMinutes: 0,
    lastWorkoutDate: null,
    membership: {
      plan: "Xtreme Mensual",
      status: "active",
      startedAt: todayIso(),
      nextBillingDate: todayIso(),
      daysRemaining: 30,
    },
    bodyMetrics: [],
    latestBodyMetric: null,
    trainingPlan: null,
  };
}

const ACHIEVEMENTS: {
  id: string;
  name: string;
  desc: string;
  icon: typeof Flame;
  test: (m: Member) => boolean;
}[] = [
  { id: "first", name: "Primer paso", desc: "Tu primer entreno marcado", icon: Star, test: (m) => m.totalWorkouts >= 1 },
  { id: "streak7", name: "En racha", desc: "7 dias seguidos, sin aflojar", icon: Flame, test: (m) => m.streak >= 7 },
  { id: "streak30", name: "Imparable", desc: "30 dias de racha pura vida", icon: Rocket, test: (m) => m.streak >= 30 },
  { id: "variety", name: "Todoterreno", desc: "Prueba las 4 clases", icon: Target, test: (m) => new Set(m.workouts.map((w) => w.trainingId)).size >= 4 },
  { id: "vet", name: "Veterano", desc: "50 entrenos", icon: Medal, test: (m) => m.totalWorkouts >= 50 },
  { id: "marathon", name: "Maratonico", desc: "1.000 minutos acumulados", icon: Timer, test: (m) => m.totalMinutes >= 1000 },
];

function memberCode(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 100000000)
    .toString()
    .padStart(8, "0")
    .replace(/(\d{4})(\d{4})/, "$1 $2");
}

function Barcode({ value }: { value: string }) {
  const seed = value.replace(/\D/g, "").padEnd(12, "7");
  const bars = Array.from({ length: 44 }, (_, i) => 1 + ((Number(seed[i % seed.length]) + i) % 4));
  return (
    <div className="flex h-14 items-stretch gap-[2px] bg-white px-3 py-2">
      {bars.map((width, i) => (
        <span key={i} style={{ width }} className={i % 2 === 0 ? "bg-black" : "bg-white"} />
      ))}
    </div>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "No se pudo conectar con Mongo.");
  return data;
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-sm">
      <div className={`mb-4 grid h-10 w-10 place-items-center bg-gradient-to-br ${accent} text-black shadow-lg`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</div>
    </div>
  );
}

function PinModal({
  memberName,
  mode: initialMode,
  onSuccess,
  onChangeMember,
  onDone,
}: {
  memberName: string;
  mode: "set" | "verify" | "change";
  onSuccess: () => void;
  onChangeMember: () => void;
  onDone?: (message: string) => void;
}) {
  const [mode, setMode] = useState<"set" | "verify" | "change" | "recover">(initialMode);
  const [step, setStep] = useState<"enter" | "new" | "confirm">("enter");
  const [firstPin, setFirstPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [recoveryContact, setRecoveryContact] = useState("");
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetPinFlow = useCallback((nextMode: "set" | "verify" | "change" | "recover") => {
    setMode(nextMode);
    setStep("enter");
    setDigits("");
    setFirstPin("");
    setCurrentPin("");
    setError("");
  }, []);

  useEffect(() => {
    resetPinFlow(initialMode);
  }, [initialMode, resetPinFlow]);

  const completePin = useCallback(
    async (pin: string) => {
      if (mode === "set" && step === "enter") {
        setFirstPin(pin);
        setDigits("");
        setStep("confirm");
        return;
      }

      if (mode === "change" && step === "enter") {
        setCurrentPin(pin);
        setDigits("");
        setStep("new");
        return;
      }

      if (mode === "change" && step === "new") {
        setFirstPin(pin);
        setDigits("");
        setStep("confirm");
        return;
      }

      if (mode === "recover" && step === "enter") {
        if (!recoveryContact.trim()) {
          setError("Escriba su telefono o correo registrado.");
          setDigits("");
          return;
        }
        setFirstPin(pin);
        setDigits("");
        setStep("confirm");
        return;
      }

      if ((mode === "set" || mode === "change" || mode === "recover") && pin !== firstPin) {
        setError("Los PIN no coinciden.");
        setDigits("");
        setFirstPin("");
        setStep(mode === "change" ? "new" : "enter");
        return;
      }

      setIsLoading(true);
      try {
        const action = mode === "recover" ? "recover" : mode;
        const response = await fetch("/api/xtreme/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberName,
            pin,
            action,
            currentPin,
            recoveryContact,
          }),
        });
        const data = (await response.json()) as { valid?: boolean; error?: string };

        if (response.status === 409) {
          setMode("verify");
          setStep("enter");
          setDigits("");
          setError("Ya existe PIN. Ingreselo para entrar.");
          return;
        }

        if (!response.ok) throw new Error(data.error ?? "No se pudo validar.");
        if (mode === "verify" && !data.valid) {
          setError("PIN incorrecto.");
          setDigits("");
          return;
        }

        if (mode === "change") {
          onDone?.("PIN actualizado. Sesion protegida.");
        }
        if (mode === "recover") {
          onDone?.("PIN recuperado. Guardelo bien para la proxima.");
        }

        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de conexion.");
        setDigits("");
      } finally {
        setIsLoading(false);
      }
    },
    [currentPin, firstPin, memberName, mode, onDone, onSuccess, recoveryContact, step],
  );

  const pressDigit = useCallback(
    (digit: string) => {
      if (isLoading || digits.length >= 4) return;
      const next = digits + digit;
      setDigits(next);
      setError("");
      if (next.length === 4) void completePin(next);
    },
    [completePin, digits, isLoading],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pressDigit(event.key);
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        setDigits((value) => value.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pressDigit]);

  const title =
    mode === "set"
      ? step === "enter"
        ? "Cree su PIN"
        : "Confirme su PIN"
      : mode === "change"
        ? step === "enter"
          ? "PIN actual"
          : step === "new"
            ? "Nuevo PIN"
            : "Confirme PIN"
        : mode === "recover"
          ? step === "enter"
            ? "Nuevo PIN"
            : "Confirme PIN"
          : "Ingrese su PIN";
  const subtitle =
    mode === "set"
      ? "4 digitos para proteger su racha y entrenos"
      : mode === "change"
        ? "Primero validamos el PIN actual"
        : mode === "recover"
          ? "Validamos su telefono o correo registrado"
          : "Entramos a su perfil Xtreme";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-[320px] border border-white/12 bg-[#101010] p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center bg-[#d8ff3e] text-black">
          {mode === "set" ? <ShieldCheck className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.26em] text-orange-300">{memberName}</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">{title}</h2>
        <p className="mt-2 text-sm font-semibold text-white/55">{subtitle}</p>

        {mode === "recover" && (
          <input
            value={recoveryContact}
            onChange={(event) => setRecoveryContact(event.target.value)}
            placeholder="Telefono o correo registrado"
            className="mt-4 w-full border border-white/12 bg-black/45 px-3 py-3 text-center text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
          />
        )}

        <button
          type="button"
          onClick={onChangeMember}
          className="mt-4 border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93]"
        >
          Cambiar usuario
        </button>

        {initialMode === "verify" && mode !== "recover" && (
          <button
            type="button"
            onClick={() => resetPinFlow("recover")}
            className="ml-2 mt-4 border border-orange-300/30 px-3 py-2 text-xs font-black uppercase tracking-wide text-orange-200 transition hover:border-orange-300 hover:text-white"
          >
            Olvide mi PIN
          </button>
        )}

        {mode === "recover" && (
          <button
            type="button"
            onClick={() => resetPinFlow("verify")}
            className="ml-2 mt-4 border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/60 transition hover:text-white"
          >
            Volver al PIN
          </button>
        )}

        <div className="mt-7 flex justify-center gap-4">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-4 w-4 border-2 ${digits.length > index ? "border-[#d8ff3e] bg-[#d8ff3e]" : "border-white/30"}`}
            />
          ))}
        </div>

        <div className="mt-4 min-h-6 text-sm font-bold text-red-300">{error}</div>

        {isLoading ? (
          <Loader2 className="mx-auto mt-4 h-7 w-7 animate-spin text-[#d8ff3e]" />
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => pressDigit(digit)}
                className="grid h-14 place-items-center border border-white/10 bg-white/[0.04] text-xl font-black text-white transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black"
              >
                {digit}
              </button>
            ))}
            <span />
            <button
              type="button"
              onClick={() => pressDigit("0")}
              className="grid h-14 place-items-center border border-white/10 bg-white/[0.04] text-xl font-black text-white transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setDigits((value) => value.slice(0, -1))}
              className="grid h-14 place-items-center border border-white/10 bg-white/[0.04] text-white transition hover:border-orange-300 hover:text-orange-200"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExtremeGymSite() {
  const [memberNameInput, setMemberNameInput] = useState("");
  const [memberPhoneInput, setMemberPhoneInput] = useState("");
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberName, setMemberName] = useState("");
  const [goal, setGoal] = useState(GOALS[0]);
  const [member, setMember] = useState<Member | null>(null);
  const [leaderboard, setLeaderboard] = useState<Member[]>([]);
  const [pinMode, setPinMode] = useState<"set" | "verify" | "change">("verify");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingTrainingId, setSavingTrainingId] = useState("");
  const [reservingTrainingId, setReservingTrainingId] = useState("");
  const [reservations, setReservations] = useState<ReservationState>({});
  const [gymStatus, setGymStatus] = useState<GymStatus | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [metricNote, setMetricNote] = useState("");
  const [selectedReminder, setSelectedReminder] = useState(REMINDERS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("resumen");

  const unlocked = Boolean(memberName) && !showPin;
  const currentMember = member ?? initialMember(memberName);
  const completedToday = useMemo(() => {
    const doneIds = new Set(
      currentMember.workouts
        .filter((workout) => workout.completedDate === todayIso())
        .map((workout) => workout.trainingId),
    );
    return doneIds;
  }, [currentMember.workouts]);

  const recentWorkouts = [...currentMember.workouts].reverse().slice(0, 5);
  const workoutDates = useMemo(
    () => new Set(currentMember.workouts.map((workout) => workout.completedDate)),
    [currentMember.workouts],
  );
  const weekDates = useMemo(() => getWeekDates(), []);
  const weekDoneCount = weekDates.filter((date) => workoutDates.has(date)).length;
  const weeklyGoal = 4;
  const weeklyProgressPct = Math.min(100, Math.round((weekDoneCount / weeklyGoal) * 100));
  const level = Math.floor(currentMember.totalWorkouts / 10) + 1;
  const nextMilestone = level * 10;
  const milestoneLeft = Math.max(0, nextMilestone - currentMember.totalWorkouts);
  const achievements = ACHIEVEMENTS.map((a) => ({ ...a, done: a.test(currentMember) }));
  const unlockedCount = achievements.filter((a) => a.done).length;
  const accessCode = memberCode(currentMember.normalizedName || memberName.toUpperCase() || "XTREME01");
  const latestMetric = currentMember.latestBodyMetric;
  const metricTrend = currentMember.bodyMetrics.slice(-5);
  const membershipTone =
    currentMember.membership.status === "expired"
      ? "border-red-400/40 bg-red-500/10 text-red-200"
      : currentMember.membership.status === "warning"
        ? "border-orange-300/40 bg-orange-300/10 text-orange-100"
        : "border-[#d8ff3e]/35 bg-[#d8ff3e]/10 text-[#efffb8]";

  const storeSession = useCallback((name: string) => {
    window.localStorage.setItem(STORAGE_KEY, name);
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ memberName: name, expiresAt: Date.now() + SESSION_TTL_MS }),
    );
  }, []);

  const loadReservations = useCallback(async (name: string) => {
    const params = new URLSearchParams({ memberName: name, date: todayIso() });
    const response = await fetch(`/api/xtreme/reservations?${params}`, { cache: "no-store" });
    const data = await readJson<ReservationsResponse>(response);
    setReservations(data.reservations ?? {});
  }, []);

  const loadGymStatus = useCallback(async () => {
    const response = await fetch("/api/xtreme/status", { cache: "no-store" });
    const data = await readJson<GymStatus>(response);
    setGymStatus(data);
  }, []);

  const startMember = useCallback(
    async (
      name: string,
      allowSession = true,
      contact: { phone?: string; email?: string } = {},
    ) => {
      const trimmed = normalizeName(name);
      if (!trimmed) return;

      setError("");
      setMessage("");
      setIsLoading(true);
      setMemberName(trimmed);
      setMemberNameInput(trimmed);

      try {
        const params = new URLSearchParams({ memberName: trimmed });
        const memberResponse = await fetch(`/api/xtreme/user?${params}`, { cache: "no-store" });
        const memberData = await readJson<MembersResponse>(memberResponse);
        const phone = contact.phone?.trim() ?? "";
        const email = contact.email?.trim() ?? "";

        if (!memberData.exists && !phone) {
          setError("Para crear un perfil nuevo, escriba al menos el telefono.");
          setMember(memberData.member ?? initialMember(trimmed));
          setLeaderboard(memberData.leaderboard ?? []);
          setShowPin(false);
          return;
        }

        if (phone || email || !memberData.exists) {
          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: trimmed,
              goal: memberData.member?.goal || goal,
              favoriteTraining: memberData.member?.favoriteTraining || "",
              phone,
              email,
            }),
          });
          const createData = await readJson<MembersResponse>(createResponse);
          setMember(createData.member ?? initialMember(trimmed));
          setGoal(createData.member?.goal || GOALS[0]);
          setMemberPhoneInput(createData.member?.phone ?? phone);
          setMemberEmailInput(createData.member?.email ?? email);
          setLeaderboard(createData.leaderboard ?? []);
          setWeightKg(createData.member?.latestBodyMetric?.weightKg ? String(createData.member.latestBodyMetric.weightKg) : "");
          setWaistCm(createData.member?.latestBodyMetric?.waistCm ? String(createData.member.latestBodyMetric.waistCm) : "");
        } else {
          setMember(memberData.member ?? initialMember(trimmed));
          setGoal(memberData.member?.goal || GOALS[0]);
          setMemberPhoneInput(memberData.member?.phone ?? "");
          setMemberEmailInput(memberData.member?.email ?? "");
          setLeaderboard(memberData.leaderboard ?? []);
          setWeightKg(memberData.member?.latestBodyMetric?.weightKg ? String(memberData.member.latestBodyMetric.weightKg) : "");
          setWaistCm(memberData.member?.latestBodyMetric?.waistCm ? String(memberData.member.latestBodyMetric.waistCm) : "");
        }

        await Promise.all([loadReservations(trimmed), loadGymStatus()]);

        if (allowSession) {
          try {
            const raw = window.localStorage.getItem(SESSION_KEY);
            const parsed = raw ? (JSON.parse(raw) as { memberName?: string; expiresAt?: number }) : null;
            if (
              parsed?.memberName?.toUpperCase() === trimmed.toUpperCase() &&
              typeof parsed.expiresAt === "number" &&
              parsed.expiresAt > Date.now()
            ) {
              setShowPin(false);
              return;
            }
          } catch {}
        }

        const pinResponse = await fetch(`/api/xtreme/pin?memberName=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
        });
        const pinData = (await pinResponse.json()) as { hasPinSet?: boolean };
        setPinMode(pinData.hasPinSet ? "verify" : "set");
        setShowPin(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pude cargar Xtreme Gym.");
      } finally {
        setIsLoading(false);
      }
    },
    [goal, loadGymStatus, loadReservations],
  );

  useEffect(() => {
    const storedName = normalizeName(window.localStorage.getItem(STORAGE_KEY) ?? "");
    if (storedName) void startMember(storedName, true);
    else setIsLoading(false);
  }, [startMember]);

  async function saveProfile() {
    const trimmed = normalizeName(memberName);
    if (!trimmed) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName: trimmed,
          goal,
          favoriteTraining: currentMember.favoriteTraining,
          phone: memberPhoneInput,
          email: memberEmailInput,
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMessage("Perfil actualizado. Ahora si, a meterle.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  async function completeTraining(training: (typeof TRAININGS)[number]) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setSavingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingName: training.name,
          intensity: training.intensity,
          minutes: training.minutes,
          completedDate: todayIso(),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      await loadGymStatus();
      setMessage(`Registrado: ${training.name}. Racha viva, mae.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el entreno.");
    } finally {
      setSavingTrainingId("");
    }
  }

  async function reserveTraining(training: (typeof TRAININGS)[number]) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setReservingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingName: training.name,
          trainingDate: todayIso(),
        }),
      });
      const data = await readJson<ReservationsResponse>(response);
      setReservations(data.reservations ?? {});
      await loadGymStatus();
      setMessage(`Reservado: ${training.name}. Llegue 5 minutos antes, pura vida.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reservar.");
    } finally {
      setReservingTrainingId("");
    }
  }

  async function cancelReservation(training: (typeof TRAININGS)[number]) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setReservingTrainingId(training.id);

    try {
      const response = await fetch("/api/xtreme/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingDate: todayIso(),
        }),
      });
      const data = await readJson<ReservationsResponse>(response);
      setReservations(data.reservations ?? {});
      await loadGymStatus();
      setMessage(`Reserva cancelada: ${training.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar.");
    } finally {
      setReservingTrainingId("");
    }
  }

  async function saveBodyMetric() {
    if (!unlocked) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bodyMetric",
          memberName,
          weightKg: Number(weightKg),
          waistCm: Number(waistCm),
          note: metricNote,
          completedDate: todayIso(),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMetricNote("");
      setMessage("Medidas guardadas. Progreso visible, sin cuentos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar las medidas.");
    }
  }

  async function togglePlanItem(item: PlanItem) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    const nextDone = !item.done;
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "planItem",
          memberName,
          itemId: item.id,
          done: nextDone,
          completedDate: todayIso(),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setMessage(nextDone ? "Sesion del plan completada. Sigalo asi." : "Sesion marcada como pendiente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el plan.");
    }
  }

  function resetMember() {
    window.localStorage.removeItem(SESSION_KEY);
    setShowPin(false);
    setMemberName("");
    setMemberNameInput("");
    setMemberPhoneInput("");
    setMemberEmailInput("");
    setMember(null);
    setMessage("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#d8ff3e] selection:text-black">
      {showPin && (
        <PinModal
          memberName={memberName}
          mode={pinMode}
          onChangeMember={resetMember}
          onDone={setMessage}
          onSuccess={() => {
            storeSession(memberName);
            setShowPin(false);
            setMessage((current) => current || "Sesion protegida. Bienvenido a Xtreme.");
          }}
        />
      )}

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-6 sm:px-8">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1800&q=80"
            alt="Entrenamiento funcional Xtreme Gym"
            className="h-full w-full object-cover opacity-24"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,.88)_48%,rgba(5,5,5,.52)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] to-transparent" />
        </div>
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center bg-[#d8ff3e] text-black">
                <Dumbbell className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8ff3e]">Ciudad Quesada</p>
                <h1 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">
                  Xtreme Gym <span className="text-[#d8ff3e]">OS</span>
                </h1>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm font-semibold text-white/58 sm:text-base">
              App de socios para reservar cupo, cuidar la racha, ver membresia y medir progreso.
              Sin cuento: si lo marca, queda guardado en Mongo con su PIN.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
              <span className="border border-white/10 bg-white/[0.06] px-3 py-2">Reservas reales</span>
              <span className="border border-white/10 bg-white/[0.06] px-3 py-2">Ocupacion en vivo</span>
              <span className="border border-white/10 bg-white/[0.06] px-3 py-2">Rachas ticas</span>
            </div>
          </div>

          {!memberName ? (
            <form
              className="grid w-full max-w-md gap-2 border border-white/10 bg-black/40 p-2 backdrop-blur-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void startMember(memberNameInput, false, {
                  phone: memberPhoneInput,
                  email: memberEmailInput,
                });
              }}
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={memberNameInput}
                  onChange={(event) => setMemberNameInput(event.target.value)}
                  placeholder="Su nombre"
                  className="min-w-0 border border-white/12 bg-black/45 px-4 py-3 font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 bg-[#d8ff3e] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
                >
                  Entrar <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={memberPhoneInput}
                  onChange={(event) => setMemberPhoneInput(event.target.value)}
                  placeholder="Telefono si es nuevo"
                  inputMode="tel"
                  className="border border-white/12 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
                />
                <input
                  value={memberEmailInput}
                  onChange={(event) => setMemberEmailInput(event.target.value)}
                  placeholder="Correo opcional"
                  type="email"
                  className="border border-white/12 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
                />
              </div>
              <p className="px-1 text-xs font-semibold text-white/38">
                Si ya tiene perfil, puede entrar solo con nombre. Si es nuevo, el telefono evita duplicados.
              </p>
            </form>
          ) : (
            <div className="flex items-center gap-3 border border-white/12 bg-black/45 px-4 py-3 backdrop-blur-sm">
              <UserRound className="h-5 w-5 text-[#d8ff3e]" />
              <span className="font-black uppercase">{memberName}</span>
              <button type="button" onClick={resetMember} className="text-xs font-bold text-white/45 hover:text-white">
                cambiar
              </button>
            </div>
          )}
        </div>
      </section>

      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 sm:px-8">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-4 text-xs font-black uppercase tracking-[0.14em] transition ${active ? "text-[#d8ff3e]" : "text-white/45 hover:text-white/80"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#d8ff3e]" />}
              </button>
            );
          })}
        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {isLoading ? (
          <div className="grid min-h-[420px] place-items-center border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-8 w-8 animate-spin text-[#d8ff3e]" />
          </div>
        ) : (
          <div className="space-y-6">
            {(message || error) && (
              <div className={`border px-4 py-3 text-sm font-bold ${error ? "border-red-400/40 bg-red-500/10 text-red-200" : "border-[#d8ff3e]/40 bg-[#d8ff3e]/10 text-[#eaff93]"}`}>
                {error || message}
              </div>
            )}

            {tab === "resumen" && (
              <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-4">
                <StatTile icon={Flame} label="Racha" value={`${currentMember.streak} dias`} accent="from-orange-400 to-red-500" />
                <StatTile icon={CalendarCheck} label="Entrenos" value={`${currentMember.totalWorkouts}`} accent="from-[#d8ff3e] to-emerald-300" />
                <StatTile icon={Timer} label="Minutos" value={`${currentMember.totalMinutes}`} accent="from-cyan-300 to-sky-500" />
                <StatTile icon={Trophy} label="Ranking" value={`#${Math.max(1, leaderboard.findIndex((p) => p.normalizedName === currentMember.normalizedName) + 1 || 1)}`} accent="from-yellow-300 to-orange-400" />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_.85fr]">
                <div className={`border p-5 ${membershipTone}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">Membresia</p>
                      <h2 className="mt-2 text-2xl font-black uppercase">{currentMember.membership.plan}</h2>
                      <p className="mt-2 text-sm font-bold opacity-75">
                        Proximo cobro: {currentMember.membership.nextBillingDate}
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8" />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-60">Estado</p>
                      <p className="mt-1 font-black uppercase">{currentMember.membership.status}</p>
                    </div>
                    <div className="border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-60">Dias restantes</p>
                      <p className="mt-1 font-black">{Math.max(0, currentMember.membership.daysRemaining)}</p>
                    </div>
                    <div className="border border-white/10 bg-black/20 p-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] opacity-60">Plan</p>
                      <p className="mt-1 font-black">Socio local</p>
                    </div>
                  </div>
                </div>

                <div className="border border-white/10 bg-white/[0.05] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Ocupacion ahora</p>
                      <h2 className="mt-2 text-4xl font-black uppercase">{gymStatus?.level ?? "Cargando"}</h2>
                    </div>
                    <Users className="h-8 w-8 text-cyan-300" />
                  </div>
                  <div className="mt-5 h-3 border border-white/10 bg-black/45">
                    <div className="h-full bg-cyan-300 transition-all" style={{ width: `${gymStatus?.occupancyPct ?? 0}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/55">
                    {gymStatus
                      ? `${gymStatus.currentPeople}/${gymStatus.capacity} personas estimadas. Reservas hoy: ${gymStatus.reservationsToday}. Llegue fino.`
                      : "Leyendo el gym en vivo."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_.85fr_.85fr]">
                <div className="border border-[#d8ff3e]/25 bg-[#d8ff3e]/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">
                        Mision semanal
                      </p>
                      <h2 className="mt-2 text-2xl font-black uppercase">
                        {weekDoneCount}/{weeklyGoal} entrenos
                      </h2>
                    </div>
                    <Flame className="h-8 w-8 text-orange-300" />
                  </div>
                  <div className="mt-5 h-3 border border-white/10 bg-black/45">
                    <div className="h-full bg-[#d8ff3e] transition-all" style={{ width: `${weeklyProgressPct}%` }} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/55">
                    {weekDoneCount >= weeklyGoal
                      ? "Semana cumplida. Ahora va por modo bestia."
                      : `Faltan ${weeklyGoal - weekDoneCount} para cerrar la semana fuerte.`}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Semana</p>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {weekDates.map((date) => {
                      const done = workoutDates.has(date);
                      return (
                        <div key={date} className="text-center">
                          <div
                            className={`grid aspect-square place-items-center border text-xs font-black ${
                              done
                                ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                                : "border-white/10 bg-black/25 text-white/35"
                            }`}
                          >
                            {done ? <Check className="h-4 w-4" /> : dayLabel(date)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/45">Vista rapida de constancia.</p>
                </div>

                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Nivel</p>
                  <div className="mt-3 flex items-end gap-3">
                    <span className="text-5xl font-black text-white">{level}</span>
                    <span className="pb-2 text-sm font-bold uppercase text-white/45">Xtreme</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/55">
                    {milestoneLeft === 0
                      ? "Subio de nivel. Tremendo."
                      : `${milestoneLeft} entrenos para el nivel ${level + 1}.`}
                  </p>
                </div>
              </div>

              </div>
            )}

            {tab === "entrenar" && (
              <div className="space-y-6">
              {currentMember.trainingPlan ? (
                <div className="border border-[#d8ff3e]/30 bg-[#d8ff3e]/[0.06] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#d8ff3e] text-black">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">Plan de tu coach</p>
                        <h2 className="text-xl font-black uppercase leading-tight">{currentMember.trainingPlan.title}</h2>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-black text-[#eaff93]">
                      {currentMember.trainingPlan.doneItems}/{currentMember.trainingPlan.totalItems} · {currentMember.trainingPlan.progressPct}%
                    </span>
                  </div>

                  {currentMember.trainingPlan.objective && (
                    <p className="mt-3 text-sm font-semibold text-white/60">
                      Objetivo: {currentMember.trainingPlan.objective}
                    </p>
                  )}

                  <div className="mt-4 h-2.5 border border-white/10 bg-black/45">
                    <div className="h-full bg-[#d8ff3e] transition-all" style={{ width: `${currentMember.trainingPlan.progressPct}%` }} />
                  </div>

                  {currentMember.trainingPlan.coachNote && (
                    <p className="mt-4 border-l-2 border-[#d8ff3e]/40 pl-3 text-sm font-semibold italic text-white/55">
                      {currentMember.trainingPlan.coachNote}
                    </p>
                  )}

                  <div className="mt-5 grid gap-3">
                    {currentMember.trainingPlan.items.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex gap-3 border p-3 ${item.done ? "border-[#d8ff3e]/40 bg-[#d8ff3e]/[0.08]" : "border-white/10 bg-black/20"}`}
                      >
                        <button
                          type="button"
                          onClick={() => void togglePlanItem(item)}
                          disabled={!unlocked}
                          aria-label={item.done ? "Marcar pendiente" : "Marcar hecha"}
                          className={`grid h-8 w-8 shrink-0 place-items-center border transition ${
                            item.done
                              ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                              : "border-white/25 text-white/40 hover:border-[#d8ff3e] hover:text-[#eaff93]"
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-black uppercase ${item.done ? "text-white/60 line-through" : "text-white"}`}>
                              {item.day || `Sesion ${index + 1}`}
                            </p>
                            {item.focus && (
                              <span className="bg-white/10 px-2 py-0.5 text-[11px] font-black uppercase text-white/60">
                                {item.focus}
                              </span>
                            )}
                            {item.targetMinutes > 0 && (
                              <span className="text-[11px] font-bold uppercase text-white/40">{item.targetMinutes} min</span>
                            )}
                          </div>
                          {item.exercises && (
                            <p className="mt-1 text-sm font-semibold text-white/55">{item.exercises}</p>
                          )}
                          {item.done && item.doneDate && (
                            <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-[#eaff93]">
                              Hecho · {item.doneDate}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {!currentMember.trainingPlan.items.length && (
                      <p className="text-sm font-semibold text-white/45">Tu coach aun no agrego sesiones al plan.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-white/45" />
                    <h2 className="text-lg font-black uppercase">Plan personalizado</h2>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white/45">
                    Tu coach aun no te asigno un plan. Pedilo en recepcion y aparece aqui para seguirlo dia a dia.
                  </p>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr]">
                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-[#d8ff3e]" />
                    <h2 className="text-lg font-black uppercase">Perfil Xtreme</h2>
                  </div>
                  <label className="mt-5 block text-xs font-black uppercase tracking-[0.16em] text-white/45">
                    Meta actual
                  </label>
                  <div className="mt-3 grid gap-2">
                    {GOALS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setGoal(option)}
                        disabled={!unlocked}
                        className={`flex items-center justify-between border px-4 py-3 text-left font-bold transition ${
                          goal === option
                            ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                            : "border-white/10 bg-black/20 text-white/70 hover:border-white/30"
                        } disabled:opacity-50`}
                      >
                        {option}
                        {goal === option && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={!unlocked}
                    className="mt-5 w-full bg-white px-4 py-3 font-black uppercase text-black transition hover:bg-[#d8ff3e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Guardar perfil
                  </button>
                  <p className="mt-4 text-sm font-semibold text-white/45">
                    Favorito: {currentMember.favoriteTraining || "todavia en blanco"}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Hoy disponible</p>
                      <h2 className="mt-1 text-2xl font-black uppercase">Entrenamientos</h2>
                    </div>
                    <p className="text-sm font-semibold text-white/45">{todayIso()}</p>
                  </div>

                  <div className="mt-5 grid gap-3">
                    {TRAININGS.map((training) => {
                      const Icon = training.icon;
                      const done = completedToday.has(training.id);
                      const reservation = reservations[training.id] ?? {
                        reserved: 0,
                        capacity: training.slots,
                        remaining: training.slots,
                        isMine: false,
                      };
                      const isFull = reservation.remaining <= 0 && !reservation.isMine;
                      return (
                        <div key={training.id} className="grid gap-4 border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_auto] md:items-center">
                          <div className="flex gap-4">
                            <span className={`grid h-14 w-14 shrink-0 place-items-center bg-gradient-to-br ${training.color} text-black`}>
                              <Icon className="h-7 w-7" />
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black uppercase">{training.name}</h3>
                                <span className="bg-white/10 px-2 py-1 text-[11px] font-black uppercase text-white/55">
                                  {training.intensity}
                                </span>
                              </div>
                              <p className="mt-1 text-sm font-semibold text-white/50">
                                {training.time} - {training.minutes} min - {training.coach}
                              </p>
                              <p className="mt-2 text-sm text-white/64">
                                {training.focus} - Cupos: {reservation.remaining}/{reservation.capacity}
                              </p>
                              <div className="mt-3 h-2 border border-white/10 bg-black/35">
                                <div
                                  className="h-full bg-[#d8ff3e] transition-all"
                                  style={{ width: `${Math.min(100, Math.round((reservation.reserved / reservation.capacity) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 md:min-w-[310px]">
                            <button
                              type="button"
                              onClick={() => reservation.isMine ? cancelReservation(training) : reserveTraining(training)}
                              disabled={!unlocked || Boolean(reservingTrainingId) || isFull}
                              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase transition ${
                                reservation.isMine
                                  ? "border border-[#d8ff3e] bg-[#d8ff3e]/10 text-[#eaff93] hover:bg-[#d8ff3e] hover:text-black"
                                  : "bg-orange-300 text-black hover:bg-white"
                              } disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {reservingTrainingId === training.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : reservation.isMine ? (
                                <CalendarClock className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {reservation.isMine ? "Cancelar" : isFull ? "Lleno" : "Reservar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => completeTraining(training)}
                              disabled={!unlocked || Boolean(savingTrainingId) || done}
                              className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-black uppercase transition ${
                                done
                                  ? "bg-[#d8ff3e] text-black"
                                  : "bg-white text-black hover:bg-[#d8ff3e]"
                              } disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              {savingTrainingId === training.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : done ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Dumbbell className="h-4 w-4" />
                              )}
                              {done ? "Hecho" : "Check-in"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-orange-300" />
                  <h2 className="text-lg font-black uppercase">Rutinas guiadas</h2>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {ROUTINES.map((routine) => (
                    <div key={routine.name} className="border border-white/10 bg-black/20 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">{routine.level}</p>
                      <h3 className="mt-2 font-black uppercase">{routine.name}</h3>
                      <ul className="mt-3 space-y-2 text-sm font-semibold text-white/55">
                        {routine.exercises.map((exercise) => (
                          <li key={exercise}>{exercise}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-4 inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white/65 transition hover:border-orange-300 hover:text-orange-200"
                      >
                        <Video className="h-4 w-4" />
                        {routine.video}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            )}

            {tab === "maquinas" && (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
                  <div className="border border-[#d8ff3e]/30 bg-[#d8ff3e]/[0.07] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d8ff3e]">
                          Guia de maquinas
                        </p>
                        <h2 className="mt-2 text-3xl font-black uppercase leading-none">
                          Use el equipo con mas confianza.
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/58">
                          Ajuste primero, controle el peso y pregunte en recepcion si siente dolor articular.
                          La meta es entrenar fuerte sin sacrificar tecnica.
                        </p>
                      </div>
                      <ShieldCheck className="h-9 w-9 shrink-0 text-[#d8ff3e]" />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {["Ajuste", "Control", "Progreso"].map((item) => (
                        <div key={item} className="border border-white/10 bg-black/25 p-3">
                          <p className="text-sm font-black uppercase text-white">{item}</p>
                          <p className="mt-1 text-xs font-semibold text-white/45">
                            Paso clave antes de subir peso.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-orange-300" />
                      <h2 className="text-lg font-black uppercase">Rutinas rapidas</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                      {GUIDE_WORKOUTS.map((workout) => (
                        <div key={workout.goal} className="border border-white/10 bg-black/20 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">
                            {workout.goal}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {workout.steps.map((step) => (
                              <span
                                key={step}
                                className="border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-xs font-bold text-white/65"
                              >
                                {step}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {MACHINE_GUIDE.map((machine) => (
                    <article key={machine.id} className="overflow-hidden border border-white/10 bg-white/[0.04]">
                      <div className={`h-2 bg-gradient-to-r ${machine.accent}`} />
                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                              {machine.zone} / {machine.level}
                            </p>
                            <h2 className="mt-2 text-2xl font-black uppercase leading-tight">
                              {machine.name}
                            </h2>
                          </div>
                          <span className={`grid h-12 w-12 place-items-center bg-gradient-to-br ${machine.accent} text-black`}>
                            <Dumbbell className="h-6 w-6" />
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {machine.muscles.map((muscle) => (
                            <span
                              key={muscle}
                              className="border border-[#d8ff3e]/25 bg-[#d8ff3e]/10 px-2.5 py-1 text-[11px] font-black uppercase text-[#eaff93]"
                            >
                              {muscle}
                            </span>
                          ))}
                        </div>

                        <div className="mt-5 border border-white/10 bg-black/25 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Ajuste inicial</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/62">{machine.setup}</p>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d8ff3e]">Tips</p>
                            <ul className="mt-3 space-y-2 text-sm font-semibold text-white/58">
                              {machine.tips.map((tip) => (
                                <li key={tip} className="flex gap-2">
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300">Evite</p>
                            <ul className="mt-3 space-y-2 text-sm font-semibold text-white/58">
                              {machine.mistakes.map((mistake) => (
                                <li key={mistake} className="flex gap-2">
                                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                                  <span>{mistake}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center gap-3 border border-white/10 bg-white/[0.04] p-3">
                          <Timer className="h-5 w-5 shrink-0 text-orange-300" />
                          <p className="text-sm font-black uppercase text-white/70">{machine.starter}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {tab === "progreso" && (
              <div className="space-y-6">
              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-yellow-300" />
                  <h2 className="text-lg font-black uppercase">Logros</h2>
                  <span className="ml-auto text-sm font-black text-white/45">
                    {unlockedCount}/{achievements.length}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-3 border p-3 ${
                          a.done ? "border-[#d8ff3e]/40 bg-[#d8ff3e]/10" : "border-white/10 bg-black/20"
                        }`}
                      >
                        <span
                          className={`grid h-11 w-11 shrink-0 place-items-center ${
                            a.done ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/40"
                          }`}
                        >
                          {a.done ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-black uppercase ${
                              a.done ? "text-white" : "text-white/55"
                            }`}
                          >
                            {a.name}
                          </p>
                          <p className="text-xs font-semibold text-white/40">{a.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <Ruler className="h-5 w-5 text-cyan-300" />
                    <h2 className="text-lg font-black uppercase">Progreso corporal</h2>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Peso kg</span>
                      <input
                        value={weightKg}
                        onChange={(event) => setWeightKg(event.target.value)}
                        inputMode="decimal"
                        className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-cyan-300"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Cintura cm</span>
                      <input
                        value={waistCm}
                        onChange={(event) => setWaistCm(event.target.value)}
                        inputMode="decimal"
                        className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-cyan-300"
                      />
                    </label>
                  </div>
                  <input
                    value={metricNote}
                    onChange={(event) => setMetricNote(event.target.value)}
                    placeholder="Nota opcional"
                    className="mt-3 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300"
                  />
                  <button
                    type="button"
                    onClick={saveBodyMetric}
                    disabled={!unlocked}
                    className="mt-3 w-full bg-cyan-300 px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
                  >
                    Guardar medidas
                  </button>
                  <p className="mt-3 text-sm font-semibold text-white/45">
                    Ultimo registro: {latestMetric ? `${latestMetric.weightKg} kg - ${latestMetric.waistCm} cm` : "sin medidas aun"}
                  </p>
                </div>

                <div className="border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-center gap-3">
                    <Target className="h-5 w-5 text-[#d8ff3e]" />
                    <h2 className="text-lg font-black uppercase">Grafica rapida</h2>
                  </div>
                  {metricTrend.length ? (
                    <div className="mt-5 flex h-40 items-end gap-3 border border-white/10 bg-black/25 p-4">
                      {metricTrend.map((metric) => {
                        const maxWeight = Math.max(...metricTrend.map((item) => item.weightKg));
                        const height = Math.max(18, Math.round((metric.weightKg / maxWeight) * 100));
                        return (
                          <div key={metric.id} className="flex flex-1 flex-col items-center gap-2">
                            <div className="w-full bg-[#d8ff3e]" style={{ height: `${height}%` }} />
                            <span className="text-[10px] font-bold text-white/45">{metric.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-5 grid h-40 place-items-center border border-white/10 bg-black/25 text-sm font-semibold text-white/40">
                      Guarde su primera medida para ver evolucion.
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-white/45">
                    Pensado para peso, medidas y seguimiento simple de recepcion.
                  </p>
                </div>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Medal className="h-5 w-5 text-orange-300" />
                  <h2 className="text-lg font-black uppercase">Leaderboard</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {leaderboard.length ? (
                    leaderboard.slice(0, 5).map((entry, index) => (
                      <div key={entry.normalizedName || entry.memberName} className="flex items-center gap-3 border border-white/10 bg-black/20 p-3">
                        <span className={`grid h-9 w-9 place-items-center font-black ${index === 0 ? "bg-orange-300 text-black" : "bg-white/10 text-white"}`}>
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black uppercase">{entry.memberName}</p>
                          <p className="text-xs font-semibold text-white/45">
                            {entry.streak} dias - {entry.totalWorkouts} entrenos
                          </p>
                        </div>
                        <Flame className="h-5 w-5 text-orange-300" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-white/45">El ranking aparece cuando alguien marque entrenos.</p>
                  )}
                </div>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Timer className="h-5 w-5 text-cyan-300" />
                  <h2 className="text-lg font-black uppercase">Ultimos registros</h2>
                </div>
                <div className="mt-5 space-y-3">
                  {recentWorkouts.length ? (
                    recentWorkouts.map((workout) => (
                      <div key={workout.id} className="border border-white/10 bg-black/20 p-3">
                        <p className="font-black uppercase">{workout.trainingName}</p>
                        <p className="mt-1 text-xs font-semibold text-white/45">
                          {workout.completedDate} - {workout.minutes} min - {workout.intensity}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-white/45">
                      Todavia no hay registros. Primer entreno y arranca la racha, pura vida.
                    </p>
                  )}
                </div>
              </div>
              </div>
            )}

            {tab === "perfil" && (
              <div className="space-y-6">
              <div className="border border-white/10 bg-gradient-to-br from-[#d8ff3e]/10 to-orange-400/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Carne digital</h2>
                </div>
                {memberName ? (
                  <>
                    <div className="mt-4 border border-white/10 bg-black/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
                            Socio Xtreme
                          </p>
                          <p className="mt-1 truncate text-lg font-black uppercase leading-tight">{memberName}</p>
                        </div>
                        <span className="shrink-0 border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-2 py-1 text-[10px] font-black uppercase text-[#eaff93]">
                          Activo
                        </span>
                      </div>
                      <div className="mt-4">
                        <Barcode value={accessCode} />
                      </div>
                      <p className="mt-2 text-center text-sm font-black tracking-[0.3em] text-white/70">{accessCode}</p>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-white/45">
                      Mostra este codigo en recepcion para tu check-in.
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm font-semibold text-white/45">
                    Entra con tu nombre para generar tu carne de acceso.
                  </p>
                )}
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Seguridad y contacto</h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Telefono</span>
                    <input
                      value={memberPhoneInput}
                      onChange={(event) => setMemberPhoneInput(event.target.value)}
                      inputMode="tel"
                      placeholder="Ej. 88984000"
                      className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Correo</span>
                    <input
                      value={memberEmailInput}
                      onChange={(event) => setMemberEmailInput(event.target.value)}
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={!unlocked}
                    className="bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
                  >
                    Guardar contacto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setMessage("");
                      setPinMode("change");
                      setShowPin(true);
                    }}
                    disabled={!memberName}
                    className="border border-white/15 px-4 py-3 font-black uppercase text-white/70 transition hover:border-[#d8ff3e] hover:text-[#eaff93] disabled:opacity-45"
                  >
                    Cambiar PIN
                  </button>
                </div>
                <p className="mt-3 text-xs font-semibold text-white/42">
                  El contacto sirve para recuperar el PIN y evitar perfiles duplicados.
                </p>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-yellow-300" />
                  <h2 className="text-lg font-black uppercase">Recordatorios</h2>
                </div>
                <div className="mt-4 grid gap-2">
                  {REMINDERS.map((reminder) => (
                    <button
                      key={reminder}
                      type="button"
                      onClick={() => setSelectedReminder(reminder)}
                      className={`border px-3 py-3 text-left text-sm font-bold transition ${
                        selectedReminder === reminder
                          ? "border-yellow-300 bg-yellow-300/10 text-yellow-100"
                          : "border-white/10 bg-black/20 text-white/55 hover:border-white/25"
                      }`}
                    >
                      {reminder}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMessage(`Recordatorio listo: ${selectedReminder}`)}
                  disabled={!unlocked}
                  className="mt-4 w-full bg-yellow-300 px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
                >
                  Activar aviso
                </button>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Invita a un compa</h2>
                </div>
                <p className="mt-4 text-sm font-semibold text-white/55">
                  Pase de cortesia para entrenar una vez con usted.
                </p>
                <div className="mt-4 border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 p-4 text-center">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d8ff3e]">Codigo invitado</p>
                  <p className="mt-2 text-2xl font-black tracking-[0.18em] text-white">
                    XT-{accessCode.replace(/\s/g, "").slice(0, 5)}
                  </p>
                </div>
              </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
