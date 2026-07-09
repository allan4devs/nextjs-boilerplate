import { MessageCircle } from "lucide-react";
import { waLink } from "../lib/site";

export default function CtaBand({
  eyebrow = "Primer paso",
  title,
  message,
  cta = "Escribir ahora",
}: {
  eyebrow?: string;
  title: string;
  message: string;
  cta?: string;
}) {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#f6c400] px-5 py-16 text-black sm:px-8">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,#000_1px,transparent_1px)] [background-size:54px_54px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-black/55">{eyebrow}</p>
          <h2 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl">{title}</h2>
        </div>
        <a
          href={waLink(message)}
          className="inline-flex min-h-14 w-fit items-center gap-2 bg-black px-6 font-black uppercase text-white transition hover:bg-white hover:text-black"
        >
          {cta}
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>
    </section>
  );
}
