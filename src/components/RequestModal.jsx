import { useEffect, useState } from "react";
import { Alert, Field, Modal, useToast } from "./ui";
import { useList } from "../lib/hooks";
import { api, errMsg, pb } from "../lib/pb";
import { DURATIONS, MODES, minStart, fmtCredits, fmtMin } from "../lib/util";
import { useAuth } from "../lib/auth";

// Asks someone for a session; credits are reserved on send.
export default function RequestModal({ person, skill, onClose, onDone }) {
  const { me } = useAuth();
  const toast = useToast();
  const { items } = useList("wallets", { filter: `member = "${me.id}"`, perPage: 1, sort: "" });
  const avail = items[0]?.available ?? 0;
  const allowed = (Array.isArray(skill?.durations) && skill.durations.length ? skill.durations : DURATIONS);
  const [minutes, setMinutes] = useState(allowed.includes(30) ? 30 : allowed[0]);
  const [start, setStart] = useState("");
  const [slots, setSlots] = useState(null);
  useEffect(() => { let off = false; setStart(""); setSlots(null); api("/availability/" + person.id + "?minutes=" + minutes).then((r) => { if (!off) setSlots(r); }).catch(() => { if (!off) setSlots({ configured: false, slots: [] }); }); return () => { off = true; }; }, [person.id, minutes]);
  const [mode, setMode] = useState(skill.mode === "both" ? "virtual" : skill.mode);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!start) return setError("Elige la fecha y hora que propones para la sesión.");
    setBusy(true);
    try {
      await api("/exchanges", { method: "POST", body: { provider: person.id, skill: skill.id, minutes, mode, start: start.length === 16 ? start + ":00-06:00" : start, message } });
      toast("Solicitud enviada. Tus créditos quedaron reservados.");
      onDone?.();
      onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Solicitar a ${person.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl bg-sand p-3"><strong>{skill.name}</strong><br /><span className="hint">Quieres aprender esto. Tu saldo disponible: <span className="num font-bold">{fmtCredits(avail)}</span> créditos.</span></p>
        <Field label="Duración (1 minuto = 1 crédito)" hint={`Se apartan ${minutes} créditos de tu saldo. Solo se descuentan cuando ambos confirman que la sesión se realizó; si no se concreta, vuelven a ti.`}>
          {(p) => <select {...p} className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>{allowed.map((m) => <option key={m} value={m}>{m} minutos{m >= 60 ? ` (${fmtMin(m)})` : ""} · {m} créditos</option>)}</select>}
        </Field>
        <Field label="Fecha y hora propuestas">
          {(p) => slots && slots.configured ? (
            <select {...p} className="input" value={start} onChange={(e) => setStart(e.target.value)} required>
              <option value="">{slots.slots.length ? "Elige un horario libre (hora de Ciudad de México)" : "No hay horarios libres en los próximos 14 días"}</option>
              {slots.slots.map((x) => <option key={x} value={x}>{new Date(x).toLocaleString("es", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</option>)}
            </select>
          ) : <input {...p} className="input" type="datetime-local" min={minStart()} value={start} onChange={(e) => setStart(e.target.value)} required />}
        </Field>
        {skill.mode === "both" ? (
          <Field label="Modalidad">{(p) => <select {...p} className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="virtual">Virtual</option><option value="in_person">Presencial</option></select>}</Field>
        ) : <p className="hint">Modalidad: {MODES[skill.mode]}</p>}
        <Field label="Mensaje (opcional)" hint="Cuéntale qué te gustaría aprender.">
          {(p) => <textarea {...p} className="input" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
        {avail < minutes && <Alert kind="warn">No tienes suficientes créditos disponibles. Enseña una sesión o completa retos para ganar más.</Alert>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy || avail < minutes}>{busy ? "Enviando…" : "Enviar solicitud"}</button>
        </div>
      </form>
    </Modal>
  );
}
