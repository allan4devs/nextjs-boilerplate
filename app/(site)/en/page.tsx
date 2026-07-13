import type { Metadata } from "next";
import Link from "next/link";
import CtaBand from "../../components/CtaBand";
import ImageTile from "../../components/ImageTile";
import JsonLd from "../../components/JsonLd";
import LandingTrack from "../../components/LandingTrack";
import { BUSINESS, HERO_IMAGES } from "../../lib/site";
import { gymJsonLd, pageMetadata } from "../../lib/seo";
import { ArrowRight, CalendarCheck, Dumbbell, MapPin, Smartphone, Trophy } from "lucide-react";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Xtreme Gym | Gym in Ciudad Quesada",
    description:
      "A complete gym in Ciudad Quesada, San Carlos, with strength, functional and cardio areas, flexible memberships and personal support.",
    path: "/en",
    absoluteTitle: true,
  }),
  alternates: {
    canonical: "/en",
    languages: { "es-CR": "/", "en": "/en" },
  },
};

const PROOF = [
  { value: "5 AM", label: "weekday opening" },
  { value: "4", label: "training areas" },
  { value: "3", label: "flexible plans" },
  { value: "1", label: "member app" },
];

const STEPS = [
  { icon: CalendarCheck, title: "Choose your pace", text: "Start with a day, week, fortnight or monthly membership." },
  { icon: Dumbbell, title: "Train with structure", text: "Dedicated strength, functional, cardio and lower-body areas." },
  { icon: Trophy, title: "Keep progressing", text: "Use streaks, reservations and progress tracking in the member app." },
];

const EXPLORE = [
  { href: "/en/prices", label: "Prices and plans", text: "Day, weekly, fortnightly and monthly options with online payment.", image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=84" },
  { href: "/en/training", label: "Training areas", text: "Strength, functional, cardio and lower-body equipment.", image: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=84" },
  { href: "/en/seniors", label: "Senior fitness", text: "Three guided classes per week for mobility, strength and confidence.", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=84" },
  { href: "/app", label: "Member app", text: "Reservations, streaks, digital membership card and progress in one place.", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=84" },
  { href: "/en/faq", label: "Frequently asked questions", text: "Useful information before your first workout.", image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=900&q=84" },
  { href: "/en/contact", label: "Hours and location", text: "Find us in Barrio San Pablo, Ciudad Quesada.", image: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=900&q=84" },
];

export default function EnglishLandingPage() {
  return (
    <>
      <JsonLd data={gymJsonLd()} />
      <LandingTrack surface="home-en" />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2400&q=88" alt="Modern gym interior" className="h-full w-full object-cover opacity-44" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#070707_0%,rgba(7,7,7,.94)_38%,rgba(7,7,7,.62)_72%,rgba(7,7,7,.34)_100%)]" />
          <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 border border-[#f6c400]/45 bg-black/45 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffe875] backdrop-blur">
              <MapPin className="h-4 w-4" /> {BUSINESS.location}
            </div>
            <h1 className="mt-7 text-[2.75rem] font-black uppercase leading-[0.86] tracking-tight min-[420px]:text-5xl sm:text-7xl lg:text-8xl">
              Train strong.
              <span className="block text-[#f6c400]">Live with more energy.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-white/72">
              A complete gym in Ciudad Quesada for strength, functional training, cardio and lasting habits. Choose your plan, book through the app and train with a team that helps you move forward.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/en/first-day" className="inline-flex min-h-14 items-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black transition hover:bg-white">
                Get your first day free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/app" className="inline-flex min-h-14 items-center gap-2 border border-white/20 bg-white/[0.07] px-6 font-black uppercase text-white transition hover:border-white/45">
                View member app <Smartphone className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 border border-white/10 bg-black/45 backdrop-blur sm:grid-cols-4">
              {PROOF.map((item) => (
                <div key={item.label} className="border-r border-white/10 p-4 last:border-r-0">
                  <p className="text-3xl font-black text-[#f6c400]">{item.value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/48">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden gap-4 lg:grid lg:grid-cols-[1fr_260px]">
            <div className="relative border border-white/12 bg-black/70 p-4 shadow-2xl">
              <ImageTile src={HERO_IMAGES[0].src} alt="Strength equipment" className="aspect-[4/5]" />
              <div className="absolute left-8 top-8 bg-[#f6c400] px-4 py-3 text-black">
                <p className="text-xs font-black uppercase tracking-[0.18em]">Xtreme movement</p>
                <p className="text-2xl font-black uppercase leading-none">Strength with direction</p>
              </div>
            </div>
            <div className="grid gap-4">
              <ImageTile src={HERO_IMAGES[1].src} alt="Strength workout" className="aspect-square" />
              <div className="bg-[#f6c400] p-5 text-black">
                <p className="text-xs font-black uppercase tracking-[0.2em]">Start with purpose</p>
                <h2 className="mt-3 text-3xl font-black uppercase leading-none">Your next workout has a place</h2>
              </div>
              <ImageTile src={HERO_IMAGES[2].src} alt="Functional training class" className="aspect-[4/3]" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#f6c400] px-5 py-4 text-black sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 text-xs font-black uppercase tracking-[0.16em]">
          <span>Strength</span><span>Functional</span><span>Cardio</span><span>Personal support</span><span>Real habits</span><span>Senior fitness</span><span>San Carlos</span>
        </div>
      </section>

      <section className="bg-[#0b0b0b] px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">A simple path</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-none sm:text-6xl">Show up, train and make it a habit.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article key={step.title} className="border border-white/10 bg-white/[0.045] p-5 transition hover:border-[#f6c400]/55 hover:bg-[#f6c400]/10">
                <div className="flex justify-between"><span className="grid h-12 w-12 place-items-center bg-[#f6c400] text-black"><step.icon className="h-6 w-6" /></span><span className="text-4xl font-black text-white/10">0{index + 1}</span></div>
                <h3 className="mt-8 text-2xl font-black uppercase">{step.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/58">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Explore</p>
          <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">Everything you need to know.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {EXPLORE.map((item) => (
              <Link key={item.href} href={item.href} className="group overflow-hidden border border-white/10 bg-black transition hover:border-[#f6c400]/55">
                <div className="aspect-[16/10] overflow-hidden"><img src={item.image} alt={item.label} className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" /></div>
                <div className="p-5"><div className="flex justify-between gap-3"><h3 className="text-xl font-black uppercase">{item.label}</h3><ArrowRight className="h-5 w-5 text-[#f6c400]" /></div><p className="mt-2 text-sm font-semibold leading-6 text-white/55">{item.text}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CtaBand eyebrow="Start today" title="Choose the plan that works best for you." cta="Join now" href="/en/prices#inscripcion" />
    </>
  );
}
