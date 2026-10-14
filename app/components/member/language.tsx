"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type MemberLanguage = "es" | "en";
type CopyKey = "enterProfile" | "viewProfile" | "logout" | "closeNav" | "openNav" | "credential" | "enter" | "language" | "streak" | "level" | "week";
const COPY: Record<MemberLanguage, Record<CopyKey, string>> = {
  es: { enterProfile: "Entrar a mi perfil", viewProfile: "Ver perfil", logout: "Cerrar sesión", closeNav: "Cerrar navegación", openNav: "Abrir navegación", credential: "Cédula o correo", enter: "Entrar", language: "Idioma", streak: "Racha", level: "Nv", week: "Sem" },
  en: { enterProfile: "Enter my profile", viewProfile: "View profile", logout: "Log out", closeNav: "Close navigation", openNav: "Open navigation", credential: "ID or email", enter: "Enter", language: "Language", streak: "Streak", level: "Lvl", week: "Week" },
};
const STORAGE_KEY = "xtreme-member-language";
const LanguageContext = createContext<{ language: MemberLanguage; setLanguage: (language: MemberLanguage) => void; t: (key: CopyKey) => string }>({ language: "es", setLanguage: () => undefined, t: (key) => COPY.es[key] });
export function MemberLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<MemberLanguage>("es");
  useEffect(() => { const stored = window.localStorage.getItem(STORAGE_KEY); if (stored === "en" || stored === "es") setLanguageState(stored); }, []);
  const setLanguage = (next: MemberLanguage) => { setLanguageState(next); window.localStorage.setItem(STORAGE_KEY, next); };
  const value = useMemo(() => ({ language, setLanguage, t: (key: CopyKey) => COPY[language][key] }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useMemberLanguage() { return useContext(LanguageContext); }
