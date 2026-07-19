import type { ComponentType, ReactNode } from "react";
import {
  Award,
  Briefcase,
  Cloud,
  Code2,
  Database,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Rocket,
  Server,
  Sparkles,
  Wrench,
} from "lucide-react";
import PrintButton from "./PrintButton";

const CONTACT = {
  name: "Allan José Rojas Durán",
  title: "Senior Software Engineer",
  focus: "Full-Stack · Cloud-Native · Distributed Systems",
  stack: "TypeScript · React · Next.js · Java · Spring Boot · Python · AWS · Kubernetes",
  location: "Alajuela, Costa Rica · Remote",
  phone: "+506 7225 2296",
  phoneHref: "tel:+50672252296",
  email: "allan4devs@gmail.com",
  emailHref: "mailto:allan4devs@gmail.com",
  github: "emeraldcr",
  githubHref: "https://github.com/emeraldcr",
};

const SUMMARY =
  "Senior Software Engineer with 10+ years shipping production systems across enterprise, healthcare, and consumer products. I design and deliver end-to-end platforms-scalable backends, modern web clients, and reliable cloud infrastructure-from architecture through production ownership. Strong in Java/Spring and TypeScript/React stacks on AWS, with deep experience in microservices, data modeling, CI/CD, and observability. I work effectively with product and cross-functional partners, raise engineering quality through design reviews and mentoring, and use AI-assisted workflows to accelerate delivery without sacrificing reliability.";

const ACHIEVEMENTS = [
  "Owned full product delivery for cloud-native platforms-architecture, implementation, infrastructure, and production operations.",
  "Designed and operated backend services and APIs at production scale with Java, Spring Boot, Node.js, and Python.",
  "Built modern React/TypeScript frontends and operator dashboards with real-time data and strong UX for internal and customer workflows.",
  "Established CI/CD, containerization, and cloud deployment patterns that improved release consistency and team throughput.",
  "Improved system performance through query optimization, caching, and schema design on relational databases.",
  "Introduced AI-assisted automation for operations and internal workflows, reducing manual work and turnaround time.",
];

const EXPERIENCE = [
  {
    role: "Senior Full-Stack Engineer",
    company: "La Vieja Adventures",
    location: "Remote · Costa Rica",
    bullets: [
      "Architected and shipped a cloud-native tourism platform with Spring Boot, React, Next.js, TypeScript, and GraphQL.",
      "Delivered booking flows, admin consoles, reservation tooling, auth, and payment integrations end to end.",
      "Designed backend services and MySQL data models for responsiveness and operational reliability.",
      "Containerized services with Docker and ran production workloads on AWS.",
      "Built AI-assisted tools for reservations, customer communication, reporting, and internal operations.",
      "Owned architecture, deployment, monitoring, and continuous improvement after go-live.",
    ],
  },
  {
    role: "Senior Software Engineer",
    company: "Wind River",
    location: "Remote · Costa Rica",
    bullets: [
      "Designed and maintained Spring Boot microservices for cloud-native enterprise platforms.",
      "Shipped event-driven backend services on AWS with Lambda, Kubernetes, and scalable service patterns.",
      "Built React dashboards with Redux Toolkit and real-time visualization for operational insights.",
      "Hardened delivery with GitHub Actions and Jenkins pipelines for consistent, repeatable releases.",
      "Raised production visibility with Prometheus and Grafana observability.",
      "Contributed to system design, code review culture, production support, and mentoring.",
    ],
  },
  {
    role: "Full-Stack Engineer",
    company: "Costa Rica Software Services",
    location: "Costa Rica",
    bullets: [
      "Delivered full-stack web products with React, TypeScript, Node.js, and Express.",
      "Built REST APIs for GPS tracking, payments, and real-time mobility use cases.",
      "Improved API and data-layer performance with SQL tuning, caching, and request-path optimization.",
      "Increased reliability with automated testing (Jest, Cypress) and tighter QA collaboration.",
      "Partnered closely with product, QA, and multi-disciplinary engineering teams.",
    ],
  },
  {
    role: "Software Engineer",
    company: "MicroVention - Terumo",
    location: "Costa Rica",
    bullets: [
      "Built Java systems for manufacturing operations in an FDA-regulated medical device environment.",
      "Automated production reporting to cut manual effort and improve operational consistency.",
      "Shipped equipment monitoring dashboards with JavaScript and Chart.js.",
      "Maintained enterprise software under FDA and ISO 13485 quality constraints.",
      "Collaborated with manufacturing, quality, and business stakeholders in a compliance-heavy context.",
    ],
  },
  {
    role: "Software Engineer",
    company: "ImagineerCX",
    location: "Costa Rica",
    bullets: [
      "Developed and maintained customer-facing web applications with PHP, JavaScript, HTML/CSS, and MySQL.",
      "Improved performance through frontend rendering and backend processing optimizations.",
      "Worked in Agile teams with design, QA, and project management partners.",
      "Took features from implementation through production deployment and support.",
    ],
  },
];

const SKILL_GROUPS = [
  {
    title: "Languages",
    icon: Code2,
    items: ["TypeScript", "JavaScript", "Java", "Python", "SQL"],
  },
  {
    title: "Frontend",
    icon: Monitor,
    items: [
      "React",
      "Next.js",
      "Redux Toolkit",
      "Tailwind CSS",
      "Material UI",
      "HTML5 / CSS3",
    ],
  },
  {
    title: "Backend & APIs",
    icon: Server,
    items: [
      "Spring Boot",
      "Node.js",
      "Express",
      "REST",
      "GraphQL",
      "Microservices",
      "AuthN / AuthZ",
      "Event-driven design",
    ],
  },
  {
    title: "Cloud & Platform",
    icon: Cloud,
    items: [
      "AWS",
      "Lambda",
      "ECS / EKS",
      "EC2",
      "S3",
      "RDS",
      "Docker",
      "Kubernetes",
      "Terraform",
      "GitHub Actions",
      "Jenkins",
      "CI/CD",
    ],
  },
  {
    title: "Data",
    icon: Database,
    items: [
      "PostgreSQL",
      "MySQL",
      "Redis",
      "Schema design",
      "Query optimization",
      "Caching strategies",
    ],
  },
  {
    title: "Quality & Ops",
    icon: Wrench,
    items: [
      "System design",
      "Observability",
      "Prometheus",
      "Grafana",
      "Testing (Jest / Cypress)",
      "Code review",
      "Linux",
      "Git",
      "Agile",
      "AI-assisted engineering",
    ],
  },
];

const STRENGTHS = [
  "End-to-end product ownership",
  "Backend & API design",
  "Distributed systems",
  "Cloud architecture",
  "Performance & reliability",
  "Platform / DevEx mindset",
  "Production operations",
  "Technical leadership",
  "Cross-functional delivery",
  "AI-augmented workflows",
];

const LANGUAGES = [
  { name: "Spanish", level: "Native" },
  { name: "English", level: "Professional working (C1)" },
];

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: ReactNode;
}) {
  return (
    <h2 className="cv-section-title flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-300">
      <span className="cv-section-icon flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {children}
    </h2>
  );
}

function SkillPill({ children }: { children: ReactNode }) {
  return (
    <span className="cv-pill inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-slate-200">
      {children}
    </span>
  );
}

export default function CvPage() {
  return (
    <div className="cv-page relative overflow-hidden">
      <div aria-hidden className="cv-no-print pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -right-24 top-40 h-[360px] w-[360px] rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[280px] w-[280px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="cv-page-inner relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="cv-no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Professional profile
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={CONTACT.emailHref}
              className="inline-flex items-center gap-2 rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-sky-300"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Contact
            </a>
            <PrintButton />
          </div>
        </div>

        <article className="cv-sheet overflow-hidden rounded-3xl border border-white/10 bg-[#0c1220]/90 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_80px_-20px_rgba(0,0,0,0.65)] backdrop-blur-sm">
          <header className="cv-hero relative border-b border-white/10 bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10 px-6 py-8 sm:px-10 sm:py-10">
            <div className="cv-hero-row flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="cv-badge inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-200">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Open to remote · Senior IC
                </p>
                <h1 className="cv-name mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
                  {CONTACT.name}
                </h1>
                <p className="cv-title cv-accent mt-2 text-lg font-semibold tracking-tight text-sky-200 sm:text-xl">
                  {CONTACT.title}
                </p>
                <p className="cv-focus mt-1 text-sm font-medium text-slate-400">
                  {CONTACT.focus}
                </p>
                <p className="cv-stack cv-soft mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">
                  {CONTACT.stack}
                </p>
              </div>

              <div className="cv-contact grid shrink-0 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-1 lg:text-right">
                <a
                  href={CONTACT.phoneHref}
                  className="inline-flex items-center gap-2 text-slate-300 transition hover:text-sky-300 lg:justify-end"
                >
                  <Phone
                    className="cv-contact-icon h-4 w-4 shrink-0 text-sky-400"
                    aria-hidden
                  />
                  {CONTACT.phone}
                </a>
                <a
                  href={CONTACT.emailHref}
                  className="inline-flex items-center gap-2 text-slate-300 transition hover:text-sky-300 lg:justify-end"
                >
                  <Mail
                    className="cv-contact-icon h-4 w-4 shrink-0 text-sky-400"
                    aria-hidden
                  />
                  {CONTACT.email}
                </a>
                <p className="inline-flex items-center gap-2 text-slate-300 lg:justify-end">
                  <MapPin
                    className="cv-contact-icon h-4 w-4 shrink-0 text-sky-400"
                    aria-hidden
                  />
                  {CONTACT.location}
                </p>
                <a
                  href={CONTACT.githubHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-300 transition hover:text-sky-300 lg:justify-end"
                >
                  <Code2
                    className="cv-contact-icon h-4 w-4 shrink-0 text-sky-400"
                    aria-hidden
                  />
                  github.com/{CONTACT.github}
                </a>
              </div>
            </div>
          </header>

          <div className="cv-body grid gap-0 lg:grid-cols-[1fr_280px] print:block print:grid-cols-none">
            <div className="cv-main space-y-10 border-white/10 px-6 py-8 sm:px-10 sm:py-10 lg:border-r print:w-full print:border-0 print:p-0">
              <section className="cv-avoid-break">
                <SectionTitle icon={Rocket}>Summary</SectionTitle>
                <p className="cv-summary mt-4 text-[15px] leading-relaxed text-slate-300">
                  {SUMMARY}
                </p>
              </section>

              <section className="cv-avoid-break">
                <SectionTitle icon={Award}>Impact highlights</SectionTitle>
                <ul className="cv-list mt-4 space-y-2.5">
                  {ACHIEVEMENTS.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-[14px] leading-relaxed text-slate-300"
                    >
                      <span
                        className="cv-bullet mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <SectionTitle icon={Briefcase}>Experience</SectionTitle>
                <div className="cv-jobs mt-6 space-y-8">
                  {EXPERIENCE.map((job, index) => (
                    <article
                      key={`${job.company}-${job.role}`}
                      className={`cv-job relative pl-5${index === 1 ? " cv-page2-start" : ""}`}
                    >
                      <span
                        className="cv-job-rail absolute left-0 top-1.5 h-full w-px bg-gradient-to-b from-sky-400/60 via-white/10 to-transparent"
                        aria-hidden
                      />
                      <span
                        className="cv-job-dot absolute left-[-3.5px] top-1.5 h-2 w-2 rounded-full border-2 border-sky-400 bg-[#0c1220]"
                        aria-hidden
                      />
                      <div className="cv-job-head flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="cv-job-identity min-w-0">
                          <h3 className="cv-job-role text-base font-bold text-white">
                            {job.role}
                          </h3>
                          <p className="cv-job-company text-sm font-semibold text-sky-200">
                            {job.company}
                          </p>
                        </div>
                        <p className="cv-job-location shrink-0 text-xs font-medium text-slate-500 sm:text-right">
                          {job.location}
                        </p>
                      </div>
                      <ul className="cv-job-bullets mt-3 space-y-2">
                        {job.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate-300"
                          >
                            <span
                              className="cv-bullet mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-slate-500"
                              aria-hidden
                            />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      {index < EXPERIENCE.length - 1 ? (
                        <div className="cv-job-rule mt-8 h-px w-full bg-white/5" />
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="cv-side space-y-8 bg-white/[0.02] px-6 py-8 sm:px-8 sm:py-10 print:w-full print:break-before-page">
              <section>
                <SectionTitle icon={Code2}>Technical skills</SectionTitle>
                <div className="mt-5 space-y-5">
                  {SKILL_GROUPS.map((group) => {
                    const Icon = group.icon;
                    return (
                      <div key={group.title} className="cv-skill-group">
                        <p className="cv-skill-label mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          <Icon className="h-3.5 w-3.5 text-sky-400" aria-hidden />
                          {group.title}
                        </p>
                        <div className="cv-pills flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <SkillPill key={item}>{item}</SkillPill>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="cv-avoid-break">
                <SectionTitle icon={GraduationCap}>Education</SectionTitle>
                <div className="cv-edu-card mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="cv-edu-degree text-sm font-bold text-white">
                    B.S. Computer Engineering
                  </p>
                  <p className="cv-edu-school mt-1 text-sm font-medium text-sky-200">
                    Instituto Tecnológico de Costa Rica (TEC)
                  </p>
                </div>
              </section>

              <section className="cv-avoid-break">
                <SectionTitle icon={Sparkles}>How I work</SectionTitle>
                <div className="cv-pills mt-4 flex flex-wrap gap-1.5">
                  {STRENGTHS.map((item) => (
                    <SkillPill key={item}>{item}</SkillPill>
                  ))}
                </div>
              </section>

              <section className="cv-avoid-break">
                <SectionTitle icon={Languages}>Languages</SectionTitle>
                <ul className="mt-4 space-y-2">
                  {LANGUAGES.map((lang) => (
                    <li
                      key={lang.name}
                      className="cv-lang-item flex flex-col rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                    >
                      <span className="cv-lang-name text-sm font-bold text-white">
                        {lang.name}
                      </span>
                      <span className="cv-lang-level text-xs text-slate-400">
                        {lang.level}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>

          <footer className="cv-footer border-t border-white/10 px-6 py-5 text-center sm:px-10">
            <p className="text-xs text-slate-500">
              {CONTACT.name}
              <span aria-hidden> · </span>
              {CONTACT.title}
              <span aria-hidden> · </span>
              {CONTACT.email}
              <span aria-hidden> · </span>
              github.com/{CONTACT.github}
            </p>
          </footer>
        </article>

        <p className="cv-no-print mt-6 text-center text-xs text-slate-500">
          Click{" "}
          <span className="font-semibold text-slate-300">Print / Save PDF</span>, then
          choose <span className="font-semibold text-slate-300">Save as PDF</span>.
        </p>
      </div>
    </div>
  );
}
