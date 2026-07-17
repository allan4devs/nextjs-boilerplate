"use client";

export function TrainerField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.14em] text-white/40">{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full border-[3px] border-white/15 bg-black/45 px-3 font-bold outline-none transition focus:border-cyan-300" /></label>;
}

export function TrainerNumberField({ label, value, onChange, min = 0, max }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.14em] text-white/40">{label}</span><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, Number(event.target.value) || 0)))} className="min-h-11 w-full border-[3px] border-white/15 bg-black/45 px-3 font-bold outline-none transition focus:border-cyan-300" /></label>;
}

export function TrainerTextarea({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (value: string) => void; rows?: number; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.14em] text-white/40">{label}</span><textarea value={value} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full resize-y border-[3px] border-white/15 bg-black/45 p-3 font-semibold outline-none transition focus:border-cyan-300" /></label>;
}

