import type { Metadata } from "next";
import Link from "next/link";
import ExtremeGymCheckout from "./ExtremeGymCheckout";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  Star,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Xtreme Gym | Ciudad Quesada",
  description:
    "Xtreme Gym en Ciudad Quesada, San Carlos. Gimnasio completo para construir hábitos, mejorar condición física, ganar energía y entrenar con acompañamiento.",
};

const BUSINESS = {
  whatsapp: "50688984000",
  phone: "8898 4000",
  email: "xtremegymadm@gmail.com",
  location: "Ciudad Quesada, Barrio San Pablo",
  maps: "https://maps.app.goo.gl/RxUmrxqqchH5men99",
};

const waLink = (message: string) =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(message)}`;

const HERO_IMAGES = [
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

const ZONES = [
  {
    icon: Dumbbell,
    title: "Fuerza",
    eyebrow: "Pesas / máquinas",
    text: "Equipo completo para ganar fuerza, mejorar técnica y convertir el esfuerzo en progreso.",
    image: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=1000&q=84",
  },
  {
    icon: Zap,
    title: "Funcional",
    eyebrow: "HIIT / circuitos",
    text: "Sesiones dinámicas para moverse mejor, subir energía y mantener el cuerpo activo.",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=1000&q=84",
  },
  {
    icon: HeartPulse,
    title: "Cardio",
    eyebrow: "Condición / salud",
    text: "Trabajo cardiovascular para respirar mejor, rendir más y cuidar su salud todos los días.",
    image: "https://images.unsplash.com/photo-1570829460005-c840387bb1ca?auto=format&fit=crop&w=1000&q=84",
  },
  {
    icon: Flame,
    title: "Lower Lab",
    eyebrow: "Pierna / glúteo",
    text: "Pierna, glúteo y estabilidad con ejercicios pensados para avanzar sin perder control.",
    image: "https://images.unsplash.com/photo-1434596922112-19c563067271?auto=format&fit=crop&w=1000&q=84",
  },
];

const APP_FEATURES = [
  [CalendarCheck, "Reservas con cupo real"],
  [ShieldCheck, "PIN privado de socio"],
  [Users, "Ocupación del gym"],
  [Trophy, "Rachas y ranking"],
  [Timer, "Progreso corporal"],
  [QrCode, "Carné digital"],
];

const COSTS = [
  { period: "Día", price: "CRC 3.000", note: "Primer paso" },
  { period: "Semana", price: "CRC 8.000", note: "Activa el hábito" },
  { period: "Quincena", price: "CRC 13.500", note: "Mantiene el ritmo" },
  { period: "Mes", price: "CRC 23.000", note: "Compromiso completo" },
];

const QUICK_INFO = [
  { label: "Mensualidad", value: "CRC 23.000", detail: "confirme vigencia" },
  { label: "Día", value: "CRC 3.000", detail: "entrada rápida" },
  { label: "Horario", value: "5 AM - 10 PM", detail: "lunes a viernes" },
];

const PLAN_DETAILS = [
  "Equipo, ambiente y acompañamiento para entrenar mejor",
  "Clases y zonas para diferentes objetivos",
  "Reservas, rachas y progreso desde la app de socios",
  "Información vigente directo con recepción",
];

const GALLERY = [
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

const SCHEDULE = [
  { day: "Lunes a viernes", hours: "5:00 AM - 10:00 PM" },
  { day: "Sábados", hours: "6:00 AM - 6:00 PM" },
  { day: "Domingos", hours: "7:00 AM - 1:00 PM" },
];

const SENIOR_CLASSES = [
  { label: "Primera clase", time: "9:00 AM - 10:00 AM" },
  { label: "Segunda clase", time: "10:00 AM - 11:00 AM" },
];

const SOCIAL_PROOF = [
  { value: "5 AM", label: "apertura entre semana" },
  { value: "4", label: "zonas de entrenamiento" },
  { value: "3", label: "planes flexibles" },
  { value: "1", label: "app para socios" },
];

const TRANSFORM_STEPS = [
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

function ImageTile({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden bg-neutral-900 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
    </div>
  );
}

export default function ExtremeGymLandingPage() {
  return (
    <main className="min-h-screen bg-[#070707] text-white selection:bg-[#f6c400] selection:text-black">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070707]/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-[#f6c400]/50 bg-[#f6c400] text-black shadow-[0_0_28px_-12px_rgba(246,196,0,.9)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/xtreme/logo.jpg" alt="Xtreme Gym" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 text-lg font-black uppercase tracking-tight">
              Xtreme<span className="text-[#f6c400]">Gym</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-xs font-black uppercase tracking-[0.18em] text-white/58 lg:flex">
            <a href="#zonas" className="transition hover:text-white">Zonas</a>
            <a href="#planes" className="transition hover:text-white">Precios</a>
            <a href="#inscripcion" className="transition hover:text-white">Inscripción</a>
            <a href="#adultos" className="transition hover:text-white">Adultos</a>
            <a href="#app" className="transition hover:text-white">App</a>
            <a href="#contacto" className="transition hover:text-white">Contacto</a>
          </nav>

          <a
            href={waLink("Hola Xtreme Gym, quiero empezar a entrenar y conocer las opciones disponibles.")}
            className="hidden items-center gap-2 bg-[#f6c400] px-5 py-2.5 text-sm font-black uppercase text-black shadow-[0_0_30px_-14px_rgba(246,196,0,.9)] transition hover:bg-white sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2400&q=88"
            alt="Interior de gimnasio con máquinas"
            className="h-full w-full object-cover opacity-44"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,.94)_38%,rgba(7,7,7,.62)_72%,rgba(7,7,7,.34)_100%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#070707] to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col px-5 py-8 sm:px-8">
          <div className="grid flex-1 gap-10 py-8 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:py-12">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 border border-[#f6c400]/45 bg-black/45 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffe875] backdrop-blur">
                <MapPin className="h-4 w-4" />
                {BUSINESS.location}
              </div>
              <h1 className="mt-7 max-w-4xl text-[2.75rem] font-black uppercase leading-[0.86] tracking-tight min-[420px]:text-5xl sm:text-7xl lg:text-8xl">
                Entrena fuerte.
                <span className="block text-[#f6c400]">Vive con más energía.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/72">
                Un gimnasio completo en Ciudad Quesada para fuerza, funcional, cardio y hábitos
                reales. Elija su plan, reserve desde la app y empiece con un equipo pensado para avanzar.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href={waLink("Hola Xtreme Gym, quiero empezar hoy. ¿Me comparte horarios, costos y opciones de entrenamiento?")}
                  className="inline-flex min-h-14 items-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black shadow-[0_0_40px_-16px_rgba(246,196,0,.95)] transition hover:bg-white"
                >
                  Empieza hoy
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link
                  href="/app"
                  className="inline-flex min-h-14 items-center gap-2 border border-white/20 bg-white/[0.07] px-6 font-black uppercase text-white backdrop-blur transition hover:border-white/45 hover:bg-white/10"
                >
                  Ver app
                  <Smartphone className="h-5 w-5" />
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-2 border border-white/10 bg-black/45 backdrop-blur sm:grid-cols-4">
                {SOCIAL_PROOF.map((item) => (
                  <div key={item.label} className="border-r border-white/10 p-3 last:border-r-0 sm:p-4">
                    <p className="text-2xl font-black text-[#f6c400] sm:text-3xl">{item.value}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-3">
                {QUICK_INFO.map((item) => (
                  <a
                    key={item.label}
                    href={item.label === "Horario" ? "#contacto" : "#planes"}
                    className="border border-white/10 bg-white/[0.06] p-4 transition hover:border-[#f6c400]/55 hover:bg-[#f6c400]/10"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                    <p className="mt-2 text-xl font-black uppercase text-white">{item.value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f6c400]">{item.detail}</p>
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden gap-4 lg:grid lg:grid-cols-[1fr_260px]">
              <div className="relative border border-white/12 bg-black/70 p-4 shadow-2xl backdrop-blur">
                <ImageTile src={HERO_IMAGES[0].src} alt={HERO_IMAGES[0].alt} className="aspect-[4/5]" />
                <div className="absolute left-8 top-8 max-w-[230px] bg-[#f6c400] px-4 py-3 text-black">
                  <p className="text-xs font-black uppercase tracking-[0.18em]">Movimiento Xtreme</p>
                  <p className="text-2xl font-black uppercase leading-none">Fuerza con dirección</p>
                </div>
                <div className="absolute bottom-8 right-8 border border-white/15 bg-black/80 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Plan mensual</p>
                  <p className="mt-1 text-3xl font-black text-white">CRC 23.000</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[#f6c400]">confirme vigencia</p>
                </div>
              </div>

              <div className="grid gap-4">
                <ImageTile src={HERO_IMAGES[1].src} alt={HERO_IMAGES[1].alt} className="aspect-square" />
                <div className="border border-[#f6c400]/45 bg-[#f6c400] p-5 text-black shadow-[0_0_36px_-18px_rgba(246,196,0,.9)]">
                  <p className="text-xs font-black uppercase tracking-[0.2em]">Empiece con decisión</p>
                  <h2 className="mt-3 text-3xl font-black uppercase leading-none">Su próximo entreno ya tiene lugar</h2>
                  <p className="mt-3 text-sm font-bold leading-6">
                    Cada entrenamiento es una decisión a favor de su salud, energía y calidad de vida.
                  </p>
                </div>
                <ImageTile src={HERO_IMAGES[2].src} alt={HERO_IMAGES[2].alt} className="aspect-[4/3]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#f6c400] px-5 py-4 text-black sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em]">
          <span>Fuerza</span>
          <span>Funcional</span>
          <span>Cardio</span>
          <span>Acompañamiento</span>
          <span>Hábitos reales</span>
          <span>Adultos mayores</span>
          <span>San Carlos</span>
        </div>
      </section>

      <section className="bg-[#0b0b0b] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Ruta simple</p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black uppercase leading-none sm:text-6xl">
                Llegar, entrenar y sostener el hábito.
              </h2>
            </div>
            <p className="max-w-2xl text-base font-semibold leading-8 text-white/58 lg:ml-auto">
              Desde la primera consulta hasta el seguimiento en la app, Xtreme Gym le da una
              ruta clara para moverse mejor, ganar fuerza y mantenerse constante.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TRANSFORM_STEPS.map((step, index) => (
              <article
                key={step.title}
                className="group border border-white/10 bg-white/[0.045] p-5 transition hover:border-[#f6c400]/55 hover:bg-[#f6c400]/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 place-items-center bg-[#f6c400] text-black">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-black leading-none text-white/[0.08] transition group-hover:text-[#f6c400]/25">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-black uppercase">{step.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/58">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-start">
          <div className="relative overflow-hidden border border-white/10 bg-black lg:sticky lg:top-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1500&q=84"
              alt="Costos Xtreme Gym"
              className="absolute inset-0 h-full w-full object-cover opacity-34"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-black/38" />
            <div className="relative p-6 sm:p-9">
              <div className="inline-flex bg-[#f6c400] px-6 py-3 text-black">
                <span className="text-5xl font-black uppercase leading-none sm:text-7xl">Costos</span>
              </div>
              <p className="mt-3 text-xl font-semibold italic text-white/78">
                El momento de comenzar es ahora.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="border border-white/12 bg-white/[0.06] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Desde</p>
                  <p className="mt-2 text-3xl font-black text-[#f6c400]">CRC 3.000</p>
                </div>
                <div className="border border-white/12 bg-white/[0.06] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Mensual</p>
                  <p className="mt-2 text-3xl font-black text-[#f6c400]">CRC 23.000</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-white/65">
                  Información: {BUSINESS.phone}
                </p>
                <a
                  href={waLink("Hola Xtreme Gym, quiero confirmar costos vigentes: día, semana, quincena o mes.")}
                  className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
                >
                  Confirmar costo
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Membresías</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Elija el ritmo que puede sostener.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-white/62">
              Día, semana, quincena o mes: lo importante es tomar la decisión y mantenerse activo.
              Recepción confirma costos, horarios y cualquier promoción vigente antes de matricular.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {COSTS.map((item) => {
                const featured = item.period === "Mes";
                return (
                  <article
                    key={item.period}
                    className={`border p-5 ${
                      featured
                        ? "border-[#f6c400] bg-[#f6c400] text-black shadow-[0_0_44px_-20px_rgba(246,196,0,.9)]"
                        : "border-white/10 bg-white/[0.045] text-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-xs font-black uppercase tracking-[0.18em] ${featured ? "text-black/55" : "text-white/45"}`}>
                          {item.note}
                        </p>
                        <h3 className="mt-2 text-2xl font-black uppercase">{item.period}</h3>
                      </div>
                      {featured && (
                        <span className="bg-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-6 text-4xl font-black uppercase leading-none">{item.price}</p>
                    <a
                      href={waLink(`Hola Xtreme Gym, me interesa el plan de ${item.period}. ¿Me confirma disponibilidad y requisitos?`)}
                      className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 text-sm font-black uppercase transition ${
                        featured ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-[#f6c400]"
                      }`}
                    >
                      Consultar plan
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </article>
                );
              })}
            </div>
            <div className="mt-7 grid gap-3">
              {PLAN_DETAILS.map((detail) => (
                <div key={detail} className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-4">
                  <CheckCircle2 className="h-5 w-5 text-[#f6c400]" />
                  <span className="font-bold text-white/72">{detail}</span>
                </div>
              ))}
            </div>
            <a
              href={waLink("Hola Xtreme Gym, quiero empezar. ¿Me confirma costos y requisitos?")}
              className="mt-7 inline-flex items-center gap-2 bg-white px-5 py-3 font-black uppercase text-black transition hover:bg-[#f6c400]"
            >
              Quiero comenzar
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <ExtremeGymCheckout />

      <section id="zonas" className="border-y border-white/10 bg-[#101010] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Entrenamiento completo</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
                Equipo, ambiente y objetivos claros.
              </h2>
            </div>
            <p className="max-w-xl text-sm font-semibold leading-7 text-white/55">
              En Xtreme encuentra el espacio, las herramientas y el acompañamiento para trabajar
              fuerza, condición, salud y confianza. Lo importante es empezar y mantenerse en movimiento.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {ZONES.map((zone) => (
              <article key={zone.title} className="group overflow-hidden border border-white/10 bg-black">
                <div className="relative aspect-[4/5] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={zone.image} alt={zone.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <zone.icon className="absolute left-5 top-5 h-8 w-8 text-[#f6c400]" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f6c400]">{zone.eyebrow}</p>
                    <h3 className="mt-2 text-3xl font-black uppercase">{zone.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-white/70">{zone.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageTile src={GALLERY[0].src} alt={GALLERY[0].label} className="aspect-[4/5] sm:row-span-2" />
            <ImageTile src={GALLERY[1].src} alt={GALLERY[1].label} className="aspect-[4/3]" />
            <ImageTile src={GALLERY[2].src} alt={GALLERY[2].label} className="aspect-[4/3]" />
          </div>

          <div className="flex flex-col justify-center border border-white/10 bg-white/[0.04] p-7">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Compromiso personal</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
              Cada entreno cuenta.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-white/60">
              El entrenamiento no es solo un hábito, es un compromiso con usted mismo.
              Cuando cuida su cuerpo, también fortalece su mente. Haga del movimiento
              parte de su estilo de vida.
            </p>
            <a
                href={waLink("Hola Xtreme Gym, quiero visitar el gym y conocer las instalaciones.")}
              className="mt-7 inline-flex w-fit items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
            >
              Conocer el gym
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <section id="adultos" className="border-y border-white/10 bg-[#f6c400] px-5 py-20 text-black sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="overflow-hidden border border-black/10 bg-black">
            <div className="relative min-h-[520px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1300&q=86"
                alt="Adultos activos entrenando bienestar"
                className="absolute inset-0 h-full w-full object-cover opacity-82"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/62 to-black/8" />
              <div className="relative flex min-h-[520px] flex-col justify-between p-7 text-white">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-[#f6c400]">Clase de</p>
                  <h2 className="mt-3 max-w-xl text-5xl font-black uppercase leading-none sm:text-7xl">
                    Adultos Mayores
                  </h2>
                </div>
                <div className="grid max-w-xl gap-4">
                  {SENIOR_CLASSES.map((item) => (
                    <div key={item.label} className="grid grid-cols-[.82fr_1.18fr] overflow-hidden border border-[#f6c400] bg-black/70">
                      <div className="grid place-items-center bg-[#f6c400] px-4 py-5 text-center text-black">
                        <span className="text-lg font-black uppercase leading-none">{item.label}</span>
                      </div>
                      <div className="grid place-items-center px-4 py-5 text-center">
                        <span className="text-lg font-black uppercase">{item.time}</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-sm font-black uppercase tracking-[0.22em] text-white/80">
                    Tres clases por semana - costo: CRC 16.000
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black/52">Bienestar y movimiento</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Nunca es tarde para sentirse mejor.
            </h2>
            <p className="mt-5 text-base font-bold leading-8 text-black/66">
              Moverse es bienestar. No importa la edad ni el punto de partida:
              cada clase es una oportunidad para cuidar su cuerpo, fortalecer su mente
              y ganar confianza en comunidad.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["3", "clases por semana"],
                ["CRC 16.000", "inversión"],
                ["8898 4000", "información"],
              ].map(([value, label]) => (
                <div key={label} className="border border-black/15 bg-white p-4">
                  <p className="text-2xl font-black uppercase">{value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-black/45">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={waLink("Hola Xtreme Gym, quiero información de la clase de Adultos Mayores.")}
                className="inline-flex items-center gap-2 bg-black px-5 py-3 font-black uppercase text-white transition hover:bg-white hover:text-black"
              >
                Consultar clase
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 border border-black/20 px-5 py-3 font-black uppercase text-black transition hover:bg-white"
              >
                Llamar
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="app" className="border-y border-white/10 bg-white px-5 py-20 text-black sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.78fr_1.22fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black/50">App de socios</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Su progreso también se organiza.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-black/62">
              Registre entrenamientos, reserve clases, revise su membresía y cuide su racha.
              La app ayuda a convertir el esfuerzo diario en seguimiento claro y motivación real.
            </p>
            <Link
              href="/app"
              className="mt-7 inline-flex items-center gap-2 bg-black px-5 py-3 font-black uppercase text-white transition hover:bg-[#f6c400] hover:text-black"
            >
              Abrir app de socios
              <Smartphone className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-[.85fr_1.15fr]">
            <div className="border border-black/10 bg-[#0b0b0b] p-4 text-white">
              <div className="border border-white/12 bg-black p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-[#f6c400]">Hoy</span>
                  <span className="text-xs font-bold text-white/45">Socio activo</span>
                </div>
                <div className="py-8">
                  <p className="text-5xl font-black text-[#f6c400]">12</p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">días de racha</p>
                  <div className="mt-6 h-3 bg-white/10">
                    <div className="h-full w-3/4 bg-[#f6c400]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["Fuerza", "Cardio", "Funcional", "Lower"].map((item) => (
                    <span key={item} className="border border-white/10 px-3 py-2 text-xs font-black uppercase text-white/65">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {APP_FEATURES.map(([Icon, label]) => (
                <div key={label as string} className="border border-black/10 bg-[#f7f7f7] p-5 transition hover:border-black/25 hover:bg-[#f6c400]/20">
                  <Icon className="h-7 w-7 text-black" />
                  <p className="mt-5 font-black uppercase">{label as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#f6c400] px-5 py-16 text-black sm:px-8">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,#000_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">Primer paso</p>
            <h2 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">
              Venga hoy, confirme su plan y empiece sin darle más vueltas.
            </h2>
          </div>
          <a
            href={waLink("Hola Xtreme Gym, quiero visitar hoy y empezar mi plan.")}
            className="inline-flex min-h-14 w-fit items-center gap-2 bg-black px-6 font-black uppercase text-white transition hover:bg-white hover:text-black"
          >
            Escribir ahora
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
      </section>

      <section id="contacto" className="border-t border-white/10 bg-[#101010] px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Contacto</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Su próximo entreno empieza aquí.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-white/60">
              {BUSINESS.location}. Escriba por WhatsApp para consultar horarios, costos,
              clases o una visita al gimnasio. Le esperamos en Xtreme Gym, donde cada día
              es una oportunidad para sentirse mejor.
            </p>
            <div className="mt-7 grid gap-3">
              {SCHEDULE.map((item) => (
                <div key={item.day} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/25 p-4">
                  <span className="flex items-center gap-3 font-black uppercase">
                    <Clock className="h-5 w-5 text-[#f6c400]" />
                    {item.day}
                  </span>
                  <span className="text-sm font-bold text-white/58">{item.hours}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid overflow-hidden border border-white/10 bg-black lg:grid-cols-[.9fr_1.1fr]">
            <ImageTile
              src="https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=84"
              alt="Persona entrenando con pesas"
              className="min-h-[360px]"
            />
            <div className="grid place-items-center p-6 text-center">
              <div>
                <MapPin className="mx-auto h-12 w-12 text-[#f6c400]" />
                <p className="mt-5 text-3xl font-black uppercase">Xtreme Gym</p>
                <p className="mt-2 text-sm font-semibold text-white/55">{BUSINESS.location}</p>
                <p className="mt-1 text-sm font-semibold text-white/42">{BUSINESS.phone} - {BUSINESS.email}</p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <a
                    href={waLink("Hola Xtreme Gym, quiero información para entrenar.")}
                    className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp
                  </a>
                  <a
                    href={BUSINESS.maps}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 border border-white/15 px-5 py-3 font-black uppercase text-white transition hover:border-white/35"
                  >
                    Cómo llegar
                    <MapPin className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mapa" className="border-t border-white/10 bg-[#070707] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Ubicación</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
                Llegue directo a Xtreme Gym.
              </h2>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-white/58">
                Estamos en {BUSINESS.location}. Abra el mapa y venga con ganas de moverse.
              </p>
            </div>
            <a
              href={BUSINESS.maps}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
            >
              Cómo llegar
              <MapPin className="h-4 w-4" />
            </a>
          </div>

          <div className="overflow-hidden border border-white/10 bg-black">
            <iframe
              title="Mapa de Xtreme Gym en Ciudad Quesada"
              src="https://www.google.com/maps?q=Xtreme%20Gym%20Ciudad%20Quesada%20Barrio%20San%20Pablo&output=embed"
              className="h-[420px] w-full border-0 grayscale invert-[.92] contrast-125 md:h-[520px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm font-bold text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>Xtreme Gym - Ciudad Quesada, Barrio San Pablo</span>
          <span className="inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-[#f6c400]" />
            Hábitos, movimiento y progreso
          </span>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/92 px-3 py-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <a
            href={waLink("Hola Xtreme Gym, quiero información para empezar a entrenar.")}
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#f6c400] px-3 text-xs font-black uppercase text-black"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <a
            href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 bg-white/[0.06] px-3 text-xs font-black uppercase text-white"
          >
            <Phone className="h-4 w-4" />
            Llamar
          </a>
          <a
            href={BUSINESS.maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 bg-white/[0.06] px-3 text-xs font-black uppercase text-white"
          >
            <MapPin className="h-4 w-4" />
            Mapa
          </a>
        </div>
      </div>
    </main>
  );
}
