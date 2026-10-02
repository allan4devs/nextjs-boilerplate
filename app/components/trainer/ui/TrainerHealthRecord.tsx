"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Loader2, Save } from "lucide-react";
import { GameButton, GamePanel } from "@/app/components/GameOS";
import { PARQ_QUESTIONS, parqSummary, validateTrainerHealth, type TrainerHealthData, type TrainerHealthRecord as HealthRecord } from "@/lib/xtreme/trainer-health";
import type { TrainerMember } from "../types";

const PERSONAL_FIELDS: Array<{ key: keyof TrainerHealthData["personal"]; label: string; type?: string; max: number }> = [
  { key: "cedula", label: "Cédula / documento", max: 30 },
  { key: "birthDate", label: "Fecha de nacimiento", type: "date", max: 10 },
  { key: "age", label: "Edad declarada al registro", type: "number", max: 3 },
  { key: "sex", label: "Sexo", max: 60 },
  { key: "bloodType", label: "Grupo sanguíneo (si lo conoce)", max: 20 },
  { key: "phone", label: "Teléfono", type: "tel", max: 40 },
  { key: "email", label: "Correo electrónico", type: "email", max: 160 },
  { key: "occupation", label: "Ocupación", max: 160 },
  { key: "address", label: "Domicilio", max: 500 },
  { key: "emergencyName", label: "Contacto de emergencia", max: 160 },
  { key: "emergencyPhone", label: "Teléfono de emergencia", type: "tel", max: 40 },
  { key: "emergencyRelation", label: "Parentesco / relación", max: 80 },
];
const HEALTH_FIELDS = [
  { key: "conditions", label: "Condiciones o padecimientos", hint: "Lo que el socio informa; anotá si indica que no tiene." },
  { key: "medications", label: "Medicamentos informados", hint: "Nombre y observaciones que el socio comparta." },
  { key: "allergies", label: "Alergias", hint: "Alergias informadas o pendientes de consultar." },
  { key: "injuries", label: "Lesiones, dolores y molestias", hint: "Zona afectada y situaciones en las que aparece la molestia." },
  { key: "surgeries", label: "Cirugías y antecedentes", hint: "Antecedentes relevantes y fecha, si la conoce." },
  { key: "restrictions", label: "Restricciones e indicaciones recibidas", hint: "Movimientos a evitar o indicaciones que el socio o un profesional haya comunicado." },
  { key: "trainerNotes", label: "Seguimiento del entrenador", hint: "Cambios reportados, acuerdos y observaciones de esta revisión." },
] as const;
const inputClass = "min-h-11 w-full border-[3px] border-white/15 bg-black/45 px-3 font-bold outline-none focus:border-cyan-300";

async function readRecord(response: Response): Promise<HealthRecord> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}

function savedDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" }).format(new Date(value));
}

export function TrainerHealthRecord({ member, active, refreshKey, onDirtyChange, onBusyChange }: {
  member: TrainerMember; active: boolean; refreshKey: number;
  onDirtyChange: (value: boolean) => void; onBusyChange: (value: boolean) => void;
}) {
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [draft, setDraft] = useState<TrainerHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const dirty = Boolean(draft && record && JSON.stringify(draft) !== JSON.stringify(record.data));

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => { onDirtyChange(false); onBusyChange(false); }, [onDirtyChange, onBusyChange]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotice(null);
    void (async () => {
      try {
        const result = await readRecord(await fetch(`/api/xtreme/trainer/health?memberId=${encodeURIComponent(member.memberId)}`, {
          cache: "no-store", signal: controller.signal,
        }));
        if (controller.signal.aborted) return;
        setRecord(result);
        setDraft(result.data);
      } catch (error) {
        if (!controller.signal.aborted) setNotice({ error: true, text: error instanceof Error ? error.message : "No se pudo cargar la ficha." });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [member.memberId, refreshKey, reloadKey]);

  function reload() {
    if (saving || loading) return;
    if (dirty && !window.confirm("¿Recargar la ficha y descartar estos cambios sin guardar?")) return;
    setReloadKey((current) => current + 1);
  }

  function update(next: TrainerHealthData) {
    setDraft(next);
    // Update synchronously so navigating immediately also protects the draft.
    onDirtyChange(true);
    setNotice(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !record || saving || loading || !dirty) return;
    const invalid = validateTrainerHealth(draft);
    if (invalid) { setNotice({ error: true, text: invalid }); return; }
    setSaving(true);
    onBusyChange(true);
    setNotice(null);
    try {
      const result = await readRecord(await fetch("/api/xtreme/trainer/health", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.memberId, version: record.version, data: draft }),
      }));
      setRecord(result);
      setDraft(result.data);
      onDirtyChange(false);
      setNotice({ error: false, text: `Ficha guardada para ${member.memberName}.` });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar. Tus cambios siguen en pantalla." });
    } finally {
      setSaving(false);
      onBusyChange(false);
    }
  }

  const summary = record ? parqSummary(record.data) : null;
  const latest = record?.history.at(-1);
  return <>
    {!active && record && <div className="border-[3px] border-cyan-300/25 bg-cyan-300/5 p-3 text-sm">
      <p className="font-black text-cyan-200">Ficha de salud: {record.version ? "registrada" : "pendiente de registrar"}</p>
      {record.data.conditions && <p className="mt-1 whitespace-pre-wrap break-words text-white/65"><strong>Padecimientos:</strong> {record.data.conditions}</p>}
      {record.data.restrictions && <p className="mt-1 whitespace-pre-wrap break-words text-orange-200"><strong>Restricciones:</strong> {record.data.restrictions}</p>}
      {record.receptionMedicalNotes && <p className="mt-1 whitespace-pre-wrap break-words text-white/65"><strong>Notas de recepción:</strong> {record.receptionMedicalNotes}</p>}
      <p className="mt-1 text-xs text-white/50">Cuestionario: {summary?.affirmative} respuestas afirmativas · {summary?.unanswered} sin responder{dirty ? " · Hay cambios en la ficha sin guardar" : ""}</p>
    </div>}
    {!active && notice?.error && <p role="alert" className="border-[3px] border-orange-300/40 p-3 text-sm text-orange-200">Ficha de salud: {notice.text}</p>}
    <div hidden={!active}>
      <GamePanel title="Ficha personal y de salud" subtitle="Información declarada por el socio y seguimiento del entrenador" icon={ClipboardList}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-bold">{member.memberName}</p><p className="mt-1 text-xs text-white/45">{latest ? `Último registro: ${savedDate(latest.savedAt)} · ${latest.savedBy}` : "Todavía no hay una ficha guardada."}</p></div>
          <button type="button" onClick={reload} disabled={loading || saving} className="min-h-11 border-2 border-white/20 px-3 text-xs font-bold disabled:opacity-40">Recargar ficha</button>
        </div>
        <p className="mb-4 text-xs leading-5 text-white/50">Los campos vacíos quedan pendientes. La ficha registra información; no determina aptitud médica. Los datos de contacto se toman inicialmente del perfil y los cambios se guardan en esta ficha de Trainer.</p>
        {notice && <p role={notice.error ? "alert" : "status"} className={`mb-4 border-[3px] p-3 text-sm font-bold ${notice.error ? "border-red-300/40 text-red-200" : "border-cyan-300/40 text-cyan-200"}`}>{notice.text}</p>}
        {loading && <p role="status" className="flex items-center gap-2 text-cyan-300"><Loader2 className="h-5 w-5 animate-spin" /> Cargando ficha…</p>}
        {draft && record && <form onSubmit={(event) => void save(event)}>
          <fieldset disabled={loading || saving} className="space-y-6 disabled:opacity-50">
            <section><h3 className="mb-4 font-black uppercase text-cyan-300">Datos personales</h3><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {PERSONAL_FIELDS.map(({ key, label, type = "text", max }) => <label key={key} className="block"><span className="mb-1.5 block text-xs font-bold text-white/55">{label}</span><input className={inputClass} type={type} min={type === "number" ? 0 : undefined} max={type === "number" ? 120 : undefined} step={type === "number" ? 1 : undefined} maxLength={max} value={draft.personal[key]} onChange={(event) => update({ ...draft, personal: { ...draft.personal, [key]: event.target.value } })} /></label>)}
            </div></section>
            <section><h3 className="mb-4 font-black uppercase text-cyan-300">Condiciones y cuidados para entrenar</h3>
              {record.receptionMedicalNotes && <p className="mb-4 whitespace-pre-wrap break-words border-2 border-white/15 p-3 text-sm text-white/60"><strong>Notas existentes en recepción:</strong> {record.receptionMedicalNotes}</p>}
              <div className="grid gap-4 sm:grid-cols-2">{HEALTH_FIELDS.map(({ key, label, hint }) => <NoteField key={key} label={label} hint={hint} value={draft[key]} onChange={(value) => update({ ...draft, [key]: value })} />)}</div>
            </section>
            <section><h3 className="mb-2 font-black uppercase text-cyan-300">Cuestionario PAR-Q de la hoja de ingreso</h3><p className="mb-4 text-xs text-white/50">Marcá lo que el socio responda. Podés guardar una ficha parcial y completarla después.</p>
              <label className="mb-4 block max-w-xs"><span className="mb-1.5 block text-xs font-bold text-white/55">Fecha del cuestionario</span><input type="date" className={inputClass} value={draft.parq.date} onChange={(event) => update({ ...draft, parq: { ...draft.parq, date: event.target.value } })} /></label>
              <div className="space-y-3">{PARQ_QUESTIONS.map(({ id, label }, index) => <fieldset key={id} className="border-2 border-white/15 p-3"><legend className="px-1 text-sm font-bold">{index + 1}. {label}</legend><div className="mt-2 flex flex-wrap gap-2">{([{ value: "yes", label: "Sí" }, { value: "no", label: "No" }, { value: null, label: "Sin responder" }] as const).map((option) => <label key={option.label} className={`flex min-h-11 cursor-pointer items-center gap-2 border-2 px-3 text-xs font-bold ${draft.parq.answers[id] === option.value ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-white/55"}`}><input type="radio" name={`parq-${member.memberId}-${id}`} checked={draft.parq.answers[id] === option.value} onChange={() => update({ ...draft, parq: { ...draft.parq, answers: { ...draft.parq.answers, [id]: option.value } } })} />{option.label}</label>)}</div></fieldset>)}</div>
              {parqSummary(draft).affirmative > 0 && <p className="mt-4 flex items-start gap-2 border-2 border-orange-300/40 p-3 text-sm text-orange-200"><AlertTriangle className="h-5 w-5 shrink-0" />Hay respuestas afirmativas. Revisá los detalles y registrá las indicaciones o restricciones recibidas antes de definir el plan.</p>}
              <div className="mt-4"><NoteField label="Detalles del cuestionario" hint="Aclaraciones del socio, revisión pendiente o referencia al documento físico." value={draft.parq.notes} onChange={(notes) => update({ ...draft, parq: { ...draft.parq, notes } })} /></div>
            </section>
            <div className="flex flex-wrap items-center gap-3 border-t-2 border-white/15 pt-4"><GameButton type="submit" disabled={!dirty || loading || saving}><Save className="h-4 w-4" />{saving ? "Guardando…" : "Guardar ficha"}</GameButton><p className="text-xs text-white/50">{dirty ? "Hay cambios sin guardar." : record.version ? "Ficha guardada." : "Completá los datos disponibles para guardar."}</p></div>
          </fieldset>
        </form>}
      </GamePanel>
      {!!record?.history.length && <GamePanel className="mt-4" title="Historial de la ficha" subtitle="Últimos 20 registros guardados, con fecha y responsable">
        <div className="space-y-3">{[...record.history].reverse().map((entry) => <details key={entry.version} className="border-2 border-white/15 p-3"><summary className="min-h-11 cursor-pointer text-sm font-bold">{savedDate(entry.savedAt)} · {entry.savedBy} · Registro {entry.version}</summary><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {PERSONAL_FIELDS.map(({ key, label }) => <p key={key} className="whitespace-pre-wrap break-words text-white/60"><strong>{label}:</strong> {entry.data.personal[key] || "Sin registrar"}</p>)}
          {HEALTH_FIELDS.map(({ key, label }) => <p key={key} className="whitespace-pre-wrap break-words text-white/60"><strong>{label}:</strong> {entry.data[key] || "Sin registrar"}</p>)}
          <p className="text-white/60"><strong>Fecha PAR-Q:</strong> {entry.data.parq.date || "Sin registrar"}</p>
          {PARQ_QUESTIONS.map(({ id, label }) => <p key={id} className="text-white/60"><strong>{label}</strong> {entry.data.parq.answers[id] === "yes" ? "Sí" : entry.data.parq.answers[id] === "no" ? "No" : "Sin responder"}</p>)}
          <p className="whitespace-pre-wrap break-words text-white/60"><strong>Detalles PAR-Q:</strong> {entry.data.parq.notes || "Sin registrar"}</p>
        </div></details>)}</div>
      </GamePanel>}
    </div>
  </>;
}

function NoteField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-white/55">{label}</span><textarea rows={3} maxLength={2000} value={value} onChange={(event) => onChange(event.target.value)} placeholder={hint} className={`${inputClass} resize-y p-3 font-semibold`} /><span className="mt-1 block text-[10px] text-white/35">{value.length}/2000</span></label>;
}
