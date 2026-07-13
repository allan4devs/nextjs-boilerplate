"use client";

import { useEffect } from "react";

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = "en";
    return () => {
      document.documentElement.lang = previousLanguage || "es-CR";
    };
  }, []);

  return children;
}
