import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fase 2 · Propuesta de desarrollo",
  description:
    "Propuesta de desarrollo Fase 2 para Xtreme Gym: inventario inteligente, QR con registro de uso, ingreso facial, cobros y facturación directa con Hacienda.",
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
    situation: "Las máquinas y sus accesorios no tienen ficha ni historial digital.",
    consequence:
      "Almohadillas, cadenas, agarres y repuestos se separan del equipo sin una trazabilidad clara de ubicación, estado o mantenimiento.",
    fix: "Inventario conectado de equipo y accesorios",
  },
  {
    situation: "Los cobros de recepción y la facturación fiscal viven en procesos separados.",
    consequence:
      "Se duplica trabajo y cuesta seguir, desde un solo lugar, qué se cobró, quién lo atendió y qué respondió Hacienda.",
    fix: "Cobro + comprobante electrónico desde Xtreme",
  },
  {
    situation: "El uso real de cada máquina y los horarios de mayor demanda no quedan registrados.",
    consequence: "No se puede saber qué equipos se usan más, cuánto duran ocupados ni cómo mejorar la rotación en horas pico.",
    fix: "QR personal + tiempos de uso",
  },
  {
    situation: "Ingreso, presencia y ocupación se observan como procesos separados.",
    consequence: "Recepción pierde tiempo validando personas y no tiene una vista sencilla de quién entró, quién sigue dentro o cuándo fluye mejor el gimnasio.",
    fix: "Lector facial + ocupación en vivo",
  },
];

const OPERATIONS_MODULES = [
  {
    num: "01",
    title: "Inventario conectado de máquinas, equipo y accesorios",
    text: "Cada activo deja de ser una pieza suelta. Máquinas, almohadillas, cadenas, agarres, repuestos y accesorios quedan asociados a ubicación, estado e historial desde un mismo panel.",
    items: [
      "Nombre, marca, modelo, código interno",
      "Ubicación, categoría y accesorios asignados",
      "Estado, disponibilidad y observaciones",
      "Fotografías e historial de mantenimiento",
    ],
  },
  {
    num: "02",
    title: "Cada máquina se convierte en un punto interactivo",
    text: "Al escanear el QR, el socio ve el video de uso correcto, instrucciones y ejercicios asociados; desde el mismo punto puede iniciar o finalizar su tiempo de uso sin buscar la máquina dentro de la app.",
    items: [
      "Video e instrucciones en cada máquina",
      "Ejercicios y grupos musculares relacionados",
      "Inicio y finalización del tiempo de uso",
      "Reporte de averías desde el piso",
    ],
  },
  {
    num: "03",
    title: "El QR personal registra la experiencia completa",
    text: "Todos los usuarios usan su QR para dejar trazabilidad de sus tiempos en máquinas. Cada sesión queda ligada a una persona, un equipo y una hora, sin volver a digitar sus datos.",
    items: [
      "Duración por usuario y por máquina",
      "Historial personal de uso dentro de la app",
      "Datos reales para rotación y horarios fluidos",
      "Base para progreso y recomendaciones futuras",
    ],
  },
  {
    num: "04",
    title: "Ingreso facial más fácil y una vista viva del gimnasio",
    text: "El lector facial se integra mejor con la identidad y membresía que ya existen. Cada ingreso o salida alimenta una vista clara de ocupación para recepción y administración.",
    items: [
      "Validación más rápida al ingresar",
      "Personas dentro del gimnasio en tiempo real",
      "Entradas, salidas y permanencia por horario",
      "Mejor lectura de horas pico y capacidad",
    ],
  },
];

const MONEY_MODULES = [
  {
    num: "05",
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
    num: "06",
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
  "Ver quién está dentro, ingresos, salidas y permanencia",
  "Consultar tiempos de uso por máquina, socio y horario",
  "Administrar máquinas, accesorios, videos y códigos QR",
  "Detectar horas pico, rotación y equipos con mayor demanda",
  "Ver cobros por método, operador y estado en Hacienda",
  "Emitir, consultar y reenviar comprobantes electrónicos",
  "Mantener identidad, membresía, acceso y actividad unidos",
];

const PHASE2_BRIDGE = [
  {
    title: "Una identidad",
    text: "QR, rostro, membresía y actividad apuntan al mismo socio.",
  },
  {
    title: "Cada uso deja un evento",
    text: "Persona, máquina, inicio, fin y duración quedan conectados.",
  },
  {
    title: "Cada activo tiene contexto",
    text: "Equipo, accesorios, contenido, estado y mantenimiento comparten ficha.",
  },
  {
    title: "Cada cobro cierra el ciclo",
    text: "Recepción, pago, factura y respuesta de Hacienda quedan unidos.",
  },
];

const PHASE3_ITEMS = [
  {
    title: "Una única fuente de verdad",
    text: "Socios, staff, activos, accesos, cobros, gastos y operaciones dejan de vivir en sistemas separados.",
  },
  {
    title: "Bronceado 100% digital",
    text: "Clientes, paquetes, sesiones, tiempos, disponibilidad, consentimiento y seguimiento del área.",
  },
  {
    title: "Matrícula y documentos legales",
    text: "Expediente digital, contratos, autorizaciones y documentos de padres o encargados para menores.",
  },
  {
    title: "Gastos y recibos de luz",
    text: "Registro, archivo, vencimientos, comparación por periodo y trazabilidad de gastos operativos.",
  },
  {
    title: "Facilidades y cámaras",
    text: "Seguimiento de zonas, incidencias, revisiones, responsables y estado de cámaras y facilidades.",
  },
  {
    title: "Mantenimiento y limpieza",
    text: "Personas responsables, turnos, tareas, evidencia, frecuencia y cumplimiento por zona o activo.",
  },
  {
    title: "Operación de relojes y música",
    text: "Control y registro de dispositivos, horarios, configuraciones e incidencias operativas.",
  },
  {
    title: "Cierres, caja e incidencias",
    text: "Aperturas y cierres operativos, arqueos, inspecciones, pendientes y entrega de turno completamente digitales.",
  },
];

const WORK_PROPOSALS = [
  {
    num: "01",
    title: "Base operativa e inventario",
    price: "$200",
    text: "Crea el catálogo de activos que las siguientes entregas necesitan para compartir datos confiables.",
    items: [
      "Máquinas, accesorios, repuestos y ubicaciones",
      "Ficha, estado, fotografías e historial",
      "Administración central desde el Admin OS",
    ],
  },
  {
    num: "02",
    title: "Experiencia QR y tiempos",
    price: "$200",
    text: "Convierte cada máquina en un punto interactivo y cada sesión en información medible.",
    items: [
      "Videos, instrucciones y ejercicios por máquina",
      "QR personal con inicio, fin y duración",
      "Horas pico, demanda y rotación de equipos",
    ],
  },
  {
    num: "03",
    title: "Ingreso, ocupación y control",
    price: "$200",
    text: "Une identidad, membresía, ingreso y recepción para visualizar mejor la operación diaria.",
    items: [
      "Ingreso facial más fluido",
      "Personas dentro, entradas, salidas y permanencia",
      "Cobros por método, operador e historial",
    ],
  },
  {
    num: "04",
    title: "Hacienda y facturación electrónica",
    price: "$200",
    text: "Es la entrega de mayor complejidad técnica. Reutiliza la identidad, catálogos y cobros construidos en las propuestas anteriores.",
    featured: true,
    items: [
      "Facturas, tiquetes y notas electrónicas",
      "XML v4.4, firma XAdES y envío a Hacienda",
      "Aceptación, rechazo, reintentos, XML y PDF",
    ],
  },
];

const FINE_PRINT = [
  "La inversión cubre las funcionalidades descritas e integración con la plataforma existente.",
  "Las cuatro propuestas funcionan como entregas conectadas de $200 cada una; el total de la Fase 2 es $800.",
  "Hacienda es el bloque de mayor complejidad y se entrega al final, apoyado en los datos e integraciones de las tres propuestas anteriores.",
  "Xtreme aporta sus datos fiscales correctos y el acceso vigente de TRIBU-CR o ATV; la configuración técnica, firma e integración directa con Hacienda están incluidas.",
  "No se requiere contratar un facturador externo. Hardware, impresoras, etiquetas, lectores QR o servicios opcionales de terceros no están incluidos.",
  "La centralización total descrita como Fase 3 no forma parte de esta inversión y se cotiza por separado una vez consolidada la Fase 2.",
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
            El gimnasio ya tiene una página.
            <br />
            Ahora necesita un sistema que <em className="italic text-[#8a6f00]">gobierne todo lo demás.</em>
          </h1>
          <p className="max-w-[62ch] text-[1.18rem] text-[#585138]">
            La Fase 1 conectó socios, entrenadores, recepción y pagos en una sola plataforma. Lo que
            falta es que cada máquina, cada ingreso, cada minuto de uso y cada cobro alimente esa misma
            plataforma. La Fase 2 convierte funciones aisladas en una operación conectada y medible.
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
              Cada QR, rostro, máquina y cobro deja de ser un dato aislado. Todos pasan a contar la misma
              historia operativa dentro de Xtreme.
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

        {/* Connected operations */}
        <section className="mt-16">
          <SectionLabel>01 — Operación conectada</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Cada máquina deja de ser equipo aislado y se vuelve parte del sistema
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            La Fase 2 une inventario, contenido, identidad y tiempo. El socio escanea, aprende a usar la
            máquina, registra su sesión y genera información útil para mejorar horarios, rotación,
            mantenimiento y experiencia dentro del gimnasio.
          </p>
          <div className="flex flex-col gap-px border border-[#e7e2d3] bg-[#e7e2d3]">
            {OPERATIONS_MODULES.map((m) => (
              <ModuleCard key={m.num} {...m} />
            ))}
          </div>
        </section>

        {/* Money */}
        <section className="mt-16">
          <SectionLabel>02 — Cobros y Hacienda</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Cobrar, facturar y saber exactamente qué pasó
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
          <SectionLabel>03 — Visión operativa</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Un panel para ver personas, equipos, tiempos y dinero
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
          <SectionLabel>La interconexión que compra esta fase</SectionLabel>
          <h2 className="mb-7 text-balance text-[1.8rem] font-semibold tracking-tight">
            Cada acción deja un rastro que el siguiente proceso puede aprovechar
          </h2>
          <div className="border border-[#141208]/15 bg-[#fffdf7] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[13px]">
              {["Socio", "QR", "Máquina", "Tiempo", "Progreso"].map((n, i, arr) => (
                <span key={n} className="flex items-center gap-2.5">
                  <span className="border border-[#f6c400] bg-[#efeadb] px-3.5 py-2 font-semibold text-[#8a6f00]">
                    {n}
                  </span>
                  {i < arr.length - 1 ? <span className="text-[#948a6e]">→</span> : null}
                </span>
              ))}
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 font-mono text-[13px]">
              {["Rostro", "Ingreso", "Ocupación", "Cobro", "Hacienda"].map((n, i, arr) => (
                <span key={n} className="flex items-center gap-2.5">
                  <span className="border border-[#e7e2d3] bg-[#efeadb] px-3.5 py-2 font-semibold text-[#141208]">
                    {n}
                  </span>
                  {i < arr.length - 1 ? <span className="text-[#948a6e]">→</span> : null}
                </span>
              ))}
            </div>
            <p className="mt-5 max-w-[60ch] text-[0.88rem] text-[#948a6e]">
              La Fase 2 crea la identidad, los catálogos y los eventos operativos que necesita la
              centralización total. Sin esta base, la Fase 3 solo conectaría datos incompletos.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PHASE2_BRIDGE.map((item) => (
              <div key={item.title} className="border border-[#e7e2d3] bg-[#fffdf7] p-5">
                <h5 className="mb-1 text-[0.92rem] font-bold">{item.title}</h5>
                <p className="text-[0.83rem] text-[#948a6e]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Phase 3 */}
        <section className="mt-16">
          <SectionLabel>Fase 3 — La centralización completa</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Todos los sistemas conectados. Una única fuente de verdad.
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            La Fase 3 termina de digitalizar la operación completa. Todo se relaciona con personas,
            responsables, fechas, costos y evidencia dentro del mismo sistema. No está incluida en esta
            cotización: es la siguiente inversión que la Fase 2 deja técnicamente preparada.
          </p>
          <div className="grid grid-cols-1 gap-px border border-[#e7e2d3] bg-[#e7e2d3] sm:grid-cols-2">
            {PHASE3_ITEMS.map((item, index) => (
              <div key={item.title} className="bg-[#fffdf7] p-5 sm:p-6">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[#8a6f00]">
                  Fase 3 · {String(index + 1).padStart(2, "0")}
                </div>
                <h5 className="mb-1 text-[0.96rem] font-bold">{item.title}</h5>
                <p className="text-[0.83rem] text-[#948a6e]">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 border border-[#141208] bg-[#141208] p-6 text-[#f4f1e6]">
            <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#f6c400]">
              El paso que desbloquea todo
            </div>
            <p className="max-w-[62ch] text-[0.93rem] text-[#d8d2bd]">
              Cerrar la Fase 2 significa que usuarios, activos, accesos, tiempos, cobros y facturas ya
              hablan el mismo idioma. Ahí la Fase 3 puede centralizar el resto sin rehacer la base.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-16">
          <SectionLabel>Inversión</SectionLabel>
          <h2 className="mb-3.5 text-balance text-[1.8rem] font-semibold tracking-tight">
            Cuatro propuestas de $200. Una sola Fase 2 de $800.
          </h2>
          <p className="mb-7 max-w-[66ch] text-[1.03rem] text-[#585138]">
            Cada propuesta produce una entrega verificable y prepara la siguiente. Hacienda es el
            trabajo técnico más pesado, por eso se construye al final sobre datos, identidad y cobros que
            ya quedaron conectados.
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
                    Inicio · operación conectada · entrega final con Hacienda
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
