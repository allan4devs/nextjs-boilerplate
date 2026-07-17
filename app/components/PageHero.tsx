import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

export default function PageHero({
  eyebrow,
  title,
  highlight,
  text,
  image,
  imageAlt,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  text: string;
  image: string;
  imageAlt: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0">
        <Image src={image} alt={imageAlt} fill priority sizes="100vw" quality={78} className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,.92)_45%,rgba(7,7,7,.55)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070707] to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <nav className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">
          <Link href="/" className="transition hover:text-[#f6c400]">
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-[#f6c400]">{eyebrow}</span>
        </nav>

        <h1 className="mt-6 max-w-4xl text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl">
          {title}
          {highlight && <span className="block text-[#f6c400]">{highlight}</span>}
        </h1>
        <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/70">{text}</p>

        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
