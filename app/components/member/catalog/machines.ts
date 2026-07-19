import type { GuideWorkout, MachineGuide } from "../domain/training";

/** Extrae el ID de un video de YouTube (watch, youtu.be, shorts, embed). */
export function youtubeVideoId(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        return parts[1] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeThumb(url: string | undefined, quality: "hq" | "mq" | "sd" = "hq"): string | null {
  const id = youtubeVideoId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/${quality}default.jpg`;
}

/**
 * Guías de máquinas del Member OS.
 * Fotos: piso real de Xtreme Gym (`/public/xtreme/*`).
 * Videos: demos de técnica en YouTube (referencia de forma; el equipo en sala puede variar).
 */
export const MACHINE_GUIDE: MachineGuide[] = [
  {
    id: "leg-press",
    name: "Prensa de pierna",
    zone: "Pierna",
    level: "Base",
    muscles: ["Cuadriceps", "Gluteo", "Femoral"],
    setup:
      "Espalda completa apoyada, pies al ancho de hombros y rodillas alineadas con los pies.",
    tips: [
      "Bajá controlado sin despegar la cadera",
      "Empujá con todo el pie",
      "No bloqueés las rodillas arriba",
    ],
    mistakes: [
      "Rodillas hacia adentro",
      "Rango corto sin control",
      "Levantar la cadera del asiento",
    ],
    starter: "3 series de 10 a 12 reps con peso que puedas controlar.",
    accent: "from-yellow-300 to-orange-400",
    image: "/xtreme/maquinas-fuerza-xtreme.webp",
    images: [
      "/xtreme/maquinas-fuerza-xtreme.webp",
      "/xtreme/maquinas-xtreme-amarillas.webp",
      "/xtreme/piso-maquinas-panoramica.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=vCQAIWHIdXE",
    videoLabel: "Técnica de prensa",
  },
  {
    id: "leg-extension",
    name: "Extensión de cuádriceps",
    zone: "Pierna",
    level: "Base",
    muscles: ["Cuadriceps"],
    setup:
      "Ajustá el respaldo para que la rodilla quede alineada con el eje y el rodillo sobre el tobillo.",
    tips: [
      "Subí con control hasta casi bloquear sin rebotar",
      "Bajá en 2-3 segundos",
      "Mantené cadera pegada al asiento",
    ],
    mistakes: ["Peso excesivo y balanceo", "Rodillas hacia afuera o adentro", "Rango incompleto"],
    starter: "3 series de 12 a 15 reps, ideal al final de pierna.",
    accent: "from-amber-300 to-yellow-500",
    image: "/xtreme/maquinas-xtreme-amarillas.webp",
    images: [
      "/xtreme/maquinas-xtreme-amarillas.webp",
      "/xtreme/maquinas-fuerza-xtreme.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0",
    videoLabel: "Extensión de pierna",
  },
  {
    id: "leg-curl",
    name: "Curl femoral",
    zone: "Pierna",
    level: "Base",
    muscles: ["Femoral", "Pantorrilla", "Gluteo estabilizador"],
    setup: "Alineá la rodilla con el eje de la máquina y el rodillo sobre la parte baja de la pierna.",
    tips: ["Contraé atrás sin arquear la espalda", "No dejes caer el peso", "Usá rango completo"],
    mistakes: ["Levantar la cadera", "Mover muy rapido", "Peso excesivo"],
    starter: "3 series de 12 reps, perfecto para cerrar pierna.",
    accent: "from-lime-300 to-emerald-500",
    image: "/xtreme/maquinas-fuerza-xtreme.webp",
    images: [
      "/xtreme/maquinas-fuerza-xtreme.webp",
      "/xtreme/piso-maquinas-panoramica.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
    videoLabel: "Curl femoral",
  },
  {
    id: "hip-abductor",
    name: "Abductor de cadera",
    zone: "Pierna",
    level: "Base",
    muscles: ["Gluteo medio", "Gluteo menor", "Estabilizadores de cadera"],
    setup:
      "Espalda apoyada, almohadillas en la parte externa de los muslos y rango que no te quite la pelvis del asiento.",
    tips: [
      "Abrí con control apretando glúteo",
      "No rebotés al final del rango",
      "Respirá: exhalá al abrir",
    ],
    mistakes: ["Empujar con los pies en vez de la cadera", "Arquear la espalda baja", "Rango forzado"],
    starter: "3 series de 12 a 15 reps con tempo lento.",
    accent: "from-yellow-200 to-lime-400",
    image: "/xtreme/maquinas-xtreme-amarillas.webp",
    images: [
      "/xtreme/maquinas-xtreme-amarillas.webp",
      "/xtreme/zona-entrenamiento-vip.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=jgh6sGwtTwk",
    videoLabel: "Abductor de cadera",
  },
  {
    id: "chest-press",
    name: "Press de pecho",
    zone: "Pecho",
    level: "Base",
    muscles: ["Pecho", "Triceps", "Hombro frontal"],
    setup: "Ajustá el asiento para que las agarraderas queden a media altura del pecho.",
    tips: [
      "Mantené escápulas atrás",
      "Empujá sin despegar la espalda",
      "Regresá lento hasta sentir estiramiento",
    ],
    mistakes: ["Subir los hombros", "Rebotar el peso", "Abrir demasiado los codos"],
    starter: "3 series de 8 a 12 reps, descansando 60 a 90 segundos.",
    accent: "from-red-400 to-rose-500",
    image: "/xtreme/maquinas-y-entrenador-xtreme.webp",
    images: [
      "/xtreme/maquinas-y-entrenador-xtreme.webp",
      "/xtreme/piso-maquinas-panoramica.webp",
      "/xtreme/maquinas-fuerza-xtreme.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=xUm0BiZCWlQ",
    videoLabel: "Press de pecho en máquina",
  },
  {
    id: "pec-deck",
    name: "Pec deck / mariposa",
    zone: "Pecho",
    level: "Intermedio",
    muscles: ["Pecho", "Hombro frontal"],
    setup:
      "Asiento a altura de codos con los brazos, antebrazos en los pads y pecho alto sin hundir el pecho.",
    tips: [
      "Cerrá como si abrazaras un barril",
      "Pausa de 1 segundo al centro",
      "Abrí controlado sin soltar del todo la tensión",
    ],
    mistakes: ["Empujar con hombros hacia adelante", "Rebote en el centro", "Peso que no controlás"],
    starter: "3 series de 10 a 12 reps, buen complemento del press.",
    accent: "from-rose-400 to-pink-500",
    image: "/xtreme/piso-maquinas-panoramica.webp",
    images: [
      "/xtreme/piso-maquinas-panoramica.webp",
      "/xtreme/maquinas-y-entrenador-xtreme.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0",
    videoLabel: "Pec deck / fly máquina",
  },
  {
    id: "lat-pulldown",
    name: "Jalon al pecho",
    zone: "Espalda",
    level: "Base",
    muscles: ["Dorsal", "Biceps", "Espalda media"],
    setup: "Asegurá las piernas, pecho alto y agarre un poco más ancho que hombros.",
    tips: [
      "Jalá hacia la parte alta del pecho",
      "Pensá en bajar los codos",
      "Controlá el regreso sin soltar tensión",
    ],
    mistakes: ["Jalar detras de la nuca", "Usar impulso del torso", "Encoger los hombros"],
    starter: "3 series de 10 reps con pausa corta abajo.",
    accent: "from-sky-300 to-cyan-500",
    image: "/xtreme/piso-maquinas-panoramica.webp",
    images: [
      "/xtreme/piso-maquinas-panoramica.webp",
      "/xtreme/maquinas-y-entrenador-xtreme.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc",
    videoLabel: "Jalón al pecho",
  },
  {
    id: "seated-row",
    name: "Remo sentado",
    zone: "Espalda",
    level: "Intermedio",
    muscles: ["Espalda media", "Dorsal", "Biceps"],
    setup: "Pecho firme, columna neutral y agarre con brazos estirados sin redondear la espalda.",
    tips: ["Llevá los codos atrás", "Apretá espalda un segundo", "Volvé lento al inicio"],
    mistakes: ["Balancear el cuerpo", "Redondear la espalda", "Jalar solo con brazos"],
    starter: "3 series de 10 a 12 reps con tempo controlado.",
    accent: "from-cyan-300 to-blue-500",
    image: "/xtreme/maquinas-fuerza-xtreme.webp",
    images: [
      "/xtreme/maquinas-fuerza-xtreme.webp",
      "/xtreme/piso-maquinas-panoramica.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=GZbfZ033f74",
    videoLabel: "Remo en polea sentado",
  },
  {
    id: "shoulder-press",
    name: "Press de hombro",
    zone: "Hombro",
    level: "Base",
    muscles: ["Hombro", "Triceps", "Trapecio superior"],
    setup:
      "Asiento con respaldo, agarres a la altura de las orejas y pies firmes en el piso.",
    tips: [
      "Empujá hacia arriba sin arquear la lumbar",
      "No bloqueés los codos de golpe",
      "Bajá hasta ~90° de codo",
    ],
    mistakes: ["Empujar con el pecho hacia adelante", "Peso que te saca del asiento", "Encoger cuello"],
    starter: "3 series de 8 a 12 reps con control total.",
    accent: "from-violet-400 to-purple-500",
    image: "/xtreme/maquinas-y-entrenador-xtreme.webp",
    images: [
      "/xtreme/maquinas-y-entrenador-xtreme.webp",
      "/xtreme/maquinas-xtreme-amarillas.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=Wqq43dKW1TU",
    videoLabel: "Press de hombro en máquina",
  },
  {
    id: "cable-station",
    name: "Polea ajustable",
    zone: "Full body",
    level: "Versatil",
    muscles: ["Core", "Hombros", "Brazos", "Gluteo"],
    setup: "Ajustá la polea según el ejercicio y mantené una postura estable antes de iniciar.",
    tips: [
      "Empezá liviano para sentir trayectoria",
      "Mantené abdomen firme",
      "Evitá tirones bruscos",
    ],
    mistakes: ["Perder postura", "Cambiar angulo a mitad de repeticion", "Usar impulso"],
    starter: "2 a 4 series de 12 reps según el ejercicio elegido.",
    accent: "from-fuchsia-400 to-purple-500",
    image: "/xtreme/zona-funcional-turf.webp",
    images: [
      "/xtreme/zona-funcional-turf.webp",
      "/xtreme/zona-funcional-amplia.webp",
      "/xtreme/zona-mancuernas.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk",
    videoLabel: "Face pulls y trabajo en polea",
  },
  {
    id: "free-weights",
    name: "Zona de peso libre",
    zone: "Full body",
    level: "Todos",
    muscles: ["Cuerpo completo", "Estabilizadores", "Core"],
    setup:
      "Elegí mancuernas o barra con espacio libre alrededor. Revisá discos y collares antes de levantar.",
    tips: [
      "Aprendé el patrón con poco peso",
      "Pies firmes y mirada al frente",
      "Pedí spot si vas pesado en press o sentadilla",
    ],
    mistakes: [
      "Cargar más de lo que controlás",
      "Bloquear pasillos con discos",
      "Saltar el calentamiento de movilidad",
    ],
    starter: "Empezá con 2-3 movimientos compuestos: sentadilla, press y remo.",
    accent: "from-orange-400 to-amber-500",
    image: "/xtreme/zona-mancuernas.webp",
    images: [
      "/xtreme/zona-mancuernas.webp",
      "/xtreme/piso-pesas-panoramica.webp",
      "/xtreme/zona-entrenamiento-vip.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8",
    videoLabel: "Sentadilla con barra (base)",
  },
  {
    id: "cardio-zone",
    name: "Zona de cardio",
    zone: "Cardio",
    level: "Todos",
    muscles: ["Sistema cardiovascular", "Piernas", "Resistencia"],
    setup:
      "Ajustá sillín o inclinación, amarrá bien los zapatos y arrancá 3-5 min suave para calentar.",
    tips: [
      "Podés hacer intervalos (ej. 30s fuerte / 90s suave)",
      "Mantené postura erguida en elíptica y bici",
      "Hidrátate y no te colgués del manubrio",
    ],
    mistakes: ["Empezar a tope sin calentar", "Inclinación extrema sin control", "Sesiones solo en 0 de esfuerzo"],
    starter: "15-25 min: 5 calentamiento + 10 intervalos + 5 vuelta a la calma.",
    accent: "from-cyan-400 to-teal-500",
    image: "/xtreme/zona-cardio.webp",
    images: [
      "/xtreme/zona-cardio.webp",
      "/xtreme/zona-funcional-clases.webp",
    ],
    videoUrl: "https://www.youtube.com/watch?v=ml6cT4AZdqI",
    videoLabel: "Intervalos en cinta (idea)",
  },
];

export const GUIDE_WORKOUTS: GuideWorkout[] = [
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
  {
    goal: "Lower + gluteo",
    steps: ["Prensa 3x12", "Curl femoral 3x12", "Abductor 3x15", "Extensión 2x15"],
  },
  {
    goal: "Tren superior",
    steps: ["Press pecho 3x10", "Jalon 3x10", "Remo 3x10", "Press hombro 3x10"],
  },
];

export function findMachineGuide(machineId: MachineGuide["id"]) {
  return MACHINE_GUIDE.find((machine) => machine.id === machineId) ?? null;
}
