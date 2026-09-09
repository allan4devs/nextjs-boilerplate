"use client";

import { useState } from "react";
import type { MemberOs } from "../useMemberOs";

export default function WellnessCheck({ os, onDone }: { os: MemberOs; onDone: () => void }) {
  const today = os.lifestyle.today;
  const [energy, setEnergy] = useState<number | null>(today?.assessedAt ? today.energy : null);
  const [mood, setMood] = useState<number | null>(today?.assessedAt ? today.mood : null);
  const [soreness, setSoreness] = useState<number | null>(today?.assessedAt ? today.soreness : null);
  const [sleep, setSleep] = useState(today?.assessedAt ? String(today.sleepHours) : "");
  const [note, setNote] = useState(today?.note ?? "");
  const [error, setError] = useState("");

  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (energy === null || mood === null || soreness === null) { setError("Elegí cómo están tu energía, ánimo y molestias."); return; }
    setError("");
    const saved = await os.saveDailyWellness({ energy, mood, soreness, sleepHours: Number(sleep), note, waterCups: today?.waterCups ?? 0, steps: today?.steps ?? 0 });
    if (saved) onDone();
    else setError("No se guardó tu respuesta. Podés reintentar sin volver a llenarla.");
  }} className="space-y-5">
    <div><h2 className="text-2xl font-black">¿Cómo te sentís hoy?</h2><p className="mt-2 text-sm text-white/55">Contame cómo llegás. Podés cambiar lo que vas a trabajar o dejarlo para después.</p></div>
    {os.lifestyleLoadError && <p role="alert" className="text-sm text-orange-200">{os.lifestyleLoadError} <button type="button" onClick={() => void os.loadLifestyle()} className="underline">Reintentar</button></p>}
    <fieldset disabled={Boolean(os.lifestyleBusy) || os.isLoadingLifestyle} className="space-y-4 disabled:opacity-50">
      <Score label="Energía" low="Muy poca" high="Mucha" value={energy} onChange={setEnergy} />
      <Score label="Ánimo" low="Bajo" high="Muy bien" value={mood} onChange={setMood} />
      <Score label="Molestias musculares" low="Ninguna" high="Muchas" value={soreness} onChange={setSoreness} />
      <label className="block text-sm text-white/60">¿Cuántas horas dormiste?<input required type="number" min="0" max="16" step="0.5" value={sleep} onChange={(event) => setSleep(event.target.value)} className="mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-black/30 px-3 text-white" /></label>
      <label className="block text-sm text-white/60">Algo que quieras recordar (opcional)<textarea maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 block w-full rounded-lg border border-white/20 bg-black/30 p-3 text-white" /></label>
      <button className="min-h-12 w-full rounded-xl bg-[#d8ff3e] px-4 font-black text-black" type="submit">{os.lifestyleBusy ? "Guardando…" : "Guardar y seguir"}</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-orange-200">{error}</p>}
    <button type="button" disabled={Boolean(os.journeyBusy || os.lifestyleBusy)} onClick={async () => { if (await os.updateJourney("skip-wellness")) onDone(); }} className="min-h-11 w-full text-sm text-white/60">Ahora quiero entrenar</button>
  </form>;
}

function Score({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number | null; onChange: (value: number) => void }) {
  return <fieldset><legend className="mb-2 text-sm font-bold">{label}</legend><div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((score) => <button type="button" key={score} aria-pressed={value === score} aria-label={`${label}: ${score} de 5${score === 1 ? `, ${low}` : score === 5 ? `, ${high}` : ""}`} onClick={() => onChange(score)} className={`min-h-12 rounded-lg border text-lg font-bold ${value === score ? "border-[#d8ff3e] bg-[#d8ff3e] text-black" : "border-white/20 bg-white/5"}`}>{score}</button>)}</div><div className="mt-1 flex justify-between text-xs text-white/40"><span>{low}</span><span>{high}</span></div></fieldset>;
}
