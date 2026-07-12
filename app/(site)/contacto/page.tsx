import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, SCHEDULE, telLink, waLink } from "../../lib/site";
import { CalendarCheck, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contacto y ubicación",
  description:
    "Horarios, teléfono, correo y ubicación de Xtreme Gym en Ciudad Quesada, Barrio San Pablo. Escríbanos por WhatsApp.",
};

type BrandIconProps = { className?: string };

function brandSvgProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    className,
  } as const;
}

function FacebookIcon({ className }: BrandIconProps) {
  return (
    <svg {...brandSvgProps(className)}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: BrandIconProps) {
  return (
    <svg {...brandSvgProps(className)}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ className }: BrandIconProps) {
  return (
    <svg {...brandSvgProps(className)}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

function TikTokIcon({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M19.6 6.7a5 5 0 0 1-3.6-1.6 5 5 0 0 1-1.2-2.4V2h-3.1v12.6a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V8.6a6.6 6.6 0 0 0-.9-.1 6 6 0 1 0 6 6V9.5a8 8 0 0 0 4.8 1.6V6.7Z" />
    </svg>
  );
}

const CONTACT_ACTIONS = [
  {
    href: waLink("Hola Xtreme Gym, quiero información para entrenar."),
    label: "WhatsApp",
    detail: BUSINESS.phone,
    icon: MessageCircle,
    external: true,
    primary: true,
  },
  {
    href: "/app",
    label: "Reservar",
    detail: "App de socios",
    icon: CalendarCheck,
    external: false,
    primary: false,
  },
  {
    href: telLink,
    label: "Llamar",
    detail: BUSINESS.phone,
    icon: Phone,
    external: false,
    primary: false,
  },
  {
    href: `mailto:${BUSINESS.email}`,
    label: "Correo",
    detail: BUSINESS.email,
    icon: Mail,
    external: false,
    primary: false,
  },
];

const SOCIAL_LINKS = [
  { href: BUSINESS.social.facebook, label: "Facebook", icon: FacebookIcon },
  { href: BUSINESS.social.instagram, label: "Instagram", icon: InstagramIcon },
  { href: BUSINESS.social.youtube, label: "YouTube", icon: YoutubeIcon },
  { href: BUSINESS.social.tiktok, label: "TikTok", icon: TikTokIcon },
];

export default function ContactoPage() {
  return (
    <section className="px-5 py-10 sm:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Contacto</p>
            <h1 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">
              Llegue directo a Xtreme Gym.
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/58">
              <MapPin className="h-4 w-4 shrink-0 text-[#f6c400]" />
              {BUSINESS.location}
            </p>
          </div>
          <a
            href={BUSINESS.maps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#f6c400] px-5 py-3 font-black uppercase text-black transition hover:bg-white"
          >
            Cómo llegar
            <MapPin className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="overflow-hidden border border-white/10 bg-black">
            <iframe
              title="Mapa de Xtreme Gym en Ciudad Quesada"
              src="https://www.google.com/maps?q=Xtreme%20Gym%20Ciudad%20Quesada%20Barrio%20San%20Pablo&output=embed"
              className="h-[340px] w-full border-0 grayscale invert-[.92] contrast-125 md:h-full md:min-h-[440px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="grid content-start gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {CONTACT_ACTIONS.map(({ href, label, detail, icon: Icon, external, primary }) => {
                const className = primary
                  ? "flex items-center gap-3 bg-[#f6c400] p-4 text-black transition hover:bg-white"
                  : "flex items-center gap-3 border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#f6c400]/55";
                const body = (
                  <>
                    <Icon className={`h-5 w-5 shrink-0 ${primary ? "" : "text-[#f6c400]"}`} />
                    <span className="min-w-0">
                      <span className="block font-black uppercase">{label}</span>
                      <span
                        className={`block truncate text-xs font-bold ${primary ? "text-black/65" : "text-white/55"}`}
                      >
                        {detail}
                      </span>
                    </span>
                  </>
                );
                return href.startsWith("/") ? (
                  <Link key={label} href={href} className={className}>
                    {body}
                  </Link>
                ) : (
                  <a
                    key={label}
                    href={href}
                    className={className}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {body}
                  </a>
                );
              })}
            </div>

            <div className="border border-white/10 bg-white/[0.04] p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#f6c400]">
                <Clock className="h-4 w-4" />
                Horario
              </p>
              <div className="mt-3 grid gap-2">
                {SCHEDULE.map((item) => (
                  <div key={item.day} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black uppercase">{item.day}</span>
                    <span className="text-sm font-bold text-white/58">{item.hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2 border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#f6c400]/55"
                >
                  <Icon className="h-5 w-5 text-[#f6c400]" />
                  <span className="text-xs font-black uppercase">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
