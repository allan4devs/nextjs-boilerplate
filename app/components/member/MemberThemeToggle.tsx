"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const STORAGE_KEY = "xtreme-member-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("xg-member-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

export default function MemberThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: Theme = saved === "light" ? "light" : "dark";
    applyTheme(initial);
    const frame = window.requestAnimationFrame(() => setTheme(initial));
    return () => {
      window.cancelAnimationFrame(frame);
      document.documentElement.classList.remove("xg-member-light");
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
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Activar tema oscuro" : "Activar tema claro"}
      aria-pressed={light}
      className="xg-member-theme-toggle inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 border-2 border-white/15 px-2 text-[10px] font-black uppercase text-white/60 transition hover:border-[#d8ff3e] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d8ff3e] sm:min-h-9 sm:px-2.5"
    >
      {light ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{light ? "Oscuro" : "Claro"}</span>
    </button>
  );
}
