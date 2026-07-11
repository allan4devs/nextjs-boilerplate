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

export const BUSINESS = {
  whatsapp: "50688984000",
  phone: "8898 4000",
  email: "xtremegymadm@gmail.com",
  location: "Ciudad Quesada, Barrio San Pablo",
  maps: "https://maps.app.goo.gl/RxUmrxqqchH5men99",
};

export const telLink = `tel:${BUSINESS.phone.replace(/\s/g, "")}`;

export const waLink = (message: string) =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;

export const NAV_LINKS = [
  { href: "/zonas", label: "Zonas", icon: Dumbbell, description: "Fuerza, funcional, cardio y lower lab" },
  { href: "/precios", label: "Precios", icon: Tag, description: "Primer día gratis y planes con pago en línea" },
  { href: "/adultos-mayores", label: "Adultos", icon: HeartPulse, description: "Tres clases por semana con acompañamiento" },
  { href: "/app", label: "App", icon: Smartphone, description: "Reservas, rachas y carné digital" },
  { href: "/preguntas", label: "Preguntas", icon: HelpCircle, description: "Dudas frecuentes antes de empezar" },
  { href: "/contacto", label: "Contacto", icon: MapPin, description: "Horario, teléfono y ubicación" },
];

export const HERO_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=86",
    alt: "Zona de máquinas y pesas en gimnasio moderno",
  },
  {
    src: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=86",
    alt: "Entrenamiento de fuerza con mancuernas",
  },
  {
    src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=86",
    alt: "Clase grupal funcional",
  },
];

export const ZONES = [
  {
    icon: Dumbbell,
    title: "Fuerza",
    eyebrow: "Pesas / máquinas",
    text: "Equipo completo para ganar fuerza, mejorar técnica y convertir el esfuerzo en progreso.",
    image: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=1000&q=84",
    details: [
      "Barras, discos, mancuernas y máquinas guiadas",
      "Progresión de cargas con técnica supervisada",
      "Ideal para hipertrofia, fuerza y composición corporal",
    ],
  },
  {
    icon: Zap,
    title: "Funcional",
    eyebrow: "HIIT / circuitos",
    text: "Sesiones dinámicas para moverse mejor, subir energía y mantener el cuerpo activo.",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1000&q=84",
    details: [
      "Circuitos de alta intensidad por tiempo",
      "Trabajo de core, coordinación y potencia",
      "Buena opción si entrena con poco tiempo disponible",
    ],
  },
  {
    icon: HeartPulse,
    title: "Cardio",
    eyebrow: "Condición / salud",
    text: "Trabajo cardiovascular para respirar mejor, rendir más y cuidar su salud todos los días.",
    image: "https://images.unsplash.com/photo-1570829460005-c840387bb1ca?auto=format&fit=crop&w=1000&q=84",
    details: [
      "Fajas, elípticas, bicicletas y escaladores",
      "Sesiones continuas o por intervalos",
      "Apoya salud cardiovascular y control de peso",
    ],
  },
  {
    icon: Flame,
    title: "Lower Lab",
    eyebrow: "Pierna / glúteo",
    text: "Pierna, glúteo y estabilidad con ejercicios pensados para avanzar sin perder control.",
    image: "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=1000&q=84",
    details: [
      "Sentadilla, peso muerto, hip thrust y accesorios",
      "Estabilidad de cadera, rodilla y tobillo",
      "Progresiones para principiantes y avanzados",
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
  { label: "Mensualidad", value: "CRC 23.000", detail: "confirme vigencia", href: "/precios" },
  { label: "Primer día", value: "Gratis", detail: "registrate en la app", href: "/primer-dia" },
  { label: "Horario", value: "5 AM - 10 PM", detail: "lunes a viernes", href: "/contacto" },
];

export const PLAN_DETAILS = [
  "Equipo, ambiente y acompañamiento para entrenar mejor",
  "Clases y zonas para diferentes objetivos",
  "Reservas, rachas y progreso desde la app de socios",
  "Información vigente directo con recepción",
];

export const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1200&q=84",
    label: "Piso de fuerza",
  },
  {
    src: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=84",
    label: "Zona funcional",
  },
  {
    src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=84",
    label: "Entreno con coach",
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
  { value: "4", label: "zonas de entrenamiento" },
  { value: "3", label: "planes flexibles" },
  { value: "1", label: "app para socios" },
];

export const TRANSFORM_STEPS = [
  {
    icon: CalendarCheck,
    title: "Elija su ritmo",
    text: "Día, semana, quincena o mensualidad para empezar sin complicarse.",
  },
  {
    icon: Dumbbell,
    title: "Entrene con estructura",
    text: "Zonas de fuerza, funcional, cardio y lower lab para objetivos distintos.",
  },
  {
    icon: Trophy,
    title: "Sostenga el avance",
    text: "Rachas, reservas y progreso desde la app para mantenerse constante.",
  },
];

export const TRUST_POINTS = [
  "Planes flexibles para probar sin compromiso largo",
  "Horario amplio para entrenar antes o después del trabajo",
  "Zonas separadas para fuerza, cardio y funcional",
  "Seguimiento digital para rachas, reservas y progreso",
];

export const FAQS = [
  {
    question: "¿Puedo ir solo un día para probar?",
    answer:
      "Sí. Tu primer día es gratis: solo registrate en la app para conocer el ambiente, entrenar y confirmar si querés continuar con semana, quincena o mensualidad.",
  },
  {
    question: "¿Los precios pueden cambiar?",
    answer:
      "Los montos publicados son referencia de la landing. Recepción confirma vigencia, promociones y requisitos antes de matricular o pagar.",
  },
  {
    question: "¿La clase de adultos mayores es para principiantes?",
    answer:
      "Sí. Está pensada para bienestar, movilidad y confianza, con horarios específicos y acompañamiento para avanzar con seguridad.",
  },
  {
    question: "¿Para qué sirve la app de socios?",
    answer:
      "La app ayuda a reservar, revisar membresía, cuidar la racha, ver progreso y mantener más claro el hábito de entrenamiento.",
  },
  {
    question: "¿Necesito experiencia previa para entrenar?",
    answer:
      "No. Puede empezar desde cero: las zonas están separadas por objetivo y siempre hay alguien para orientarle con el uso del equipo.",
  },
  {
    question: "¿Qué debo llevar el primer día?",
    answer:
      "Ropa cómoda, tenis de entrenamiento, toalla y botella de agua. Con eso ya puede hacer su primera sesión sin problema.",
  },
  {
    question: "¿Puedo pagar en línea?",
    answer:
      "Sí. En la página de precios encuentra la inscripción con pago en línea. También puede coordinar el pago directamente en recepción.",
  },
  {
    question: "¿Cuál es el horario del gimnasio?",
    answer:
      "Lunes a viernes de 5:00 AM a 10:00 PM, sábados de 6:00 AM a 6:00 PM y domingos de 7:00 AM a 1:00 PM.",
  },
];
