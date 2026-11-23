import { Clock3 as Clock, Video, MapPin, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Avatar, Field, Modal, StarInput, useToast } from "./ui";
import { api } from "../lib/pb";
import { MODES, STATUS, fmtDateTime, minStart, toDate } from "../lib/util";
import { useApi } from "../lib/hooks";

const EVENTS = { request: "Solicitud enviada", accept: "Sesión agendada", propose: "Propuesta de horario", reject: "Solicitud rechazada", cancel: "Cancelada", note: "Lugar o enlace actualizado", confirm: "Confirmación", dispute: "Conflicto abierto", rate: "Valoración", "resolve:pay_provider": "Conflicto resuelto: créditos liberados", "resolve:refund_requester": "Conflicto resuelto: créditos devueltos" };

function Timeline({ id }) {
  const { data, loading } = useApi("/exchanges/" + id);
  if (loading) return <p className="text-sm">Cargando historial…</p>;
  return (
    <ol className="mt-3 space-y-2 border-l-2 border-line pl-4 text-sm">
      {data?.events.map((e, i) => <li key={i}><strong>{EVENTS[e.action] || e.action}</strong> · {e.by} · <span className="text-[#4b4638]">{fmtDateTime(e.created)}</span>{e.note && <p className="text-[#3c3829]">{e.note}</p>}</li>)}
    </ol>
  );
}

function ActionModal({ x, kind, onClose, onDone }) {
  const toast = useToast();
  const [v, setV] = useState({ start: "", note: x.meeting_note || "", reason: "", stars: 5, comment: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cfg = {
    propose: { title: "Proponer otro horario", action: "propose", btn: "Enviar propuesta" },
    reject: { title: "Rechazar solicitud", action: "reject", btn: "Rechazar y devolver créditos" },
    cancel: { title: "Cancelar intercambio", action: "cancel", btn: "Cancelar intercambio" },
    dispute: { title: "Abrir un conflicto", action: "dispute", btn: "Abrir conflicto" },
    rate: { title: "Valorar la experiencia", action: "rate", btn: "Enviar valoración" },
    note: { title: "Lugar o enlace de la sesión", action: "note", btn: "Guardar" },
  }[kind];
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const body = kind === "propose" ? { start: v.start.length === 16 ? v.start + ":00-06:00" : v.start, note: v.note } : kind === "rate" ? { stars: v.stars, comment: v.comment } : kind === "note" ? { note: v.note } : { reason: v.reason };
      await api(`/exchanges/${x.id}/${cfg.action}`, { method: "POST", body });
      toast({ propose: "Propuesta de horario enviada.", reject: "Solicitud rechazada y créditos devueltos.", cancel: "Intercambio cancelado; los créditos reservados se devolvieron.", dispute: "Conflicto abierto. Moderación lo revisará.", rate: "Valoración enviada.", note: "Lugar o enlace guardado." }[kind] || "Cambios guardados."); onDone(); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={cfg.title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl bg-sand p-3 text-sm"><strong>{x.skill_name}</strong> con {x.other.name} · {x.minutes} min · {x.minutes} créditos</p>
        {kind === "propose" && <>
          <Field label="Nueva fecha y hora">{(p) => <input {...p} className="input" type="datetime-local" min={minStart()} required value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} />}</Field>
          <Field label="Nota (opcional)">{(p) => <input {...p} className="input" maxLength={300} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />}</Field>
        </>}
        {kind === "note" && <Field label="Dirección pública, enlace de videollamada u otra indicación" hint="Evita compartir tu domicilio: usa un lugar público o un enlace.">{(p) => <input {...p} className="input" maxLength={300} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />}</Field>}
        {(kind === "reject" || kind === "cancel") && <Field label={kind === "cancel" ? "Motivo (la otra persona lo verá)" : "Motivo (opcional)"} hint={kind === "cancel" && x.status === "scheduled" ? "Cancelar con poca antelación se anota en tu pasaporte de confianza. Los créditos se devuelven siempre." : "Los créditos reservados se devuelven a quien los reservó."}>{(p) => <textarea {...p} className="input" rows={3} maxLength={300} required={kind === "cancel" && x.status === "scheduled"} value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} />}</Field>}
        {kind === "dispute" && <Field label="¿Qué ocurrió?" hint="Los créditos quedan en custodia hasta que moderación decida.">{(p) => <textarea {...p} className="input" rows={4} minLength={10} maxLength={500} required value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} />}</Field>}
        {kind === "rate" && <><div><span className="label">Tu valoración</span><StarInput value={v.stars} onChange={(s) => setV({ ...v, stars: s })} /></div><Field label="Comentario (opcional)">{(p) => <textarea {...p} className="input" rows={3} maxLength={400} value={v.comment} onChange={(e) => setV({ ...v, comment: e.target.value })} />}</Field></>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button><button className={`btn ${kind === "cancel" || kind === "reject" || kind === "dispute" ? "btn-danger" : "btn-primary"}`} disabled={busy}>{busy ? "Enviando…" : cfg.btn}</button></div>
      </form>
    </Modal>
  );
}

export default function ExchangeCard({ x, onChange }) {
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const st = STATUS[x.status];
  const started = x.scheduled_start && toDate(x.scheduled_start) <= new Date();
  const mine = x.role === "requester" ? "Aprendes" : "Enseñas";

  async function run(action, ok) {
    setBusy(true);
    try { const r = await api(`/exchanges/${x.id}/${action}`, { method: "POST", body: {} }); toast(r.completed ? "¡Sesión completada! Los créditos fueron liberados." : ok); onChange(); }
    catch (err) { toast(err.message, "error"); } finally { setBusy(false); }
  }
  const canAcceptProposal = (x.status === "pending" && x.role === "provider") || (x.status === "negotiating" && !x.proposed_by_me);
  const when = x.status === "scheduled" ? x.scheduled_start : x.proposed_start;
  return (
    <li className="card">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={x.other.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{x.skill_name}</h3>
            <span className={`chip ${st.cls}`}>{st.label}</span>
            {x.late_cancel && <span className="chip chip-warn">Cancelación tardía</span>}
          </div>
          <p className="text-[#3c3829]">{mine} · con <Link className="font-semibold underline" to={`/app/persona/${x.other.id}`}>{x.other.name}</Link> · <span className="num font-bold">{x.minutes} min</span> = <span className="num font-bold">{x.minutes}</span> créditos</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {when && <div className="flex items-center gap-2"><Clock size={16} aria-hidden="true" /><div><dt className="sr-only">{x.status === "scheduled" ? "Fecha" : "Horario propuesto"}</dt><dd>{x.status === "scheduled" ? "" : x.proposed_by_me ? "Propusiste: " : "Propone: "}<strong>{fmtDateTime(when)}</strong></dd></div></div>}
        <div className="flex items-center gap-2">{x.mode === "virtual" ? <Video size={16} aria-hidden="true" /> : <MapPin size={16} aria-hidden="true" />}<dd>{MODES[x.mode]}{x.meeting_note ? ` · ${x.meeting_note}` : ""}</dd></div>
      </dl>
        {x.mode === "virtual" && x.meeting_url && x.status === "scheduled" && (
          <p className="mt-3"><a className="btn btn-primary" href={x.meeting_url} target="_blank" rel="noopener noreferrer">Ingresar a la clase</a></p>
        )}
        {x.mode === "virtual" && x.meeting_status === "cancelado" && <p className="mt-3 text-sm text-ink/80">El enlace de esta clase fue cancelado y ya no es válido.</p>}
        {x.mode === "virtual" && x.meeting_status === "reprogramando" && <p className="mt-3 text-sm text-ink/80">Se creará un enlace nuevo cuando se acepte el nuevo horario.</p>}
      {x.message && <p className="mt-2 rounded-xl bg-sand p-2.5 text-sm">“{x.message}”</p>}
      {x.cancel_reason && <p className="mt-2 text-sm"><strong>Motivo:</strong> {x.cancel_reason}</p>}
      {x.status === "scheduled" && started && <p className="mt-2 text-sm font-semibold">{x.my_confirmed ? (x.other_confirmed ? "" : "Ya confirmaste. Falta la confirmación de la otra persona para liberar los créditos.") : x.other_confirmed ? "La otra persona ya confirmó. Confirma tú para liberar los créditos." : "¿Se realizó la sesión? Ambas partes deben confirmarla."}</p>}
      {x.status === "negotiating" && x.proposed_by_me && <p className="mt-2 text-sm font-semibold">Esperando la respuesta de {x.other.name}.</p>}
      {x.status === "pending" && x.role === "requester" && <p className="mt-2 text-sm font-semibold">Esperando respuesta de {x.other.name}. Tus créditos están reservados.</p>}
      {x.status === "disputed" && <p className="mt-2 text-sm font-semibold">El equipo de moderación está revisando este conflicto. Los créditos siguen en custodia.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {canAcceptProposal && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run("accept", "Sesión agendada.")}>Aceptar {x.status === "pending" ? "y agendar" : "propuesta"}</button>}
        {["pending", "negotiating", "scheduled"].includes(x.status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal("propose")}>Proponer otro horario</button>}
        {x.status === "pending" && x.role === "provider" && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal("reject")}>Rechazar</button>}
        {["pending", "negotiating", "scheduled"].includes(x.status) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal("note")}>Lugar o enlace</button>}
        {x.status === "scheduled" && started && !x.my_confirmed && <button type="button" className="btn btn-dark btn-sm" disabled={busy} onClick={() => run("confirm", "Confirmaste la sesión.")}>Confirmar que se realizó</button>}
        {x.status === "scheduled" && started && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal("dispute")}>Abrir conflicto</button>}
        {["pending", "negotiating", "scheduled"].includes(x.status) && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal("cancel")}>Cancelar</button>}
        {x.status === "completed" && !x.rated && <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal("rate")}>Valorar a {x.other.name}</button>}
        {x.status === "completed" && x.rated && <span className="chip chip-ok self-center">Ya valoraste</span>}
        <button type="button" className="btn btn-ghost btn-sm ml-auto" aria-expanded={open} onClick={() => setOpen(!open)}>Historial <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} /></button>
      </div>
      {open && <Timeline id={x.id} />}
      {modal && <ActionModal x={x} kind={modal} onClose={() => setModal(null)} onDone={onChange} />}
    </li>
  );
}
