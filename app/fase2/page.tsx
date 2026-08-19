import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Dumbbell,
  ReceiptText,
  ScanFace,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Fase 2 · Propuesta Xtreme Gym",
  description:
    "Una propuesta sencilla para conectar facturación, accesos, máquinas y control dentro de la plataforma de Xtreme Gym.",
  robots: { index: false, follow: false },
};

type Deliverable = {
  number: string;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  includes: string[];
  result: string;
  featured?: boolean;
};

const CHANGES = [
  {
    area: "Cobro",
    before: "Recepción registra el pago",
    after: "El comprobante deja estado y respaldo",
  },
  {
    area: "Ingreso",
    before: "El socio se identifica",
    after: "Se valida la membresía y queda la entrada",
  },
  {
    area: "Máquina",
    before: "Se usa o se reporta una falla",
    after: "Queda el seguimiento pendiente",
  },
];

const DELIVERABLES: Deliverable[] = [
  {
    number: "01",
    icon: ReceiptText,
    label: "Cobros + Hacienda",
    title: "Facturación electrónica",
    description:
      "Unir el cobro con el flujo fiscal acordado, respetando que Latinsoft sigue siendo hoy la fuente operativa.",
    includes: [
      "Facturas, tiquetes y notas",
      "Firma, envío, respuesta y respaldo",
    ],
    result: "Cada comprobante queda trazable de principio a fin.",
    featured: true,
  },
  {
    number: "02",
    icon: Dumbbell,
    label: "Equipos",
    title: "Control de máquinas",
    description:
      "Dar a cada máquina una ficha y un QR para consultar su información y llevar el seguimiento de su estado.",
    includes: [
      "Ficha, accesorios y guía de uso",
      "Reportes de fallas y mantenimiento",
    ],
    result: "El equipo que necesita atención deja de depender de la memoria.",
  },
  {
    number: "03",
    icon: ScanFace,
    label: "Socios",
    title: "Acceso con biometría + QR",
    description:
      "Relacionar identidad, membresía e ingreso usando la integración disponible con Latinsoft y un QR personal como alternativa.",
    includes: ["Validación de membresía", "Entradas, salidas y ocupación"],
    result: "Cada ingreso queda claro sin crear otra base de socios.",
  },
  {
    number: "04",
    icon: BarChart3,
    label: "Administración",
    title: "Control en Admin OS",
    description:
      "Juntar los resultados de cobros, accesos y máquinas en una vista sencilla para administración.",
    includes: ["Pendientes y alertas", "Historial e indicadores básicos"],
    result: "La información importante queda en un solo lugar.",
  },
];

const CONDITIONS = [
  {
    title: "Latinsoft",
    text: "Sigue siendo la fuente operativa. Antes de conectar facturación o biometría se confirma qué datos puede compartir.",
  },
  {
    title: "Accesos",
    text: "Xtreme aporta las credenciales fiscales vigentes y el acceso necesario a sus sistemas actuales.",
  },
  {
    title: "Equipo externo",
    text: "Hardware, impresoras, etiquetas, lectores y servicios de terceros no están incluidos en el precio.",
  },
];

function SectionIntro({
  label,
  title,
  description,
  light = false,
}: {
  label: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p
        className={`font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${
          light ? "text-[#f6c400]" : "text-[#8a6f00]"
        }`}
      >
        {label}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 max-w-2xl text-pretty leading-relaxed ${light ? "text-white/65" : "text-[#625b45]"}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function DeliverableCard({ item }: { item: Deliverable }) {
  const Icon = item.icon;

  return (
    <article
      className={`flex break-inside-avoid flex-col border p-6 sm:p-8 ${
        item.featured
          ? "border-[#141208] bg-[#141208] text-white"
          : "border-[#d8d2bd] bg-[#fffdf7] text-[#141208]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`grid h-12 w-12 place-items-center ${
            item.featured
              ? "bg-[#f6c400] text-[#141208]"
              : "bg-[#efeadb] text-[#7a6407]"
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span
          className={`font-mono text-sm font-bold ${item.featured ? "text-[#f6c400]" : "text-[#8a6f00]"}`}
        >
          {item.number}
        </span>
      </div>

      <p
        className={`mt-7 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
          item.featured ? "text-white/50" : "text-[#8a8168]"
        }`}
      >
        {item.label}
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">
        {item.title}
      </h3>
      <p
        className={`mt-3 text-pretty text-sm leading-relaxed ${item.featured ? "text-white/65" : "text-[#625b45]"}`}
      >
        {item.description}
      </p>

      <ul
        className={`mt-6 space-y-2 border-t pt-5 ${item.featured ? "border-white/15" : "border-[#ded8c4]"}`}
      >
        {item.includes.map((included) => (
          <li key={included} className="flex items-start gap-2.5 text-sm">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-[#b89a00]"
              aria-hidden="true"
            />
            <span
              className={item.featured ? "text-white/80" : "text-[#494431]"}
            >
              {included}
            </span>
          </li>
        ))}
      </ul>

      <p
        className={`mt-auto pt-7 text-sm font-semibold leading-relaxed ${
          item.featured ? "text-[#f6c400]" : "text-[#6f5c00]"
        }`}
      >
        {item.result}
      </p>
    </article>
  );
}

export default function Fase2Page() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f1e6] text-[#141208]">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-[#141208]/80 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center bg-[#141208] font-mono text-sm font-black text-[#f6c400]">
              X
            </span>
            <div>
              <p className="text-sm font-bold">Xtreme Gym</p>
              <p className="text-[11px] text-[#756d55]">
                Propuesta de desarrollo
              </p>
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#756d55]">
            Agosto 2026
          </p>
        </header>

        <section className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:py-28">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6f00]">
              Propuesta · Fase 2
            </p>
            <h1 className="mt-5 max-w-[11ch] text-balance text-[clamp(3.2rem,8vw,6.7rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
              Menos trabajo manual.{" "}
              <span className="text-[#8a6f00]">Más control.</span>
            </h1>
            <p className="mt-7 max-w-[42rem] text-pretty text-lg leading-relaxed text-[#585138] sm:text-xl">
              Vamos a mejorar la facturación, los accesos, las máquinas y el
              panel administrativo dentro de la plataforma que Xtreme ya usa.
            </p>
            <p className="mt-3 max-w-[40rem] text-pretty leading-relaxed text-[#756d55]">
              El objetivo es sencillo: registrar mejor, detectar problemas
              rápido y tener la información importante en un solo lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#entregas"
                className="inline-flex items-center gap-2 bg-[#141208] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#332f20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141208]"
              >
                Ver qué incluye
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#inversion"
                className="inline-flex items-center gap-2 border border-[#141208]/30 bg-[#fffdf7] px-5 py-3 text-sm font-bold transition hover:border-[#141208] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141208]"
              >
                Ver inversión
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          <aside className="border-2 border-[#141208] bg-[#fffdf7] p-7 shadow-[8px_8px_0_#f6c400] sm:p-9">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a6f00]">
              Propuesta completa
            </p>
            <p className="mt-4 font-mono text-6xl font-black tracking-[-0.06em]">
              $800
            </p>
            <p className="mt-1 text-sm font-semibold text-[#625b45]">
              USD · 4 entregas
            </p>
            <div className="my-7 h-px bg-[#d8d2bd]" />
            <ul className="space-y-4">
              {[
                "Usa la plataforma actual",
                "Cada entrega se revisa funcionando",
                "Sin licencia mensual por el software",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm font-semibold text-[#494431]"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#2f6b3a]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </div>

      <section className="border-y border-[#d8d2bd] bg-[#fffdf7] py-16 sm:py-20">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <SectionIntro
            label="En sencillo"
            title="Una acción entra. El sistema deja una respuesta clara."
            description="La Fase 2 no crea otro programa para el personal. Conecta el trabajo diario con el seguimiento que administración necesita."
          />

          <div className="mt-10 border border-[#d8d2bd]">
            {CHANGES.map((change, index) => (
              <div
                key={change.area}
                className={`grid items-center gap-4 p-5 sm:p-6 md:grid-cols-[110px_1fr_auto_1fr] ${
                  index ? "border-t border-[#d8d2bd]" : ""
                }`}
              >
                <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#8a6f00]">
                  {change.area}
                </p>
                <p className="text-sm font-semibold text-[#494431]">
                  {change.before}
                </p>
                <ArrowRight
                  className="h-4 w-4 rotate-90 text-[#a79d7d] md:rotate-0"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold">{change.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="entregas" className="scroll-mt-6 py-16 sm:py-24">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <SectionIntro
            label="Qué incluye"
            title="Cuatro entregas concretas."
            description="Cada una resuelve una parte específica de la operación y termina con un resultado que se puede revisar."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {DELIVERABLES.map((deliverable) => (
              <DeliverableCard key={deliverable.number} item={deliverable} />
            ))}
          </div>
        </div>
      </section>

      <section
        id="inversion"
        className="scroll-mt-6 bg-[#141208] py-16 text-white sm:py-24"
      >
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-16">
            <SectionIntro
              light
              label="Inversión"
              title="$800 USD en total."
              description="Cuatro pagos de $200: uno por cada entrega aprobada. Se revisa el resultado antes de continuar con la siguiente."
            />

            <div className="grid grid-cols-2 gap-px border border-white/15 bg-white/15 sm:grid-cols-4">
              {DELIVERABLES.map((deliverable) => (
                <div key={deliverable.number} className="bg-[#141208] p-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                    Entrega {deliverable.number}
                  </p>
                  <p className="mt-4 font-mono text-2xl font-black text-[#f6c400]">
                    $200
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-snug text-white/65">
                    {deliverable.title}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 border-t border-white/15 pt-8 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[#f6c400]"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-white/70">
                Desarrollo e integración dentro de la plataforma actual.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[#f6c400]"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-white/70">
                Verificación de cada entrega antes de aprobarla.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[#f6c400]"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-white/70">
                Inventario ya desarrollado, sin costo adicional de software.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#d8d2bd] bg-[#fffdf7] py-16 sm:py-20">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <SectionIntro
            label="Antes de empezar"
            title="Tres acuerdos para que no haya sorpresas."
            description="Estos puntos se confirman al iniciar y dejan claro qué necesita Xtreme y qué queda fuera de la propuesta."
          />

          <div className="mt-10 grid gap-px border border-[#d8d2bd] bg-[#d8d2bd] md:grid-cols-3">
            {CONDITIONS.map((condition, index) => (
              <article
                key={condition.title}
                className="bg-[#fffdf7] p-6 sm:p-7"
              >
                <p className="font-mono text-xs font-bold text-[#8a6f00]">
                  0{index + 1}
                </p>
                <h3 className="mt-5 text-lg font-semibold">
                  {condition.title}
                </h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-[#625b45]">
                  {condition.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
          <div className="grid gap-8 bg-[#f6c400] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">
                Siguiente paso
              </p>
              <h2 className="mt-3 max-w-[18ch] text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
                Aprobar el alcance y confirmar los accesos.
              </h2>
              <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-[#494431]">
                Con eso se define el orden de trabajo y el criterio de
                aprobación de la primera entrega.
              </p>
            </div>
            <a
              href="#entregas"
              className="inline-flex items-center justify-center gap-2 bg-[#141208] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#332f20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141208]"
            >
              Revisar alcance
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <footer className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-[#141208]/80 pt-8">
            <div>
              <p className="text-lg font-semibold">Allan Rojas</p>
              <p className="mt-1 text-xs text-[#756d55]">
                Desarrollo de software · Xtreme Gym
              </p>
            </div>
            <p className="text-right font-mono text-[10px] leading-relaxed text-[#756d55]">
              Propuesta Fase 2
              <br />
              Agosto de 2026
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
