import type { Metadata, Viewport } from "next";
import "./print.css";

export const metadata: Metadata = {
  title: {
    absolute: "Allan José Rojas Durán | Senior Software Engineer",
  },
  description:
    "Senior Software Engineer - full-stack, cloud-native, and distributed systems. TypeScript, React, Next.js, Java, Spring Boot, Python, AWS, Kubernetes. Based in Costa Rica, open to remote roles.",
  openGraph: {
    title: "Allan José Rojas Durán | Senior Software Engineer",
    description:
      "Senior IC shipping production platforms end to end. Full-stack · Cloud-native · Distributed systems.",
    type: "profile",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
  keywords: [
    "Senior Software Engineer",
    "Full Stack",
    "TypeScript",
    "React",
    "Next.js",
    "Java",
    "Spring Boot",
    "Python",
    "AWS",
    "Kubernetes",
    "Remote",
    "Costa Rica",
  ],
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  colorScheme: "dark light",
};

export default function CvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="cv-root min-h-full bg-[#070b14] text-slate-100 antialiased selection:bg-sky-400/30 selection:text-white">
      {children}
    </div>
  );
}
