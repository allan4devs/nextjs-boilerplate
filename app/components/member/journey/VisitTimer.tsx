"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

export default function VisitTimer({ startedAt }: { startedAt: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#d8ff3e]/30 bg-[#d8ff3e]/10 px-2.5 py-1.5 text-xs font-bold text-[#d8ff3e]" aria-label="Tiempo desde tu ingreso"><Timer aria-hidden className="h-3.5 w-3.5" /><span className="tabular-nums">{Math.floor(seconds / 3600) > 0 ? `${Math.floor(seconds / 3600)}:` : ""}{String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span></span>;
}
