import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Estado del Año 2026 · Xtreme Gym",
  description:
    "Reporte financiero interno de Gimnasio Extremo para enero a julio de 2026.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const MONTHLY_DATA = [
  {
    short: "Ene",
    month: "Enero",
    memberships: 7_677_754,
    vip: 1_292_000,
    other: 345_692,
    total: 9_315_446,
    iva: 608_797,
    ccss: 682_064,
    newClients: 25,
  },
  {
    short: "Feb",
    month: "Febrero",
    memberships: 8_283_174,
    vip: 1_375_000,
    other: 324_995,
    total: 9_983_168,
    iva: 628_427,
    ccss: 670_690,
    newClients: 33,
  },
  {
    short: "Mar",
    month: "Marzo",
    memberships: 8_535_535,
    vip: 1_462_000,
    other: 348_628,
    total: 10_346_163,
    iva: 705_965,
    ccss: 687_533,
    newClients: 21,
  },
  {
    short: "Abr",
    month: "Abril",
    memberships: 8_670_184,
    vip: 1_472_000,
    other: 324_178,
    total: 10_466_362,
    iva: 737_367,
    ccss: 679_554,
    newClients: 34,
  },
  {
    short: "May",
    month: "Mayo",
    memberships: 8_565_965,
    vip: 1_462_000,
    other: 472_582,
    total: 10_500_547,
    iva: 685_035,
    ccss: 691_114,
    newClients: 32,
  },
  {
    short: "Jun",
    month: "Junio",
    memberships: 9_042_405,
    vip: 1_462_000,
    other: 392_191,
    total: 10_896_596,
    iva: 732_095,
    ccss: 691_114,
    newClients: 17,
  },
  {
    short: "Jul",
    month: "Julio",
    memberships: 8_776_260,
    vip: 1_496_000,
    other: 314_369,
    total: 10_586_629,
    iva: 753_740,
    ccss: 773_759,
    newClients: 22,
  },
] as const;

const TOTALS = {
  memberships: 59_551_276,
  vip: 10_021_000,
  other: 2_522_635,
  total: 72_094_911,
  iva: 4_851_425,
  ccss: 4_875_828,
  newClients: 184,
} as const;

const COMPARISON_DATA = [
  { month: "Enero", short: "Ene", previous: 8_483_950, current: 8_286_550, delta: "−2,3%" },
  { month: "Febrero", short: "Feb", previous: 8_291_160, current: 8_911_600, delta: "+7,5%" },
  { month: "Marzo", short: "Mar", previous: 8_415_500, current: 9_241_500, delta: "+9,8%" },
  { month: "Abril", short: "Abr", previous: 7_202_050, current: 9_407_550, delta: "+30,6%" },
] as const;

const REVENUE_SOURCES = [
  {
    label: "Membresías netas",
    amount: "₡59 551 276",
    share: "82.6%",
    width: "82.6%",
    color: "bg-[#eda432]",
  },
  {
    label: "VIP (Alberto Castro)",
    amount: "₡10 021 000",
    share: "13.9%",
    width: "13.9%",
    color: "bg-[#4f8fdf]",
  },
  {
    label: "Otras ventas y servicios",
    amount: "₡2 522 635",
    share: "3.5%",
    width: "3.5%",
    color: "bg-[#8291a8]",
  },
] as const;

const ISSUES = [
  {
    symbol: "!",
    title: "No hay registro de gastos operativos",
    text: "La plantilla de gastos (Excel.xlsx) está vacía y la carpeta «RECIBOS DE LUZ» no tiene archivos. Sin planilla, alquiler, luz ni costo de producto no se puede cerrar una utilidad neta. Es el vacío más importante del año.",
  },
  {
    symbol: "₡",
    title: "₡4.851.425 están registrados como IVA por conciliar",
    text: "El IVA registrado o estimado asociado a ventas gravadas no se considera ingreso del negocio. Debe conciliarse con Latinsoft y contabilidad para confirmar el monto declarado y pagado.",
  },
  {
    symbol: "↑",
    title: "CCSS de julio subió 12%",
    text: "De ~₡691k (mayo–junio) a ₡773.759 en julio. Confirmar si corresponde a nuevo personal, aumento de salarios reportados o un ajuste de la Caja.",
  },
  {
    symbol: "✎",
    title: "El cierre de junio está etiquetado como «Mayo 2026»",
    text: "Dentro de CIERRE MES DE JUNIO.xlsx el encabezado dice «Mayo 2026». Los datos son de junio, pero conviene corregir el título para evitar confusiones.",
  },
  {
    symbol: "≈",
    title: "Los subtotales de «otras ventas» no siempre cuadran",
    text: "La suma de personals + bebidas + servicios + bronceado no coincide exacto con el total de la fila en varios meses. El ingreso total general sí es consistente; el desajuste está en el desglose interno.",
  },
  {
    symbol: "◷",
    title: "Agosto todavía sin cerrar",
    text: "Estamos a 17 de agosto. El próximo cierre completará 8 de 12 meses. Faltan por generar los cierres de agosto a diciembre.",
  },
] as const;

const PROJECTIONS = [
  {
    label: "Agosto 2026 (est.)",
    value: "₡10,3–10,7 M",
    note: "Según promedio y tendencia reciente",
  },
  {
    label: "Ingreso anual proyectado",
    value: "₡123,6–125,6 M",
    note: "YTD ₡72,1 M + 5 meses",
  },
  {
    label: "CCSS anual (est.)",
    value: "₡8,4 M",
    note: "A ritmo actual de planilla",
  },
  {
    label: "IVA anual a Hacienda (est.)",
    value: "₡8,3 M",
    note: "Estimado asociado a ventas gravadas",
  },
] as const;

function formatNumber(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-bold tracking-[0.18em] text-[#cf7d0c] dark:text-[#f2a62a]">
          {number}
        </span>
        <h2 className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">{title}</h2>
      </div>
      <p className="max-w-xl text-sm leading-6 text-[#667085] sm:text-right dark:text-[#93a0b2]">
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  change,
}: {
  label: string;
  value: string;
  note: string;
  change?: string;
}) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(20,29,43,0.06)] dark:border-white/10 dark:bg-[#151d28] dark:shadow-[0_16px_42px_rgba(0,0,0,0.22)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#7b8492] dark:text-[#8591a3]">
        {label}
      </p>
      <p className="mt-3 text-2xl font-extrabold tracking-[-0.04em] tabular-nums sm:text-[27px]">
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#667085] dark:text-[#93a0b2]">
        {change ? (
          <span className="rounded-full bg-[#dff6e8] px-2 py-0.5 font-bold text-[#137a45] dark:bg-[#103b2a] dark:text-[#50d68b]">
            ▲ {change}
          </span>
        ) : null}
        <span>{note}</span>
      </div>
    </article>
  );
}

function ChartShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-black/10 bg-white p-3 shadow-[0_14px_35px_rgba(20,29,43,0.05)] sm:p-6 dark:border-white/10 dark:bg-[#151d28] dark:shadow-[0_16px_42px_rgba(0,0,0,0.2)] " +
        className
      }
    >
      {children}
    </div>
  );
}

function RevenueTrendChart() {
  const left = 88;
  const right = 870;
  const top = 38;
  const bottom = 292;
  const min = 9_000_000;
  const max = 11_000_000;
  const average = 10_299_273;
  const points = MONTHLY_DATA.map((item, index) => ({
    x: left + (index * (right - left)) / (MONTHLY_DATA.length - 1),
    y: bottom - ((item.total - min) / (max - min)) * (bottom - top),
  }));
  const line = points
    .map((point, index) => (index === 0 ? "M " : "L ") + point.x + " " + point.y)
    .join(" ");
  const area =
    line +
    " L " +
    points[points.length - 1].x +
    " " +
    bottom +
    " L " +
    points[0].x +
    " " +
    bottom +
    " Z";
  const averageY = bottom - ((average - min) / (max - min)) * (bottom - top);

  return (
    <ChartShell>
      <svg
        viewBox="0 0 940 350"
        className="h-auto min-w-[640px] w-full"
        role="img"
        aria-label="Gráfico de ingresos mensuales enero a julio 2026"
      >
        <defs>
          <linearGradient id="state-line-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#efa329" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#efa329" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[9, 9.5, 10, 10.5, 11].map((tick) => {
          const y = bottom - (((tick * 1_000_000) - min) / (max - min)) * (bottom - top);
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={right}
                y1={y}
                y2={y}
                className="stroke-black/10 dark:stroke-white/10"
                strokeWidth="1"
              />
              <text
                x={left - 15}
                y={y + 4}
                textAnchor="end"
                className="fill-[#7b8492] text-[12px] dark:fill-[#8793a5]"
              >
                ₡{tick.toFixed(tick % 1 === 0 ? 1 : 1)}M
              </text>
            </g>
          );
        })}

        <line
          x1={left}
          x2={right}
          y1={averageY}
          y2={averageY}
          className="stroke-[#718096] dark:stroke-[#8793a5]"
          strokeWidth="1.5"
          strokeDasharray="7 7"
        />
        <path d={area} fill="url(#state-line-area)" />
        <path
          d={line}
          fill="none"
          stroke="#efa329"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <g key={MONTHLY_DATA[index].short}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              className="fill-white stroke-[#efa329] dark:fill-[#151d28]"
              strokeWidth="4"
            />
            <text
              x={point.x}
              y={bottom + 35}
              textAnchor="middle"
              className="fill-[#667085] text-[13px] font-semibold dark:fill-[#9aa5b4]"
            >
              {MONTHLY_DATA[index].short}
            </text>
          </g>
        ))}

        <g>
          <rect
            x={points[5].x - 61}
            y={points[5].y - 42}
            width="122"
            height="27"
            rx="7"
            className="fill-[#fff2d8] dark:fill-[#3a2a12]"
          />
          <text
            x={points[5].x}
            y={points[5].y - 24}
            textAnchor="middle"
            className="fill-[#a85e00] text-[12px] font-bold dark:fill-[#ffbd52]"
          >
            ₡10 896 596
          </text>
        </g>
      </svg>
      <div className="flex flex-wrap gap-x-6 gap-y-2 px-2 pb-1 text-xs text-[#667085] dark:text-[#93a0b2]">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-7 bg-[#efa329]" />
          Ingreso total mensual
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0 w-7 border-t border-dashed border-[#718096]" />
          Promedio del período (₡10,30 M)
        </span>
      </div>
    </ChartShell>
  );
}

function CcssChart() {
  const chartTop = 24;
  const chartBottom = 188;
  const maxValue = 800_000;

  return (
    <svg
      viewBox="0 0 640 245"
      className="h-auto min-w-[500px] w-full"
      role="img"
      aria-label="CCSS mensual"
    >
      <line
        x1="36"
        x2="614"
        y1={chartBottom}
        y2={chartBottom}
        className="stroke-black/10 dark:stroke-white/10"
      />
      {MONTHLY_DATA.map((item, index) => {
        const barWidth = 48;
        const gap = 34;
        const x = 49 + index * (barWidth + gap);
        const height = (item.ccss / maxValue) * (chartBottom - chartTop);
        const y = chartBottom - height;
        return (
          <g key={item.short}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx="7"
              className={
                index === MONTHLY_DATA.length - 1
                  ? "fill-[#efa329]"
                  : "fill-[#728197] dark:fill-[#64748b]"
              }
            />
            <text
              x={x + barWidth / 2}
              y={y - 9}
              textAnchor="middle"
              className="fill-[#596579] text-[11px] font-bold dark:fill-[#a9b3c1]"
            >
              {Math.round(item.ccss / 1_000)}k
            </text>
            <text
              x={x + barWidth / 2}
              y={chartBottom + 27}
              textAnchor="middle"
              className="fill-[#667085] text-[12px] font-semibold dark:fill-[#9aa5b4]"
            >
              {item.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ComparisonChart() {
  const top = 24;
  const bottom = 228;
  const max = 10_000_000;

  return (
    <svg
      viewBox="0 0 660 300"
      className="h-auto min-w-[520px] w-full"
      role="img"
      aria-label="Comparación 2025 vs 2026"
    >
      {[0, 2.5, 5, 7.5, 10].map((tick) => {
        const y = bottom - ((tick * 1_000_000) / max) * (bottom - top);
        return (
          <g key={tick}>
            <line
              x1="70"
              x2="635"
              y1={y}
              y2={y}
              className="stroke-black/10 dark:stroke-white/10"
            />
            <text
              x="57"
              y={y + 4}
              textAnchor="end"
              className="fill-[#7b8492] text-[11px] dark:fill-[#8793a5]"
            >
              ₡{tick}M
            </text>
          </g>
        );
      })}
      {COMPARISON_DATA.map((item, index) => {
        const groupX = 105 + index * 137;
        const previousHeight = (item.previous / max) * (bottom - top);
        const currentHeight = (item.current / max) * (bottom - top);
        return (
          <g key={item.month}>
            <rect
              x={groupX}
              y={bottom - previousHeight}
              width="39"
              height={previousHeight}
              rx="5"
              className="fill-[#7a8799] dark:fill-[#637083]"
            />
            <rect
              x={groupX + 44}
              y={bottom - currentHeight}
              width="39"
              height={currentHeight}
              rx="5"
              className="fill-[#efa329]"
            />
            <text
              x={groupX + 41}
              y={bottom + 28}
              textAnchor="middle"
              className="fill-[#667085] text-[12px] font-semibold dark:fill-[#9aa5b4]"
            >
              {item.short}
            </text>
          </g>
        );
      })}
      <g transform="translate(430 279)">
        <rect width="13" height="13" rx="3" className="fill-[#7a8799] dark:fill-[#637083]" />
        <text x="20" y="11" className="fill-[#667085] text-[11px] dark:fill-[#9aa5b4]">
          2025
        </text>
        <rect x="75" width="13" height="13" rx="3" className="fill-[#efa329]" />
        <text x="95" y="11" className="fill-[#667085] text-[11px] dark:fill-[#9aa5b4]">
          2026
        </text>
      </g>
    </svg>
  );
}

export default function StatePage() {
  return (
    <main className="min-h-screen bg-[#f3f5f8] font-sans text-[#18212d] dark:bg-[#0c1219] dark:text-[#f3f5f8]">
      <header className="border-b border-black/10 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1219]/90">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#eda432] via-[#d5bd58] to-[#5b9fc8] text-sm font-black text-white shadow-sm">
              GX
            </div>
            <div>
              <p className="font-bold leading-tight tracking-[-0.02em]">
                Gimnasio Extremo · Ciudad Quesada S.A.
              </p>
              <p className="mt-1 text-xs text-[#667085] dark:text-[#93a0b2]">
                Cédula jurídica 3-101-686420 · Reporte financiero interno
              </p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-black/10 bg-[#f7f8fa] px-4 py-2 text-xs text-[#667085] dark:border-white/10 dark:bg-[#151d28] dark:text-[#a2adbc]">
            Ene – Jul 2026 · 7 de 12 meses
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-5 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
        <section aria-labelledby="state-title">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#bd7108] dark:text-[#efa329]">
            Estado del año · Corte al 17 de agosto 2026
          </p>
          <h1
            id="state-title"
            className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.055em] sm:text-5xl lg:text-[58px] lg:leading-[1.04]"
          >
            Cómo va el 2026 en números
          </h1>
          <p className="mt-5 max-w-[710px] text-base leading-7 text-[#5f6b7b] dark:text-[#a2adbc]">
            Consolidado de los siete cierres de mes disponibles (enero a julio). Reúne
            ingresos, cargas obligatorias, comparación contra 2025, vacíos de información
            detectados y la proyección al próximo cierre. Todas las cifras están en colones (₡),
            registradas antes de gastos. El IVA reportado se presenta por separado y debe
            conciliarse con Latinsoft y contabilidad.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Ingresos registrados"
              value="₡72.094.911"
              note="Enero–julio · antes de gastos"
            />
            <MetricCard
              label="Promedio mensual"
              value="₡10.299.273"
              change="+13,7%"
              note="julio vs enero"
            />
            <MetricCard
              label="Mejor mes"
              value="₡10.896.596"
              note="Junio 2026 · máximo del año"
            />
            <MetricCard label="Clientes nuevos" value="184" note="Altas acumuladas en 7 meses" />
            <MetricCard label="CCSS pagado" value="₡4.875.828" note="Cargas sociales · 7 planillas" />
            <MetricCard
              label="IVA registrado"
              value="₡4.851.425"
              note="Por conciliar con Latinsoft y contabilidad"
            />
          </div>
        </section>

        <section className="mt-20" aria-labelledby="section-01">
          <div id="section-01">
            <SectionHeading
              number="01"
              title="Tendencia de ingresos"
              description="Ingreso total mensual (membresías + VIP + otras ventas)"
            />
          </div>
          <div className="overflow-x-auto">
            <RevenueTrendChart />
          </div>
        </section>

        <section className="mt-20" aria-labelledby="section-02">
          <div id="section-02">
            <SectionHeading
              number="02"
              title="Detalle mes a mes"
              description="Desglose de cada cierre · valores en ₡"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(20,29,43,0.05)] dark:border-white/10 dark:bg-[#151d28] dark:shadow-[0_16px_42px_rgba(0,0,0,0.2)]">
            <table className="w-full min-w-[1020px] border-collapse text-right text-sm tabular-nums">
              <thead>
                <tr className="border-b border-black/10 bg-[#eef1f5] text-[11px] uppercase tracking-[0.07em] text-[#667085] dark:border-white/10 dark:bg-[#111923] dark:text-[#94a0b1]">
                  <th scope="col" className="px-5 py-4 text-left font-semibold">Mes</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Membresías netas</th>
                  <th scope="col" className="px-4 py-4 font-semibold">VIP (Alberto)</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Otras ventas</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Ingreso total</th>
                  <th scope="col" className="px-4 py-4 font-semibold">IVA 13%</th>
                  <th scope="col" className="px-4 py-4 font-semibold">CCSS</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Nuevos</th>
                </tr>
              </thead>
              <tbody>
                {MONTHLY_DATA.map((item) => (
                  <tr
                    key={item.month}
                    className="border-b border-black/[0.07] transition-colors last:border-0 hover:bg-black/[0.025] dark:border-white/[0.07] dark:hover:bg-white/[0.025]"
                  >
                    <th scope="row" className="px-5 py-4 text-left font-bold">{item.month}</th>
                    <td className="px-4 py-4">{formatNumber(item.memberships)}</td>
                    <td className="px-4 py-4">{formatNumber(item.vip)}</td>
                    <td className="px-4 py-4">{formatNumber(item.other)}</td>
                    <td className="px-4 py-4 font-extrabold text-[#a85e00] dark:text-[#ffc15c]">
                      {formatNumber(item.total)}
                    </td>
                    <td className="px-4 py-4 text-[#667085] dark:text-[#a2adbc]">{formatNumber(item.iva)}</td>
                    <td className="px-4 py-4 text-[#667085] dark:text-[#a2adbc]">{formatNumber(item.ccss)}</td>
                    <td className="px-5 py-4">{item.newClients}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#d89525] bg-[#fff7e7] font-extrabold dark:bg-[#2b2112]">
                  <th scope="row" className="px-5 py-4 text-left">Total 7m</th>
                  <td className="px-4 py-4">{formatNumber(TOTALS.memberships)}</td>
                  <td className="px-4 py-4">{formatNumber(TOTALS.vip)}</td>
                  <td className="px-4 py-4">{formatNumber(TOTALS.other)}</td>
                  <td className="px-4 py-4">{formatNumber(TOTALS.total)}</td>
                  <td className="px-4 py-4">{formatNumber(TOTALS.iva)}</td>
                  <td className="px-4 py-4">{formatNumber(TOTALS.ccss)}</td>
                  <td className="px-5 py-4">{TOTALS.newClients}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#667085] dark:text-[#93a0b2]">
            «Membresías netas» es el monto registrado como ingreso por membresías. «Otras ventas»
            agrupa personals, bebidas, cámara de bronceado, INBODY y servicios (CCSS Alberto, luz
            local, Valari Dance). Los totales del archivo se muestran tal como fueron entregados:
            hay diferencias de ₡1 pendientes de conciliación en membresías, IVA y la suma de los
            componentes de febrero.
          </p>
        </section>

        <section className="mt-20" aria-labelledby="section-03">
          <div id="section-03">
            <SectionHeading
              number="03"
              title="De dónde viene el dinero"
              description="Composición del ingreso acumulado"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <ChartShell>
              <div
                className="flex h-8 w-full overflow-hidden rounded-lg bg-[#e5e9ef] dark:bg-[#26303d]"
                aria-label="Distribución del ingreso acumulado"
              >
                {REVENUE_SOURCES.map((source) => (
                  <span
                    key={source.label}
                    className={source.color}
                    style={{ width: source.width }}
                    title={source.label + ": " + source.share}
                  />
                ))}
              </div>
              <div className="mt-7 space-y-5">
                {REVENUE_SOURCES.map((source) => (
                  <div key={source.label} className="flex items-start justify-between gap-5">
                    <div className="flex items-center gap-3">
                      <span className={"mt-1 size-3 shrink-0 rounded-sm " + source.color} />
                      <p className="font-semibold">{source.label}</p>
                    </div>
                    <p className="text-right font-bold tabular-nums">
                      {source.amount}{" "}
                      <span className="font-medium text-[#667085] dark:text-[#93a0b2]">
                        · {source.share}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </ChartShell>

            <div className="rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-[#151d28]">
              <h3 className="text-lg font-bold tracking-[-0.02em]">Lectura rápida</h3>
              <p className="mt-4 text-sm leading-7 text-[#596579] dark:text-[#a8b2bf]">
                El negocio se sostiene casi por completo en membresías: 8 de cada 10 colones.
                El programa VIP de Alberto Castro es la segunda pata, estable en ~₡1,46 M mensuales
                desde marzo. Las otras ventas (bebidas, personals, bronceado) aportan poco al total,
                pero la ganancia neta por bebidas suma ₡1.496.449 en el período.
              </p>
              <div className="mt-6 flex gap-3 rounded-xl border border-[#e7b65f]/50 bg-[#fff7e7] p-4 text-sm leading-6 text-[#744817] dark:border-[#8f6321]/60 dark:bg-[#2b2112] dark:text-[#f5c978]">
                <span aria-hidden="true">💡</span>
                <p>
                  Concentración alta en una sola fuente: cualquier caída en renovaciones de membresía
                  pega directo al 83% del ingreso. Vale la pena vigilar la tasa de renovación mes a mes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="section-04">
          <div id="section-04">
            <SectionHeading
              number="04"
              title="Gastos y cargas obligatorias"
              description="Lo único registrado en los controles"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <ChartShell>
              <h3 className="px-2 pt-1 text-base font-bold">CCSS mensual (planilla)</h3>
              <div className="mt-5 overflow-x-auto">
                <CcssChart />
              </div>
              <p className="px-2 pb-1 text-sm leading-6 text-[#667085] dark:text-[#93a0b2]">
                Estable en ₡670k–691k de enero a junio, salta a ₡773.759 en julio (+12%):
                revisar si entró personal nuevo o hubo ajuste salarial.
              </p>
            </ChartShell>

            <ChartShell>
              <h3 className="px-1 pt-1 text-base font-bold">Cargas del período (₡)</h3>
              <dl className="mt-5 divide-y divide-black/[0.08] dark:divide-white/[0.08]">
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-[#667085] dark:text-[#a2adbc]">CCSS – Caja</dt>
                  <dd className="font-extrabold tabular-nums">4.875.828</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-[#667085] dark:text-[#a2adbc]">IVA 13% a Hacienda</dt>
                  <dd className="font-extrabold tabular-nums">4.851.425</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-4">
                  <dt className="text-sm text-[#667085] dark:text-[#a2adbc]">INS – Riesgos del Trabajo</dt>
                  <dd className="max-w-[190px] text-right text-sm font-bold">base salarial ₡1.358.096/mes</dd>
                </div>
              </dl>
            </ChartShell>
          </div>

          <div className="mt-5 flex gap-4 rounded-2xl border border-[#dca346]/50 bg-[#fff7e7] p-5 text-sm leading-7 text-[#704513] dark:border-[#8d6426]/60 dark:bg-[#2b2112] dark:text-[#f3c878]">
            <span className="text-lg" aria-hidden="true">⚠️</span>
            <p>
              <strong>No es un estado de resultados completo.</strong> Estos controles registran
              ingresos y las cargas de CCSS/IVA, pero no incluyen planilla/salarios, alquiler,
              electricidad ni costo de producto. La utilidad real no se puede calcular con los
              archivos actuales.
            </p>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="section-05">
          <div id="section-05">
            <SectionHeading
              number="05"
              title="2026 contra 2025"
              description="Ingreso bruto de membresías · meses comparables"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
            <ChartShell>
              <div className="overflow-x-auto">
                <ComparisonChart />
              </div>
            </ChartShell>

            <ChartShell>
              <h3 className="px-1 pt-1 text-lg font-bold tracking-[-0.02em]">El año arrancó mejor</h3>
              <p className="mt-3 px-1 text-sm leading-6 text-[#667085] dark:text-[#a2adbc]">
                Comparando el ingreso bruto de membresías (tarjeta + efectivo + SINPE, antes del
                IVA para que sea comparable con 2025):
              </p>
              <div className="mt-5 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                <table className="w-full text-right text-sm tabular-nums">
                  <thead className="bg-[#eef1f5] text-[11px] uppercase tracking-[0.07em] text-[#667085] dark:bg-[#111923] dark:text-[#94a0b1]">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Mes</th>
                      <th scope="col" className="px-3 py-3">2025</th>
                      <th scope="col" className="px-3 py-3">2026</th>
                      <th scope="col" className="px-4 py-3">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON_DATA.map((item, index) => (
                      <tr key={item.month} className="border-t border-black/[0.07] dark:border-white/[0.07]">
                        <th scope="row" className="px-4 py-3 text-left font-semibold">{item.month}</th>
                        <td className="px-3 py-3">{formatNumber(item.previous)}</td>
                        <td className="px-3 py-3 font-bold">{formatNumber(item.current)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "rounded-full px-2 py-1 text-xs font-bold " +
                              (index === 0
                                ? "bg-[#fee8e8] text-[#b83232] dark:bg-[#3a1c20] dark:text-[#ff8b8b]"
                                : "bg-[#dff6e8] text-[#137a45] dark:bg-[#103b2a] dark:text-[#50d68b]")
                            }
                          >
                            {item.delta}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartShell>
          </div>

          <p className="mt-4 text-sm leading-6 text-[#667085] dark:text-[#93a0b2]">
            Solo enero–abril son comparables: el archivo de mayo 2025 está dañado (datos repetidos)
            y el de junio 2025 mezcla dos turnos. Sin datos de julio–diciembre 2025 en la carpeta.
          </p>
        </section>

        <section className="mt-20" aria-labelledby="section-06">
          <div id="section-06">
            <SectionHeading
              number="06"
              title="Vacíos y cosas por revisar"
              description="Faltantes de información y datos a corregir"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {ISSUES.map((issue) => (
              <article
                key={issue.title}
                className="flex gap-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#151d28]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff1d7] font-mono text-sm font-black text-[#ad6500] dark:bg-[#332611] dark:text-[#f5b84e]">
                  {issue.symbol}
                </span>
                <div>
                  <h3 className="font-bold leading-6 tracking-[-0.015em]">{issue.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-[#a2adbc]">{issue.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20" aria-labelledby="section-07">
          <div id="section-07">
            <SectionHeading
              number="07"
              title="Proyección al próximo cierre"
              description="Agosto 2026 y estimado de cierre anual"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROJECTIONS.map((projection) => (
              <article
                key={projection.label}
                className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#151d28]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7b8492] dark:text-[#8f9bad]">
                  {projection.label}
                </p>
                <p className="mt-3 text-xl font-extrabold tracking-[-0.04em] tabular-nums text-[#a85e00] dark:text-[#ffc15c]">
                  {projection.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#667085] dark:text-[#93a0b2]">{projection.note}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-[#151d28]">
            <h3 className="text-lg font-bold tracking-[-0.02em]">Cómo se calculó</h3>
            <p className="mt-3 max-w-5xl text-sm leading-7 text-[#596579] dark:text-[#a8b2bf]">
              La proyección de agosto toma el promedio de los 7 meses (₡10.299.273) como piso y el
              ritmo reciente redondeado a ₡10,7 M como techo; el promedio exacto de mayo a julio
              es ₡10.661.257. Para el cierre anual se suma el acumulado real (₡72.094.911) más
              cinco meses (agosto–diciembre) dentro de ese rango, dando ₡123,6 M a ₡125,6 M.
              Es una proyección lineal: no considera la estacionalidad de fin de año
              (matrículas de enero, baja de diciembre) porque no hay histórico 2025 completo para
              modelarla. Ajustar cuando entren los cierres reales.
            </p>
          </div>
        </section>
      </div>

      <footer className="border-t border-black/10 bg-white/65 dark:border-white/10 dark:bg-[#0a1017]">
        <div className="mx-auto grid max-w-[1120px] gap-5 px-5 py-8 text-xs leading-5 text-[#667085] sm:px-8 lg:grid-cols-[1fr_auto] dark:text-[#8f9bad]">
          <p className="max-w-2xl">
            Reporte generado a partir de los archivos de control internos. Cifras en colones
            costarricenses (₡) según esos controles; tratamiento fiscal pendiente de conciliación
            con Latinsoft y contabilidad.
          </p>
          <div className="flex flex-col gap-1 lg:text-right">
            <strong className="font-bold text-[#3f4b5b] dark:text-[#c6cfda]">Fuentes:</strong>
            <span>CIERRES DE MES · 7 archivos (ene–jul 2026)</span>
            <span>INGRESOS MENSUALES · 2025</span>
            <span>CCSS/REPORTES 2026 · 7 comprobantes</span>
            <span>INS · planillas RT</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
