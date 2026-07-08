import type { Metadata } from "next";
import Link from "next/link";
import ExtremeGymCheckout from "../ExtremeGymCheckout";
import {
  ArrowRight,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Xtreme Gym | Opción Neon — Ciudad Quesada",
  description:
    "Propuesta de landing (versión Neon) para Xtreme Gym en Ciudad Quesada, San Carlos. Diseño oscuro y energético.",
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

const STATS = [
  { value: "₡23K", label: "Plan mensual" },
  { value: "₡3K", label: "Pase del día" },
  { value: "4", label: "Zonas de entreno" },
  { value: "5AM", label: "Lunes a viernes" },
];

const ZONES = [
  { icon: Dumbbell, title: "Fuerza", text: "Pesas y máquinas para fuerza e hipertrofia." },
  { icon: Zap, title: "Funcional", text: "HIIT y circuitos de alta intensidad." },
  { icon: HeartPulse, title: "Cardio", text: "Condición cardiovascular y salud." },
  { icon: Flame, title: "Lower Lab", text: "Pierna, glúteo y estabilidad." },
];

const COSTS = [
  { period: "Día", price: "₡3.000", note: "Primer paso", highlight: false },
  { period: "Semana", price: "₡8.000", note: "Activa el hábito", highlight: false },
  { period: "Quincena", price: "₡13.500", note: "Mantiene el ritmo", highlight: false },
  { period: "Mes", price: "₡23.000", note: "Compromiso completo", highlight: true },
];

const APP_FEATURES = [
  "Reservas con cupo real",
  "PIN privado de socio",
  "Ocupación en vivo",
  "Rachas y ranking",
  "Progreso corporal",
  "Carné digital",
];

const SCHEDULE = [
  { day: "Lun a Vie", hours: "5:00 AM – 10:00 PM" },
  { day: "Sábados", hours: "6:00 AM – 6:00 PM" },
  { day: "Domingos", hours: "7:00 AM – 1:00 PM" },
];

const GOLD = "#f6c400";

function VersionSwitcher() {
  const links = [
    { href: "/extreme-gym", label: "V1 Industrial" },
    { href: "/extreme-gym/v2", label: "V2 Studio" },
    { href: "/extreme-gym/v3", label: "V3 Neon", active: true },
  ];
  return (
    <div className="bg-[#0c0c0c] px-5 py-2 text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
        <span className="text-white/45">Propuesta · Opción Neon (3/3)</span>
        <div className="flex items-center gap-1.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2.5 py-1 transition ${
                l.active ? "bg-[#f6c400] text-black" : "text-white/55 hover:text-white"
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

export default function ExtremeGymNeonLanding() {
  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-[#f6c400] selection:text-black">
      <VersionSwitcher />

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/extreme-gym/v3" className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg ring-1 ring-[#f6c400]/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/xtreme/logo.jpg" alt="Xtreme Gym" className="h-full w-full object-cover" />
            </span>
            <span className="text-lg font-black uppercase tracking-tight">
              Xtreme<span className="text-[#f6c400]">Gym</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-white/55 md:flex">
            <a href="#zonas" className="transition hover:text-[#f6c400]">Zonas</a>
            <a href="#precios" className="transition hover:text-[#f6c400]">Precios</a>
            <a href="#inscripcion" className="transition hover:text-[#f6c400]">Inscripción</a>
            <a href="#app" className="transition hover:text-[#f6c400]">App</a>
            <a href="#contacto" className="transition hover:text-[#f6c400]">Contacto</a>
          </nav>
          <a
            href={waLink("Hola Xtreme Gym, quiero empezar a entrenar.")}
            className="inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-[#f6c400] to-[#ffd84d] px-5 py-2.5 text-sm font-black uppercase text-black transition hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=86"
            alt="Interior de gimnasio"
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(246,196,0,.22),transparent_45%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/60 via-[#050505]/85 to-[#050505]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-sm border border-[#f6c400]/40 bg-[#f6c400]/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">
            <Sparkles className="h-3.5 w-3.5" /> Ciudad Quesada · San Carlos
          </span>
          <h1 className="mt-6 text-6xl font-black uppercase leading-[0.85] tracking-tighter sm:text-8xl">
            Versión
            <br />
            más{" "}
            <span className="bg-gradient-to-r from-[#f6c400] via-[#ffe37a] to-[#f6c400] bg-clip-text text-transparent">
              saludable
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-lg font-medium text-white/65">
            Conviértete en la versión más saludable de ti. Un diseño oscuro, energético
            y directo para vender planes, clases, app, ubicación y pagos online.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#inscripcion"
              className="group inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-[#f6c400] to-[#ffd84d] px-8 py-4 font-black uppercase text-black shadow-[0_0_35px_-8px_rgba(246,196,0,.7)] transition hover:brightness-110"
            >
              Inscribirme
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </a>
            <a
              href="#precios"
              className="inline-flex items-center gap-2 rounded-sm border border-white/20 px-8 py-4 font-black uppercase text-white transition hover:border-[#f6c400] hover:text-[#f6c400]"
            >
              Ver precios
            </a>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-5 sm:px-8 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 py-8 text-center">
              <div className="text-4xl font-black text-[#f6c400] sm:text-5xl">{s.value}</div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ZONAS */}
      <section id="zonas" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Disciplinas</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Entrena a tu manera
            </h2>
          </div>
          <p className="max-w-sm text-sm font-medium text-white/50">
            Cuatro zonas para trabajar fuerza, condición, salud y confianza. Empieza donde estés.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ZONES.map((z, i) => (
            <article
              key={z.title}
              className="group relative overflow-hidden rounded-sm border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6 transition hover:border-[#f6c400]/50"
            >
              <span className="absolute right-4 top-3 text-5xl font-black text-white/[0.06] transition group-hover:text-[#f6c400]/15">
                0{i + 1}
              </span>
              <span className="grid h-12 w-12 place-items-center rounded-sm bg-gradient-to-br from-[#f6c400] to-[#ffd84d] text-black shadow-[0_0_25px_-8px_rgba(246,196,0,.8)]">
                <z.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-xl font-black uppercase">{z.title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-white/55">{z.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="border-y border-white/10 bg-[#0a0a0a] py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Membresías</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">Elige tu plan</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {COSTS.map((c) => (
              <div
                key={c.period}
                className={`relative flex flex-col rounded-sm border p-7 ${
                  c.highlight
                    ? "border-[#f6c400] bg-gradient-to-b from-[#f6c400]/15 to-transparent shadow-[0_0_45px_-14px_rgba(246,196,0,.7)]"
                    : "border-white/12 bg-white/[0.03]"
                }`}
              >
                {c.highlight && (
                  <span className="absolute -top-3 left-6 rounded-sm bg-gradient-to-r from-[#f6c400] to-[#ffd84d] px-3 py-1 text-[10px] font-black uppercase text-black">
                    Más popular
                  </span>
                )}
                <span className="text-sm font-black uppercase tracking-wide text-white/55">{c.period}</span>
                <div className="mt-4 text-4xl font-black">{c.price}</div>
                <p className="mt-2 text-sm font-semibold text-white/45">{c.note}</p>
                <a
                  href={waLink(`Hola Xtreme Gym, me interesa el plan de ${c.period}.`)}
                  className={`mt-7 rounded-sm py-3 text-center text-sm font-black uppercase transition hover:brightness-110 ${
                    c.highlight
                      ? "bg-gradient-to-r from-[#f6c400] to-[#ffd84d] text-black"
                      : "border border-white/20 text-white hover:border-[#f6c400] hover:text-[#f6c400]"
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
      <section id="app" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">App de socios</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
              Tu entreno, medido
            </h2>
            <p className="mt-5 max-w-md text-base font-medium text-white/60">
              Reserva clases, cuida tu racha y sigue tu progreso desde el celular. La constancia
              se vuelve un juego que querés ganar.
            </p>
            <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
              {APP_FEATURES.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2.5 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold"
                >
                  <span className="h-2 w-2 shrink-0 bg-[#f6c400]" style={{ boxShadow: `0 0 10px ${GOLD}` }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-sm border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1100&q=86"
              alt="Entreno con coach en Xtreme Gym"
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
          </div>
        </div>
      </section>

      {/* CTA + CONTACTO */}
      <section id="contacto" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#f6c400] to-[#ffd84d]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_15%_20%,#000,transparent_45%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="text-black">
            <h2 className="text-4xl font-black uppercase leading-none sm:text-6xl">
              Tu mejor versión empieza hoy
            </h2>
            <p className="mt-5 max-w-md text-base font-bold text-black/70">
              Escríbenos por WhatsApp y reserva tu clase de prueba. Te esperamos en {BUSINESS.location}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={waLink("Hola Xtreme Gym, quiero mi clase de prueba.")}
                className="inline-flex items-center gap-2 rounded-sm bg-black px-7 py-4 font-black uppercase text-white transition hover:scale-105"
              >
                <MessageCircle className="h-4 w-4" /> Reserva por WhatsApp
              </a>
              <a
                href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-2 rounded-sm border-2 border-black px-7 py-4 font-black uppercase text-black transition hover:bg-black hover:text-white"
              >
                <Phone className="h-4 w-4" /> {BUSINESS.phone}
              </a>
            </div>
          </div>
          <div className="rounded-sm border-2 border-black bg-black/5 p-6 text-black backdrop-blur">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <h3 className="text-lg font-black uppercase">Horario</h3>
            </div>
            <div className="mt-4 space-y-2">
              {SCHEDULE.map((s) => (
                <div key={s.day} className="flex items-center justify-between border-b border-black/15 pb-2 text-sm font-bold">
                  <span>{s.day}</span>
                  <span>{s.hours}</span>
                </div>
              ))}
            </div>
            <a
              href={BUSINESS.maps}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase underline"
            >
              <MapPin className="h-4 w-4" /> Cómo llegar
            </a>
          </div>
        </div>
      </section>

      <section id="mapa" className="border-t border-white/10 bg-[#050505] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Mapa</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
                Entrena en Ciudad Quesada
              </h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-white/55">
                Xtreme Gym está en {BUSINESS.location}. Abra el mapa y llegue directo al próximo entreno.
              </p>
            </div>
            <a
              href={BUSINESS.maps}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-[#f6c400] to-[#ffd84d] px-6 py-3 font-black uppercase text-black transition hover:brightness-110"
            >
              Cómo llegar
              <MapPin className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-hidden rounded-sm border border-[#f6c400]/30 bg-black shadow-[0_0_45px_-20px_rgba(246,196,0,.7)]">
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

      <footer className="bg-[#050505] px-5 py-8 text-center text-xs font-bold uppercase tracking-wide text-white/40 sm:px-8">
        © {new Date().getFullYear()} Xtreme Gym · Ciudad Quesada · Propuesta de sitio web (demo)
      </footer>
    </main>
  );
}
