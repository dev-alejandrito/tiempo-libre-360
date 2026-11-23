import { Banknote, GraduationCap, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, Empty, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";

const STATUS = [["pending", "Pendiente", "chip-warn"], ["accepted", "Aceptada", "chip-info"], ["rejected", "Rechazada", "chip-bad"], ["payment_pending", "Pago por acordar", "chip-warn"], ["confirmed", "Confirmada", "chip-ok"], ["completed", "Finalizada", "chip-ok"], ["cancelled", "Cancelada", "chip-bad"], ["disputed", "En disputa", "chip-bad"]];
const ST = Object.fromEntries(STATUS.map(([k, l, c]) => [k, [l, c]]));
const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
const parse = (s) => { const d = s ? new Date(String(s).replace(" ", "T")) : null; return d && !isNaN(d) ? d : null; };
const when = (s, long) => { const d = parse(s); return d ? d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", ...(long ? { weekday: "long" } : {}), day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; };
const dur = (m) => { m = Math.round(Number(m || 0)); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };

function ResolveModal({ b, onClose, onDone }) {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const x = {};
    if (!status) x.status = "Elige cómo queda la clase.";
    if (note.trim().length < 5) x.note = "Escribe la resolución (mínimo 5 caracteres).";
    setErrs(x); setError("");
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api(`/admin/private/${b.id}/resolve`, { method: "POST", body: { status, note } });
      toast(`Disputa de ${b.code} resuelta: la clase quedó ${status === "completed" ? "finalizada" : "cancelada"}. Se avisó a ambas personas.`);
      onDone(); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Resolver disputa ${b.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="rounded-xl bg-sand p-3 text-sm">
          <p className="font-bold">{b.skill_name} · {MXN.format(b.price_mxn)}</p>
          <p>{b.instructor_name} (instructor) y {b.student_name} (alumno)</p>
          {b.dispute_reason && <p className="mt-2 whitespace-pre-wrap break-words"><strong>Motivo de la disputa:</strong> {b.dispute_reason}</p>}
        </div>
        <Alert kind="info">Resolver la disputa solo cambia el estado de la clase. La plataforma no mueve créditos ni dinero.</Alert>
        <fieldset aria-describedby={errs.status ? "res-st-err" : undefined}>
          <legend className="label">¿Cómo queda la clase?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[["completed", "Finalizada", "La clase sí se dio."], ["cancelled", "Cancelada", "La clase no se dio."]].map(([v, l, h]) => (
              <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3 ${status === v ? "border-ink" : "border-line"}`}>
                <input type="radio" name="res-status" className="mt-1 h-5 w-5 accent-[#0c1626]" checked={status === v} onChange={() => setStatus(v)} />
                <span><span className="block font-bold">{l}</span><span className="text-sm">{h}</span></span>
              </label>))}
          </div>
          {errs.status && <p id="res-st-err" className="mt-1 text-sm font-semibold text-danger">{errs.status}</p>}
        </fieldset>
        <Field label="Nota de resolución (obligatoria)" error={errs.note} hint="Se envía a la persona que da la clase y a quien la tomó.">{(p) => <textarea {...p} className="input" rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button><button className="btn btn-dark" disabled={busy}>{busy ? "Guardando…" : "Resolver disputa"}</button></div>
      </form>
    </Modal>
  );
}

function Booking({ b, onResolve }) {
  const st = ST[b.status] || [b.status_label || b.status, ""];
  const disputed = b.status === "disputed";
  const own = b.role !== "staff";
  return (
    <li className={`card ${disputed ? "border-2 border-danger bg-[#fff6f4]" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="num rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-white">{b.code}</span>
        <span className={`chip ${st[1]}`}>{st[0]}</span>
        <span className="chip chip-info">{b.mode_label || "—"}</span>
        <span className="num ml-auto text-xl font-bold">{MXN.format(b.price_mxn)}</span>
      </div>
      <h3 className="mt-2 break-words text-xl font-bold">{b.title || b.skill_name}</h3>
      <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="font-bold">Instructor</dt><dd className="break-words">{b.instructor_name}</dd></div>
        <div><dt className="font-bold">Alumno</dt><dd className="break-words">{b.student_name}</dd></div>
        <div><dt className="font-bold">Habilidad</dt><dd className="break-words">{b.skill_name}</dd></div>
        <div><dt className="font-bold">Fecha y hora (Ciudad de México)</dt><dd>{when(b.starts_at, true)}</dd></div>
        <div><dt className="font-bold">Duración</dt><dd>{dur(b.minutes)}</dd></div>
        <div><dt className="font-bold">Solicitada el</dt><dd>{when(b.created)}</dd></div>
      </dl>
      {b.terms && <div className="mt-3"><h4 className="text-sm font-bold">Condiciones acordadas</h4><p className="whitespace-pre-wrap break-words text-sm">{b.terms}</p></div>}
      {b.student_note && <div className="mt-2"><h4 className="text-sm font-bold">Nota del alumno</h4><p className="whitespace-pre-wrap break-words text-sm">{b.student_note}</p></div>}
      {b.payment_note && <div className="mt-2"><h4 className="text-sm font-bold">Acuerdo de pago (entre ellos)</h4><p className="whitespace-pre-wrap break-words text-sm">{b.payment_note}</p></div>}
      {b.dispute_reason && <div className="mt-3 rounded-xl border border-[#f2b1ab] bg-[#fde1de] p-3"><h4 className="flex items-center gap-1.5 text-sm font-bold text-[#7a1810]"><ShieldAlert size={16} aria-hidden="true" />Motivo de la disputa</h4><p className="whitespace-pre-wrap break-words text-sm text-[#5e130c]">{b.dispute_reason}</p></div>}
      {b.history?.length > 0 && (
        <details className="mt-3 rounded-xl bg-sand p-3">
          <summary className="min-h-6 cursor-pointer text-sm font-bold">Historial ({b.history.length})</summary>
          <ol className="mt-2 space-y-2">{[...b.history].reverse().map((h, i) => (
            <li key={i} className="text-sm"><p><strong>{h.action}</strong> · {h.by || "Sistema"} · {when(h.at)}</p>{h.note && <p className="whitespace-pre-wrap break-words">{h.note}</p>}</li>))}</ol>
        </details>
      )}
      {disputed && (
        <div className="mt-3">
          {own ? <Alert kind="warn">Participas en esta clase, así que otra persona del equipo debe resolver la disputa.</Alert> : <button type="button" className="btn btn-primary" onClick={() => onResolve(b)}>Resolver disputa</button>}
        </div>
      )}
    </li>
  );
}

export default function AdminPrivate() {
  const { data, loading, error, reload } = useApi("/admin/private");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const items = data?.items;
  const counts = useMemo(() => { const c = {}; (items || []).forEach((b) => { c[b.status] = (c[b.status] || 0) + 1; }); return c; }, [items]);
  const shown = useMemo(() => {
    const list = (items || []).filter((b) => !status || b.status === status);
    return [...list.filter((b) => b.status === "disputed"), ...list.filter((b) => b.status !== "disputed")];
  }, [items, status]);
  const disputes = counts.disputed || 0;
  const firstRest = shown.findIndex((b) => b.status !== "disputed");

  return (
    <>
      <PageHeader title="Clases particulares" subtitle="Supervisión de las reservas de clases particulares entre miembros acreditados." />
      <div className="mb-4"><Alert kind="info">Las clases particulares se pagan directamente entre alumno e instructor. La plataforma no recibe, retiene ni verifica pagos y no mueve créditos.</Alert></div>
      {error && !items ? <Alert kind="error">No se pudieron cargar las reservas: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert> : loading && !items ? <Spinner /> : (
        <>
          {disputes > 0 && <div className="mb-4"><Alert kind="error"><strong>{disputes} {disputes === 1 ? "disputa por resolver" : "disputas por resolver"}.</strong> Aparecen primero en la lista.</Alert></div>}
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            <button type="button" aria-pressed={status === ""} className={`btn btn-sm ${status === "" ? "btn-dark" : "btn-ghost"}`} onClick={() => setStatus("")}>Todas ({items.length})</button>
            {STATUS.map(([k, l]) => <button key={k} type="button" aria-pressed={status === k} className={`btn btn-sm ${status === k ? "btn-dark" : "btn-ghost"}`} onClick={() => setStatus(k)}>{l} ({counts[k] || 0})</button>)}
          </div>
          {error && <div className="mb-3"><Alert kind="error">No se pudo actualizar la lista: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert></div>}
          {items.length === 0 ? <Empty icon={GraduationCap} title="Aún no hay clases particulares">Cuando alguien reserve una clase particular, aparecerá aquí para su supervisión.</Empty>
            : shown.length === 0 ? <Empty icon={Banknote} title="Sin reservas con este estado">Prueba con otro estado o muestra todas.</Empty> : (
              <ul className="space-y-3">{shown.map((b, i) => (
                <div key={b.id} className="contents">
                  {i === 0 && b.status === "disputed" && <li className="list-none"><h2 className="text-lg font-extrabold text-danger">Disputas por resolver</h2></li>}
                  {i === firstRest && i > 0 && <li className="list-none pt-2"><h2 className="text-lg font-extrabold">Otras reservas</h2></li>}
                  <Booking b={b} onResolve={setModal} />
                </div>))}</ul>
            )}
        </>
      )}
      {modal && <ResolveModal b={modal} onClose={() => setModal(null)} onDone={reload} />}
    </>
  );
}
