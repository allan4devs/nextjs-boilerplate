import Link from "next/link";
import type { LegalSection } from "../lib/legal";
import { LEGAL_UPDATED } from "../lib/legal";

export function LegalDocNav({
  current,
}: {
  current: "ayuda" | "terminos" | "privacidad" | "normas" | "preguntas";
}) {
  const items = [
    { id: "ayuda", href: "/ayuda", label: "Ayuda" },
    { id: "preguntas", href: "/preguntas", label: "Preguntas" },
    { id: "normas", href: "/normas", label: "Normas" },
    { id: "terminos", href: "/terminos", label: "Condiciones" },
    { id: "privacidad", href: "/privacidad", label: "Privacidad" },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`inline-flex min-h-10 items-center border px-3 text-[11px] font-black uppercase tracking-[0.12em] transition ${
              active
                ? "border-[#f6c400] bg-[#f6c400] text-black"
                : "border-white/15 text-white/55 hover:border-[#f6c400]/60 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-28">
          <h2 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">
            {section.title}
          </h2>
          <div className="mt-4 space-y-3">
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="text-sm font-semibold leading-7 text-white/65 sm:text-base sm:leading-8"
              >
                {paragraph}
              </p>
            ))}
          </div>
          {section.bullets && section.bullets.length > 0 && (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-semibold leading-7 text-white/60 sm:text-base">
              {section.bullets.map((bullet) => (
                <li key={bullet.slice(0, 48)}>{bullet}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function LegalUpdated() {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
      Actualizado: {LEGAL_UPDATED}
    </p>
  );
}

export function LegalToc({ sections }: { sections: LegalSection[] }) {
  return (
    <aside className="border border-white/10 bg-white/[0.03] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f6c400]">
        En esta página
      </p>
      <ul className="mt-3 space-y-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="text-sm font-bold text-white/55 transition hover:text-[#f6c400]"
            >
              {section.title.replace(/^\d+\.\s*/, "")}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
