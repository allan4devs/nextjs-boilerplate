import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ExtremeGymCheckout from "../../ExtremeGymCheckout";
import { BUSINESS, PLAN_DETAILS, waLink } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Precios y planes",
  description:
    "Costos de Xtreme Gym en Ciudad Quesada: primer día gratis, semana, quincena y mensualidad. Inscripción y pago en línea.",
  path: "/precios",
});

const COMPARISON = [
  { feature: "Acceso a todas las zonas", week: true, fortnight: true, month: true, group: true },
  { feature: "Clases funcionales", week: true, fortnight: true, month: true, group: true },
  { feature: "App de socios", week: true, fortnight: true, month: true, group: true },
  { feature: "Seguimiento de progreso", week: false, fortnight: true, month: true, group: true },
  { feature: "Entrenador en grupo reducido", week: false, fortnight: false, month: false, group: true },
  { feature: "Grupo de máximo 6 personas", week: false, fortnight: false, month: false, group: true },
  { feature: "Mejor precio por día", week: false, fortnight: false, month: true, group: false },
];

export default async function PreciosPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const validPlans = new Set(["week", "fortnight", "month", "senior"]);
  const initialPlan = plan && validPlans.has(plan) ? plan : "month";

  return (
    <div className="relative isolate min-h-[70vh] bg-[#050505]">
      {/* Misma atmósfera del Member OS: rejilla HUD + glows lima/cyan/naranja */}
      <div aria-hidden className="xg-atmosphere" />

      <div className="relative z-[1]">
        <section className="px-5 pb-6 pt-10 sm:px-8 lg:pb-8 lg:pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Precios claros</p>
            <h1 className="mt-2 text-4xl font-black uppercase leading-[0.9] sm:text-6xl">Elegí tu plan.</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58 sm:text-base">
              Tocá una opción para inscribirte. El mensual ofrece el mejor precio por día.
            </p>
          </div>
        </section>
        <Suspense fallback={null}>
          <ExtremeGymCheckout initialOption={initialPlan} compact />
        </Suspense>

        <section className="border-t border-white/10 px-5 py-14 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 lg:grid-cols-[1fr_.75fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Compará con calma</p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-none sm:text-5xl">
                  Qué incluye cada opción.
                </h2>
              </div>
              <p className="text-sm font-semibold leading-7 text-white/50 lg:text-right">
                La clase grupal suma supervisión cercana y cupos reducidos. Los planes normales mantienen acceso flexible al gimnasio.
              </p>
            </div>

            <div className="mt-8 overflow-x-auto border border-white/10 bg-black/40 backdrop-blur-[2px]">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="bg-white/[0.05] text-[11px] font-black uppercase tracking-[0.12em] text-white/50">
                    <th className="p-4">Beneficio</th>
                    <th className="p-4 text-center">Semana</th>
                    <th className="p-4 text-center">Quincena</th>
                    <th className="bg-[#f6c400] p-4 text-center text-black">Mes</th>
                    <th className="p-4 text-center text-[#f6c400]">Grupal</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.feature} className="border-t border-white/10">
                      <td className="p-4 text-sm font-bold text-white/72">{row.feature}</td>
                      {[row.week, row.fortnight, row.month, row.group].map((value, index) => (
                        <td key={index} className={index === 2 ? "bg-[#f6c400]/[0.06] p-4 text-center" : "p-4 text-center"}>
                          {value ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-[#f6c400]" />
                          ) : (
                            <span className="text-white/20">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Incluido según el plan</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {PLAN_DETAILS.map((detail) => (
                  <div key={detail} className="flex items-start gap-3 border-l-2 border-[#f6c400] bg-white/[0.035] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f6c400]" />
                    <span className="text-sm font-bold leading-6 text-white/65">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
              <a
                href="#inscripcion"
                className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 text-sm font-black uppercase text-black transition hover:bg-white"
              >
                Elegir un plan
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={waLink("Hola Xtreme Gym, quiero consultar disponibilidad para las clases grupales de ₡45.000.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 border border-[#f6c400]/60 px-5 text-sm font-black uppercase text-[#f6c400] transition hover:bg-[#f6c400] hover:text-black"
              >
                Consultar clase grupal
                <MessageCircle className="h-4 w-4" />
              </a>
              <Link
                href="/adultos-mayores"
                className="inline-flex min-h-12 items-center gap-2 border border-white/15 px-5 text-sm font-black uppercase text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Adultos mayores
                <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="ml-auto text-xs font-black uppercase tracking-[0.12em] text-white/35">
                Información: {BUSINESS.phone}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
