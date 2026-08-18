import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fase 2 · Propuesta de desarrollo",
  description:
    "Propuesta Fase 2 para Xtreme Gym: facturación electrónica directa con Hacienda, Machine Tracker, biometría facial, QR y analítica conectada.",
  robots: { index: false, follow: false },
};

const FOUNDATION = [
  {
    title: "Página web",
    text: "Presencia oficial, precios, zonas, contacto y rutas de conversión.",
  },
  {
    title: "Member OS",
    text: "Identidad, PIN, membresía, entrenamientos, progreso y experiencia del socio.",
  },
  {
    title: "Reception OS",
    text: "Ingresos, atención, cobros, ventas y operación diaria de recepción.",
  },
  {
    title: "Admin OS",
    text: "Socios, pagos, bitácora, analítica, seguridad y control administrativo.",
  },
];

const PRODUCTION_RESULTS = [
  {
    value: "2.076",
    label: "socios gestionados",
    detail: "Una base central de personas, membresías y seguimiento.",
  },
  {
    value: "334",
    label: "sesiones en 14 días",
    detail: "3.671 vistas, 1.230 clics y 162 acciones en la bitácora interna.",
  },
  {
    value: "70",
    label: "ingresos en 30 días",
    detail: "60 socios únicos identificados al entrar al gimnasio.",
  },
  {
    value: "0",
    label: "facturas fiscales emitidas",
    detail: "La facturación real con Hacienda aún no ha iniciado; todos los registros existentes fueron pruebas.",
  },
  {
    value: "28",
    label: "ventas de productos",
    detail: "29 unidades y ₡37.000 registrados desde recepción en 30 días.",
  },
  {
    value: "1.178",
    label: "impresiones en Google",
    detail: "39 clics, CTR de 3,31% y posición media de 4,36 en Search.",
  },
];

const DIGITAL_RESULTS = [
  {
    source: "Google Search Console",
    headline: "+51,5% de visibilidad",
    text: "Las impresiones pasaron de 163 en la primera semana completa a 247 en la semana más reciente.",
  },
  {
    source: "Búsquedas locales",
    headline: "Posiciones 1 a 4",
    text: "“xtreme gym ciudad quesada” promedia 1,85; “gimnasios en ciudad quesada”, 1,50.",
  },
  {
    source: "Vercel Analytics",
    headline: "102 visitantes · 1.924 vistas",
    text: "En 7 días: 84% desde Costa Rica, 62% móvil y 8 visitantes referidos por Google.",
  },
];

const COST_ROWS = [
  {
    situation: "El cobro y la factura ante Hacienda todavía no forman un solo ciclo.",
    consequence:
      "Recepción puede registrar dinero, pero falta emitir, firmar, enviar, consultar y conservar cada comprobante desde Xtreme.",
    fix: "01 · Hacienda Billing Tracker",
  },
  {
    situation: "Las máquinas y sus accesorios no tienen una ficha operativa completa.",
    consequence:
      "No existe una trazabilidad común para estado, video, uso, tiempos, averías, almohadillas, cadenas, agarres y repuestos.",
    fix: "02 · Machine Tracker",
  },
  {
    situation: "Rostro, QR, membresía, ingreso y ocupación aún no comparten el mismo tracker.",
    consequence:
      "Recepción necesita una validación más fluida y una sola vista de quién entró, quién sigue dentro y cuánto permaneció.",
    fix: "03 · Biometría facial + QR",
  },
  {
    situation: "Los datos existen, pero todavía se leen desde módulos separados.",
    consequence:
      "Bitácora, ingresos, ventas, uso, ocupación y resultados digitales necesitan un cierre común para tomar decisiones.",
    fix: "04 · Analytics + Control",
  },
];

const PHASE2_PRIORITIES = [
  {
    num: "01",
    eyebrow: "Tema principal de la Fase 2",
    title: "Factura Hacienda: del cobro al comprobante electrónico trazable",
    text: "La prioridad es cerrar el ciclo fiscal completo dentro de xtremecr.com. Recepción registra el cobro y el sistema construye, firma, envía y sigue el comprobante hasta conocer la respuesta de Hacienda.",
    items: [
      "Facturas, tiquetes y notas de crédito o débito",
      "XML oficial v4.4, impuestos, clave y consecutivo",
      "Firma electrónica XAdES con la llave configurada",
      "Autenticación, envío y consulta directa ante Hacienda",
      "Aceptación, rechazo, mensajes y reintentos controlados",
      "Historial, XML, representación PDF y entrega al cliente",
    ],
    note: "Alcance real: Hoy existen 0 facturas fiscales emitidas: todos los registros anteriores fueron pruebas y la facturación real con Hacienda aún no ha iniciado. Xtreme aporta sus datos fiscales y el acceso vigente de TRIBU-CR o ATV. Allan configura credenciales, llave y firma, consecutivos y comunicación con Hacienda.",
    featured: true,
  },
  {
    num: "02",
    eyebrow: "Segunda prioridad",
    title: "Machine Tracker: cada equipo tiene ficha, contenido, uso y estado",
    text: "Todas las máquinas pasan a formar parte del sistema. Cada una conecta su identidad física con sus accesorios, video, instrucciones, tiempos de uso, incidencias y mantenimiento.",
    items: [
      "Máquina, marca, modelo, código, ubicación y categoría",
      "Almohadillas, cadenas, agarres, repuestos y accesorios",
      "Video de uso, instrucciones y ejercicios relacionados",
      "Inicio, fin y duración por persona y por máquina",
      "Estado, disponibilidad, averías y observaciones",
      "Demanda, rotación, horas pico e historial de mantenimiento",
    ],
  },
  {
    num: "03",
    eyebrow: "Tercera prioridad",
    title: "Biometría facial + QR App: una identidad para cada ingreso y uso",
    text: "xtremecr.com administra el registro facial y el QR personal. Ambos se vinculan con la misma identidad y membresía para validar acceso, registrar presencia y relacionar al socio con sus tiempos de uso.",
    items: [
      "Registro y validación facial propios",
      "QR personal dentro de la aplicación del socio",
      "Validación de identidad y membresía vigente",
      "Entradas, salidas, permanencia y ocupación en vivo",
      "Historial de acceso unido al historial de máquinas",
      "Ingreso más rápido y atención más fluida en recepción",
    ],
  },
  {
    num: "04",
    eyebrow: "Cierre de la Fase 2",
    title: "Analytics + Control: todos los trackers visibles en el Admin OS",
    text: "La última entrega reúne facturación, máquinas, accesos, QR, ocupación y la analítica que Xtreme ya genera. No crea otra base separada: amplía el mismo Admin OS.",
    items: [
      "Bitácora de sesiones, páginas, clics y acciones",
      "Ingresos al gimnasio, ocupación y permanencia",
      "Cobros, ventas y estados ante Hacienda",
      "Uso de máquinas por socio, equipo y horario",
      "Resultados de Search, Ads, Maps y Vercel al conectarlos",
      "Base limpia para la centralización completa de la Fase 3",
    ],
  },
];

const ADMIN_ITEMS = [
  "Ver comprobantes emitidos, aceptados, rechazados o pendientes",
  "Consultar cobros por método, operador y estado ante Hacienda",
  "Administrar máquinas, accesorios, videos, QR y mantenimiento",
  "Medir uso por máquina, socio, duración y horario",
  "Ver quién está dentro, ingresos, salidas y permanencia",
  "Cruzar bitácora, ventas, ocupación y demanda digital",
];

const PHASE_MAP = [
  {
    num: "01",
    phase: "Fase 1",
    status: "Construida y en producción",
    title: "La base digital",
    description: "Las superficies principales ya comparten identidad, sesiones y operación.",
    systems: ["Página web", "Member OS", "Reception OS", "Admin OS"],
  },
  {
    num: "02",
    phase: "Fase 2",
    status: "Propuesta actual · $800",
    title: "Los trackers que conectan operación y dinero",
    description: "Hacienda es el eje; máquinas y acceso convierten la actividad física en datos trazables.",
    systems: ["Hacienda Billing Tracker", "Machine Tracker", "Biometría facial + QR", "Analytics + Control"],
  },
  {
    num: "03",
    phase: "Fase 3",
    status: "Centralización completa",
    title: "Todos los subsistemas en una sola base de datos",
    description: "Inventarios, servicios, gastos, responsables y trackers operan como una única fuente de verdad.",
    systems: [
      "Inventarios conectados",
      "Gastos y misceláneos",
      "Mantenimiento y limpieza",
      "Electricidad y facilidades",
      "Cámaras y cierres",
      "Valari Dance",
      "Bronceado",
      "VIP",
      "Funcional",
      "Entrenadores",
    ],
  },
];

const WORK_PROPOSALS = [
  {
    num: "01",
    title: "Hacienda Billing Tracker",
    price: "$200",
    text: "Construye el eje fiscal y la trazabilidad completa de cada comprobante electrónico.",
    featured: true,
    items: [
      "Facturas, tiquetes y notas electrónicas",
      "XML v4.4, firma XAdES y envío a Hacienda",
      "Estados, reintentos, historial, XML y PDF",
    ],
  },
  {
    num: "02",
    title: "Machine Tracker",
    price: "$200",
    text: "Convierte cada máquina, accesorio y sesión de uso en información administrable.",
    items: [
      "Ficha, estado, ubicación, accesorios y repuestos",
      "Videos, instrucciones, averías y mantenimiento",
      "Inicio, fin, duración, demanda y rotación",
    ],
  },
  {
    num: "03",
    title: "Biometría facial + QR App",
    price: "$200",
    text: "Une rostro, QR, identidad, membresía, ingreso y presencia dentro del gimnasio.",
    items: [
      "Registro y validación facial propios",
      "QR personal conectado con el Member OS",
      "Entradas, salidas, permanencia y ocupación",
    ],
  },
  {
    num: "04",
    title: "Analytics + integración final",
    price: "$200",
    text: "Reúne Hacienda, máquinas, biometría, QR y la analítica actual en el Admin OS.",
    items: [
      "Tableros de dinero, uso, acceso y ocupación",
      "Bitácora y resultados digitales conectados",
      "Base preparada para la centralización de Fase 3",
    ],
  },
];

const FINE_PRINT = [
  "La inversión cubre las funcionalidades descritas e integración con la plataforma existente.",
  "Las cuatro propuestas funcionan como entregas conectadas de $200 cada una; el total de la Fase 2 es $800.",
  "Hacienda es el tema principal y el bloque de mayor complejidad técnica de esta fase.",
  "Xtreme aporta sus datos fiscales correctos y el acceso vigente de TRIBU-CR o ATV; la configuración técnica, firma e integración directa con Hacienda están incluidas.",
  "No se requiere contratar un facturador externo. Hardware, impresoras, etiquetas, lectores QR o servicios opcionales de terceros no están incluidos.",
  "La Fase 3 centraliza inventarios, subsistemas y trackers en una sola base de datos; se cotiza por separado.",
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
  eyebrow,
  title,
  text,
  items,
  note,
  featured = false,
}: {
  num: string;
  eyebrow?: string;
  title: string;
  text: string;
  items: string[];
  note?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-5 border-t p-7 first:border-t-0 sm:grid-cols-[64px_1fr] sm:p-8 ${
        featured
          ? "border-[#3b382d] bg-[#141208] text-[#f4f1e6] ring-2 ring-inset ring-[#f6c400]"
          : "border-[#e7e2d3] bg-[#fffdf7]"
      }`}
    >
      <div className={`font-mono text-[13px] ${featured ? "text-[#f6c400]" : "text-[#948a6e]"}`}>
        {num}
      </div>
      <div>
        {eyebrow ? (
          <div className={`mb-2 font-mono text-[10px] uppercase tracking-[0.12em] ${featured ? "text-[#f6c400]" : "text-[#8a6f00]"}`}>
            {eyebrow}
          </div>
        ) : null}
        <h3 className={`mb-2 text-[1.25rem] font-semibold tracking-tight ${featured ? "text-white" : "text-[#141208]"}`}>
          {title}
        </h3>
        <p className={`mb-4 max-w-[62ch] text-[0.95rem] ${featured ? "text-white/65" : "text-[#585138]"}`}>
          {text}
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className={`relative pl-4 text-[0.87rem] ${featured ? "text-white/85" : "text-[#141208]"}`}>
              <span className="absolute left-0 top-[8px] h-[6px] w-[6px] bg-[#f6c400]" />
              {item}
            </li>
          ))}
        </ul>
        {note ? (
          <div className={`mt-4 border-t border-dashed pt-3 text-[0.83rem] ${featured ? "border-white/20 text-white/55" : "border-[#d8d2bd] text-[#948a6e]"}`}>
            <b className={featured ? "text-white/85" : "text-[#585138]"}>Alcance real:</b>{" "}
            {note.replace("Alcance real: ", "")}
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
            Facturación directa con Hacienda.
            <br />
            Máquinas y accesos que <em className="italic text-[#8a6f00]">también dejan rastro.</em>
          </h1>
          <p className="max-w-[62ch] text-[1.18rem] text-[#585138]">
            La Fase 2 tiene un eje principal: que cada cobro termine en una factura o tiquete electrónico
            trazable desde xtremecr.com. A ese núcleo se conectan el Machine Tracker, la biometría facial,
            el QR personal y un tablero operativo común.
          </p>

          <div className="mt-9 grid grid-cols-2 border-y border-[#e7e2d3] sm:grid-cols-4">
            {[
              ["Atención", "Eyleen & Alejandro"],
              ["Desarrollo", "Allan Rojas"],
              ["Inversión", "$800 USD"],
              ["Modalidad", "3 o 4 pagos"],
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
              Cobro → Hacienda. Persona → rostro o QR. Máquina → uso y mantenimiento. Cada tracker
              alimenta la misma operación y deja lista la centralización de la Fase 3.
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
            Cuatro sistemas ya sostienen la operación digital de Xtreme
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            La Fase 1 dejó página web, Member OS, Reception OS y Admin OS en producción. La Fase 2 no
            crea otra plataforma: extiende esa misma base con trackers especializados.
          </p>
          <div className="grid grid-cols-1 gap-px border border-[#e7e2d3] bg-[#e7e2d3] sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Measured results */}
        <section className="mt-16">
          <SectionLabel>Resultados medibles · corte al 18 de agosto de 2026</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            La plataforma ya produce datos útiles antes de comenzar la Fase 2
          </h2>
          <p className="mb-7 max-w-[68ch] text-[1.03rem] text-[#585138]">
            No se trata únicamente de funciones instaladas. La bitácora, los ingresos, las ventas y la
            presencia digital ya generan evidencia real. El seguimiento fiscal parte correctamente en
            cero: la facturación real con Hacienda aún no ha iniciado y todos los registros anteriores
            fueron pruebas. La Fase 2 conecta esos datos con máquinas, tiempos, ocupación, biometría y
            Hacienda.
          </p>

          <div className="grid grid-cols-1 gap-px border border-[#e7e2d3] bg-[#e7e2d3] sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTION_RESULTS.map((result) => (
              <div key={result.label} className="bg-[#fffdf7] p-5">
                <div className="font-mono text-[1.45rem] font-bold tabular-nums text-[#8a6f00]">
                  {result.value}
                </div>
                <h4 className="mt-1 text-[0.94rem] font-bold">{result.label}</h4>
                <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[#948a6e]">{result.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-px border border-[#141208] bg-[#3b382d] lg:grid-cols-3">
            {DIGITAL_RESULTS.map((result) => (
              <div key={result.source} className="bg-[#141208] p-5 text-white">
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#f6c400]">
                  {result.source}
                </div>
                <h4 className="mt-2 text-[1.02rem] font-semibold">{result.headline}</h4>
                <p className="mt-2 text-[0.8rem] leading-relaxed text-white/60">{result.text}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 max-w-[72ch] font-mono text-[10.5px] leading-relaxed text-[#948a6e]">
            Fuentes: Admin OS y base operativa de xtremecr.com; Google Search Console del 11/07 al
            16/08/2026; Vercel Analytics del 11/08 al 18/08/2026. Las sesiones internas excluyen pruebas
            identificadas. Google Ads y Google Maps se incorporarán al tablero de atribución cuando se
            conecten o exporten sus métricas propias.
          </p>
        </section>

        {/* Three-phase map */}
        <section className="mt-16">
          <SectionLabel>Mapa completo · de plataforma a fuente única de verdad</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            El proyecto se entiende mejor cuando cada sistema ocupa su fase
          </h2>
          <p className="mb-7 max-w-[68ch] text-[1.03rem] text-[#585138]">
            La Fase 1 construyó las superficies principales. La Fase 2 agrega los trackers críticos. La
            Fase 3 conecta inventarios y subsistemas completos sobre una sola base de datos centralizada.
          </p>

          <div className="space-y-3">
            {PHASE_MAP.map((phase, phaseIndex) => {
              const isCurrent = phase.phase === "Fase 2";
              const isCentralized = phase.phase === "Fase 3";
              return (
                <div key={phase.phase}>
                  <article
                    className={`border p-5 sm:p-6 ${
                      isCurrent
                        ? "border-[#141208] bg-[#141208] text-white ring-2 ring-[#f6c400] ring-offset-2 ring-offset-[#f4f1e6]"
                        : "border-[#d8d2bd] bg-[#fffdf7]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-baseline gap-3">
                        <span className={`font-mono text-[12px] ${isCurrent ? "text-[#f6c400]" : "text-[#8a6f00]"}`}>
                          {phase.num}
                        </span>
                        <h3 className="text-[1.15rem] font-semibold">{phase.phase} · {phase.title}</h3>
                      </div>
                      <span className={`font-mono text-[9.5px] uppercase tracking-[0.1em] ${isCurrent ? "text-white/55" : "text-[#948a6e]"}`}>
                        {phase.status}
                      </span>
                    </div>
                    <p className={`mt-2 max-w-[68ch] text-[0.86rem] ${isCurrent ? "text-white/60" : "text-[#948a6e]"}`}>
                      {phase.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                      {phase.systems.map((system, index) => (
                        <span key={system} className="flex items-center gap-2">
                          <span
                            className={`border px-3 py-2 font-semibold ${
                              isCurrent
                                ? "border-[#f6c400] bg-[#f6c400] text-[#141208]"
                                : "border-[#d8d2bd] bg-[#efeadb] text-[#141208]"
                            }`}
                          >
                            {system}
                          </span>
                          {!isCentralized && index < phase.systems.length - 1 ? (
                            <span className={isCurrent ? "text-white/35" : "text-[#b2aa91]"}>→</span>
                          ) : null}
                        </span>
                      ))}
                    </div>

                    {isCentralized ? (
                      <div className="mt-5 border-t border-dashed border-[#d8d2bd] pt-4 text-center">
                        <div className="mb-2 font-mono text-[15px] text-[#b2aa91]">↓</div>
                        <div className="inline-flex border-2 border-[#141208] bg-[#141208] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#f6c400]">
                          Base de datos centralizada · única fuente de verdad
                        </div>
                      </div>
                    ) : null}
                  </article>
                  {phaseIndex < PHASE_MAP.length - 1 ? (
                    <div className="py-1 text-center font-mono text-[18px] text-[#b2aa91]">↓</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Cost table */}
        <section className="mt-16">
          <SectionLabel>Lo que todavía cuesta dinero y tiempo</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Cuatro puntos ciegos que la plataforma actual no cubre
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

        {/* Phase 2 priorities */}
        <section className="mt-16">
          <SectionLabel>Fase 2 · orden de prioridad</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Hacienda es el tema principal. Los demás trackers completan la operación.
          </h2>
          <p className="mb-7 max-w-[68ch] text-[1.03rem] text-[#585138]">
            El alcance se organiza por valor operativo: primero facturación electrónica; segundo,
            Machine Tracker; tercero, acceso biométrico y QR; cuarto, la vista analítica que los une.
          </p>
          <div className="flex flex-col gap-px border border-[#141208] bg-[#3b382d]">
            {PHASE2_PRIORITIES.map((priority) => (
              <ModuleCard key={priority.num} {...priority} />
            ))}
          </div>
        </section>

        {/* Connected control */}
        <section className="mt-16">
          <SectionLabel>Control conectado en Admin OS</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Tres recorridos operativos, una sola vista administrativa
          </h2>
          <p className="mb-7 max-w-[68ch] text-[1.03rem] text-[#585138]">
            Allan, Alejandro y Eileen continúan usando el Admin OS existente. La diferencia es que cada
            cobro, ingreso y uso de máquina llega con contexto suficiente para actuar y auditar.
          </p>

          <div className="border border-[#141208]/15 bg-[#fffdf7] p-6 sm:p-8">
            {[
              ["Cobro", "Factura", "Firma", "Hacienda", "Estado"],
              ["Socio", "Rostro / QR", "Ingreso", "Ocupación", "Historial"],
              ["Máquina", "Uso", "Tiempo", "Avería", "Mantenimiento"],
            ].map((flow, flowIndex) => (
              <div key={flow[0]} className={`flex flex-wrap items-center gap-2 font-mono text-[11px] ${flowIndex ? "mt-3" : ""}`}>
                {flow.map((node, index) => (
                  <span key={node} className="flex items-center gap-2">
                    <span
                      className={`border px-3 py-2 font-semibold ${
                        flowIndex === 0
                          ? "border-[#f6c400] bg-[#f6c400] text-[#141208]"
                          : "border-[#d8d2bd] bg-[#efeadb] text-[#141208]"
                      }`}
                    >
                      {node}
                    </span>
                    {index < flow.length - 1 ? <span className="text-[#b2aa91]">→</span> : null}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 border border-[#e7e2d3] bg-[#fffdf7] p-7 sm:p-8">
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

        {/* Pricing */}
        <section className="mt-16">
          <SectionLabel>Inversión</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Cuatro propuestas de $200. Una sola Fase 2 de $800.
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Cada propuesta produce una entrega verificable de $200. Hacienda ocupa la Propuesta 01 y
            define el tema central; máquinas y biometría amplían la trazabilidad, y la Propuesta 04 cierra
            la integración dentro del Admin OS.
          </p>

          <div className="border border-[#141208]/15 bg-[#fffdf7]">
            <div className="flex flex-wrap items-center justify-between gap-5 bg-[#141208] px-7 py-6 text-[#f4f1e6]">
              <div>
                <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em] opacity-70">
                  Total Fase 2
                </div>
                <div className="text-[1.3rem] font-semibold">
                  4 propuestas conectadas · $200 cada una
                </div>
              </div>
              <div className="font-mono text-[2.4rem] font-bold tabular-nums text-[#f6c400]">$800</div>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#e7e2d3] sm:grid-cols-2">
              {WORK_PROPOSALS.map((proposal) => (
                <article
                  key={proposal.num}
                  className={`relative bg-[#fffdf7] p-6 ${proposal.featured ? "ring-2 ring-inset ring-[#f6c400]" : ""}`}
                >
                  {proposal.featured ? (
                    <span className="mb-3 inline-block bg-[#f6c400] px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#141208]">
                      Mayor complejidad técnica
                    </span>
                  ) : null}
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#948a6e]">
                        Propuesta {proposal.num}
                      </div>
                      <h3 className="text-[1rem] font-bold">{proposal.title}</h3>
                    </div>
                    <div className="font-mono text-[1.25rem] font-bold text-[#8a6f00]">{proposal.price}</div>
                  </div>
                  <p className="mb-4 text-[0.84rem] text-[#585138]">{proposal.text}</p>
                  <ul className="grid gap-1.5">
                    {proposal.items.map((item) => (
                      <li key={item} className="relative pl-4 text-[0.8rem] text-[#141208]">
                        <span className="absolute left-0 text-[#8a6f00]">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="mx-7 my-6">
              <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#948a6e]">
                Formas de pago
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border-2 border-[#f6c400] bg-[#fffdf7] p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a6f00]">
                      Opción recomendada
                    </span>
                    <span className="font-mono text-[12px] font-bold">3 pagos</span>
                  </div>
                  <div className="font-mono text-[1.05rem] font-bold tabular-nums">
                    $300 + $250 + $250
                  </div>
                  <p className="mt-2 text-[0.78rem] text-[#948a6e]">
                    Hacienda · trackers operativos · integración final
                  </p>
                </div>
                <div className="border border-[#e7e2d3] bg-[#efeadb] p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#948a6e]">
                      Por propuesta
                    </span>
                    <span className="font-mono text-[12px] font-bold">4 pagos</span>
                  </div>
                  <div className="font-mono text-[1.05rem] font-bold tabular-nums">
                    $200 + $200 + $200 + $200
                  </div>
                  <p className="mt-2 text-[0.78rem] text-[#948a6e]">
                    Un pago al iniciar cada entrega de trabajo
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-7 mb-6 border border-[#bcd9bc] bg-[#eef6ee] p-4.5 text-[0.86rem] text-[#585138]">
              <b className="text-[#141208]">Cortesía incluida — $0:</b> el sistema de inventario de
              bebidas, registro de productos y control de ventas desarrollado previamente se mantiene
              sin costo adicional. Su interconexión con todos los demás inventarios y subsistemas queda
              reservada para la Fase 3.
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
