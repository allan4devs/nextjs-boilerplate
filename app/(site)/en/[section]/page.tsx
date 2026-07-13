import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CtaBand from "../../../components/CtaBand";
import ExtremeGymCheckout from "../../../ExtremeGymCheckout";
import GymBenefitsGrid from "../../../components/GymBenefitsGrid";
import PageHero from "../../../components/PageHero";
import { BUSINESS, telLink, waLink } from "../../../lib/site";
import { pageMetadata } from "../../../lib/seo";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";

const SECTIONS = ["training", "prices", "benefits", "seniors", "faq", "contact", "first-day"] as const;
type Section = (typeof SECTIONS)[number];

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const titles: Record<Section, string> = {
    training: "Training areas",
    prices: "Membership prices",
    benefits: "Member benefits",
    seniors: "Senior fitness classes",
    faq: "Frequently asked questions",
    contact: "Contact and location",
    "first-day": "Your first day free",
  };
  if (!SECTIONS.includes(section as Section)) return {};
  return pageMetadata({
    title: titles[section as Section],
    description: `${titles[section as Section]} at Xtreme Gym in Ciudad Quesada, Costa Rica.`,
    path: `/en/${section}`,
  });
}

const TRAINING_AREAS = [
  { icon: Dumbbell, title: "Strength", label: "Weights and machines", text: "Complete equipment to build strength, improve technique and turn effort into measurable progress." },
  { icon: Zap, title: "Functional", label: "HIIT and circuits", text: "Dynamic sessions that improve movement, conditioning, coordination and everyday energy." },
  { icon: HeartPulse, title: "Cardio", label: "Fitness and health", text: "Treadmills, ellipticals, bikes and climbers for endurance, heart health and weight management." },
  { icon: Trophy, title: "Lower Lab", label: "Legs and glutes", text: "A dedicated lower-body area for controlled strength, stability and progressive training." },
];

const PRICES = [
  { label: "First day", price: "Free", note: "Register through the app", href: "/en/first-day" },
  { label: "Week", price: "CRC 8,000", note: "Build momentum", href: "#inscripcion" },
  { label: "Fortnight", price: "CRC 13,500", note: "Keep your rhythm", href: "#inscripcion" },
  { label: "Month", price: "CRC 23,000", note: "Best long-term option", href: "#inscripcion" },
];

const FAQ = [
  ["What member benefits are available?", "Members have instructor support, free body assessments, customer parking, a snack area, equipment variety and a kids area, subject to availability and gym policies."],
  ["Does the kids area include childcare?", "No. It is a space designed for children, but they must remain supervised by their responsible adult."],
  ["Can I try the gym for one day?", "Yes. Your first day is free after registration, so you can experience the gym before choosing a plan."],
  ["Can I pay online?", "Yes. Weekly, fortnightly and monthly plans can be paid online through PayPal from our prices page."],
  ["Do I need previous experience?", "No. Beginners are welcome and our team can guide you through the equipment and training areas."],
  ["What should I bring?", "Comfortable workout clothes, training shoes, a towel and a water bottle."],
  ["Are senior classes beginner-friendly?", "Yes. Classes focus on safe mobility, gradual strength, balance and confidence."],
  ["What are the opening hours?", "Monday to Friday 5:00 AM–10:00 PM, Saturday 6:00 AM–6:00 PM and Sunday 7:00 AM–1:00 PM."],
];

function TrainingPage() {
  return (
    <>
      <PageHero eyebrow="Training areas" title="A place for every" highlight="training goal." text="Train strength, functional fitness, cardio and lower body with dedicated equipment and a clear purpose." image="https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=2000&q=86" imageAlt="Strength training area" />
      <section className="px-5 py-16 sm:px-8"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">{TRAINING_AREAS.map(({ icon: Icon, ...area }) => <article key={area.title} className="border border-white/10 bg-white/[0.04] p-6"><Icon className="h-8 w-8 text-[#f6c400]" /><p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-white/40">{area.label}</p><h2 className="mt-2 text-3xl font-black uppercase">{area.title}</h2><p className="mt-3 font-semibold leading-7 text-white/58">{area.text}</p></article>)}</div></section>
      <CtaBand eyebrow="Start training" title="Choose your plan and make today count." cta="Join now" href="/en/prices#inscripcion" />
    </>
  );
}

function PricesPage() {
  return (
    <>
      <PageHero eyebrow="Memberships" title="Flexible plans." highlight="No guesswork." text="Choose the amount of time that works for you. Pay online or speak with reception if you need help." image="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=2000&q=86" imageAlt="Gym training floor" />
      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f6c400]">Prices</p>
              <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-4xl">Current options.</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-white/58">
                Start free, then choose a week, fortnight or month. Paid plans are activated securely through PayPal.
              </p>
            </div>
            <a href="#inscripcion" className="inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black transition hover:bg-white">
              Join now <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PRICES.map((plan) => {
              const featured = plan.label === "Month";
              return (
                <article
                  key={plan.label}
                  className={`border p-5 ${
                    featured
                      ? "border-[#f6c400] bg-[#f6c400] text-black shadow-[0_0_44px_-20px_rgba(246,196,0,.9)]"
                      : "border-white/10 bg-white/[0.045] text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-[0.18em] ${featured ? "text-black/55" : "text-white/45"}`}>
                        {plan.note}
                      </p>
                      <h3 className="mt-2 text-2xl font-black uppercase">{plan.label}</h3>
                    </div>
                    {featured && (
                      <span className="bg-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="mt-6 text-4xl font-black uppercase leading-none">{plan.price}</p>
                  <Link
                    href={plan.href}
                    className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 text-sm font-black uppercase transition ${
                      featured ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-[#f6c400]"
                    }`}
                  >
                    {plan.price === "Free" ? "Register free" : "Choose this plan"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex items-start gap-3 border border-[#f6c400]/40 bg-[#f6c400]/10 p-5">
            <ShieldCheck className="h-6 w-6 shrink-0 text-[#f6c400]" />
            <p className="font-bold text-white/70">
              Online checkout is securely processed through PayPal. Your first free day stays outside the payment flow.
            </p>
          </div>
        </div>
      </section>
      <ExtremeGymCheckout locale="en" />
      <CtaBand eyebrow="Find your plan" title="Review the options and choose what works for you." cta="Join now" href="#inscripcion" />
    </>
  );
}

function SeniorsPage() {
  const benefits = [["Mobility", "Improve joint movement and everyday comfort."], ["Safe strength", "Gentle, progressive resistance helps maintain muscle and prevent falls."], ["Balance", "Build stability and confidence for walking and stairs."], ["Community", "Small groups and friendly guidance in every session."]];
  return <><PageHero eyebrow="Senior fitness" title="It is never too late" highlight="to feel better." text="Three guided classes every week for mobility, strength, balance and confidence in a welcoming community." image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=2000&q=86" imageAlt="Active older adults exercising" /><section className="px-5 py-16 sm:px-8"><div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2"><div className="border border-[#f6c400]/40 bg-white/[.04] p-6"><p className="text-xs font-black uppercase tracking-[.2em] text-[#f6c400]">Schedule and price</p><h2 className="mt-3 text-4xl font-black uppercase">Three classes per week</h2><p className="mt-6 text-3xl font-black text-[#f6c400]">CRC 16,000</p><p className="mt-3 font-semibold text-white/60">Morning groups run from 9:00–10:00 AM and 10:00–11:00 AM. Contact reception to confirm availability.</p><a href={waLink("Hello Xtreme Gym, I would like information about senior fitness classes.")} className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#f6c400] px-5 font-black uppercase text-black"><MessageCircle className="h-4 w-4" />Ask about classes</a></div><div className="grid gap-4 sm:grid-cols-2">{benefits.map(([title,text])=><article key={title} className="border border-white/10 bg-white/[.04] p-5"><CheckCircle2 className="h-5 w-5 text-[#f6c400]"/><h3 className="mt-4 text-xl font-black uppercase">{title}</h3><p className="mt-2 text-sm font-semibold leading-6 text-white/55">{text}</p></article>)}</div></div></section></>;
}

function BenefitsPage() {
  return (
    <>
      <PageHero
        eyebrow="Member benefits"
        title="More than equipment."
        highlight="Everything supports consistency."
        text="Training is easier to sustain when you have guidance, convenient access and spaces designed around your visit."
        image="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=2000&q=86"
        imageAlt="Training floor with a variety of gym equipment"
      />
      <section className="px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#f6c400]">Designed around your visit</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-none sm:text-6xl">
                Arrive with fewer worries. Train with more direction.
              </h2>
            </div>
            <p className="max-w-md text-sm font-semibold leading-7 text-white/55">
              Benefits are subject to schedule, availability and gym usage policies.
            </p>
          </div>
          <GymBenefitsGrid locale="en" />
        </div>
      </section>
      <CtaBand eyebrow="Your next step" title="Choose a plan and make the most of everything Xtreme offers." cta="Join now" href="/en/prices#inscripcion" />
    </>
  );
}

function FaqPage() {
  return <><PageHero eyebrow="FAQ" title="Answers before" highlight="your first visit." text="If your question is not here, message reception and we will be happy to help." image="https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=2000&q=86" imageAlt="Functional fitness training" /><section className="px-5 py-16 sm:px-8"><div className="mx-auto max-w-4xl divide-y divide-white/10 border-y border-white/10">{FAQ.map(([question,answer])=><details key={question} className="group py-5"><summary className="flex cursor-pointer list-none justify-between gap-4 text-lg font-black uppercase">{question}<span className="grid h-8 w-8 shrink-0 place-items-center bg-white text-black group-open:bg-[#f6c400]">+</span></summary><p className="mt-3 max-w-2xl font-semibold leading-8 text-white/58">{answer}</p></details>)}</div></section></>;
}

function ContactPage() {
  const schedule = [["Monday–Friday", "5:00 AM–10:00 PM"], ["Saturday", "6:00 AM–6:00 PM"], ["Sunday", "7:00 AM–1:00 PM"]];
  return <section className="px-5 py-12 sm:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#f6c400]">Contact</p><h1 className="mt-3 text-4xl font-black uppercase sm:text-6xl">Find Xtreme Gym.</h1><p className="mt-3 flex items-center gap-2 font-semibold text-white/60"><MapPin className="h-5 w-5 text-[#f6c400]"/>{BUSINESS.location}</p><div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><iframe title="Xtreme Gym location" src="https://www.google.com/maps?q=Xtreme%20Gym%20Ciudad%20Quesada%20Barrio%20San%20Pablo&output=embed" className="h-[440px] w-full border border-white/10 grayscale invert-[.92]" loading="lazy"/><div className="space-y-4"><a href={BUSINESS.maps} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 bg-[#f6c400] px-5 font-black uppercase text-black"><MapPin className="h-5 w-5"/>Get directions</a><a href={telLink} className="flex min-h-14 items-center gap-3 border border-white/15 px-5 font-black uppercase"><Phone className="h-5 w-5 text-[#f6c400]"/>{BUSINESS.phone}</a><a href={`mailto:${BUSINESS.email}`} className="flex min-h-14 items-center gap-3 border border-white/15 px-5 font-black uppercase"><Mail className="h-5 w-5 text-[#f6c400]"/>{BUSINESS.email}</a><div className="border border-white/10 p-5"><p className="flex items-center gap-2 font-black uppercase text-[#f6c400]"><Clock className="h-5 w-5"/>Opening hours</p>{schedule.map(([day,hours])=><div key={day} className="mt-3 flex justify-between gap-3 text-sm font-bold"><span>{day}</span><span className="text-white/55">{hours}</span></div>)}</div></div></div></div></section>;
}

function FirstDayPage() {
  return <><PageHero eyebrow="First visit" title="Your first day" highlight="is free." text="Experience the gym, explore the equipment and decide which membership fits your routine." image="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=2000&q=86" imageAlt="Gym strength floor"/><section className="px-5 py-16 sm:px-8"><div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">{[["1","Contact us","Tell reception when you would like to visit."],["2","Bring the basics","Workout clothes, training shoes, towel and water."],["3","Start training","Our team will show you where to begin."]].map(([n,title,text])=><article key={n} className="border border-white/10 bg-white/[.04] p-5"><span className="grid h-10 w-10 place-items-center bg-[#f6c400] font-black text-black">{n}</span><h2 className="mt-5 text-xl font-black uppercase">{title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-white/55">{text}</p></article>)}</div><div className="mx-auto mt-8 max-w-5xl"><a href={waLink("Hello Xtreme Gym, I would like to schedule my free first day.")} className="inline-flex min-h-14 items-center gap-2 bg-[#f6c400] px-6 font-black uppercase text-black"><MessageCircle className="h-5 w-5"/>Schedule your free day</a></div></section></>;
}

export default async function EnglishSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section as Section)) notFound();
  const pages: Record<Section, React.ReactNode> = { training: <TrainingPage />, prices: <PricesPage />, benefits: <BenefitsPage />, seniors: <SeniorsPage />, faq: <FaqPage />, contact: <ContactPage />, "first-day": <FirstDayPage /> };
  return pages[section as Section];
}
