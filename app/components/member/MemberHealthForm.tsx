"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, ClipboardList, Loader2, Save } from "lucide-react";
import { PARQ_QUESTIONS, parqSummary, validateTrainerHealth, type TrainerHealthData, type TrainerHealthRecord } from "@/lib/xtreme/trainer-health";

const PERSONAL_FIELDS: Array<{ key: keyof TrainerHealthData["personal"]; label: string; type?: string; max: number }> = [
  { key: "cedula", label: "Cédula / documento", max: 30 },
  { key: "birthDate", label: "Fecha de nacimiento", type: "date", max: 10 },
  { key: "age", label: "Edad", type: "number", max: 3 },
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
  ["conditions", "Condiciones o padecimientos", "Podés escribir Ninguno si no tenés."],
  ["medications", "Medicamentos", "Nombre y observaciones importantes."],
  ["allergies", "Alergias", "Incluí alergias a medicamentos o alimentos."],
  ["injuries", "Lesiones, dolores o molestias", "Zona y cuándo aparece la molestia."],
  ["surgeries", "Cirugías y antecedentes", "Antecedentes relevantes y fecha, si la conocés."],
  ["restrictions", "Restricciones para entrenar", "Movimientos que debés evitar o indicaciones médicas."],
] as const;

const inputClass = "min-h-11 w-full border-[3px] border-white/15 bg-black/45 px-3 font-bold outline-none focus:border-[#d8ff3e]";

async function readRecord(response: Response): Promise<TrainerHealthRecord> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
  return data as TrainerHealthRecord;
}

export default function MemberHealthForm({ unlocked }: { unlocked: boolean }) {
  const [record, setRecord] = useState<TrainerHealthRecord | null>(null);
  const [draft, setDraft] = useState<TrainerHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const dirty = Boolean(draft && record && JSON.stringify(draft) !== JSON.stringify(record.data));

  useEffect(() => {
    if (!unlocked) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setNotice(null);
    void (async () => {
      try {
        const result = await readRecord(await fetch("/api/xtreme/member/health", { cache: "no-store", credentials: "same-origin", signal: controller.signal }));
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
  }, [unlocked]);

  function update(next: TrainerHealthData) {
    setDraft(next);
    setNotice(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !record || saving || loading || !dirty) return;
    const invalid = validateTrainerHealth(draft);
    if (invalid) {
      setNotice({ error: true, text: invalid });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const result = await readRecord(await fetch("/api/xtreme/member/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ version: record.version, data: draft }),
      }));
      setRecord(result);
      setDraft(result.data);
      setNotice({ error: false, text: "Ficha guardada. La entrenadora podrá revisarla antes de asignarte cambios." });
    } catch (error) {
      setNotice({ error: true, text: error instanceof Error ? error.message : "No se pudo guardar. Tus cambios siguen en pantalla." });
    } finally {
      setSaving(false);
    }
  }

  if (!unlocked) return <p className="text-sm font-semibold text-white/45">Entrá con tu PIN para completar tu ficha.</p>;
  const summary = draft ? parqSummary(draft) : null;

  return (
    <div className="space-y-4">
      <div className="border-[3px] border-cyan-300/30 bg-cyan-300/[0.06] p-3 text-sm text-white/65">
        <p className="flex items-center gap-2 font-black text-cyan-200"><ClipboardList className="h-4 w-4" /> La llenás vos; la entrenadora la revisa</p>
        <p className="mt-1 text-xs leading-5">Completá lo que conozcás. Esta ficha informa sobre tu entrenamiento y no reemplaza una valoración médica profesional. La nota interna de la entrenadora no se puede editar desde aquí.</p>
      </div>
      {notice && <p role={notice.error ? "alert" : "status"} className={`border-[3px] p-3 text-sm font-bold ${notice.error ? "border-red-300/40 text-red-200" : "border-cyan-300/40 text-cyan-200"}`}>{notice.text}</p>}
      {loading && <p role="status" className="flex items-center gap-2 text-cyan-300"><Loader2 className="h-5 w-5 animate-spin" /> Cargando ficha…</p>}
      {draft && record && <form onSubmit={(event) => void save(event)}>
        <fieldset disabled={loading || saving} className="space-y-6 disabled:opacity-50">
          <section>
            <h3 className="mb-3 font-black uppercase text-cyan-300">Datos personales</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERSONAL_FIELDS.map(({ key, label, type = "text", max }) => <label key={key} className="block"><span className="mb-1.5 block text-xs font-bold text-white/55">{label}</span><input className={inputClass} type={type} min={type === "number" ? 0 : undefined} max={type === "number" ? 120 : undefined} maxLength={max} value={draft.personal[key]} onChange={(event) => update({ ...draft, personal: { ...draft.personal, [key]: event.target.value } })} /></label>)}
            </div>
          </section>
          <section>
            <h3 className="mb-3 font-black uppercase text-cyan-300">Salud y cuidados</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {HEALTH_FIELDS.map(([key, label, hint]) => <label key={key} className="block"><span className="mb-1.5 block text-xs font-bold text-white/55">{label}</span><textarea rows={3} maxLength={2000} value={draft[key]} onChange={(event) => update({ ...draft, [key]: event.target.value })} placeholder={hint} className={`${inputClass} resize-y p-3 font-semibold`} /><span className="mt-1 block text-[10px] text-white/30">{draft[key].length}/2000</span></label>)}
            </div>
          </section>
          <section>
            <h3 className="mb-2 font-black uppercase text-cyan-300">Cuestionario PAR-Q</h3>
            <p className="mb-3 text-xs text-white/50">Respondé cada pregunta con honestidad. Si alguna respuesta es “Sí”, la entrenadora la revisará antes de ajustar tu plan.</p>
            <label className="mb-3 block max-w-xs"><span className="mb-1.5 block text-xs font-bold text-white/55">Fecha del cuestionario</span><input type="date" className={inputClass} value={draft.parq.date} onChange={(event) => update({ ...draft, parq: { ...draft.parq, date: event.target.value } })} /></label>
            <div className="space-y-2">{PARQ_QUESTIONS.map(({ id, label }, index) => <fieldset key={id} className="border-2 border-white/15 p-3"><legend className="px-1 text-sm font-bold">{index + 1}. {label}</legend><div className="mt-2 flex flex-wrap gap-2">{([{ value: "yes", label: "Sí" }, { value: "no", label: "No" }, { value: null, label: "Sin responder" }] as const).map((option) => <label key={option.label} className={`flex min-h-11 cursor-pointer items-center gap-2 border-2 px-3 text-xs font-bold ${draft.parq.answers[id] === option.value ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-white/55"}`}><input type="radio" name={`member-parq-${id}`} checked={draft.parq.answers[id] === option.value} onChange={() => update({ ...draft, parq: { ...draft.parq, answers: { ...draft.parq.answers, [id]: option.value } } })} />{option.label}</label>)}</div></fieldset>)}</div>
            {summary && summary.affirmative > 0 && <p className="mt-3 flex items-start gap-2 border-2 border-orange-300/40 p-3 text-sm text-orange-200"><AlertTriangle className="h-5 w-5 shrink-0" /> Marcaste {summary.affirmative} respuesta(s) afirmativa(s). La entrenadora debe revisarlas antes de definir cambios.</p>}
            <label className="mt-3 block"><span className="mb-1.5 block text-xs font-bold text-white/55">Detalles o aclaraciones</span><textarea rows={3} maxLength={2000} value={draft.parq.notes} onChange={(event) => update({ ...draft, parq: { ...draft.parq, notes: event.target.value } })} className={`${inputClass} resize-y p-3 font-semibold`} placeholder="Algo más que tu entrenadora deba saber…" /></label>
          </section>
          <div className="flex flex-wrap items-center gap-3 border-t-2 border-white/15 pt-4"><button type="submit" disabled={!dirty || loading || saving} className="inline-flex min-h-12 items-center gap-2 bg-[#d8ff3e] px-4 font-black uppercase text-black disabled:opacity-40"><Save className="h-4 w-4" />{saving ? "Guardando…" : "Guardar mi ficha"}</button><p className="text-xs text-white/50">{dirty ? "Hay cambios sin guardar." : record.version ? `Guardada · revisión ${record.version}` : "Completá los datos y guardá."}</p></div>
        </fieldset>
      </form>}
    </div>
  );
}
