"use client";

import { useRef, useState } from "react";
import { BODY_SEGMENTS, INBODY_FIELDS, type InBodyReport } from "@/lib/xtreme/body-composition";
import type { MemberOs } from "./useMemberOs";
import type { MembersResponse } from "./types";
import { readJson, todayIso, errorText } from "./utils";

const inputClass = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#d8ff3e] focus:outline-none";

export default function BodyMetricsForm({ os }: { os: MemberOs }) {
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [date, setDate] = useState(todayIso);
  const [note, setNote] = useState("");
  const [hasReport, setHasReport] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [segments, setSegments] = useState<Record<string, Record<string, string>>>({});
  const [additional, setAdditional] = useState<Array<{ label: string; value: string; unit: string }>>([]);
  const [device, setDevice] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const requestId = useRef("");
  const lock = useRef(false);
  const latest = os.currentMember.latestBodyMetric;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!os.unlocked || lock.current) return;
    lock.current = true;
    setBusy(true);
    setFeedback("");
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/xtreme/user", {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bodyMetric", requestId: requestId.current, completedDate: date,
          weightKg: weight.replace(",", "."), waistCm: waist.replace(",", "."), note,
          ...(hasReport ? { inbody: { values, segments, additional, device } } : {}),
        }),
      });
      const data = await readJson<MembersResponse>(response);
      os.setMember(data.member);
      setFeedback("Medición guardada en tu historial.");
      requestId.current = "";
    } catch (error) {
      setFeedback(errorText(error, "No se pudo guardar. Tus datos siguen aquí; reintentá."));
    } finally { lock.current = false; setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black">¿Cuánto estás pesando?</h2>
        <p className="mt-1 text-sm text-white/55">Registrá una medición real cuando la tengas. Los campos del InBody son opcionales.</p>
        {latest && <p className="mt-2 text-xs text-[#d8ff3e]">Último registro: {latest.weightKg} kg · {latest.date}</p>}
      </div>
      <form onSubmit={save} onChangeCapture={() => { requestId.current = ""; }} className="space-y-4">
        <fieldset disabled={busy || !os.unlocked} className="space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="text-xs text-white/60">Peso (kg)<input required type="number" min="1" max="400" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} /></label>
            <label className="text-xs text-white/60">Cintura (cm), opcional<input type="number" min="1" max="300" step="0.1" value={waist} onChange={(event) => setWaist(event.target.value)} className={inputClass} /></label>
            <label className="col-span-2 text-xs text-white/60 sm:col-span-1">Fecha de medición<input required type="date" max={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={hasReport} onChange={(event) => setHasReport(event.target.checked)} className="h-5 w-5 accent-[#d8ff3e]" />Tengo mi reporte InBody</label>
          {hasReport && <div className="space-y-4 rounded-xl border border-white/15 p-3 sm:p-4">
            <label className="block text-xs text-white/60">Modelo del equipo / referencia del reporte<input value={device} maxLength={80} onChange={(event) => setDevice(event.target.value)} className={inputClass} /></label>
            <div className="grid grid-cols-2 gap-3">
              {INBODY_FIELDS.map(([key, label, unit, max]) => <label key={key} className="text-xs text-white/60">{label}{unit ? ` (${unit})` : ""}<input type="number" step="any" min={key.endsWith("ControlKg") ? -max : 0} max={max} value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className={inputClass} /></label>)}
            </div>
            <details className="rounded-lg border border-white/15 p-3">
              <summary className="min-h-11 cursor-pointer font-bold">Análisis segmental</summary>
              <div className="space-y-4">{BODY_SEGMENTS.map(([key, label]) => <fieldset key={key}>
                <legend className="text-sm font-bold text-[#d8ff3e]">{label}</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">{[["leanKg", "Masa magra (kg)"], ["leanPct", "Masa magra (%)"], ["fatKg", "Grasa (kg)"], ["fatPct", "Grasa (%)"]].map(([field, title]) => <label key={field} className="text-xs text-white/60">{title}<input type="number" min="0" max={field.endsWith("Pct") ? 1000 : 300} step="any" value={segments[key]?.[field] ?? ""} onChange={(event) => setSegments((current) => ({ ...current, [key]: { ...current[key], [field]: event.target.value } }))} className={inputClass} /></label>)}</div>
              </fieldset>)}</div>
            </details>
            <div>
              <p className="text-sm font-bold">Otros datos del reporte</p>
              <p className="mt-1 text-xs text-white/50">Incluí aquí cualquier parámetro adicional, frecuencia o impedancia que aparezca en tu hoja.</p>
              {additional.map((entry, index) => <div key={index} className="mt-3 grid grid-cols-2 gap-2">
                {(["label", "value", "unit"] as const).map((field) => <label key={field} className="text-xs text-white/60">{field === "label" ? "Nombre del dato" : field === "value" ? "Valor" : "Unidad"}<input required={field !== "unit"} maxLength={field === "value" ? 100 : field === "label" ? 80 : 20} value={entry[field]} onChange={(event) => setAdditional((current) => current.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))} className={inputClass} /></label>)}
                <button type="button" onClick={() => setAdditional((current) => current.filter((_, i) => i !== index))} className="min-h-11 self-end text-xs text-red-300">Quitar dato {index + 1}</button>
              </div>)}
              <button type="button" disabled={additional.length >= 30} onClick={() => setAdditional((current) => [...current, { label: "", value: "", unit: "" }])} className="mt-2 min-h-11 text-sm font-bold text-[#d8ff3e] disabled:opacity-40">+ Agregar otro dato</button>
            </div>
          </div>}
          <label className="block text-xs text-white/60">Notas<textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className={inputClass} /></label>
          <button type="submit" className="min-h-12 w-full rounded-lg bg-[#d8ff3e] px-4 font-black text-black">{busy ? "Guardando…" : "Guardar medición"}</button>
        </fieldset>
        {feedback && <p role="status" className="text-sm text-white/80">{feedback}</p>}
      </form>
      <details className="rounded-lg border border-white/15 p-3">
        <summary className="min-h-11 cursor-pointer font-bold">Historial de mediciones e InBody ({os.currentMember.bodyMetrics.length})</summary>
        <div className="space-y-3">{[...os.currentMember.bodyMetrics].reverse().map((metric) => <details key={metric.id} className="rounded-lg bg-white/5 p-3">
          <summary className="min-h-11 cursor-pointer text-sm font-bold">{metric.date} · {metric.weightKg} kg{metric.inbody ? " · InBody" : ""}</summary>
          {metric.waistCm > 0 && <p className="text-sm text-white/60">Cintura: {metric.waistCm} cm</p>}
          {metric.note && <p className="my-2 text-sm text-white/60">{metric.note}</p>}
          {metric.inbody && <ReportValues report={metric.inbody} />}
        </details>)}</div>
      </details>
    </div>
  );
}

function ReportValues({ report }: { report: InBodyReport }) {
  return <div className="space-y-3 text-xs text-white/70">
    {report.device && <p>Equipo / referencia: {report.device}</p>}
    <dl className="grid grid-cols-2 gap-3">{INBODY_FIELDS.filter(([key]) => report.values[key] !== undefined).map(([key, label, unit]) => <div key={key}><dt className="text-white/45">{label}</dt><dd className="mt-1 font-bold">{report.values[key]} {unit}</dd></div>)}</dl>
    {BODY_SEGMENTS.filter(([key]) => report.segments[key]).map(([key, label]) => <div key={key}><p className="font-bold">{label}</p><dl className="mt-1 grid grid-cols-2 gap-2">{([['leanKg', 'Masa magra', 'kg'], ['leanPct', 'Masa magra', '%'], ['fatKg', 'Grasa', 'kg'], ['fatPct', 'Grasa', '%']] as const).filter(([field]) => report.segments[key]?.[field] !== undefined).map(([field, title, unit]) => <div key={field}><dt>{title} ({unit})</dt><dd>{report.segments[key]?.[field]}</dd></div>)}</dl></div>)}
    {report.additional.map((entry, i) => <p key={i}>{entry.label}: {entry.value} {entry.unit}</p>)}
  </div>;
}
