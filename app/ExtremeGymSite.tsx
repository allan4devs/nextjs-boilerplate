"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Award,
  Bell,
  CalendarCheck,
  CalendarClock,
  Camera,
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
  Snowflake,
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
  Mail,
  Menu,
  Pin,
  X,
} from "lucide-react";
import { CHART_CYAN, CHART_LIME, LineTrendChart } from "./components/charts";
import {
  BadgeGallery,
  CelebrationOverlay,
  StreakRing,
  XpBar,
  nextBadgeUp,
  phraseContextFor,
  tierStyle,
  badgeIcon,
  type CelebrationData,
} from "./components/gamification";
import { pickPhrase } from "@/lib/xtreme/phrases";
import { STREAK_MILESTONES, WEEKLY_GOAL_MAX, WEEKLY_GOAL_MIN } from "@/lib/xtreme/gamification";
import OnboardingTour, { type TourStep } from "./components/OnboardingTour";
import {
  GameButton,
  GameCallout,
  GameChip,
  GameDockItem,
  GameHudPill,
  GameLabel,
  GameModal,
  GamePanel,
  GameStat,
} from "./components/GameOS";

const STORAGE_KEY = "xtreme-gym-member-name";
const CEDULA_KEY = "xtreme-gym-member-cedula";
const SESSION_KEY = "xtreme-gym-session";
const TOUR_KEY = "xtreme-gym-tour-done";
/** Digitos minimos para buscar cedula (lector de barras o teclado). */
const CEDULA_MIN_DIGITS = 6;

const TOUR_STEPS: TourStep[] = [
  {
    target: "tab-resumen",
    tab: "resumen",
    title: "Tu resumen",
    body: "Aquí ves tu racha, tu nivel y tu próximo paso. Es tu punto de partida cada día que entrenás.",
    icon: Activity,
  },
  {
    target: "tab-entrenar",
    tab: "entrenar",
    title: "Marcá tu entreno",
    body: "Cada vez que entrenes, marcalo aquí. Así sumás tu racha 🔥 y desbloqueás logros.",
    icon: Dumbbell,
  },
  {
    target: "tab-maquinas",
    tab: "maquinas",
    title: "Guía de máquinas",
    body: "¿No sabés usar un equipo? Mirá la guía con videos y pasos para entrenar seguro.",
    icon: ShieldCheck,
  },
  {
    target: "tab-progreso",
    tab: "progreso",
    title: "Seguí tu progreso",
    body: "Registrá tu peso y medidas para ver tu avance en el tiempo, sesión tras sesión.",
    icon: TrendingUp,
  },
  {
    target: "tab-perfil",
    tab: "perfil",
    title: "Tu carné digital",
    body: "En tu perfil está tu carné con código de acceso. Mostralo en recepción para entrar. ¡Listo para arrancar!",
    icon: QrCode,
  },
];
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

const TAB_SUBTITLES: Record<(typeof TABS)[number]["id"], string> = {
  resumen: "Tu base de operaciones — toca los paneles",
  entrenar: "Plan, clases y check-in del día",
  maquinas: "Toca una máquina para abrir la guía",
  progreso: "Logros, medidas y ranking",
  perfil: "Carné, preferencias y seguridad",
};

type TabId = (typeof TABS)[number]["id"];
type MachineGuide = (typeof MACHINE_GUIDE)[number];
type OsModal =
  | null
  | { kind: "machine"; machine: MachineGuide }
  | { kind: "membership" }
  | { kind: "occupancy" }
  | { kind: "streak" }
  | { kind: "week" }
  | { kind: "training"; trainingId: string }
  | { kind: "badges" }
  | { kind: "quick-train" };

type Workout = {
  id: string;
  trainingId: string;
  trainingName: string;
  intensity: string;
  minutes: number;
  completedDate: string;
  completedAt: string;
};

type NotificationPrefs = {
  streakRisk: boolean;
  milestones: boolean;
  renewalReminders: boolean;
  winBack: boolean;
  weeklyRecap: boolean;
};

type PublicBadge = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: string;
  secret: boolean;
  earned: boolean;
  earnedAt: string | null;
  seen: boolean;
  progress: { current: number; target: number } | null;
};

type Gamification = {
  streak: number;
  weeklyGoal: number;
  weekCount: number;
  weekMet: boolean;
  weeksStreak: number;
  freezesAvailable: number;
  xp: number;
  level: { index: number; name: string; minXp: number; nextXp: number | null; progressPct: number };
  badges: PublicBadge[];
  earnedBadgeCount: number;
  pinnedBadges: string[];
  unseenBadgeIds: string[];
};

type Member = {
  memberName: string;
  normalizedName: string;
  goal: string;
  favoriteTraining: string;
  phone: string;
  email: string;
  cedula?: string;
  photoUrl: string;
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
  notificationPrefs?: NotificationPrefs;
  pinnedBadges?: string[];
  gamification?: Gamification;
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

type NextBestAction = {
  kind: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  priority: number;
};

type MembersResponse = {
  member: Member | null;
  leaderboard: Member[];
  exists?: boolean;
  nextBestAction?: NextBestAction | null;
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

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Reduce la foto a un cuadrado de 256px (JPEG) para guardarla en Mongo. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    bitmap.close();
  }
}

function Avatar({
  name,
  photoUrl,
  className = "h-10 w-10",
  textClass = "text-sm",
}: {
  name: string;
  photoUrl?: string;
  className?: string;
  textClass?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${className} shrink-0 rounded-full border border-[#d8ff3e]/40 object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-[#d8ff3e] font-black text-black ${textClass}`}
    >
      {initialsOf(name)}
    </span>
  );
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

const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  streakRisk: true,
  milestones: true,
  renewalReminders: true,
  winBack: true,
  weeklyRecap: true,
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}

function formatCedulaInput(value: string) {
  // Conserva digitos y guiones (lector suele mandar solo digitos).
  return value.replace(/[^\d-]/g, "").slice(0, 20);
}

function initialMember(name = ""): Member {
  return {
    memberName: name,
    normalizedName: name.toUpperCase(),
    goal: "",
    favoriteTraining: "",
    phone: "",
    email: "",
    cedula: "",
    photoUrl: "",
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
    notificationPrefs: { ...DEFAULT_NOTIF_PREFS },
    pinnedBadges: [],
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
  const [otpCode, setOtpCode] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetPinFlow = useCallback((nextMode: "set" | "verify" | "change" | "recover") => {
    setMode(nextMode);
    setStep("enter");
    setDigits("");
    setFirstPin("");
    setCurrentPin("");
    setOtpCode("");
    setOtpSentTo("");
    setError("");
  }, []);

  useEffect(() => {
    resetPinFlow(initialMode);
  }, [initialMode, resetPinFlow]);

  const requestOtp = useCallback(async () => {
    setOtpSending(true);
    setError("");
    try {
      const response = await fetch("/api/xtreme/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          action: "requestOtp",
          recoveryContact: recoveryContact.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        maskedEmail?: string;
        expiresInMin?: number;
      };
      if (!response.ok) throw new Error(data.error ?? "No se pudo enviar el codigo.");
      setOtpSentTo(data.maskedEmail ?? "su correo");
      onDone?.(
        `Codigo enviado a ${data.maskedEmail ?? "su correo"} (vence en ${data.expiresInMin ?? 15} min).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el codigo.");
    } finally {
      setOtpSending(false);
    }
  }, [memberName, onDone, recoveryContact]);

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
        if (!otpCode.trim() && !recoveryContact.trim()) {
          setError("Pida el codigo al correo, o escriba su telefono/correo registrado.");
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
            otp: otpCode.replace(/\D/g, "").slice(0, 6),
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
    [currentPin, firstPin, memberName, mode, onDone, onSuccess, otpCode, recoveryContact, step],
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
          ? "Codigo al correo del perfil (o contacto registrado)"
          : "Entramos a su perfil Xtreme";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="w-full max-w-[360px] border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-5 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-6">
        <div className="mx-auto grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
          {mode === "set" ? <ShieldCheck className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">{memberName}</p>
        <h2 className="mt-2 text-2xl font-black uppercase text-white">{title}</h2>
        <p className="mt-2 text-sm font-bold text-white/55">{subtitle}</p>

        {mode === "recover" && (
          <div className="mt-4 space-y-2 text-left">
            <button
              type="button"
              onClick={() => void requestOtp()}
              disabled={otpSending}
              className="flex w-full items-center justify-center gap-2 border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-[#eaff93] transition hover:bg-[#d8ff3e] hover:text-black disabled:opacity-50"
            >
              {otpSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
              {otpSentTo ? "Reenviar codigo" : "Enviar codigo al correo"}
            </button>
            {otpSentTo ? (
              <p className="text-center text-[11px] font-semibold text-white/50">
                Enviado a {otpSentTo}
              </p>
            ) : null}
            <input
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="Codigo de 6 digitos"
              className="w-full border border-white/12 bg-black/45 px-3 py-3 text-center text-sm font-bold tracking-[0.3em] text-white outline-none placeholder:tracking-normal placeholder:text-white/30 focus:border-[#d8ff3e]"
            />
            <input
              value={recoveryContact}
              onChange={(event) => setRecoveryContact(event.target.value)}
              placeholder="O telefono/correo (fallback)"
              className="w-full border border-white/12 bg-black/45 px-3 py-3 text-center text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-[#d8ff3e]"
            />
          </div>
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
                className="grid h-14 place-items-center border-[3px] border-white/20 bg-black/40 text-xl font-black text-white transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black active:translate-y-px"
              >
                {digit}
              </button>
            ))}
            <span />
            <button
              type="button"
              onClick={() => pressDigit("0")}
              className="grid h-14 place-items-center border-[3px] border-white/20 bg-black/40 text-xl font-black text-white transition hover:border-[#d8ff3e] hover:bg-[#d8ff3e] hover:text-black active:translate-y-px"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setDigits((value) => value.slice(0, -1))}
              className="grid h-14 place-items-center border-[3px] border-white/20 bg-black/40 text-white transition hover:border-orange-300 hover:text-orange-200 active:translate-y-px"
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
  const [memberCedulaInput, setMemberCedulaInput] = useState("");
  const [memberPhoneInput, setMemberPhoneInput] = useState("");
  const [memberEmailInput, setMemberEmailInput] = useState("");
  const [memberName, setMemberName] = useState("");
  /** Si la cedula no existe, pedimos nombre/telefono para alta. */
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const cedulaInputRef = useRef<HTMLInputElement | null>(null);
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabId>("resumen");
  const [navOpen, setNavOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [nextBestAction, setNextBestAction] = useState<NextBestAction | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [osModal, setOsModal] = useState<OsModal>(null);
  const closeOsModal = useCallback(() => setOsModal(null), []);

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
  const gami = currentMember.gamification;
  const weekDoneCount = gami?.weekCount ?? weekDates.filter((date) => workoutDates.has(date)).length;
  const weeklyGoal = gami?.weeklyGoal ?? 4;
  const level = gami?.level?.index ?? Math.floor(currentMember.totalWorkouts / 10) + 1;
  const levelName = gami?.level?.name ?? "Novato";
  const nextMilestone = gami?.level?.nextXp ?? level * 10;
  const milestoneLeft = gami
    ? Math.max(0, (gami.level.nextXp ?? gami.xp) - gami.xp)
    : Math.max(0, nextMilestone - currentMember.totalWorkouts);
  const serverBadges = gami?.badges ?? [];
  const achievements = serverBadges.length
    ? serverBadges.map((b) => ({
        id: b.id,
        name: b.name,
        desc: b.desc,
        icon: Award,
        done: b.earned,
      }))
    : ACHIEVEMENTS.map((a) => ({ ...a, done: a.test(currentMember) }));
  const unlockedCount = achievements.filter((a) => a.done).length;
  const pinnedBadgeIds = currentMember.pinnedBadges ?? gami?.pinnedBadges ?? [];
  const notifPrefs = currentMember.notificationPrefs ?? DEFAULT_NOTIF_PREFS;
  const accessCode = memberCode(currentMember.normalizedName || memberName.toUpperCase() || "XTREME01");
  const latestMetric = currentMember.latestBodyMetric;
  const metricTrend = currentMember.bodyMetrics.slice(-12);
  const membershipTone =
    currentMember.membership.status === "expired"
      ? "border-red-400/40 bg-red-500/10 text-red-200"
      : currentMember.membership.status === "warning"
        ? "border-orange-300/40 bg-orange-300/10 text-orange-100"
        : "border-[#d8ff3e]/35 bg-[#d8ff3e]/10 text-[#efffb8]";

  // --- Gamificacion: frase del dia, proximo logro y celebraciones ---
  const trainedToday = completedToday.size > 0;
  const effectiveStreak = gami?.streak ?? currentMember.streak;
  const dayPhrase = pickPhrase(
    phraseContextFor({
      trainedToday,
      streak: effectiveStreak,
      totalWorkouts: currentMember.totalWorkouts,
      lastWorkoutDate: currentMember.lastWorkoutDate,
    }),
    memberName || "Xtreme",
    { streak: effectiveStreak },
  );
  const nextBadge = nextBadgeUp(serverBadges);
  const quickTraining =
    TRAININGS.find((t) => t.name === currentMember.favoriteTraining) ?? TRAININGS[0];

  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const prevGamiRef = useRef<{ streak: number; levelIndex: number } | null>(null);

  useEffect(() => {
    if (!gami || !unlocked) return;
    const prev = prevGamiRef.current;
    prevGamiRef.current = { streak: gami.streak, levelIndex: gami.level.index };

    const unseen = gami.badges.filter((badge) => gami.unseenBadgeIds.includes(badge.id));
    if (unseen.length) {
      setCelebration({
        title: unseen.length > 1 ? "Logros desbloqueados" : "Logro desbloqueado",
        subtitle: unseen.length > 1 ? `${unseen.length} badges nuevos` : unseen[0].name,
        phraseContext: "milestone",
        badges: unseen,
      });
      // Marcar como vistos en segundo plano (la proxima carga ya no celebra).
      void fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, action: "badgesSeen" }),
      }).catch(() => {});
      return;
    }
    if (prev && gami.level.index > prev.levelIndex) {
      setCelebration({
        title: "Subida de nivel",
        subtitle: `Nivel ${gami.level.index}: ${gami.level.name}`,
        phraseContext: "levelUp",
        badges: [],
      });
      return;
    }
    if (prev && gami.streak > prev.streak && STREAK_MILESTONES.includes(gami.streak)) {
      setCelebration({
        title: "Hito de racha",
        subtitle: `${gami.streak} dias seguidos`,
        phraseContext: "milestone",
        badges: [],
      });
    }
  }, [gami, unlocked, memberName]);

  // Tour de bienvenida: se muestra una vez por socio la primera vez que entra.
  useEffect(() => {
    if (!unlocked || showPin || isLoading || !memberName) return;
    if (typeof window === "undefined") return;
    const key = normalizeName(memberName).toUpperCase();
    let seen: string[] = [];
    try {
      seen = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]") as string[];
    } catch {
      seen = [];
    }
    if (!Array.isArray(seen) || !seen.includes(key)) {
      setShowTour(true);
    }
  }, [unlocked, showPin, isLoading, memberName]);

  const finishTour = useCallback(
    () => {
      setShowTour(false);
      if (typeof window === "undefined" || !memberName) return;
      const key = normalizeName(memberName).toUpperCase();
      let seen: string[] = [];
      try {
        seen = JSON.parse(window.localStorage.getItem(TOUR_KEY) ?? "[]") as string[];
      } catch {
        seen = [];
      }
      if (!Array.isArray(seen)) seen = [];
      if (!seen.includes(key)) {
        seen.push(key);
        window.localStorage.setItem(TOUR_KEY, JSON.stringify(seen.slice(-50)));
      }
    },
    [memberName],
  );

  async function updateWeeklyGoal(goalDays: number) {
    if (!unlocked) return;
    setError("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, action: "weeklyGoal", weeklyGoal: goalDays }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      setMessage(`Meta semanal: ${goalDays} dias. A cumplirla.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la meta.");
    }
  }

  const storeSession = useCallback((name: string, cedula?: string) => {
    window.localStorage.setItem(STORAGE_KEY, name);
    if (cedula) window.localStorage.setItem(CEDULA_KEY, onlyDigits(cedula));
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        memberName: name,
        cedula: cedula ? onlyDigits(cedula) : undefined,
        expiresAt: Date.now() + SESSION_TTL_MS,
      }),
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

  const applyMemberPayload = useCallback(
    (memberData: MembersResponse, fallbackName: string, phone = "", email = "", cedula = "") => {
      const resolved = memberData.member ?? initialMember(fallbackName);
      const name = resolved.memberName || fallbackName;
      setMember(resolved);
      setMemberName(name);
      setMemberNameInput(name);
      setGoal(resolved.goal || GOALS[0]);
      setMemberPhoneInput(resolved.phone || phone);
      setMemberEmailInput(resolved.email || email);
      if (resolved.cedula || cedula) {
        setMemberCedulaInput(formatCedulaInput(resolved.cedula || cedula));
      }
      setLeaderboard(memberData.leaderboard ?? []);
      setNextBestAction(memberData.nextBestAction ?? null);
      setWeightKg(resolved.latestBodyMetric?.weightKg ? String(resolved.latestBodyMetric.weightKg) : "");
      setWaistCm(resolved.latestBodyMetric?.waistCm ? String(resolved.latestBodyMetric.waistCm) : "");
      return name;
    },
    [],
  );

  /**
   * Login principal por cedula (lector de barras o teclado).
   * Si no existe, pide nombre+telefono para registrar y ligar la cedula.
   */
  const startMemberByCedula = useCallback(
    async (
      cedulaRaw: string,
      allowSession = true,
      contact: { name?: string; phone?: string; email?: string } = {},
    ) => {
      const digits = onlyDigits(cedulaRaw);
      if (digits.length < CEDULA_MIN_DIGITS) {
        setError(`Digite o escanee la cedula (minimo ${CEDULA_MIN_DIGITS} digitos).`);
        return;
      }

      setError("");
      setMessage("");
      setIsLoading(true);
      setMemberCedulaInput(formatCedulaInput(cedulaRaw));

      try {
        const lookupParams = new URLSearchParams({ cedula: digits });
        const lookupResponse = await fetch(`/api/xtreme/user?${lookupParams}`, { cache: "no-store" });
        const lookupData = await readJson<
          MembersResponse & { exists?: boolean; lookup?: string; cedula?: string }
        >(lookupResponse);

        const phone = contact.phone?.trim() ?? "";
        const email = contact.email?.trim() ?? "";
        const regName = normalizeName(contact.name ?? "");

        if (!lookupData.exists) {
          // Socio nuevo: necesita nombre + telefono + cedula
          if (!regName || !phone) {
            setNeedsRegistration(true);
            setShowPin(false);
            setMemberName("");
            setMember(null);
            setError(
              "Cedula no registrada. Escriba su nombre y telefono para crear el perfil, o pida alta en recepcion.",
            );
            setIsLoading(false);
            return;
          }

          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: regName,
              cedula: digits,
              phone,
              email,
              goal: goal || GOALS[0],
              favoriteTraining: "",
            }),
          });
          const createData = await readJson<MembersResponse>(createResponse);
          const name = applyMemberPayload(createData, regName, phone, email, digits);
          setNeedsRegistration(false);
          await Promise.all([loadReservations(name), loadGymStatus()]);
          setPinMode("set");
          setShowPin(true);
          return;
        }

        // Socio existente
        const name = applyMemberPayload(
          lookupData,
          lookupData.member?.memberName || "",
          phone,
          email,
          digits,
        );
        if (!name) {
          setError("No se pudo resolver el perfil de esa cedula.");
          return;
        }
        setNeedsRegistration(false);
        await Promise.all([loadReservations(name), loadGymStatus()]);

        if (allowSession) {
          try {
            const raw = window.localStorage.getItem(SESSION_KEY);
            const parsed = raw
              ? (JSON.parse(raw) as { memberName?: string; cedula?: string; expiresAt?: number })
              : null;
            const sameUser =
              parsed?.memberName?.toUpperCase() === name.toUpperCase() ||
              (parsed?.cedula && onlyDigits(parsed.cedula) === digits);
            if (sameUser && typeof parsed?.expiresAt === "number" && parsed.expiresAt > Date.now()) {
              storeSession(name, digits);
              setShowPin(false);
              return;
            }
          } catch {
            /* ignore */
          }
        }

        const pinResponse = await fetch(`/api/xtreme/pin?memberName=${encodeURIComponent(name)}`, {
          cache: "no-store",
        });
        const pinData = (await pinResponse.json()) as { hasPinSet?: boolean };
        setPinMode(pinData.hasPinSet ? "verify" : "set");
        setShowPin(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pude cargar Xtreme Gym.");
        setMemberName("");
      } finally {
        setIsLoading(false);
      }
    },
    [applyMemberPayload, goal, loadGymStatus, loadReservations, storeSession],
  );

  /** @deprecated Preferir startMemberByCedula — se mantiene para rehidratacion por nombre en storage. */
  const startMember = useCallback(
    async (
      name: string,
      allowSession = true,
      contact: { phone?: string; email?: string; cedula?: string } = {},
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
        const cedula = onlyDigits(contact.cedula ?? memberData.member?.cedula ?? "");

        if (!memberData.exists && !phone) {
          setError("Perfil no encontrado. Inicie sesion con su cedula.");
          setMember(memberData.member ?? initialMember(trimmed));
          setLeaderboard(memberData.leaderboard ?? []);
          setNextBestAction(memberData.nextBestAction ?? null);
          setShowPin(false);
          setMemberName("");
          return;
        }

        if (phone || email || cedula || !memberData.exists) {
          const createResponse = await fetch("/api/xtreme/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberName: trimmed,
              goal: memberData.member?.goal || goal,
              favoriteTraining: memberData.member?.favoriteTraining || "",
              phone,
              email,
              ...(cedula ? { cedula } : {}),
            }),
          });
          const createData = await readJson<MembersResponse>(createResponse);
          applyMemberPayload(createData, trimmed, phone, email, cedula);
        } else {
          applyMemberPayload(memberData, trimmed, "", "", cedula);
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
              storeSession(trimmed, cedula || undefined);
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
    [applyMemberPayload, goal, loadGymStatus, loadReservations, storeSession],
  );

  // Solo al montar: rehidratar sesion por cedula (preferido) o nombre legacy.
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const storedCedula = onlyDigits(window.localStorage.getItem(CEDULA_KEY) ?? "");
    const storedName = normalizeName(window.localStorage.getItem(STORAGE_KEY) ?? "");
    if (storedCedula.length >= CEDULA_MIN_DIGITS) {
      void startMemberByCedula(storedCedula, true);
    } else if (storedName) {
      void startMember(storedName, true);
    } else {
      setIsLoading(false);
    }
  }, [startMember, startMemberByCedula]);

  // Auto-focus en cedula cuando no hay sesion (listo para lector de barras).
  useEffect(() => {
    if (!memberName && !isLoading && !showPin) {
      const id = window.setTimeout(() => cedulaInputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [memberName, isLoading, showPin]);

  async function saveProfile() {
    const trimmed = normalizeName(memberName);
    if (!trimmed) return;
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "profile",
          memberName: trimmed,
          goal,
          favoriteTraining: currentMember.favoriteTraining,
          phone: memberPhoneInput,
          email: memberEmailInput,
          cedula: memberCedulaInput,
          weeklyGoal,
          notificationPrefs: notifPrefs,
          pinnedBadges: pinnedBadgeIds,
        }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.member?.cedula) {
        setMemberCedulaInput(formatCedulaInput(data.member.cedula));
        window.localStorage.setItem(CEDULA_KEY, onlyDigits(data.member.cedula));
      }
      setLeaderboard(data.leaderboard ?? []);
      setMessage("Perfil actualizado. Ahora si, a meterle.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  async function saveProfileField(patch: Record<string, unknown>, okMessage: string) {
    const trimmed = normalizeName(memberName);
    if (!trimmed || !unlocked) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", memberName: trimmed, ...patch }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      if (data.member?.cedula) {
        setMemberCedulaInput(formatCedulaInput(data.member.cedula));
        window.localStorage.setItem(CEDULA_KEY, onlyDigits(data.member.cedula));
      }
      setLeaderboard(data.leaderboard ?? []);
      setMessage(okMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  function togglePinnedBadge(badgeId: string) {
    if (!unlocked) return;
    const earned = serverBadges.find((b) => b.id === badgeId)?.earned;
    if (!earned) {
      setError("Solo puede fijar badges que ya gano.");
      return;
    }
    const next = pinnedBadgeIds.includes(badgeId)
      ? pinnedBadgeIds.filter((id) => id !== badgeId)
      : pinnedBadgeIds.length >= 3
        ? pinnedBadgeIds
        : [...pinnedBadgeIds, badgeId];
    if (!pinnedBadgeIds.includes(badgeId) && pinnedBadgeIds.length >= 3) {
      setError("Maximo 3 badges en el showcase.");
      return;
    }
    void saveProfileField({ pinnedBadges: next }, "Showcase de badges actualizado.");
  }

  function toggleNotifPref(key: keyof NotificationPrefs) {
    if (!unlocked) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    void saveProfileField({ notificationPrefs: next }, "Preferencias de correo guardadas.");
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
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberName,
          trainingId: training.id,
          trainingName: training.name,
          trainingDate: todayIso(),
        }),
      });
      const data = (await response.json()) as ReservationsResponse & {
        error?: string;
        code?: string;
        paymentRequired?: boolean;
        checkoutOptionId?: string;
      };
      if (!response.ok) {
        if (data.paymentRequired || response.status === 402) {
          setError(
            data.error ||
              "Necesita un plan activo o su primer dia gratis. Registrese en Primer dia o elija un plan en Precios.",
          );
          setMessage("");
          // Soft nudge: open first-day offer
          if (typeof window !== "undefined") {
            // Keep user in app; show clear next step
          }
        } else {
          throw new Error(data.error ?? "No se pudo reservar.");
        }
        if (data.reservations) setReservations(data.reservations);
        return;
      }
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

  async function uploadPhoto(file: File) {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setIsUploadingPhoto(true);
    try {
      const photo = await resizePhoto(file);
      const response = await fetch("/api/xtreme/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, photo }),
      });
      const data = await readJson<MembersResponse>(response);
      setMember(data.member);
      setLeaderboard(data.leaderboard ?? []);
      setMessage("Foto de perfil actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function activateReminder() {
    if (!unlocked) return;
    setError("");
    setMessage("");
    setIsSendingReminder(true);
    try {
      const response = await fetch("/api/xtreme/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberName, message: selectedReminder }),
      });
      const data = await readJson<{ ok?: boolean; sentTo?: string }>(response);
      setMessage(`Aviso enviado a ${data.sentTo}. Revise su correo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el aviso.");
    } finally {
      setIsSendingReminder(false);
    }
  }

  function resetMember() {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(CEDULA_KEY);
    setShowPin(false);
    setMemberName("");
    setMemberNameInput("");
    setMemberCedulaInput("");
    setMemberPhoneInput("");
    setMemberEmailInput("");
    setNeedsRegistration(false);
    setMember(null);
    setMessage("");
    setError("");
    window.setTimeout(() => cedulaInputRef.current?.focus(), 100);
  }

  const selectedTraining =
    osModal?.kind === "training"
      ? TRAININGS.find((t) => t.id === osModal.trainingId) ?? null
      : null;

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#d8ff3e] selection:text-black">
      {celebration && !showPin && (
        <CelebrationOverlay
          data={celebration}
          memberName={memberName || "Xtreme"}
          streak={effectiveStreak}
          onClose={() => setCelebration(null)}
        />
      )}
      {showPin && (
        <PinModal
          memberName={memberName}
          mode={pinMode}
          onChangeMember={resetMember}
          onDone={setMessage}
          onSuccess={() => {
            storeSession(memberName, memberCedulaInput || currentMember.cedula);
            setShowPin(false);
            setMessage((current) => current || "Sesion protegida. Bienvenido a Xtreme.");
          }}
        />
      )}

      {/* Sin sesión: login por cedula (lector de barras / teclado). */}
      {!memberName && !isLoading && !showPin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-0 backdrop-blur-md sm:items-center sm:p-4">
          <form
            className="w-full max-w-[400px] border-[3px] border-[#d8ff3e] bg-[#0c0c0c] p-5 text-center shadow-[6px_6px_0_rgba(216,255,62,0.25)] sm:p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void startMemberByCedula(memberCedulaInput, false, {
                name: memberNameInput,
                phone: memberPhoneInput,
                email: memberEmailInput,
              });
            }}
          >
            <div className="mx-auto grid h-16 w-16 place-items-center border-[3px] border-black/30 bg-[#d8ff3e] text-black">
              <CreditCard className="h-8 w-8" />
            </div>
            <GameLabel tone="lime" className="mt-4">
              Member OS · Cedula
            </GameLabel>
            <h2 className="mt-2 text-2xl font-black uppercase text-white">Escanee su cédula</h2>
            <p className="mt-2 text-sm font-bold text-white/55">
              Pase el carnet por el lector o digite los números. Luego confirma con su PIN.
            </p>

            <div className="mt-6 grid gap-2 text-left">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
                  Cédula
                </span>
                <div className="relative mt-1.5">
                  <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
                  <input
                    ref={cedulaInputRef}
                    value={memberCedulaInput}
                    onChange={(event) => {
                      setMemberCedulaInput(formatCedulaInput(event.target.value));
                      setNeedsRegistration(false);
                      setError("");
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus
                    placeholder="1-2345-6789"
                    className="min-h-14 w-full border-[3px] border-white/20 bg-black/50 py-3 pl-11 pr-3 text-center text-xl font-black tracking-[0.18em] text-white outline-none transition placeholder:text-sm placeholder:tracking-normal placeholder:text-white/35 focus:border-[#d8ff3e]"
                  />
                </div>
              </label>

              {needsRegistration && (
                <>
                  <GameCallout tone="orange">
                    Primera vez: complete nombre y teléfono para ligar esta cédula a su perfil.
                  </GameCallout>
                  <input
                    value={memberNameInput}
                    onChange={(event) => setMemberNameInput(event.target.value)}
                    placeholder="Nombre completo"
                    className="min-h-12 min-w-0 border-[3px] border-white/20 bg-black/50 px-4 py-3 font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
                  />
                  <input
                    value={memberPhoneInput}
                    onChange={(event) => setMemberPhoneInput(event.target.value)}
                    placeholder="Telefono"
                    inputMode="tel"
                    className="min-h-12 border-[3px] border-white/15 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
                  />
                  <input
                    value={memberEmailInput}
                    onChange={(event) => setMemberEmailInput(event.target.value)}
                    placeholder="Correo opcional"
                    type="email"
                    className="min-h-12 border-[3px] border-white/15 bg-black/40 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
                  />
                </>
              )}
            </div>

            {error && (
              <div className="mt-3 border-[3px] border-red-400/50 bg-red-500/10 px-3 py-2 text-left text-sm font-bold text-red-200">
                {error}
              </div>
            )}

            <GameButton type="submit" full className="mt-4">
              {needsRegistration ? "Crear perfil y entrar" : "Entrar"} <ArrowRight className="h-4 w-4" />
            </GameButton>
            <p className="mt-3 px-1 text-xs font-semibold text-white/38">
              Lector USB tipo teclado: escanee y el sistema recibe la cédula + Enter. Si es socio
              nuevo, se pedirá nombre y teléfono.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Ir al sitio Xtreme Gym
            </Link>
          </form>
        </div>
      )}

      <OnboardingTour
        steps={TOUR_STEPS}
        open={showTour}
        onClose={finishTour}
        onGoToTab={(next) => setTab(next as TabId)}
      />

      {/* ─── TOP HUD ─── */}
      <header className="xg-safe-top sticky top-0 z-30 border-b-[3px] border-white/15 bg-[#050505]/95 backdrop-blur-md lg:pl-[84px]">
        <div className="flex h-12 items-center gap-2 px-2 sm:h-14 sm:gap-3 sm:px-3">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="grid h-11 w-11 shrink-0 place-items-center border-[3px] border-white/20 bg-black/40 text-white lg:hidden"
            aria-label="Abrir navegación"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden h-2.5 w-2.5 shrink-0 bg-[#d8ff3e] shadow-[0_0_16px_rgba(216,255,62,.75)] sm:block" />
          <div className="min-w-0 shrink">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
              Xtreme · Member OS
            </p>
            <p className="truncate text-xs font-black uppercase text-white/80 sm:text-sm">
              {TABS.find((item) => item.id === tab)?.label}
            </p>
          </div>

          {unlocked && (
            <div className="ml-auto flex max-w-[58%] items-center gap-1.5 overflow-x-auto sm:max-w-none sm:gap-2">
              <GameHudPill
                icon={Flame}
                label="Racha"
                value={effectiveStreak}
                tone="orange"
                onClick={() => setOsModal({ kind: "streak" })}
              />
              <GameHudPill
                icon={Star}
                label="Nv"
                value={level}
                tone="cyan"
                onClick={() => setOsModal({ kind: "streak" })}
              />
              <GameHudPill
                icon={Target}
                label="Sem"
                value={`${weekDoneCount}/${weeklyGoal}`}
                tone="lime"
                onClick={() => setOsModal({ kind: "week" })}
              />
            </div>
          )}
        </div>
      </header>

      {navOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r-[3px] border-white/15 bg-[#090909] shadow-[8px_0_0_rgba(0,0,0,.45)] transition-[width,transform] duration-300 ${
          navOpen ? "translate-x-0 lg:w-[240px]" : "-translate-x-full lg:w-[72px] lg:translate-x-0"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b-[3px] border-white/15 bg-[#d8ff3e]/10 px-3">
          <div className={navOpen ? "block" : "lg:hidden"}>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#d8ff3e]">Xtreme Gym</p>
            <p className="text-sm font-black uppercase">Member OS</p>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="grid h-10 w-10 place-items-center border-[3px] border-white/15 text-white/60 lg:hidden"
            aria-label="Cerrar navegación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-tour={`tab-${item.id}`}
                title={item.label}
                onClick={() => {
                  setTab(item.id);
                  setNavOpen(false);
                  setOsModal(null);
                }}
                className={`flex h-14 w-full items-center gap-3 border-[3px] px-3 text-left text-xs font-black uppercase tracking-[.1em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${
                  active
                    ? "border-[#d8ff3e] bg-[#d8ff3e]/15 text-[#d8ff3e]"
                    : "border-transparent text-white/50 hover:border-white/15 hover:bg-white/[.05] hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={navOpen ? "block" : "lg:hidden"}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t-[3px] border-white/15 p-2">
          {memberName ? (
            <button
              type="button"
              title="Ver perfil"
              onClick={() => {
                setTab("perfil");
                setNavOpen(false);
              }}
              className="flex h-14 w-full items-center gap-3 border-[3px] border-white/10 px-2 text-left transition hover:border-[#d8ff3e]/40 hover:bg-white/[.05]"
            >
              <Avatar name={memberName} photoUrl={currentMember.photoUrl} className="h-11 w-11" textClass="text-xs" />
              <span className={`min-w-0 flex-1 ${navOpen ? "block" : "lg:hidden"}`}>
                <span className="block truncate text-xs font-black uppercase">{memberName}</span>
                <span className="text-[11px] font-bold text-[#d8ff3e]">Ver perfil</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!navOpen) {
                  setNavOpen(true);
                  setShowLogin(true);
                } else {
                  setShowLogin((value) => !value);
                }
              }}
              aria-expanded={showLogin}
              title="Entrar a mi perfil"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 border-[3px] border-black/30 bg-[#d8ff3e] px-2 text-sm font-black uppercase text-black"
            >
              <UserRound className="h-4 w-4 shrink-0" />
              <span className={navOpen ? "block" : "lg:hidden"}>Entrar a mi perfil</span>
            </button>
          )}

          {!memberName && showLogin && navOpen && (
            <form
              className="mt-3 grid gap-2 border-[3px] border-white/15 bg-black/40 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                setShowLogin(false);
                setNavOpen(false);
                void startMemberByCedula(memberCedulaInput, false, {
                  name: memberNameInput,
                  phone: memberPhoneInput,
                  email: memberEmailInput,
                });
              }}
            >
              <input
                value={memberCedulaInput}
                onChange={(event) => setMemberCedulaInput(formatCedulaInput(event.target.value))}
                placeholder="Cedula (escanear o digitar)"
                inputMode="numeric"
                autoFocus
                className="min-w-0 border-[3px] border-white/15 bg-black/45 px-4 py-3 text-center font-black tracking-widest text-white outline-none transition placeholder:tracking-normal placeholder:text-white/35 focus:border-[#d8ff3e]"
              />
              {needsRegistration && (
                <>
                  <input
                    value={memberNameInput}
                    onChange={(event) => setMemberNameInput(event.target.value)}
                    placeholder="Nombre si es nuevo"
                    className="min-w-0 border-[3px] border-white/15 bg-black/45 px-4 py-3 font-bold text-white outline-none transition placeholder:text-white/35 focus:border-[#d8ff3e]"
                  />
                  <input
                    value={memberPhoneInput}
                    onChange={(event) => setMemberPhoneInput(event.target.value)}
                    placeholder="Telefono si es nuevo"
                    inputMode="tel"
                    className="border-[3px] border-white/15 bg-black/35 px-3 py-2.5 text-sm font-bold text-white outline-none transition placeholder:text-white/30 focus:border-[#d8ff3e]"
                  />
                </>
              )}
              <GameButton type="submit" full>
                Entrar <ArrowRight className="h-4 w-4" />
              </GameButton>
            </form>
          )}
          {memberName && (
            <button
              type="button"
              onClick={resetMember}
              title="Cambiar de usuario"
              className={`mt-3 w-full border-[3px] border-white/10 py-2 text-xs font-black uppercase text-white/35 transition hover:border-white/30 hover:text-white ${
                navOpen ? "block" : "lg:hidden"
              }`}
            >
              Cambiar de usuario
            </button>
          )}
        </div>
      </aside>

      {/* ─── BOTTOM DOCK (mobile) ─── */}
      <nav
        className="xg-safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t-[3px] border-white/20 bg-[#0a0a0a]/98 backdrop-blur-md lg:hidden"
        aria-label="Navegación principal"
      >
        {TABS.map((item) => (
          <GameDockItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={tab === item.id}
            tourId={`tab-${item.id}`}
            onClick={() => {
              setTab(item.id);
              setOsModal(null);
            }}
          />
        ))}
      </nav>

      <section
        className={`xg-os-content mx-auto max-w-[1600px] px-3 py-4 transition-[padding] sm:px-6 sm:py-5 ${
          navOpen ? "lg:pl-[268px] lg:pr-10" : "lg:pl-[104px] lg:pr-10"
        }`}
      >
        {isLoading ? (
          <div className="grid min-h-[420px] place-items-center border-[3px] border-white/15 bg-[#0c0c0c]">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#d8ff3e]" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                Cargando OS…
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="border-[3px] border-white/15 bg-[#0c0c0c] px-3 py-3 shadow-[4px_4px_0_rgba(0,0,0,.55)] sm:px-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <GameLabel tone="lime">Zona activa</GameLabel>
                  <h1 className="mt-1 text-xl font-black uppercase tracking-tight sm:text-3xl">
                    {TABS.find((item) => item.id === tab)?.label}
                  </h1>
                  <p className="mt-0.5 text-xs font-bold text-white/45 sm:text-sm">{TAB_SUBTITLES[tab]}</p>
                </div>
                {unlocked && !trainedToday && (
                  <GameButton
                    variant="orange"
                    className="min-h-11 !px-3"
                    onClick={() => setOsModal({ kind: "quick-train" })}
                  >
                    <Flame className="h-4 w-4" />
                    <span className="hidden xs:inline sm:inline">Entreno</span>
                  </GameButton>
                )}
              </div>
            </div>
            {(message || error) && (
              <GameCallout tone={error ? "red" : "lime"}>
                {error || message}
              </GameCallout>
            )}

            {tab === "resumen" && (
              <div className="space-y-4">

              <div id="entrenar-hoy" className="flex flex-col gap-3 border-[3px] border-[#d8ff3e] bg-gradient-to-r from-[#d8ff3e]/15 via-[#d8ff3e]/[0.06] to-transparent p-3.5 shadow-[4px_4px_0_rgba(216,255,62,0.25)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#d8ff3e] text-black"><Flame className="h-5 w-5" /></span>
                  <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#d8ff3e]">Acción principal · Entrenamiento de hoy</p><p className="mt-0.5 text-sm font-semibold text-white/45">Un toque para mantener tu progreso al día.</p></div>
                </div>
                <button
                  type="button"
                  onClick={() => !trainedToday && void completeTraining(quickTraining)}
                  disabled={!unlocked || trainedToday || Boolean(savingTrainingId)}
                  className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-5 text-sm font-black uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] ${trainedToday ? "border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 text-[#eaff93]" : "bg-[#d8ff3e] text-black hover:bg-white active:scale-[.98]"} disabled:cursor-not-allowed`}
                >
                  {savingTrainingId ? <Loader2 className="h-5 w-5 animate-spin" /> : trainedToday ? <Check className="h-5 w-5" /> : <Flame className="h-5 w-5" />}
                  {trainedToday ? "Entreno marcado" : "Marcar entreno"}
                </button>
              </div>

              {/* Phase 3: one-tap renewal + day-pass credit + next-best action */}
              {unlocked && currentMember.membership.daysRemaining <= 5 && (
                <div className="flex flex-col gap-2 border-l-4 border-l-orange-300 bg-orange-300/[0.08] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-orange-50">
                    <span className="font-black uppercase tracking-[0.14em] text-orange-200">
                      {currentMember.membership.daysRemaining <= 0 ? "Plan vencido · " : "Renovación próxima · "}
                    </span>
                    {currentMember.membership.daysRemaining <= 0
                      ? "Renová en 1 toque y no pierdas la racha."
                      : `Tu plan vence en ${currentMember.membership.daysRemaining} día${currentMember.membership.daysRemaining === 1 ? "" : "s"}.`}
                  </p>
                  <a
                    href={`/precios#inscripcion`}
                    className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#d8ff3e] px-4 py-2 text-sm font-black uppercase text-black transition hover:bg-white"
                    onClick={() => {
                      void fetch("/api/xtreme/events/track", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "cta_clicked",
                          source: "member_app",
                          memberName,
                          properties: { cta: "one_tap_renewal", daysRemaining: currentMember.membership.daysRemaining },
                        }),
                      }).catch(() => {});
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Renovar ahora
                  </a>
                </div>
              )}

              {/* Inventario de constantes — números super marcados */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                <GameStat
                  label="Racha"
                  value={`${effectiveStreak}`}
                  hint="días · toca"
                  icon={Flame}
                  tone="orange"
                  onClick={() => setOsModal({ kind: "streak" })}
                />
                <GameStat
                  label="Mes"
                  value={`${currentMember.workouts.filter((workout) => workout.completedDate.startsWith(todayIso().slice(0, 7))).length}`}
                  hint="entrenos"
                  icon={CalendarCheck}
                  tone="lime"
                />
                <GameStat
                  label="Semana"
                  value={`${weekDoneCount}/${weeklyGoal}`}
                  hint="meta · toca"
                  icon={Target}
                  tone="lime"
                  onClick={() => setOsModal({ kind: "week" })}
                />
                <GameStat
                  label="Liga"
                  value={`#${Math.max(1, leaderboard.findIndex((entry) => entry.normalizedName === currentMember.normalizedName) + 1 || 1)}`}
                  hint="ranking"
                  icon={Trophy}
                  tone="yellow"
                  onClick={() => {
                    window.location.href = "/app/comunidad";
                  }}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                <GamePanel
                  title="Próxima clase"
                  icon={CalendarClock}
                  tone="cyan"
                  compact
                  onClick={() => setTab("entrenar")}
                >
                  <p className="truncate text-lg font-black uppercase sm:text-xl">
                    {TRAININGS.find((training) => reservations[training.id]?.isMine)?.name ?? "Sin reserva"}
                  </p>
                  <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-300">
                    Ver clases →
                  </p>
                </GamePanel>
                <GamePanel title="Accesos rápidos" icon={Zap} tone="lime" compact>
                  <div className="grid grid-cols-2 gap-2">
                    <GameButton
                      full
                      className="!min-h-11 !text-[10px]"
                      onClick={() => setOsModal({ kind: "quick-train" })}
                    >
                      Entreno
                    </GameButton>
                    <GameButton
                      full
                      variant="ghost"
                      className="!min-h-11 !text-[10px]"
                      onClick={() => setTab("progreso")}
                    >
                      Progreso
                    </GameButton>
                  </div>
                </GamePanel>
              </div>

              {unlocked && nextBestAction && (
                <div
                  id={nextBestAction.href.startsWith("#") ? nextBestAction.href.slice(1) : undefined}
                  className="border-[3px] border-cyan-300/55 bg-gradient-to-br from-cyan-400/[0.1] to-transparent p-4 shadow-[4px_4px_0_rgba(34,211,238,0.2)] sm:p-5"
                >
                  <GameLabel tone="cyan">Misión actual · siguiente paso</GameLabel>
                  <h3 className="mt-2 text-lg font-black uppercase text-white sm:text-xl">
                    {nextBestAction.title}
                  </h3>
                  <p className="mt-2 text-sm font-bold text-white/60">{nextBestAction.body}</p>
                  <GameButton
                    variant="cyan"
                    className="mt-4"
                    onClick={() => {
                      void fetch("/api/xtreme/events/track", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "recommendation_acted",
                          source: "member_app",
                          memberName,
                          properties: { kind: nextBestAction.kind },
                        }),
                      }).catch(() => {});
                      if (nextBestAction.href.startsWith("#")) {
                        if (
                          nextBestAction.kind === "train_today" ||
                          nextBestAction.kind === "protect_streak" ||
                          nextBestAction.kind === "second_visit"
                        ) {
                          if (!trainedToday) void completeTraining(quickTraining);
                        } else if (nextBestAction.kind === "renew_plan") {
                          window.location.href = "/precios#inscripcion";
                        } else if (nextBestAction.href === "/app/comunidad") {
                          window.location.href = nextBestAction.href;
                        } else {
                          setTab(nextBestAction.href === "#plan" ? "progreso" : "entrenar");
                        }
                      } else {
                        window.location.href = nextBestAction.href;
                      }
                    }}
                  >
                    {nextBestAction.cta}
                  </GameButton>
                </div>
              )}

              {gami ? (
                <>
                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-[.95fr_1.05fr]">
                    <button
                      type="button"
                      onClick={() => setOsModal({ kind: "streak" })}
                      className="relative w-full overflow-hidden border-[3px] border-orange-400/50 bg-gradient-to-br from-orange-400/[0.1] to-transparent p-4 text-left shadow-[4px_4px_0_rgba(251,146,60,0.25)] sm:p-5"
                    >
                      <GameLabel tone="orange" className="mb-2 text-center">
                        Racha · toca para ampliar
                      </GameLabel>
                      <StreakRing
                        streak={gami.streak}
                        freezes={gami.freezesAvailable}
                        weekCount={gami.weekCount}
                        weeklyGoal={gami.weeklyGoal}
                      />
                      <p className="mt-3 text-center text-sm font-bold italic text-[#eaff93]">
                        “{dayPhrase}”
                      </p>
                      {gami.freezesAvailable > 0 && (
                        <p className="mt-3 text-center text-xs font-bold text-cyan-200/70">
                          <Snowflake className="mr-1 inline h-3.5 w-3.5" />
                          {gami.freezesAvailable === 1
                            ? "1 protector de racha disponible."
                            : `${gami.freezesAvailable} protectores de racha.`}
                        </p>
                      )}
                    </button>

                    <div className="grid gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => setOsModal({ kind: "streak" })}
                        className="border-[3px] border-cyan-300/40 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5"
                      >
                        <XpBar xp={gami.xp} level={gami.level} />
                        <p className="mt-3 text-xs font-bold text-white/45">
                          {milestoneLeft === 0
                            ? "Nivel maximo. Usted ES el gym."
                            : `${milestoneLeft.toLocaleString()} XP para el nivel ${level + 1}.`}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOsModal({ kind: "week" })}
                        className="border-[3px] border-[#d8ff3e]/40 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <GameLabel tone="lime">
                            Esta semana — {weekDoneCount}/{weeklyGoal}
                          </GameLabel>
                          {gami.weeksStreak > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-orange-200">
                              <Flame className="h-3.5 w-3.5" />
                              {gami.weeksStreak}w
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-7 gap-1">
                          {weekDates.map((date) => {
                            const done = workoutDates.has(date);
                            const isToday = date === todayIso();
                            return (
                              <div
                                key={date}
                                className={`grid aspect-square place-items-center border-[3px] text-[10px] font-black sm:text-xs ${
                                  done
                                    ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                                    : isToday
                                      ? "border-[#d8ff3e]/60 bg-black/40 text-[#eaff93]"
                                      : "border-white/15 bg-black/25 text-white/35"
                                }`}
                              >
                                {done ? <Check className="h-3.5 w-3.5" /> : dayLabel(date)}
                              </div>
                            );
                          })}
                        </div>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#d8ff3e]">
                          Toca para ajustar meta →
                        </p>
                      </button>
                    </div>
                  </div>

                  {nextBadge && (
                    <button
                      type="button"
                      onClick={() => setOsModal({ kind: "badges" })}
                      className="group flex w-full items-center gap-3 border-[3px] border-yellow-300/40 bg-yellow-300/[0.06] p-3 text-left shadow-[4px_4px_0_rgba(253,224,71,0.15)] transition sm:gap-4 sm:p-4"
                    >
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center border-2 border-black/20 ${tierStyle(nextBadge.tier).icon}`}
                      >
                        {(() => {
                          const Icon = badgeIcon(nextBadge.icon);
                          return <Icon className="h-6 w-6" />;
                        })()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <GameLabel tone="yellow">Próximo logro · toca</GameLabel>
                        <p className="truncate text-sm font-black uppercase text-white">
                          {nextBadge.name}
                        </p>
                        {nextBadge.progress && (
                          <div className="mt-2 h-2 border-[2px] border-white/15 bg-black/40">
                            <div
                              className="h-full bg-yellow-300/80 transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (nextBadge.progress.current /
                                      Math.max(1, nextBadge.progress.target)) *
                                      100,
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {nextBadge.progress && (
                        <span className="shrink-0 border-[3px] border-yellow-300/40 bg-black/40 px-2 py-1 text-sm font-black text-yellow-100">
                          {nextBadge.progress.current}/{nextBadge.progress.target}
                        </span>
                      )}
                      <ChevronRight className="h-5 w-5 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-yellow-300" />
                    </button>
                  )}
                </>
              ) : null}

              {/* Membresia + ocupacion en vivo — paneles tocables → modal */}
              <div className={`grid gap-3 sm:gap-4 ${currentMember.membership.daysRemaining > 5 ? "lg:grid-cols-[1fr_.85fr]" : ""}`}>
                {currentMember.membership.daysRemaining > 5 && (
                  <button
                    type="button"
                    onClick={() => setOsModal({ kind: "membership" })}
                    className={`w-full border-[3px] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] transition active:translate-x-px active:translate-y-px ${membershipTone}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75">
                          Membresia · toca
                        </p>
                        <h2 className="mt-2 text-2xl font-black uppercase">
                          {currentMember.membership.plan}
                        </h2>
                        <p className="mt-2 text-sm font-bold opacity-75">
                          Proximo cobro: {currentMember.membership.nextBillingDate}
                        </p>
                      </div>
                      <CreditCard className="h-8 w-8" />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="border-[3px] border-white/15 bg-black/25 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">Estado</p>
                        <p className="mt-1 truncate text-sm font-black uppercase">
                          {currentMember.membership.status}
                        </p>
                      </div>
                      <div className="border-[3px] border-white/15 bg-black/25 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">Dias</p>
                        <p className="mt-1 text-sm font-black">
                          {Math.max(0, currentMember.membership.daysRemaining)}
                        </p>
                      </div>
                      <div className="border-[3px] border-white/15 bg-black/25 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-60">Plan</p>
                        <p className="mt-1 truncate text-sm font-black">Local</p>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOsModal({ kind: "occupancy" })}
                  className="w-full border-[3px] border-cyan-300/50 bg-[#0c0c0c] p-4 text-left shadow-[4px_4px_0_rgba(0,0,0,.45)] transition active:translate-x-px active:translate-y-px"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                        Ocupacion ahora · toca
                      </p>
                      <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
                        {gymStatus?.level ?? "Cargando"}
                      </h2>
                    </div>
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300/60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-300" />
                    </span>
                  </div>
                  <div className="mt-4 h-3 border-[3px] border-white/15 bg-black/45">
                    <div
                      className="h-full bg-cyan-300 transition-all"
                      style={{ width: `${gymStatus?.occupancyPct ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm font-bold text-white/55">
                    {gymStatus
                      ? `${gymStatus.currentPeople}/${gymStatus.capacity} personas · reservas hoy: ${gymStatus.reservationsToday}`
                      : "Leyendo el gym en vivo."}
                  </p>
                </button>
              </div>

              </div>
            )}

            {tab === "entrenar" && (
              <div className="space-y-3 sm:space-y-4">
              {currentMember.trainingPlan ? (
                <div className="border-[3px] border-[#d8ff3e]/55 bg-[#d8ff3e]/[0.07] p-3 shadow-[4px_4px_0_rgba(216,255,62,0.2)] sm:p-5">
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
                        <div key={training.id} className="grid gap-3 border-[3px] border-white/20 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:gap-4 sm:p-4 md:grid-cols-[1fr_auto] md:items-center">
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

              <GamePanel title="Rutinas guiadas" icon={Video} tone="orange">
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 sm:gap-3">
                  {ROUTINES.map((routine) => (
                    <div
                      key={routine.name}
                      className="border-[3px] border-white/15 bg-black/30 p-3 shadow-[3px_3px_0_rgba(0,0,0,.4)]"
                    >
                      <GameLabel tone="orange">{routine.level}</GameLabel>
                      <h3 className="mt-2 font-black uppercase">{routine.name}</h3>
                      <ul className="mt-3 space-y-1.5 text-sm font-bold text-white/55">
                        {routine.exercises.map((exercise) => (
                          <li key={exercise} className="border-l-[3px] border-white/20 pl-2">
                            {exercise}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="mt-3 inline-flex min-h-10 items-center gap-2 border-[3px] border-white/15 px-3 py-2 text-xs font-black uppercase text-white/65 transition hover:border-orange-300 hover:text-orange-200"
                      >
                        <Video className="h-4 w-4" />
                        {routine.video}
                      </button>
                    </div>
                  ))}
                </div>
              </GamePanel>
              </div>
            )}

            {tab === "maquinas" && (
              <div className="space-y-3 sm:space-y-4">
                <GameCallout tone="lime" icon={ShieldCheck}>
                  <span className="font-black uppercase">Guía de máquinas · </span>
                  Tocá una tarjeta para abrir el modal con ajuste, tips y errores. Entrená fuerte sin
                  perder técnica.
                </GameCallout>

                <div className="grid grid-cols-3 gap-2">
                  {["Ajuste", "Control", "Progreso"].map((item) => (
                    <div
                      key={item}
                      className="border-[3px] border-white/20 bg-[#0c0c0c] p-2 text-center shadow-[3px_3px_0_rgba(0,0,0,.5)] sm:p-3"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#d8ff3e] sm:text-xs">
                        {item}
                      </p>
                      <p className="mt-1 hidden text-[10px] font-bold text-white/45 sm:block">
                        Antes de subir peso
                      </p>
                    </div>
                  ))}
                </div>

                <GamePanel title="Rutinas rápidas" icon={Target} tone="orange" compact>
                  <div className="space-y-2">
                    {GUIDE_WORKOUTS.map((workout) => (
                      <div
                        key={workout.goal}
                        className="border-[3px] border-white/15 bg-black/30 p-3"
                      >
                        <GameLabel tone="orange">{workout.goal}</GameLabel>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {workout.steps.map((step) => (
                            <GameChip key={step}>{step}</GameChip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GamePanel>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                  {MACHINE_GUIDE.map((machine) => (
                    <button
                      key={machine.id}
                      type="button"
                      onClick={() => setOsModal({ kind: "machine", machine })}
                      className="group overflow-hidden border-[3px] border-white/20 bg-[#0c0c0c] text-left shadow-[4px_4px_0_rgba(0,0,0,.55)] transition active:translate-x-px active:translate-y-px active:shadow-none"
                    >
                      <div className={`h-2 bg-gradient-to-r ${machine.accent}`} />
                      <div className="p-3 sm:p-4">
                        <GameLabel tone="white">{machine.zone} · {machine.level}</GameLabel>
                        <h2 className="mt-1 text-sm font-black uppercase leading-tight sm:text-lg">
                          {machine.name}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {machine.muscles.slice(0, 2).map((muscle) => (
                            <GameChip key={muscle} tone="lime">
                              {muscle}
                            </GameChip>
                          ))}
                        </div>
                        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#d8ff3e] group-hover:underline">
                          Abrir guía →
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === "progreso" && (
              <div className="space-y-3 sm:space-y-4">
              <button
                type="button"
                onClick={() => setOsModal({ kind: "badges" })}
                className="flex w-full items-center gap-3 border-[3px] border-yellow-300/45 bg-yellow-300/[0.07] p-4 text-left shadow-[4px_4px_0_rgba(253,224,71,0.15)]"
              >
                <span className="grid h-12 w-12 place-items-center border-2 border-black/20 bg-yellow-300 text-black">
                  <Award className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <GameLabel tone="yellow">Inventario de logros</GameLabel>
                  <p className="text-lg font-black uppercase">
                    {unlockedCount}/{achievements.length} desbloqueados
                  </p>
                  <p className="text-[11px] font-bold text-white/45">Tocá para abrir el modal completo</p>
                </div>
                <ChevronRight className="h-5 w-5 text-yellow-300" />
              </button>

              <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-3 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-4">
                <GameLabel tone="white" className="mb-3">
                  Vista rápida
                </GameLabel>
                {serverBadges.length ? (
                  <div className="max-h-[280px] overflow-y-auto">
                    <BadgeGallery badges={serverBadges.slice(0, 6)} />
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {achievements.slice(0, 6).map((a) => {
                      const Icon = a.icon;
                      return (
                        <div
                          key={a.id}
                          className={`flex items-center gap-3 border-[3px] p-3 ${
                            a.done
                              ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/10"
                              : "border-white/15 bg-black/30"
                          }`}
                        >
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center ${
                              a.done ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/40"
                            }`}
                          >
                            {a.done ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black uppercase">{a.name}</p>
                            <p className="truncate text-xs font-bold text-white/40">{a.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    <h2 className="text-lg font-black uppercase">Evolucion corporal</h2>
                  </div>
                  {metricTrend.length ? (
                    <div className="mt-5 space-y-5">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Peso (kg)</p>
                        <div className="mt-2 border border-white/10 bg-black/25 p-3">
                          <LineTrendChart
                            data={metricTrend.map((m) => ({ date: m.date, value: m.weightKg }))}
                            unit="kg"
                            color={CHART_LIME}
                            height={150}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Cintura (cm)</p>
                        <div className="mt-2 border border-white/10 bg-black/25 p-3">
                          <LineTrendChart
                            data={metricTrend.map((m) => ({ date: m.date, value: m.waistCm }))}
                            unit="cm"
                            color={CHART_CYAN}
                            height={150}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid h-40 place-items-center border border-white/10 bg-black/25 text-sm font-semibold text-white/40">
                      Guarde su primera medida para ver evolucion.
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-white/45">
                    Peso y cintura por fecha. Pase el cursor para ver cada registro.
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
                        <span className={`grid h-9 w-9 shrink-0 place-items-center font-black ${index === 0 ? "bg-orange-300 text-black" : "bg-white/10 text-white"}`}>
                          {index + 1}
                        </span>
                        <Avatar name={entry.memberName} photoUrl={entry.photoUrl} className="h-9 w-9" textClass="text-xs" />
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
              <div className="space-y-8">
              <button
                type="button"
                onClick={() => {
                  setTab("resumen");
                  setShowTour(true);
                }}
                className="flex w-full items-center justify-between border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 p-5 text-left transition hover:bg-[#d8ff3e]/15"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-[#d8ff3e]">Tutorial</p>
                  <p className="mt-1 font-black uppercase">Ver el tour de bienvenida otra vez</p>
                </div>
                <Sparkles className="h-6 w-6 text-[#d8ff3e]" />
              </button>
              <a href="/app/comunidad" className="flex items-center justify-between border border-cyan-300/30 bg-cyan-300/10 p-5 transition hover:bg-cyan-300/15">
                <div><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Comunidad Xtreme</p><p className="mt-1 font-black uppercase">Liga mensual, referidos y compas</p></div>
                <Users className="h-6 w-6 text-cyan-300" />
              </a>
              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Foto de perfil</h2>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-5">
                  <Avatar
                    name={memberName || "Xtreme"}
                    photoUrl={currentMember.photoUrl}
                    className="h-24 w-24"
                    textClass="text-3xl"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white ${
                        !unlocked || isUploadingPhoto ? "pointer-events-none opacity-45" : ""
                      }`}
                    >
                      {isUploadingPhoto ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {currentMember.photoUrl ? "Cambiar foto" : "Subir foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!unlocked || isUploadingPhoto}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void uploadPhoto(file);
                        }}
                      />
                    </label>
                    <p className="mt-2 text-sm font-black uppercase text-white/70">
                      {levelName} · Nv. {level}
                      {gami ? ` · ${gami.xp} XP` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-white/45">
                      Se recorta al centro y se guarda en su perfil. Aparece en el carne digital,
                      la pantalla de ingreso y el panel del coach.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-[3px] border-white/15 bg-[#0c0c0c] p-4 shadow-[4px_4px_0_rgba(0,0,0,.45)] sm:p-5">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Cédula de acceso</h2>
                </div>
                <p className="mt-2 text-sm font-bold text-white/50">
                  Con esta cédula entra a la app y a recepción (lector de barras).
                </p>
                <label className="mt-4 block">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                    Número de cédula
                  </span>
                  <input
                    value={memberCedulaInput}
                    onChange={(event) => setMemberCedulaInput(formatCedulaInput(event.target.value))}
                    inputMode="numeric"
                    disabled={!unlocked}
                    placeholder="1-2345-6789"
                    className="mt-2 w-full border-[3px] border-white/20 bg-black/40 px-3 py-3 text-center font-black tracking-widest text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
                  />
                </label>
                <GameButton
                  className="mt-3"
                  full
                  disabled={!unlocked}
                  onClick={() =>
                    void saveProfileField(
                      { cedula: memberCedulaInput },
                      "Cedula guardada. Ya puede usarla con el lector.",
                    )
                  }
                >
                  Guardar cédula
                </GameButton>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Goal className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Meta y preferencias</h2>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Mi meta</span>
                    <select
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      disabled={!unlocked}
                      className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
                    >
                      {GOALS.map((g) => (
                        <option key={g} value={g} className="bg-black">
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                      Entrenamiento favorito
                    </span>
                    <select
                      value={currentMember.favoriteTraining}
                      onChange={(event) => {
                        const favoriteTraining = event.target.value;
                        setMember((prev) =>
                          prev ? { ...prev, favoriteTraining } : prev,
                        );
                      }}
                      disabled={!unlocked}
                      className="mt-2 w-full border border-white/10 bg-black/30 px-3 py-3 font-bold text-white outline-none focus:border-[#d8ff3e] disabled:opacity-45"
                    >
                      <option value="" className="bg-black">
                        Sin preferencia
                      </option>
                      {TRAININGS.map((t) => (
                        <option key={t.id} value={t.name} className="bg-black">
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="sm:col-span-2">
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                      Meta semanal (dias)
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[2, 3, 4, 5, 6, 7].map((n) => (
                        <button
                          key={n}
                          type="button"
                          disabled={!unlocked}
                          onClick={() =>
                            void saveProfileField(
                              { weeklyGoal: n },
                              `Meta semanal: ${n} dias. A entrenar.`,
                            )
                          }
                          className={`min-w-12 border px-3 py-2.5 text-sm font-black transition disabled:opacity-45 ${
                            weeklyGoal === n
                              ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                              : "border-white/15 text-white/70 hover:border-[#d8ff3e]/50"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white/42">
                      Esta semana: {weekDoneCount}/{weeklyGoal}
                      {gami?.weeksStreak ? ` · ${gami.weeksStreak} semanas en racha` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void saveProfileField(
                      {
                        goal,
                        favoriteTraining: currentMember.favoriteTraining,
                        phone: memberPhoneInput,
                        email: memberEmailInput,
                      },
                      "Meta y contacto guardados.",
                    )
                  }
                  disabled={!unlocked}
                  className="mt-4 bg-[#d8ff3e] px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
                >
                  Guardar meta y favorito
                </button>
              </div>

              <div className="border border-white/10 bg-gradient-to-br from-[#d8ff3e]/10 to-orange-400/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Carne digital</h2>
                </div>
                {memberName ? (
                  <>
                    <div className="mt-4 border border-white/10 bg-black/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            name={memberName}
                            photoUrl={currentMember.photoUrl}
                            className="h-12 w-12"
                            textClass="text-base"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d8ff3e]">
                              Socio Xtreme · {levelName}
                            </p>
                            <p className="mt-1 truncate text-lg font-black uppercase leading-tight">{memberName}</p>
                          </div>
                        </div>
                        <span className="shrink-0 border border-[#d8ff3e]/40 bg-[#d8ff3e]/10 px-2 py-1 text-[10px] font-black uppercase text-[#eaff93]">
                          Activo
                        </span>
                      </div>
                      {pinnedBadgeIds.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {pinnedBadgeIds.map((id) => {
                            const b = serverBadges.find((x) => x.id === id);
                            return (
                              <span
                                key={id}
                                className="border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-2 py-1 text-[10px] font-black uppercase text-[#eaff93]"
                              >
                                {b?.name ?? id}
                              </span>
                            );
                          })}
                        </div>
                      )}
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
                  <Pin className="h-5 w-5 text-[#d8ff3e]" />
                  <h2 className="text-lg font-black uppercase">Showcase de badges</h2>
                </div>
                <p className="mt-2 text-xs font-semibold text-white/45">
                  Elija hasta 3 badges ganados para mostrar en su carne.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(serverBadges.length ? serverBadges.filter((b) => b.earned) : achievements.filter((a) => a.done))
                    .slice(0, 12)
                    .map((b) => {
                      const id = "id" in b ? b.id : (b as { id: string }).id;
                      const name = "name" in b ? b.name : "";
                      const pinned = pinnedBadgeIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => togglePinnedBadge(id)}
                          className={`flex items-center justify-between border px-3 py-3 text-left text-sm font-bold transition disabled:opacity-45 ${
                            pinned
                              ? "border-[#d8ff3e] bg-[#d8ff3e]/15 text-[#eaff93]"
                              : "border-white/10 bg-black/20 text-white/60 hover:border-white/25"
                          }`}
                        >
                          <span>{name}</span>
                          <span className="text-[10px] font-black uppercase tracking-wide">
                            {pinned ? "Fijado" : "Fijar"}
                          </span>
                        </button>
                      );
                    })}
                  {!unlockedCount && (
                    <p className="text-sm font-semibold text-white/45 sm:col-span-2">
                      Todavia no tiene badges. Entrene y vuelva.
                    </p>
                  )}
                </div>
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
                  El correo sirve para recuperar el PIN con codigo OTP. El telefono evita perfiles
                  duplicados.
                </p>
              </div>

              <div className="border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-yellow-300" />
                  <h2 className="text-lg font-black uppercase">Preferencias de correo</h2>
                </div>
                <div className="mt-4 grid gap-2">
                  {(
                    [
                      ["streakRisk", "Racha en riesgo"],
                      ["milestones", "Hitos y badges"],
                      ["renewalReminders", "Renovacion de membresia"],
                      ["winBack", "Volver a entrenar"],
                      ["weeklyRecap", "Resumen semanal / mensual"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => toggleNotifPref(key)}
                      className={`flex items-center justify-between border px-3 py-3 text-left text-sm font-bold transition disabled:opacity-45 ${
                        notifPrefs[key]
                          ? "border-yellow-300/50 bg-yellow-300/10 text-yellow-100"
                          : "border-white/10 bg-black/20 text-white/45"
                      }`}
                    >
                      <span>{label}</span>
                      <span className="text-[10px] font-black uppercase">
                        {notifPrefs[key] ? "On" : "Off"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
                    Aviso rapido ahora
                  </p>
                  <div className="mt-3 grid gap-2">
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
                    onClick={() => void activateReminder()}
                    disabled={!unlocked || isSendingReminder}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-yellow-300 px-4 py-3 font-black uppercase text-black transition hover:bg-white disabled:opacity-45"
                  >
                    {isSendingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                    Enviar aviso a mi correo
                  </button>
                </div>
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

      <footer className="xg-os-content mt-2 border-t-[3px] border-white/15 px-4 py-6 sm:px-8 lg:mt-4">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-[3px] border-white/15 bg-[#0c0c0c] px-4 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-white/60 shadow-[3px_3px_0_rgba(0,0,0,.5)] transition hover:border-[#d8ff3e]/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al sitio Xtreme Gym
          </Link>
        </div>
      </footer>

      {/* ─── GAME OS MODALS ─── */}
      <GameModal
        open={osModal?.kind === "machine"}
        onClose={closeOsModal}
        title={osModal?.kind === "machine" ? osModal.machine.name : "Máquina"}
        subtitle={
          osModal?.kind === "machine"
            ? `${osModal.machine.zone} · ${osModal.machine.level}`
            : undefined
        }
        icon={Dumbbell}
        tone="lime"
        size="lg"
        footer={
          <GameButton full onClick={closeOsModal}>
            Entendido
          </GameButton>
        }
      >
        {osModal?.kind === "machine" && (
          <div className="space-y-4">
            <div className={`h-3 border-2 border-black/20 bg-gradient-to-r ${osModal.machine.accent}`} />
            <div className="flex flex-wrap gap-2">
              {osModal.machine.muscles.map((m) => (
                <GameChip key={m} tone="lime">
                  {m}
                </GameChip>
              ))}
            </div>
            <GamePanel title="Ajuste inicial" tone="cyan" compact>
              <p className="text-sm font-bold leading-6 text-white/70">{osModal.machine.setup}</p>
            </GamePanel>
            <div className="grid gap-3 sm:grid-cols-2">
              <GamePanel title="Tips" tone="lime" compact>
                <ul className="space-y-2 text-sm font-bold text-white/65">
                  {osModal.machine.tips.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d8ff3e]" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </GamePanel>
              <GamePanel title="Evite" tone="orange" compact>
                <ul className="space-y-2 text-sm font-bold text-white/65">
                  {osModal.machine.mistakes.map((mistake) => (
                    <li key={mistake} className="flex gap-2">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </GamePanel>
            </div>
            <GameCallout tone="orange" icon={Timer}>
              <span className="font-black uppercase">Starter · </span>
              {osModal.machine.starter}
            </GameCallout>
          </div>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "streak"}
        onClose={closeOsModal}
        title="Tu racha y nivel"
        subtitle="Constantes del juego"
        icon={Flame}
        tone="orange"
        size="md"
      >
        {gami ? (
          <div className="space-y-4">
            <div className="border-[3px] border-orange-300/40 bg-orange-300/[0.08] p-4">
              <StreakRing
                streak={gami.streak}
                freezes={gami.freezesAvailable}
                weekCount={gami.weekCount}
                weeklyGoal={gami.weeklyGoal}
              />
            </div>
            <div className="border-[3px] border-cyan-300/40 bg-black/40 p-4">
              <XpBar xp={gami.xp} level={gami.level} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <GameStat label="Racha" value={gami.streak} hint="días" tone="orange" icon={Flame} />
              <GameStat label="Nivel" value={gami.level.index} hint={gami.level.name} tone="cyan" icon={Star} />
              <GameStat label="XP" value={gami.xp.toLocaleString()} tone="lime" icon={Zap} />
              <GameStat
                label="Protectores"
                value={gami.freezesAvailable}
                hint="rachas"
                tone="cyan"
                icon={Snowflake}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm font-bold text-white/50">Inicia sesión para ver tu racha.</p>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "week"}
        onClose={closeOsModal}
        title="Progreso semanal"
        subtitle={`Meta ${weekDoneCount}/${weeklyGoal}`}
        icon={Target}
        tone="lime"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((date) => {
              const done = workoutDates.has(date);
              const isToday = date === todayIso();
              return (
                <div
                  key={date}
                  className={`grid aspect-square place-items-center border-[3px] text-xs font-black ${
                    done
                      ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                      : isToday
                        ? "border-[#d8ff3e]/60 bg-black/40 text-[#eaff93]"
                        : "border-white/15 bg-black/25 text-white/35"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : dayLabel(date)}
                </div>
              );
            })}
          </div>
          <GameLabel>Ajustar meta / semana</GameLabel>
          <div className="flex flex-wrap gap-2">
            {Array.from(
              { length: WEEKLY_GOAL_MAX - WEEKLY_GOAL_MIN + 1 },
              (_, i) => WEEKLY_GOAL_MIN + i,
            ).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => void updateWeeklyGoal(n)}
                disabled={!unlocked}
                className={`h-11 w-11 border-[3px] text-sm font-black transition ${
                  weeklyGoal === n
                    ? "border-[#d8ff3e] bg-[#d8ff3e] text-black"
                    : "border-white/20 bg-black/30 text-white/55"
                } disabled:opacity-40`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </GameModal>

      <GameModal
        open={osModal?.kind === "membership"}
        onClose={closeOsModal}
        title={currentMember.membership.plan}
        subtitle="Membresía"
        icon={CreditCard}
        tone="lime"
        size="md"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <GameStat label="Estado" value={currentMember.membership.status} tone="lime" />
          <GameStat
            label="Días"
            value={Math.max(0, currentMember.membership.daysRemaining)}
            hint="restantes"
            tone="orange"
          />
          <GameStat label="Cobro" value={currentMember.membership.nextBillingDate} tone="cyan" />
        </div>
      </GameModal>

      <GameModal
        open={osModal?.kind === "occupancy"}
        onClose={closeOsModal}
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

      <GameModal
        open={osModal?.kind === "badges"}
        onClose={closeOsModal}
        title="Logros"
        subtitle={`${unlockedCount}/${achievements.length}`}
        icon={Award}
        tone="lime"
        size="lg"
      >
        {serverBadges.length ? (
          <BadgeGallery badges={serverBadges} />
        ) : (
          <div className="grid gap-2">
            {achievements.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 border-[3px] p-3 ${
                    a.done ? "border-[#d8ff3e]/50 bg-[#d8ff3e]/10" : "border-white/15 bg-black/30"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center ${
                      a.done ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/40"
                    }`}
                  >
                    {a.done ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase">{a.name}</p>
                    <p className="text-xs font-bold text-white/45">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GameModal>

      <GameModal
        open={osModal?.kind === "quick-train" || osModal?.kind === "training"}
        onClose={closeOsModal}
        title={selectedTraining?.name ?? "Marcar entreno"}
        subtitle="Check-in de hoy"
        icon={Dumbbell}
        tone="orange"
        size="md"
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <GameButton variant="ghost" full onClick={closeOsModal}>
              Cerrar
            </GameButton>
            <GameButton
              full
              variant="lime"
              disabled={!unlocked || trainedToday || Boolean(savingTrainingId)}
              onClick={() => {
                const t = selectedTraining ?? quickTraining;
                if (!trainedToday) void completeTraining(t);
                closeOsModal();
              }}
            >
              {savingTrainingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : trainedToday ? (
                <Check className="h-4 w-4" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              {trainedToday ? "Ya marcado" : "Marcar entreno"}
            </GameButton>
          </div>
        }
      >
        <div className="space-y-3">
          <GameCallout tone="lime" icon={Flame}>
            Un toque y sumás racha + XP. Elegí el entreno o usá el rápido del día.
          </GameCallout>
          <div className="grid gap-2">
            {TRAININGS.map((training) => {
              const Icon = training.icon;
              const done = completedToday.has(training.id);
              return (
                <button
                  key={training.id}
                  type="button"
                  onClick={() => setOsModal({ kind: "training", trainingId: training.id })}
                  className={`flex items-center gap-3 border-[3px] p-3 text-left transition ${
                    selectedTraining?.id === training.id ||
                    (osModal?.kind === "quick-train" && training.id === quickTraining.id)
                      ? "border-[#d8ff3e] bg-[#d8ff3e]/10"
                      : "border-white/15 bg-black/30"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center bg-gradient-to-br ${training.color} text-black`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase">{training.name}</p>
                    <p className="text-[11px] font-bold text-white/45">
                      {training.time} · {training.minutes} min · {training.intensity}
                    </p>
                  </div>
                  {done && <Check className="h-5 w-5 text-[#d8ff3e]" />}
                </button>
              );
            })}
          </div>
        </div>
      </GameModal>

    </main>
  );
}
