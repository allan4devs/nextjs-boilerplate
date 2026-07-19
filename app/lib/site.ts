import {
  CalendarCheck,
  Dumbbell,
  Flame,
  HeartPulse,
  HelpCircle,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
  Tag,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import { BUSINESS } from "@/lib/constants/business";

export { BUSINESS };

export const telLink = `tel:${BUSINESS.phone.replace(/\s/g, "")}`;

export const waLink = (message: string) =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;

export const NAV_LINKS = [
  { href: "/zonas", label: "Zonas", icon: Dumbbell, description: "Calistenia, peso libre, cardio, pierna y tren superior" },
  { href: "/precios", label: "Precios", icon: Tag, description: "Primer día gratis y planes para inscribirte" },
  { href: "/adultos-mayores", label: "Adultos", icon: HeartPulse, description: "Tres clases por semana con acompañamiento" },
  { href: "/app", label: "App", icon: Smartphone, description: "Reservas, rachas y carné digital" },
  { href: "/ayuda", label: "Ayuda", icon: HelpCircle, description: "App, normas, condiciones y privacidad" },
  { href: "/contacto", label: "Contacto", icon: MapPin, description: "Horario, teléfono y ubicación" },
];

export const HERO_IMAGES = [
  {
    src: "/xtreme/piso-pesas-panoramica.webp",
    alt: "Piso de pesas y máquinas de Xtreme Gym",
  },
  {
    src: "/xtreme/maquinas-xtreme-amarillas.webp",
    alt: "Máquinas amarillas de fuerza de Xtreme Gym",
  },
  {
    src: "/xtreme/zona-funcional-clases.webp",
    alt: "Clase en la zona funcional de Xtreme Gym",
  },
];

export const ZONES = [
  {
    icon: Zap,
    title: "Calistenia",
    eyebrow: "Barras / funcional",
    text: "Un espacio para dominar tu cuerpo, mejorar la movilidad y desarrollar fuerza funcional.",
    image: "/xtreme/zona-funcional-turf.webp",
    details: [
      "Barras funcionales y ejercicios con peso corporal",
      "Trabajo de core, coordinación y control",
      "Circuitos funcionales para distintos niveles",
    ],
  },
  {
    icon: Dumbbell,
    title: "Peso libre",
    eyebrow: "Pesas / mancuernas",
    text: "Todo lo necesario para trabajar fuerza, masa muscular y progresión de cargas en serio.",
    image: "/xtreme/zona-mancuernas.webp",
    details: [
      "Mancuernas, barras, discos y bancos",
      "Opciones para principiantes y avanzados",
      "Equipo para hipertrofia, fuerza y composición corporal",
    ],
  },
  {
    icon: HeartPulse,
    title: "Cardio",
    eyebrow: "Condición / salud",
    text: "Trabajo cardiovascular para respirar mejor, rendir más y cuidar su salud todos los días.",
    image: "/xtreme/zona-cardio.webp",
    details: [
      "Fajas, elípticas, bicicletas y escaladores",
      "Sesiones continuas o por intervalos",
      "Apoya salud cardiovascular y control de peso",
    ],
  },
  {
    icon: Flame,
    title: "Pierna",
    eyebrow: "Pierna / glúteo",
    text: "Máquinas y estaciones para desarrollar pierna, glúteo, estabilidad y potencia.",
    image: "/xtreme/maquinas-fuerza-xtreme.webp",
    details: [
      "Sentadilla, peso muerto, hip thrust y accesorios",
      "Estabilidad de cadera, rodilla y tobillo",
      "Progresiones para principiantes y avanzados",
    ],
  },
  {
    icon: Dumbbell,
    title: "Tren superior",
    eyebrow: "Pecho / espalda / brazos",
    text: "Máquinas excelentes y opciones variadas para trabajar cada grupo muscular con intención.",
    image: "/xtreme/maquinas-y-entrenador-xtreme.webp",
    details: [
      "Equipos para pecho, espalda, hombros y brazos",
      "Máquinas guiadas y trabajo con peso libre",
      "Variedad para una rutina completa y progresiva",
    ],
  },
];

export const APP_FEATURES: [typeof CalendarCheck, string][] = [
  [CalendarCheck, "Reservas con cupo real"],
  [ShieldCheck, "PIN privado de socio"],
  [Dumbbell, "Guía de máquinas"],
  [Trophy, "Rachas y ranking"],
  [Timer, "Progreso corporal"],
  [QrCode, "Carné digital"],
];

export const COSTS = [
  { period: "Primer día", price: "Gratis", note: "Registrate en la app" },
  { period: "Semana", price: "CRC 8.000", note: "Activa el hábito" },
  { period: "Quincena", price: "CRC 13.500", note: "Mantiene el ritmo" },
  { period: "Mes", price: "CRC 23.000", note: "Compromiso completo" },
];

export const QUICK_INFO = [
  { label: "Primer día", value: "Gratis", detail: "probalo sin tarjeta", href: "/primer-dia" },
  { label: "Mensualidad", value: "CRC 23.000", detail: "~CRC 767/día", href: "/precios?plan=month#inscripcion" },
  { label: "Horario", value: "5 AM - 10 PM", detail: "lunes a viernes", href: "/contacto" },
];

export const PLAN_DETAILS = [
  "Acompañamiento de instructores para entrenar con dirección",
  "Medición corporal sin costo para seguir tus avances",
  "Parqueo, área para merendar y espacio infantil",
  "Máquinas excelentes de todo tipo para diferentes objetivos",
  "Reservas, rachas y progreso desde la app de socios",
];

export const GALLERY = [
  {
    src: "/xtreme/piso-maquinas-panoramica.webp",
    label: "Piso de máquinas de Xtreme Gym",
  },
  {
    src: "/xtreme/zona-entrenamiento-vip.webp",
    label: "Zona de entrenamiento VIP",
  },
  {
    src: "/xtreme/zona-funcional-amplia.webp",
    label: "Zona funcional amplia",
  },
];

export const SCHEDULE = [
  { day: "Lunes a viernes", hours: "5:00 AM - 10:00 PM" },
  { day: "Sábados", hours: "6:00 AM - 6:00 PM" },
  { day: "Domingos", hours: "7:00 AM - 1:00 PM" },
];

export const SENIOR_CLASSES = [
  { label: "Primera clase", time: "9:00 AM - 10:00 AM" },
  { label: "Segunda clase", time: "10:00 AM - 11:00 AM" },
];

export const SENIOR_BENEFITS = [
  {
    title: "Movilidad",
    text: "Trabajo articular y rango de movimiento para moverse con más soltura en el día a día.",
  },
  {
    title: "Fuerza segura",
    text: "Cargas suaves y progresivas para mantener masa muscular y prevenir caídas.",
  },
  {
    title: "Equilibrio",
    text: "Ejercicios de estabilidad y postura para ganar confianza al caminar y subir gradas.",
  },
  {
    title: "Comunidad",
    text: "Grupo pequeño, ambiente amable y acompañamiento en cada sesión.",
  },
];

export const SOCIAL_PROOF = [
  { value: "5 AM", label: "apertura entre semana" },
  { value: "5", label: "zonas de entrenamiento" },
  { value: "3", label: "planes flexibles" },
  { value: "1", label: "app para socios" },
];

export const TRANSFORM_STEPS = [
  {
    icon: CalendarCheck,
    title: "Tomá la decisión",
    text: "Elegí tu plan y comprometete con el tiempo que vas a dedicarle a tu progreso.",
  },
  {
    icon: Dumbbell,
    title: "Entrená en serio",
    text: "Aprovechá máquinas de todo tipo y zonas completas para trabajar cada objetivo.",
  },
  {
    icon: Trophy,
    title: "Sostené el compromiso",
    text: "Usá las rachas, reservas y el progreso de la app para mantenerte constante.",
  },
];

export const TRUST_POINTS = [
  "Instructores que orientan, corrigen y motivan",
  "Medición corporal sin costo para seguir el progreso",
  "Máquinas excelentes de todo tipo para un entrenamiento completo",
  "Parqueo y espacios pensados para una visita más cómoda",
];

export const FAQS = [
  {
    question: "¿Qué beneficios incluye entrenar en Xtreme Gym?",
    answer:
      "Además de las zonas y máquinas, contás con acompañamiento de instructores, medición corporal sin costo, parqueo para clientes, área para merendar y espacio infantil, sujetos a disponibilidad y normas de uso.",
  },
  {
    question: "¿El área infantil tiene servicio de cuido?",
    answer:
      "No. Es un espacio pensado para niños, pero deben permanecer bajo la supervisión y responsabilidad de la persona adulta que los acompaña. Ver también Normas del gym.",
  },
  {
    question: "¿Puedo ir solo un día para probar?",
    answer:
      "Sí. Tu primer día es gratis: registrate con tu correo, completá el perfil y el PIN, y presentate en el gym. Después podés elegir semana, quincena o mensualidad.",
  },
  {
    question: "¿Cómo pago mi plan?",
    answer:
      "En línea desde Precios o desde la app: elegís día, semana, quincena o mes, pagás de forma segura y el acceso se activa al confirmar el cobro.",
  },
  {
    question: "¿La clase de adultos mayores es para principiantes?",
    answer:
      "Sí. Está pensada para bienestar, movilidad y confianza, con horarios específicos y acompañamiento para avanzar con seguridad.",
  },
  {
    question: "¿Para qué sirve la app de socios?",
    answer:
      "Para entrar con cédula + PIN, reservar clases, ver membresía, carné digital, rachas, progreso y avisos. Guía completa en Ayuda.",
  },
  {
    question: "¿Olvidé mi PIN de la app?",
    answer:
      "En la pantalla del PIN tocá «Olvidé mi PIN», pedí el código al correo verificado de la cuenta y creá un PIN nuevo. El PIN se configura una sola vez al inicio; después solo se cambia o se recupera.",
  },
  {
    question: "¿Por qué no me deja reservar una clase?",
    answer:
      "Las reservas necesitan un plan activo, un pase del día o el primer día gratis vigente. Si ya estás en la app sin plan, al tocar Reservar te ofrecemos activar el acceso ahí mismo.",
  },
  {
    question: "¿Necesito experiencia previa para entrenar?",
    answer:
      "No. Podés empezar desde cero: las zonas están separadas por objetivo y siempre hay alguien para orientarte con el uso del equipo.",
  },
  {
    question: "¿Qué debo llevar el primer día?",
    answer:
      "Ropa cómoda, tenis de entrenamiento, toalla y botella de agua. Con eso ya podés hacer tu primera sesión sin problema.",
  },
  {
    question: "¿Puedo pagar en línea?",
    answer:
      "Sí. Entrá a Precios o usá el checkout dentro de la app, elegí el plan y completá el pago en línea.",
  },
  {
    question: "¿Cuál es el horario del gimnasio?",
    answer:
      "Lunes a viernes de 5:00 AM a 10:00 PM, sábados de 6:00 AM a 6:00 PM y domingos de 7:00 AM a 1:00 PM.",
  },
  {
    question: "¿Dónde veo las normas y la privacidad?",
    answer:
      "En el Centro de ayuda (/ayuda) tenés Normas del gym, Condiciones de uso y Política de privacidad. También están en el pie del sitio.",
  },
];
