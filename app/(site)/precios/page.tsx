import type { Metadata } from "next";
import Link from "next/link";
import ExtremeGymCheckout from "../../ExtremeGymCheckout";
import CtaBand from "../../components/CtaBand";
import { BUSINESS, COSTS, PLAN_DETAILS } from "../../lib/site";
import { pageMetadata } from "../../lib/seo";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = pageMetadata({
  title: "Precios y planes",
  description:
    "Costos de Xtreme Gym en Ciudad Quesada: primer día gratis, semana, quincena y mensualidad. Inscripción y pago en línea.",
  path: "/precios",
});

const COMPARISON = [
  { feature: "Acceso a todas las zonas", day: true, week: true, fortnight: true, month: true },
  { feature: "Clases funcionales", day: true, week: true, fortnight: true, month: true },
  { feature: "App de socios", day: false, week: true, fortnight: true, month: true },
  { feature: "Reserva de cupo", day: false, week: true, fortnight: true, month: true },
  { feature: "Seguimiento de progreso", day: false, week: false, fortnight: true, month: true },
  { feature: "Mejor precio por día", day: false, week: false, fortnight: false, month: true },
];

export default function PreciosPage() {
  return (
    <>
      <section className="px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Precios</p>
              <h1 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">Costos vigentes.</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/58">
                Día, semana, quincena o mes. Estos son los precios vigentes: elegí tu plan y pagalo en línea con
                tarjeta, sin filas ni trámites en recepción.
              </p>
            </div>
            <a
              href="#inscripcion"
              className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white"
            >
              Pagar en línea
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                      <p
                        className={`text-xs font-black uppercase tracking-[0.18em] ${
                          featured ? "text-black/55" : "text-white/45"
                        }`}
                      >
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
                    href="#inscripcion"
                    className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 text-sm font-black uppercase transition ${
                      featured ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-[#f6c400]"
                    }`}
                  >
                    {item.price === "Gratis" ? "Registrarme gratis" : "Elegir y pagar"}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </article>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {PLAN_DETAILS.map((detail) => (
              <div key={detail} className="flex items-center gap-3 border border-white/10 bg-white/[0.04] p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#f6c400]" />
                <span className="font-bold text-white/72">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Comparación</p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-5xl">Qué incluye cada plan.</h2>

          <div className="mt-8 overflow-x-auto border border-white/10">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="bg-white/[0.05] text-xs font-black uppercase tracking-[0.14em] text-white/55">
                  <th className="p-4">Beneficio</th>
                  <th className="p-4 text-center">Primer día</th>
                  <th className="p-4 text-center">Semana</th>
                  <th className="p-4 text-center">Quincena</th>
                  <th className="p-4 text-center text-[#f6c400]">Mes</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-t border-white/10">
                    <td className="p-4 font-bold text-white/72">{row.feature}</td>
                    {[row.day, row.week, row.fortnight, row.month].map((value, index) => (
                      <td key={index} className="p-4 text-center">
                        {value ? (
                          <CheckCircle2 className="mx-auto h-5 w-5 text-[#f6c400]" />
                        ) : (
                          <span className="text-white/25">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-white/65">
              Información: {BUSINESS.phone}
            </p>
            <Link
              href="/adultos-mayores"
              className="inline-flex items-center gap-2 text-sm font-black uppercase text-[#f6c400] transition hover:text-white"
            >
              Ver costo de adultos mayores
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <ExtremeGymCheckout />

      <CtaBand
        eyebrow="Empezá ahora"
        title="Elegí el plan que querés y completá el pago en línea."
        cta="Ir al pago"
        href="#inscripcion"
      />
    </>
  );
}
