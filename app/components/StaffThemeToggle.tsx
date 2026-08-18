"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const STORAGE_KEY = "xtreme-staff-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("xg-staff-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

export default function StaffThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: Theme = saved === "light" ? "light" : "dark";
    applyTheme(initial);
    const frame = window.requestAnimationFrame(() => setTheme(initial));
    return () => {
      window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove("xg-staff-light");
      document.documentElement.style.colorScheme = "dark";
    };
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  const light = theme === "light";
  return (
    <button type="button" onClick={toggle} aria-label={light ? "Activar tema oscuro" : "Activar tema claro"} aria-pressed={light} className="xg-theme-toggle inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap border-[3px] border-white/20 px-3 py-2 text-xs font-black uppercase text-white/65 transition hover:border-[#d8ff3e]/60 hover:text-[#d8ff3e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e]">
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden sm:inline">{light ? "Oscuro" : "Claro"}</span>
    </button>
  );
}
