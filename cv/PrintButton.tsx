"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cv-no-print inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-white"
    >
      <Printer className="h-4 w-4" aria-hidden />
      Print / Save PDF
    </button>
  );
}
