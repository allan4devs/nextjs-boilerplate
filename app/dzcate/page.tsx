import Image from "next/image";
import {
  BadgeCheck,
  CheckCircle2,
  Footprints,
  Heart,
  Leaf,
  MessageCircle,
  Phone,
  Shield,
  Shovel,
  Sparkles,
  Sprout,
  Star,
  Sun,
  Truck,
  Users,
} from "lucide-react";

const PHONE = "71886437";
const WHATSAPP = `https://wa.me/506${PHONE}?text=${encodeURIComponent(
  "Hola, vi la oferta de Dzcate y quiero cotizar zacate para mi jardín.",
)}`;

const FEATURES = [
  {
    icon: Footprints,
    title: "No pica",
    text: "Ideal para caminar descalzo en casa o en el jardín.",
  },
  {
    icon: Heart,
    title: "Suave y cómodo",
    text: "Perfecto para recostarse, jugar o hacer picnic.",
  },
  {
    icon: Users,
    title: "Seguro para niños y mascotas",
    text: "Suave al tacto y seguro para toda la familia.",
  },
  {
    icon: Sprout,
    title: "Excelente cobertura",
    text: "Apariencia densa y pareja en poco tiempo.",
  },
  {
    icon: Shield,
    title: "Resistente y duradero",
    text: "Aguanta sol, uso diario y el clima de Costa Rica.",
  },
  {
    icon: Shovel,
    title: "Fácil mantenimiento",
    text: "Ahorra tiempo y esfuerzo en el cuidado del césped.",
  },
  {
    icon: Sun,
    title: "Verde intenso todo el año",
    text: "Color bonito y estable en las cuatro estaciones.",
  },
  {
    icon: BadgeCheck,
    title: "Instalación profesional",
    text: "Incluida en el precio de la opción instalado.",
  },
];

const GRASSES = [
  {
    name: "Zacate Dulce",
    installed: "₡1,800",
    bare: "₡800",
    tag: "Económico",
    blurb: "Buena opción de entrada para jardines pequeños.",
  },
  {
    name: "San Agustín",
    installed: "₡2,100",
    bare: "₡1,400",
    tag: "Clásico",
    blurb: "Resistente y muy usado en patios residenciales.",
  },
  {
    name: "Bermuda",
    installed: "₡2,600",
    bare: "₡1,600",
    tag: "Deportivo",
    blurb: "Excelente para áreas de mucho uso y sol.",
  },
  {
    name: "Zoysia Toro",
    installed: "₡3,000",
    bare: "₡2,200",
    tag: "Premium",
    blurb: "El más suave y recomendado para familias.",
    highlight: true,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Escríbanos por WhatsApp",
    text: "Cuéntenos metros aproximados, zona y tipo de zacate que le interesa.",
  },
  {
    n: "02",
    title: "Cotización sin compromiso",
    text: "Le enviamos precio claro: instalado o sin instalar, con entrega.",
  },
  {
    n: "03",
    title: "Visita o agendamos",
    text: "Coordinamos medición si hace falta y la fecha de entrega o instalación.",
  },
  {
    n: "04",
    title: "Jardín listo",
    text: "Instalación profesional o entrega del material listo para colocar.",
  },
];

const ZONES = [
  "Ciudad Quesada",
  "San Carlos",
  "Florencia",
  "Aguas Zarcas",
  "Pital",
  "La Fortuna (consultar)",
  "Zarcero (consultar)",
  "Otras zonas con envío",
];

const FAQS = [
  {
    q: "¿El precio incluye la tierra o solo el zacate?",
    a: "El precio es por m² de zacate. Si su terreno necesita preparación o tierra adicional, se cotiza aparte de forma transparente.",
  },
  {
    q: "¿Cuánto tarda la instalación?",
    a: "Depende del tamaño. Un patio típico de 40–80 m² suele resolverse en el mismo día o en una jornada coordinada.",
  },
  {
    q: "¿Puedo comprar solo el zacate sin instalar?",
    a: "Sí. La opción “sin instalar” incluye el material listo para que usted o su contratista lo coloquen.",
  },
  {
    q: "¿Cómo debo regarlo los primeros días?",
    a: "Los primeros 10–14 días es clave mantener humedad constante (sin encharcar). Le damos indicaciones simples al entregar.",
  },
  {
    q: "¿Hacen garantía?",
    a: "Trabajamos con material de calidad y instalación profesional. Si algo no cuadra, lo revisamos. Satisfacción 100% es la meta.",
  },
];

const TESTIMONIALS = [
  {
    name: "María G.",
    place: "Ciudad Quesada",
    text: "Quedó hermosísimo. Los niños ya se tiran en el zacate sin que les pique. La instalación fue limpia y puntual.",
  },
  {
    name: "Carlos R.",
    place: "Florencia",
    text: "Pedí Zoysia Toro instalado. El precio fue el que cotizaron y el color se ve de revista. Recomendados.",
  },
  {
    name: "Andrea M.",
    place: "Aguas Zarcas",
    text: "Compré sin instalar y me orientaron por WhatsApp. Excelente atención y el material llegó fresco.",
  },
];

function WhatsAppButton({
  className = "",
  label = "Cotizar por WhatsApp",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={WHATSAPP}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-[#1ebe57] hover:scale-[1.02] active:scale-[0.99] ${className}`}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      {label}
    </a>
  );
}

export default function DzcatePage() {
  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-[#0f3d24]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-400 text-emerald-950">
              <Leaf className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-wide">DZCATE</p>
              <p className="text-[11px] text-emerald-100/80">Zacate premium · CR</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`tel:+506${PHONE}`}
              className="hidden items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white/95 hover:bg-white/10 sm:inline-flex"
            >
              <Phone className="h-4 w-4" />
              {PHONE}
            </a>
            <WhatsAppButton className="!px-4 !py-2.5 !text-sm" label="WhatsApp" />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#0f3d24] via-[#14532d] to-[#1a5c32] text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #a3e635 0%, transparent 40%), radial-gradient(circle at 80% 0%, #4ade80 0%, transparent 35%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-16">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-lime-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-lime-300 ring-1 ring-lime-300/30">
                <Sparkles className="h-3.5 w-3.5" />
                ¡Oferta especial!
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Zacate{" "}
                <span className="text-lime-300">Zoysia Toro</span>
              </h1>
              <p className="mt-3 text-lg text-emerald-50/90 sm:text-xl">
                El mejor zacate que puede tener. Suave, seguro y perfecto para
                toda la familia.
              </p>

              <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-lime-200">
                    Instalado por solo
                  </p>
                  <p className="mt-1 text-3xl font-black text-lime-300">
                    ₡3,000
                  </p>
                  <p className="text-sm text-emerald-100/80">por m²</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
                    Sin instalar
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">₡2,200</p>
                  <p className="text-sm text-emerald-100/80">por m²</p>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime-400 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-950">
                <BadgeCheck className="h-4 w-4" />
                Instalación incluida en opción instalado
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <WhatsAppButton />
                <a
                  href={`tel:+506${PHONE}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-5 py-3.5 text-sm font-bold text-white hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  Llamar {PHONE}
                </a>
              </div>
              <p className="mt-4 text-sm text-emerald-100/70">
                Cotice sin compromiso · Entrega rápida · Atención personalizada
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-3xl shadow-2xl shadow-black/40 ring-4 ring-lime-300/20">
                <Image
                  src="/dzcate/oferta.jpg"
                  alt="Oferta especial Zacate Zoysia Toro — Dzcate"
                  width={1004}
                  height={1600}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-emerald-900/10 bg-white">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
            {[
              {
                icon: Truck,
                title: "Entrega rápida y segura",
                text: "Coordinamos fecha y zona con usted.",
              },
              {
                icon: Shovel,
                title: "Instalación profesional",
                text: "Equipo con experiencia en jardines.",
              },
              {
                icon: BadgeCheck,
                title: "Calidad garantizada",
                text: "100% satisfacción es la meta.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl bg-emerald-50/80 px-4 py-3"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-emerald-950">{item.title}</p>
                  <p className="text-sm text-stone-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Zoysia */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              ¿Por qué elegir Zoysia Toro?
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
              Suave, seguro y de larga duración
            </h2>
            <p className="mt-3 text-stone-600">
              Diseñado para familias que quieren un jardín bonito sin
              complicaciones: no pica, se ve verde y resiste el uso diario.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl border border-emerald-900/8 bg-white p-5 shadow-sm shadow-emerald-900/5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-bold text-emerald-950">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  {f.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Pricing grid */}
        <section className="bg-emerald-950 py-14 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-lime-300">
                  Precios por m²
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                  También contamos con otros tipos de zacate
                </h2>
              </div>
              <p className="max-w-sm text-sm text-emerald-100/75">
                Precios de referencia. El total depende de metros, acceso y
                preparación del terreno. Cotice exacto por WhatsApp.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {GRASSES.map((g) => (
                <article
                  key={g.name}
                  className={`relative flex flex-col rounded-2xl p-5 ${
                    g.highlight
                      ? "bg-lime-400 text-emerald-950 shadow-xl shadow-lime-900/30 ring-2 ring-lime-200"
                      : "bg-white/10 ring-1 ring-white/10"
                  }`}
                >
                  {g.highlight && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-950 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-lime-300">
                      Recomendado
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                      g.highlight ? "text-emerald-800" : "text-lime-200/80"
                    }`}
                  >
                    {g.tag}
                  </span>
                  <h3 className="mt-1 text-xl font-black">{g.name}</h3>
                  <p
                    className={`mt-1 text-sm ${
                      g.highlight ? "text-emerald-900/80" : "text-emerald-100/70"
                    }`}
                  >
                    {g.blurb}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div
                      className={`rounded-xl p-3 ${
                        g.highlight ? "bg-emerald-950/10" : "bg-black/20"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase opacity-80">
                        Instalado
                      </p>
                      <p className="text-lg font-black">{g.installed}</p>
                      <p className="text-xs opacity-70">por m²</p>
                    </div>
                    <div
                      className={`rounded-xl p-3 ${
                        g.highlight ? "bg-emerald-950/10" : "bg-black/20"
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase opacity-80">
                        Sin instalar
                      </p>
                      <p className="text-lg font-black">{g.bare}</p>
                      <p className="text-xs opacity-70">por m²</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 text-center">
              <WhatsAppButton label="Pedir cotización ahora" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
            Cómo trabajamos
          </h2>
          <p className="mt-2 max-w-xl text-stone-600">
            Proceso simple, sin vueltas. Usted escribe y nosotros le atendemos.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <article
                key={s.n}
                className="rounded-2xl border border-emerald-900/8 bg-white p-5"
              >
                <span className="text-2xl font-black text-lime-600">{s.n}</span>
                <h3 className="mt-2 font-bold text-emerald-950">{s.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Zones + contact split */}
        <section className="bg-white py-14">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-emerald-950">
                Zonas de cobertura
              </h2>
              <p className="mt-2 text-stone-600">
                Atendemos San Carlos y alrededores. Otras zonas se cotizan con
                envío.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-2">
                {ZONES.map((z) => (
                  <li
                    key={z}
                    className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-950"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {z}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-8 text-white shadow-xl">
              <h2 className="text-2xl font-black">¡Hábleme al número!</h2>
              <p className="mt-2 text-emerald-100/90">
                Yo le atiendo y lo mando con gusto. Cotice sin compromiso por
                WhatsApp.
              </p>
              <a
                href={`tel:+506${PHONE}`}
                className="mt-6 block text-4xl font-black tracking-tight text-lime-300 hover:text-lime-200 sm:text-5xl"
              >
                {PHONE}
              </a>
              <div className="mt-6 flex flex-wrap gap-3">
                <WhatsAppButton />
                <a
                  href={`tel:+506${PHONE}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3.5 text-sm font-bold hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  Llamar ahora
                </a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-emerald-100/70">
                <Star className="h-4 w-4 text-lime-300" />
                Transforme su jardín con el mejor zacate y la mejor atención
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight text-emerald-950">
            Lo que dicen los clientes
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Testimonios de ejemplo para el prototipo — se pueden cambiar por
            fotos y reseñas reales.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="rounded-2xl border border-emerald-900/8 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex gap-0.5 text-lime-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-stone-700">
                  “{t.text}”
                </p>
                <footer className="mt-4 text-sm font-bold text-emerald-950">
                  {t.name}
                  <span className="font-normal text-stone-500">
                    {" "}
                    · {t.place}
                  </span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-emerald-900/10 bg-emerald-50/50 py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-black tracking-tight text-emerald-950">
              Preguntas frecuentes
            </h2>
            <div className="mt-8 space-y-3">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-2xl border border-emerald-900/10 bg-white p-5 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-bold text-emerald-950 marker:content-none">
                    <span className="flex items-start justify-between gap-3">
                      {f.q}
                      <span className="text-emerald-600 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="bg-lime-400 py-12">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-black text-emerald-950 sm:text-3xl">
              ¿Listo para transformar su jardín?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-emerald-950/80">
              Escriba por WhatsApp con sus metros aproximados y le armamos la
              cotización hoy.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <WhatsAppButton className="!bg-emerald-950 hover:!bg-emerald-900" />
              <a
                href={`tel:+506${PHONE}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/80 px-5 py-3.5 text-sm font-bold text-emerald-950 hover:bg-white"
              >
                <Phone className="h-4 w-4" />
                {PHONE}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-emerald-950 py-8 text-center text-sm text-emerald-100/60">
        <p className="font-bold text-emerald-50">Dzcate</p>
        <p className="mt-1">Zacate premium · Instalación y entrega en Costa Rica</p>
        <p className="mt-2">
          WhatsApp / Tel:{" "}
          <a href={`tel:+506${PHONE}`} className="text-lime-300 hover:underline">
            {PHONE}
          </a>
        </p>
        <p className="mt-4 text-xs opacity-60">
          Prototipo promocional · Precios sujetos a confirmación
        </p>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition hover:scale-105"
        aria-label="Abrir WhatsApp"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </>
  );
}
