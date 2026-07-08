import type { Metadata } from "next";
import Link from "next/link";
import ExtremeGymCheckout from "../ExtremeGymCheckout";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Xtreme Gym | Opción Studio — Ciudad Quesada",
  description:
    "Propuesta de landing (versión Studio) para Xtreme Gym en Ciudad Quesada, San Carlos. Diseño claro y editorial.",
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

const ZONES = [
  {
    icon: Dumbbell,
    title: "Fuerza",
    text: "Pesas y máquinas para ganar fuerza, mejorar técnica y ver progreso real.",
  },
  {
    icon: Zap,
    title: "Funcional",
    text: "HIIT y circuitos dinámicos para moverte mejor y subir tu energía.",
  },
  {
    icon: HeartPulse,
    title: "Cardio",
    text: "Trabajo cardiovascular para respirar mejor, rendir más y cuidar tu salud.",
  },
  {
    icon: Flame,
    title: "Lower Lab",
    text: "Pierna, glúteo y estabilidad con ejercicios para avanzar con control.",
  },
];

const COSTS = [
  { period: "Día", price: "₡3.000", note: "Primer paso", highlight: false },
  { period: "Semana", price: "₡8.000", note: "Activa el hábito", highlight: false },
  { period: "Quincena", price: "₡13.500", note: "Mantiene el ritmo", highlight: false },
  { period: "Mes", price: "₡23.000", note: "Compromiso completo", highlight: true },
];

const APP_FEATURES = [
  "Reservas de clases con cupo real",
  "PIN privado de socio",
  "Ocupación del gym en vivo",
  "Rachas, ranking y logros",
  "Progreso corporal",
  "Carné digital de acceso",
];

const SCHEDULE = [
  { day: "Lunes a viernes", hours: "5:00 AM – 10:00 PM" },
  { day: "Sábados", hours: "6:00 AM – 6:00 PM" },
  { day: "Domingos", hours: "7:00 AM – 1:00 PM" },
];

function VersionSwitcher() {
  const links = [
    { href: "/extreme-gym", label: "V1 Industrial" },
    { href: "/extreme-gym/v2", label: "V2 Studio", active: true },
    { href: "/extreme-gym/v3", label: "V3 Neon" },
  ];
  return (
    <div className="bg-black px-5 py-2 text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
        <span className="text-white/50">Propuesta · Opción Studio (2/3)</span>
        <div className="flex items-center gap-1.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2.5 py-1 transition ${
                l.active ? "bg-[#f6c400] text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ExtremeGymStudioLanding() {
  return (
    <main className="min-h-screen bg-[#f7f6f3] text-[#0b0b0b] selection:bg-[#f6c400]">
      <VersionSwitcher />

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f7f6f3]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/extreme-gym/v2" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/xtreme/logo.jpg" alt="Xtreme Gym" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-black uppercase tracking-tight">
              Xtreme<span className="text-[#c79a00]">Gym</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-black/60 md:flex">
            <a href="#zonas" className="transition hover:text-black">Zonas</a>
            <a href="#precios" className="transition hover:text-black">Precios</a>
            <a href="#inscripcion" className="transition hover:text-black">Inscripción</a>
            <a href="#app" className="transition hover:text-black">App</a>
            <a href="#contacto" className="transition hover:text-black">Contacto</a>
          </nav>
          <a
            href={waLink("Hola Xtreme Gym, quiero información para empezar a entrenar.")}
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-black uppercase text-white transition hover:bg-[#f6c400] hover:text-black"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em]">
              <span className="h-2 w-2 rounded-full bg-[#f6c400]" /> Ciudad Quesada · San Carlos
            </span>
            <h1 className="mt-6 text-5xl font-black uppercase leading-[0.92] tracking-tight sm:text-7xl">
              Conviértete en
              <span className="block">la versión</span>
              <span className="relative inline-block">
                <span className="relative z-10">más saludable</span>
                <span className="absolute inset-x-0 bottom-1.5 z-0 h-4 bg-[#f6c400]" />
              </span>
              <span className="block">de ti</span>
            </h1>
            <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-black/65">
              Una propuesta clara, cálida y comercial para mostrar precios, clases, formulario,
              pago por PayPal, app de socios y ubicación en un recorrido elegante.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#inscripcion"
                className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 font-black uppercase text-white transition hover:scale-[1.03]"
              >
                Inscribirme <ArrowUpRight className="h-4 w-4" />
              </a>
              <a
                href="#precios"
                className="inline-flex items-center gap-2 rounded-full border border-black/20 px-7 py-3.5 font-black uppercase transition hover:border-black"
              >
                Ver precios
              </a>
            </div>
            <div className="mt-10 flex gap-8">
              {[
                ["₡23K", "Mensual"],
                ["₡3K", "Día"],
                ["5AM", "L-V"],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="text-3xl font-black">{v}</div>
                  <div className="text-xs font-bold uppercase tracking-wide text-black/45">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute right-0 top-0 bottom-6 left-6 -z-0 rounded-[2rem] bg-[#f6c400]" />
            <div className="relative overflow-hidden rounded-[2rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1100&q=86"
                alt="Interior de Xtreme Gym"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl bg-black px-5 py-3 text-white shadow-xl">
              <Star className="h-5 w-5 fill-[#f6c400] text-[#f6c400]" />
              <span className="whitespace-nowrap text-sm font-black uppercase">Xtreme Gym</span>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP */}
      <div className="bg-[#f6c400]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-black sm:px-8">
          <span>Fuerza</span><span>·</span><span>Disciplina</span><span>·</span>
          <span>Comunidad</span><span>·</span><span>Resultados</span><span>·</span><span>Energía</span>
        </div>
      </div>

      {/* ZONAS */}
      <section id="zonas" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c79a00]">Entrenamiento completo</p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
            Un espacio para cada objetivo
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ZONES.map((z) => (
            <article
              key={z.title}
              className="group rounded-3xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-black/25 hover:shadow-xl"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-[#f6c400] transition group-hover:bg-[#f6c400] group-hover:text-black">
                <z.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-xl font-black uppercase">{z.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-black/60">{z.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c79a00]">Membresías</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">Precios claros</h2>
            <p className="mx-auto mt-4 max-w-lg text-sm font-medium text-black/55">
              Precios de referencia. Escríbenos por WhatsApp para promociones y planes anuales.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COSTS.map((c) => (
              <div
                key={c.period}
                className={`flex flex-col rounded-3xl border p-7 ${
                  c.highlight ? "border-black bg-black text-white" : "border-black/12 bg-[#f7f6f3]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-wide opacity-70">{c.period}</span>
                  {c.highlight && (
                    <span className="rounded-full bg-[#f6c400] px-2.5 py-1 text-[10px] font-black uppercase text-black">
                      Popular
                    </span>
                  )}
                </div>
                <div className="mt-5 text-4xl font-black">{c.price}</div>
                <p className={`mt-2 text-sm font-semibold ${c.highlight ? "text-white/60" : "text-black/50"}`}>
                  {c.note}
                </p>
                <a
                  href={waLink(`Hola Xtreme Gym, me interesa el plan de ${c.period}.`)}
                  className={`mt-7 rounded-full py-3 text-center text-sm font-black uppercase transition hover:scale-[1.02] ${
                    c.highlight ? "bg-[#f6c400] text-black" : "bg-black text-white"
                  }`}
                >
                  Lo quiero
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ExtremeGymCheckout />

      {/* APP */}
      <section id="app" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -left-3 -top-3 bottom-6 right-6 -z-0 rounded-[2rem] bg-black" />
            <div className="relative overflow-hidden rounded-[2rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1100&q=86"
                alt="Entrenamiento funcional en Xtreme Gym"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c79a00]">App de socios</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
              Tu progreso, en tu bolsillo
            </h2>
            <p className="mt-5 max-w-md text-base font-medium leading-relaxed text-black/60">
              Reserva clases, cuida tu racha y lleva tu progreso desde el celular. Todo lo que
              necesitas para mantenerte constante.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {APP_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm font-semibold">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#c79a00]" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="bg-black py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Visítanos</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">
              Empieza hoy en Xtreme
            </h2>
            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <MapPin className="mt-0.5 h-5 w-5 text-[#f6c400]" />
                <div>
                  <div className="font-black uppercase">Ubicación</div>
                  <p className="text-sm text-white/60">{BUSINESS.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="mt-0.5 h-5 w-5 text-[#f6c400]" />
                <div>
                  <div className="font-black uppercase">Teléfono / WhatsApp</div>
                  <p className="text-sm text-white/60">{BUSINESS.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="mt-0.5 h-5 w-5 text-[#f6c400]" />
                <div>
                  <div className="font-black uppercase">Horario</div>
                  {SCHEDULE.map((s) => (
                    <p key={s.day} className="text-sm text-white/60">
                      {s.day}: {s.hours}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={waLink("Hola Xtreme Gym, quiero mi clase de prueba.")}
                className="inline-flex items-center gap-2 rounded-full bg-[#f6c400] px-6 py-3 font-black uppercase text-black transition hover:scale-105"
              >
                <MessageCircle className="h-4 w-4" /> Escríbenos
              </a>
              <a
                href={BUSINESS.maps}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 font-black uppercase transition hover:border-white"
              >
                <MapPin className="h-4 w-4" /> Cómo llegar
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem]">
            <iframe
              title="Ubicación Xtreme Gym"
              src="https://www.google.com/maps?q=10.3430360,-84.4288150&z=16&output=embed"
              className="h-full min-h-[320px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <footer className="bg-black px-5 py-8 text-center text-xs font-bold uppercase tracking-wide text-white/40 sm:px-8">
        © {new Date().getFullYear()} Xtreme Gym · Ciudad Quesada · Propuesta de sitio web (demo)
      </footer>
    </main>
  );
}
