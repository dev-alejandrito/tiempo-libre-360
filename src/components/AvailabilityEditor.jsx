

import { Plus, Trash2 as Trash } from "lucide-react";
import { DAYS } from "../lib/util";

export default function AvailabilityEditor({ value, onChange }) {
  const add = (day) => onChange([...value, { day, start: "18:00", end: "20:00" }]);
  const upd = (i, k, v) => onChange(value.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const del = (i) => onChange(value.filter((_, j) => j !== i));
  return (
    <div className="space-y-3">
      {DAYS.map((d, day) => {
        const slots = value.map((s, i) => ({ ...s, i })).filter((s) => s.day === day);
        return (
          <fieldset key={d} className="rounded-2xl border border-line bg-white p-3">
            <legend className="px-1 font-bold">{d}</legend>
            <div className="space-y-2">
              {slots.length === 0 && <p className="hint">Sin disponibilidad</p>}
              {slots.map((s) => (
                <div key={s.i} className="flex flex-wrap items-end gap-2">
                  <div><label className="label" htmlFor={`s${s.i}`}>Desde</label><input id={`s${s.i}`} type="time" className="input !w-32" value={s.start} onChange={(e) => upd(s.i, "start", e.target.value)} /></div>
                  <div><label className="label" htmlFor={`e${s.i}`}>Hasta</label><input id={`e${s.i}`} type="time" className="input !w-32" value={s.end} onChange={(e) => upd(s.i, "end", e.target.value)} /></div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => del(s.i)}><Trash size={16} aria-hidden="true" />Quitar<span className="sr-only"> franja del {d}</span></button>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => add(day)}><Plus size={16} aria-hidden="true" />Añadir franja<span className="sr-only"> el {d}</span></button>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function AvailabilityView({ slots }) {
  if (!slots?.length) return <p className="hint">Aún no indicó disponibilidad.</p>;
  return (
    <ul className="space-y-1 text-sm">
      {DAYS.map((d, day) => { const s = slots.filter((x) => x.day === day); return s.length ? <li key={d}><strong className="inline-block w-24">{d}</strong>{s.map((x) => `${x.start}–${x.end}`).join(", ")}</li> : null; })}
    </ul>
  );
}
