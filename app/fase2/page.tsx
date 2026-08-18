import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fase 2 · Propuesta de desarrollo",
  description:
    "Propuesta de desarrollo Fase 2 para Xtreme Gym: inventario de máquinas, QR, cobros y facturación electrónica directa con Hacienda.",
  robots: { index: false, follow: false },
};

const FOUNDATION = [
  {
    title: "App de socios",
    text: "Login por cédula, PIN, recuperación, membresía y progreso — usada a diario.",
  },
  {
    title: "Recepción & Trainer OS",
    text: "Ingreso, entrenamientos y herramientas para Verónica, Valeska, Kengie y Josué.",
  },
  {
    title: "Admin & pagos",
    text: "Gestión centralizada de socios, membresías y cobros dentro del ecosistema.",
  },
];

const COST_ROWS = [
  {
    situation: "Las máquinas no tienen ficha ni historial digital.",
    consequence:
      "Nadie sabe con certeza qué se compró, cuándo, ni cuándo tocó el último mantenimiento — hasta que algo falla.",
    fix: "Inventario + QR por máquina",
  },
  {
    situation: "Los cobros de recepción y la facturación fiscal viven en procesos separados.",
    consequence:
      "Se duplica trabajo y cuesta seguir, desde un solo lugar, qué se cobró, quién lo atendió y qué respondió Hacienda.",
    fix: "Cobro + comprobante electrónico desde Xtreme",
  },
  {
    situation: "Identificar a un socio en recepción o en piso depende de reconocerlo o buscarlo a mano.",
    consequence: "Fricción diaria para Verónica, Valeska y los entrenadores en momentos de fila o de piso lleno.",
    fix: "QR personal por socio",
  },
];

const MACHINE_MODULES = [
  {
    num: "01",
    title: "Ficha por máquina, panel único para administración",
    text: "Identificación, ubicación, categoría, grupo muscular, estado, fotografías e historial de mantenimiento — todo consultable y editable desde un mismo panel.",
    items: [
      "Nombre, marca, modelo, código interno",
      "Ubicación y categoría dentro del gimnasio",
      "Estado actual y observaciones",
      "Historial de mantenimiento con fecha",
    ],
  },
  {
    num: "02",
    title: "QR único por máquina",
    text: "Se escanea y abre la ficha: instrucciones de uso, ejercicios asociados, historial de mantenimiento y un canal directo para reportar una avería sin pasar por una hoja o un grupo de WhatsApp.",
    items: [
      "Identificación inmediata del equipo",
      "Ejercicios y grupos musculares asociados",
      "Reporte de averías desde el piso",
      "Base para estadísticas de uso futuras",
    ],
  },
  {
    num: "03",
    title: "QR personal por socio, ya dentro de la app",
    text: "Cada socio obtiene un código propio vinculado a su cuenta — una identificación rápida que recepción y entrenadores pueden usar sin depender de reconocer una cara o buscar un nombre.",
    items: [
      "Consulta rápida de identidad y estado de membresía",
      "Integración con procesos de recepción",
      "Base para futuro ingreso por QR",
      "Visible directamente desde la app del socio",
    ],
  },
];

const MONEY_MODULES = [
  {
    num: "04",
    title: "Registro de cobros con método y operador",
    text: "Cada pase del día, cobro suelto o cargo interno queda registrado con cliente, concepto, monto, método de pago y quién de recepción lo procesó.",
    items: [
      "Método de pago: SINPE, efectivo o tarjeta",
      "Operador de recepción que atendió el cobro",
      "Historial y consulta administrativa",
      "Base para cuadrar caja sin hojas sueltas",
    ],
  },
  {
    num: "05",
    title: "Facturación electrónica directa con Hacienda",
    text: "Xtreme podrá emitir desde xtremecr.com sin depender de Odoo, Latinsoft ni otro facturador. El sistema generará el comprobante electrónico, lo firmará, lo enviará directamente a Hacienda y conservará todo el historial de la operación.",
    items: [
      "Facturas, tiquetes y notas de crédito o débito",
      "XML v4.4 y firma electrónica XAdES",
      "Envío y consulta directa ante Hacienda",
      "Aceptación, rechazo, reintentos, XML y PDF",
    ],
    note: "Alcance real: Xtreme aporta sus datos fiscales y el acceso vigente de TRIBU-CR o ATV. Allan configura las credenciales de comprobantes electrónicos, la llave y firma, los consecutivos y la comunicación con Hacienda como parte de esta fase.",
  },
];

const ADMIN_ITEMS = [
  "Consultar usuarios y su QR personal",
  "Consultar máquinas y sus códigos QR",
  "Regenerar códigos cuando haga falta",
  "Abrir el registro asociado desde cualquier código",
  "Ver cobros por método, operador y estado en Hacienda",
  "Emitir, consultar y reenviar comprobantes electrónicos",
  "Mantener socios, membresías y activos unidos",
];

const ROADMAP = [
  {
    stage: "Fase 2 · ahora",
    title: "Inventario + QR + facturación",
    text: "La operación y Hacienda en un solo sistema.",
    now: true,
  },
  {
    stage: "Próximo",
    title: "Superficie VIP de Alberto",
    text: "Acceso propio y limitado, separado del Admin OS general.",
  },
  {
    stage: "Próximo",
    title: "Estadísticas de uso",
    text: "Qué máquinas se usan más, mantenimiento preventivo real.",
  },
  {
    stage: "Próximo",
    title: "Analítica financiera",
    text: "Gastos, proveedores y compras dentro del mismo sistema.",
  },
];

const PRICING_ITEMS = [
  "Sistema de inventario de máquinas con panel de administración",
  "QR individual para cada máquina, con ficha, historial y reporte de averías",
  "QR personal para cada socio, integrado a la app existente",
  "Registro de cobros de recepción con método de pago y operador",
  "Emisión de facturas, tiquetes y notas electrónicas desde xtremecr.com",
  "Generación XML v4.4, firma XAdES y comunicación directa con Hacienda",
  "Seguimiento de aceptación o rechazo, reintentos y entrega de XML y PDF",
  "Gestión de todo lo anterior desde el Admin OS actual",
  "Diseño de base de datos, lógica interna e integración con la plataforma existente",
  "Pruebas funcionales del alcance descrito",
];

const FINE_PRINT = [
  "La inversión cubre las funcionalidades descritas e integración con la plataforma existente.",
  "Xtreme aporta sus datos fiscales correctos y el acceso vigente de TRIBU-CR o ATV; la configuración técnica, firma e integración directa con Hacienda están incluidas.",
  "No se requiere contratar un facturador externo. Hardware, impresoras, etiquetas, lectores QR o servicios opcionales de terceros no están incluidos.",
  "Cambios o módulos fuera de este alcance —incluyendo la superficie VIP— se evalúan como fase posterior.",
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8a6f00]">
      {children}
    </div>
  );
}

function ModuleCard({
  num,
  title,
  text,
  items,
  note,
}: {
  num: string;
  title: string;
  text: string;
  items: string[];
  note?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 border-t border-[#e7e2d3] bg-[#fffdf7] p-7 first:border-t-0 sm:grid-cols-[64px_1fr] sm:p-8">
      <div className="font-mono text-[13px] text-[#948a6e]">{num}</div>
      <div>
        <h3 className="mb-2 text-[1.25rem] font-semibold tracking-tight text-[#141208]">{title}</h3>
        <p className="mb-4 max-w-[58ch] text-[0.95rem] text-[#585138]">{text}</p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="relative pl-4 text-[0.87rem] text-[#141208]">
              <span className="absolute left-0 top-[8px] h-[6px] w-[6px] bg-[#f6c400]" />
              {item}
            </li>
          ))}
        </ul>
        {note ? (
          <div className="mt-4 border-t border-dashed border-[#d8d2bd] pt-3 text-[0.83rem] text-[#948a6e]">
            <b className="text-[#585138]">Alcance real:</b> {note.replace("Alcance real: ", "")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Fase2Page() {
  return (
    <main className="min-h-screen bg-[#f4f1e6] text-[#141208]">
      <div className="mx-auto max-w-[840px] px-6 pb-32 sm:px-8">
        {/* Masthead */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#141208]/80 py-10">
          <div className="flex items-baseline gap-2.5 font-mono text-[12px] uppercase tracking-[0.08em] text-[#948a6e]">
            <b className="font-bold text-[#141208]">Xtreme Gym</b>
            <span>· Propuesta de desarrollo</span>
          </div>
          <div className="font-mono text-[12px] tracking-[0.04em] text-[#948a6e]">Fase 2 · Agosto 2026</div>
        </div>

        {/* Hero */}
        <div className="pb-10 pt-16">
          <span className="mb-6 inline-flex items-center gap-2 bg-[#f6c400] px-2.5 py-[5px] font-mono text-[12px] uppercase tracking-[0.14em] text-[#141208]">
            Fase 2 de la plataforma
          </span>
          <h1 className="mb-5 text-balance text-[clamp(2.1rem,4.4vw,3.1rem)] font-semibold leading-[1.08] tracking-tight text-[#141208]">
            El gimnasio ya tiene un sistema.
            <br />
            Ahora necesita que <em className="italic text-[#8a6f00]">gobierne todo lo demás.</em>
          </h1>
          <p className="max-w-[62ch] text-[1.18rem] text-[#585138]">
            La Fase 1 conectó socios, entrenadores, recepción y pagos en una sola plataforma. Lo que
            queda operando por fuera —las máquinas, el pase del día, el VIP, las facturas— sigue
            viviendo en cuadernos, WhatsApp y la memoria del turno. La Fase 2 cierra esa brecha.
          </p>

          <div className="mt-9 grid grid-cols-2 border-y border-[#e7e2d3] sm:grid-cols-4">
            {[
              ["Atención", "Eyleen & Alejandro"],
              ["Desarrollo", "Allan Rojas"],
              ["Inversión", "$800 USD"],
              ["Modalidad", "50% inicio · 50% entrega"],
            ].map(([label, value], i) => (
              <dl
                key={label}
                className={`py-4 pr-4 ${i < 3 ? "border-r border-[#e7e2d3]" : ""} ${i === 3 ? "pr-0" : ""}`}
              >
                <dt className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#948a6e]">
                  {label}
                </dt>
                <dd className="text-[15px] font-semibold text-[#141208]">{value}</dd>
              </dl>
            ))}
          </div>
        </div>

        {/* Thesis */}
        <section className="mt-16">
          <div className="border border-[#141208]/15 border-l-[3px] border-l-[#f6c400] bg-[#fffdf7] p-7 sm:p-8">
            <p className="max-w-[60ch] text-[1.28rem] italic leading-[1.42] text-[#141208]">
              No es una lista de funciones nuevas. Es la diferencia entre un gimnasio que{" "}
              <em>tiene</em> un sistema y un gimnasio que <em>opera desde</em> su sistema.
            </p>
            <footer className="mt-3.5 font-mono text-[12px] tracking-[0.03em] text-[#948a6e]">
              Resumen ejecutivo — Fase 2
            </footer>
          </div>
        </section>

        {/* Foundation */}
        <section className="mt-16">
          <SectionLabel>Lo que ya está en pie</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            La Fase 1 no fue un experimento. Es la base sobre la que se construye esto.
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Por $300 se levantó una plataforma completa y en producción. Nada de la Fase 2 empieza de
            cero: reutiliza usuarios, sesiones, pagos y arquitectura que ya funcionan todos los días en
            el gimnasio.
          </p>
          <div className="grid grid-cols-1 gap-px border border-[#e7e2d3] bg-[#e7e2d3] sm:grid-cols-3">
            {FOUNDATION.map((f) => (
              <div key={f.title} className="bg-[#fffdf7] p-4.5 pb-5">
                <span className="mb-2 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[#3f7d3f]">
                  <span className="inline-block h-[6px] w-[6px] rounded-full bg-[#3f7d3f]" />
                  En producción
                </span>
                <h4 className="mb-1 text-[0.98rem] font-bold">{f.title}</h4>
                <p className="text-[0.87rem] text-[#948a6e]">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cost table */}
        <section className="mt-16">
          <SectionLabel>Lo que todavía cuesta dinero y tiempo</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Tres puntos ciegos que la plataforma actual no cubre
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Ninguno es un capricho técnico — son cosas que hoy dependen de que alguien se acuerde,
            anote a mano o revise físicamente.
          </p>

          <div className="border border-[#141208]/15 bg-[#fffdf7]">
            <div className="hidden grid-cols-[1.3fr_1.7fr_1fr] gap-5 sm:grid">
              {["Hoy", "Cuesta", "Fase 2 resuelve"].map((h) => (
                <div key={h} className="bg-[#efeadb] px-5.5 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#948a6e]">
                  {h}
                </div>
              ))}
            </div>
            {COST_ROWS.map((row) => (
              <div
                key={row.situation}
                className="grid grid-cols-1 gap-1.5 border-t border-[#e7e2d3] px-5.5 py-5 first:border-t-0 sm:grid-cols-[1.3fr_1.7fr_1fr] sm:gap-5"
              >
                <div className="text-[0.96rem] font-bold">{row.situation}</div>
                <div className="text-[0.9rem] text-[#585138]">{row.consequence}</div>
                <div className="text-[0.86rem] font-semibold text-[#8a6f00]">{row.fix}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Machines */}
        <section className="mt-16">
          <SectionLabel>01 — Activos físicos</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Inventario de máquinas con trazabilidad real
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Cada máquina pasa a tener una ficha viva: qué es, dónde está, cómo se le da mantenimiento
            y qué historial tiene. Pensado para manejar el inventario completo del gimnasio sin
            depender de la memoria de nadie.
          </p>
          <div className="flex flex-col gap-px border border-[#e7e2d3] bg-[#e7e2d3]">
            {MACHINE_MODULES.map((m) => (
              <ModuleCard key={m.num} {...m} />
            ))}
          </div>
        </section>

        {/* Money */}
        <section className="mt-16">
          <SectionLabel>02 — Dinero</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Un recibo interno que ordena lo que hoy se cobra sin registro
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Cada cobro podrá completar su ciclo dentro de Xtreme: recepción registra el pago, el
            sistema emite el comprobante correspondiente, lo firma, lo envía a Hacienda y conserva la
            respuesta. <b className="text-[#141208]">Latinsoft puede seguir manejando el acceso
            biométrico</b>, pero la facturación deja de depender de un sistema externo.
          </p>
          <div className="flex flex-col gap-px border border-[#e7e2d3] bg-[#e7e2d3]">
            {MONEY_MODULES.map((m) => (
              <ModuleCard key={m.num} {...m} />
            ))}
          </div>

          <div className="mt-5 border border-[#141208]/15 bg-[#efeadb] p-6">
            <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#a15b00]">
              Facturación bajo control de Xtreme
            </div>
            <p className="max-w-[62ch] text-[0.9rem] text-[#585138]">
              Xtreme entrega los datos fiscales y el acceso que tenga vigente en TRIBU-CR o ATV. Allan
              se encarga de configurar credenciales, llave y firma electrónica, consecutivos, envío,
              consulta de estado y manejo de respuestas para que todo se opere desde xtremecr.com.
            </p>
          </div>
        </section>

        {/* Admin */}
        <section className="mt-16">
          <SectionLabel>03 — Administración</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Un panel, no cinco lugares distintos
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Todo lo nuevo se administra desde el mismo Admin OS que Allan, Alejandro y Eileen ya usan —
            cada quien con su PIN, su sesión y su identidad.
          </p>
          <div className="border border-[#e7e2d3] bg-[#fffdf7] p-7 sm:p-8">
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ADMIN_ITEMS.map((item) => (
                <li key={item} className="relative pl-4 text-[0.87rem] text-[#141208]">
                  <span className="absolute left-0 top-[8px] h-[6px] w-[6px] bg-[#f6c400]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Flow */}
        <section className="mt-16">
          <SectionLabel>Cómo encaja</SectionLabel>
          <h2 className="mb-7 text-balance text-[1.8rem] font-semibold tracking-tight">
            No son herramientas sueltas — es la misma plataforma cargando más peso
          </h2>
          <div className="border border-[#141208]/15 bg-[#fffdf7] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[13px]">
              {["Socios", "Entrenadores", "Recepción", "Admin", "Pagos"].map((n, i, arr) => (
                <span key={n} className="flex items-center gap-2.5">
                  <span className="border border-[#f6c400] bg-[#efeadb] px-3.5 py-2 font-semibold text-[#8a6f00]">
                    {n}
                  </span>
                  {i < arr.length - 1 ? <span className="text-[#948a6e]">→</span> : null}
                </span>
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 font-mono text-[13px]">
              {["Máquinas", "QR", "Inventario", "Cobros", "Hacienda"].map((n, i, arr) => (
                <span key={n} className="flex items-center gap-2.5">
                  <span className="border border-[#e7e2d3] bg-[#efeadb] px-3.5 py-2 font-semibold text-[#141208]">
                    {n}
                  </span>
                  {i < arr.length - 1 ? <span className="text-[#948a6e]">→</span> : null}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-[60ch] text-[0.88rem] text-[#948a6e]">
              La fila de arriba ya existe y funciona. La fila de abajo es lo que agrega la Fase 2 — y
              ambas comparten los mismos usuarios, la misma sesión y el mismo panel administrativo.
            </p>
          </div>
        </section>

        {/* Roadmap */}
        <section className="mt-16">
          <SectionLabel>Lo que viene después</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            La Fase 2 deja la cancha lista para lo que sigue
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Nada de esto está cotizado ni comprometido en esta fase — pero cada pieza de la Fase 2 es
            lo que hace posible construirlo después sin rehacer nada.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ROADMAP.map((r) => (
              <div
                key={r.title}
                className={`border bg-[#fffdf7] p-4.5 ${
                  r.now ? "border-[#f6c400] ring-1 ring-[#f6c400]" : "border-[#e7e2d3]"
                }`}
              >
                <div
                  className={`mb-2 font-mono text-[10px] uppercase tracking-[0.08em] ${
                    r.now ? "text-[#8a6f00]" : "text-[#948a6e]"
                  }`}
                >
                  {r.stage}
                </div>
                <h5 className="mb-1 text-[0.92rem] font-bold">{r.title}</h5>
                <p className="text-[0.8rem] text-[#948a6e]">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-16">
          <SectionLabel>Inversión</SectionLabel>
          <h2 className="mb-7 text-balance text-[1.8rem] font-semibold tracking-tight">
            Propuesta económica
          </h2>

          <div className="border border-[#141208]/15 bg-[#fffdf7]">
            <div className="flex flex-wrap items-center justify-between gap-5 bg-[#141208] px-7 py-6 text-[#f4f1e6]">
              <div>
                <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em] opacity-70">
                  Desarrollo Fase 2
                </div>
                <div className="text-[1.3rem] font-semibold">
                  Inventario + QR + cobros + Hacienda
                </div>
              </div>
              <div className="font-mono text-[2.4rem] font-bold tabular-nums text-[#f6c400]">$800</div>
            </div>

            <div className="px-7 pb-2 pt-6">
              <ul className="grid gap-2.5">
                {PRICING_ITEMS.map((item, i) => (
                  <li
                    key={item}
                    className={`flex gap-3 py-2.5 text-[0.92rem] ${
                      i < PRICING_ITEMS.length - 1 ? "border-b border-[#e7e2d3]" : ""
                    }`}
                  >
                    <span className="flex-shrink-0 font-bold text-[#3f7d3f]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mx-7 my-6 grid grid-cols-1 gap-px border border-[#e7e2d3] bg-[#e7e2d3] sm:grid-cols-2">
              <div className="bg-[#efeadb] px-5 py-4.5 text-center">
                <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#948a6e]">
                  50% al iniciar
                </div>
                <div className="font-mono text-[1.5rem] font-bold tabular-nums">$400</div>
              </div>
              <div className="bg-[#efeadb] px-5 py-4.5 text-center">
                <div className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#948a6e]">
                  50% contra entrega
                </div>
                <div className="font-mono text-[1.5rem] font-bold tabular-nums">$400</div>
              </div>
            </div>

            <div className="mx-7 mb-6 border border-[#bcd9bc] bg-[#eef6ee] p-4.5 text-[0.86rem] text-[#585138]">
              <b className="text-[#141208]">Cortesía incluida — $0:</b> el sistema de inventario de
              bebidas, registro de productos y control de ventas desarrollado previamente se mantiene
              sin costo adicional.
            </div>

            <div className="mx-7 mb-7 border-t border-[#e7e2d3] pt-4.5">
              <ul className="grid gap-2">
                {FINE_PRINT.map((item) => (
                  <li key={item} className="relative pl-4 text-[0.83rem] text-[#948a6e]">
                    <span className="absolute left-0 text-[#d8d2bd]">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Sign-off */}
        <div className="mt-[4.5rem] flex flex-wrap items-end justify-between gap-6 border-t border-[#141208]/80 pt-10">
          <div>
            <div className="text-[1.4rem] font-semibold">Allan Rojas</div>
            <div className="mt-1 font-mono text-[12px] text-[#948a6e]">Desarrollo de software · Xtreme Gym</div>
          </div>
          <div className="text-right font-mono text-[11px] leading-[1.6] text-[#948a6e]">
            Xtreme Gym · Propuesta Fase 2
            <br />
            18 de agosto de 2026
          </div>
        </div>
      </div>
    </main>
  );
}
