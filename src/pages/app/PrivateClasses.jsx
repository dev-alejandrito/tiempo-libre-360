import { Banknote, Plus, Pencil, Search, Clock3 as Clock, MapPin, CalendarClock as Calendar, Inbox, Award, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "@/lib/router";
import PrivateChat from "../../components/PrivateChat";

import { Alert, Empty, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { fmtDateTime, fmtMin, toDate, toLocalInput } from "../../lib/util";

const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const money = (n) => `${MXN.format(Number(n || 0))} MXN`;
const MODE = { in_person: "Presencial", virtual: "Virtual", both: "Presencial o virtual" };
const BK_ST = {
  pending: "chip-warn", accepted: "chip-info", rejected: "chip-bad", payment_pending: "chip-warn",
  confirmed: "chip-ok", completed: "chip-ok", cancelled: "chip-bad", disputed: "chip-bad",
};
const BK_LABEL = { pending: "Pendiente", accepted: "Aceptada", rejected: "Rechazada", payment_pending: "Pago por acordar", confirmed: "Confirmada", completed: "Finalizada", cancelled: "Cancelada", disputed: "En disputa" };
const ACTIVE = ["pending", "accepted", "payment_pending", "confirmed"];
const TABS = [["offers", "Ofertas"], ["chat", "Mensajes"], ["mine", "Mis solicitudes"], ["teach", "Mis clases como instructor"], ["myoffers", "Mis ofertas"]];

// Reglas iguales a BK_RULES del servidor.
const RULES = {
  accept: { who: "instructor", from: ["pending"] },
  reject: { who: "instructor", from: ["pending"] },
  arrange: { who: "any", from: ["accepted"] },
  confirm: { who: "instructor", from: ["payment_pending"] },
  complete: { who: "any", from: ["confirmed"] },
  cancel: { who: "any", from: ACTIVE },
  dispute: { who: "any", from: ["accepted", "payment_pending", "confirmed", "completed"] },
};
const can = (action, b) => { const r = RULES[action]; return r.from.includes(b.status) && (r.who === "any" || r.who === b.role); };

function PrivateChip() {
  return <span className="chip border-amber-deep bg-[#fdecc8] text-[#5c3200]"><Banknote size={13} aria-hidden="true" />Clase particular · MXN</span>;
}

function DirectPay() {
  return (
    <Alert kind="warn">
      <strong>Pago directo entre alumno e instructor.</strong> La plataforma no recibe, no retiene y no verifica pagos; no cobra comisiones ni usa tarjetas o pasarelas. Estas clases son independientes de las comunitarias: no generan ni descuentan créditos.
    </Alert>
  );
}

function ErrorRetry({ error, reload, what }) {
  return <Alert kind="error">No se pudo cargar {what}: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert>;
}

function Fact({ icon: Icon, children }) {
  return <span className="inline-flex items-center gap-1.5">{Icon && <Icon size={15} className="shrink-0" aria-hidden="true" />}{children}</span>;
}

// ---------- Solicitar horario ----------
function BookModal({ offer, onClose, onDone }) {
  const toast = useToast();
  const [start, setStart] = useState("");
  const [mode, setMode] = useState(offer.mode === "both" ? "" : offer.mode);
  const [note, setNote] = useState("");
  const [err, setErr] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const min = toLocalInput(new Date(Date.now() + 2 * 3600000));
  const max = toLocalInput(new Date(Date.now() + 120 * 86400000));
  const d = start ? new Date(start) : null;
  const iso = d && !isNaN(d.getTime()) ? d.toISOString() : "";
  async function submit(e) {
    e.preventDefault(); setError("");
    const x = {};
    if (!iso) x.start = "Elige una fecha y hora válidas.";
    else if (d.getTime() < Date.now() + 2 * 3600000) x.start = "Elige un horario con al menos 2 horas de anticipación.";
    else if (d.getTime() > Date.now() + 120 * 86400000) x.start = "Solo puedes solicitar clases dentro de los próximos 120 días.";
    if (offer.mode === "both" && !mode) x.mode = "Elige si la clase será presencial o virtual.";
    setErr(x); if (Object.keys(x).length) return;
    setBusy(true);
    try {
      const r = await api("/private/bookings", { method: "POST", body: { offer: offer.id, starts_at: iso, mode, note } });
      toast(`Solicitud ${r.code || ""} enviada a ${offer.instructor_name}. Te avisaremos cuando responda.`.replace("  ", " "));
      onDone(); onClose();
    } catch (er) { setError(er.message); } finally { setBusy(false); }
  }
  return (
    <Modal title="Solicitar horario" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="rounded-xl bg-sand p-3 text-sm"><p className="font-bold">{offer.title}</p><p>{offer.skill_name} · {offer.instructor_name} · {money(offer.price_mxn)} · {fmtMin(offer.minutes)}</p></div>
        <DirectPay />
        <Field label="Fecha y hora que te conviene" error={err.start} hint="Con al menos 2 horas de anticipación y hasta 120 días. La referencia es la hora de Ciudad de México.">
          {(p) => <input {...p} type="datetime-local" className="input" min={min} max={max} value={start} onChange={(e) => setStart(e.target.value)} required />}
        </Field>
        {iso && <p className="text-sm font-semibold" role="status">Se solicitará para: {fmtDateTime(iso)} (hora de Ciudad de México)</p>}
        {offer.mode === "both" && (
          <Field label="Modalidad" error={err.mode}>{(p) => <select {...p} className="input" value={mode} onChange={(e) => setMode(e.target.value)} required><option value="">Elige una opción</option><option value="in_person">Presencial</option><option value="virtual">Virtual</option></select>}</Field>
        )}
        <Field label="Mensaje para el instructor (opcional)" hint="Máximo 500 caracteres.">{(p) => <textarea {...p} className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        <p className="text-sm"><strong>Condiciones de cancelación:</strong> {offer.cancel_terms}</p>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button></div>
      </form>
    </Modal>
  );
}

function OfferCard({ o, onBook, onChat }) {
  return (
    <li className="card flex flex-col gap-3 border-l-8 border-l-amber">
      <div className="flex flex-wrap items-center gap-2"><PrivateChip /><span className="chip">{o.skill_name}</span></div>
      <div>
        <h3 className="text-xl font-bold">{o.title}</h3>
        <p className="text-sm">Instructor: <strong>{o.instructor_name}</strong></p>
      </div>
      {o.description && <p className="whitespace-pre-wrap break-words text-[#3c3829]">{o.description}</p>}
      <p className="num text-3xl font-bold">{money(o.price_mxn)}<span className="ml-2 font-sans text-sm font-semibold text-[#4b4638]">por {fmtMin(o.minutes)}</span></p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Fact icon={Clock}>{fmtMin(o.minutes)}</Fact>
        <Fact icon={MapPin}>{o.mode_label || MODE[o.mode]}{o.place ? ` · ${o.place}` : ""}</Fact>
      </div>
      <dl className="space-y-1 text-sm">
        <div><dt className="inline font-bold">Disponibilidad: </dt><dd className="inline">{o.availability}</dd></div>
        <div><dt className="inline font-bold">Condiciones de cancelación: </dt><dd className="inline">{o.cancel_terms}</dd></div>
      </dl>
      <p className="text-xs text-[#4b4638]">Pago directo con el instructor. La plataforma no recibe ni verifica pagos.</p>
      <div className="mt-auto flex flex-wrap gap-2"><button type="button" className="btn btn-primary" onClick={() => onBook(o)}><Calendar size={18} aria-hidden="true" />Solicitar horario<span className="sr-only"> de {o.title}</span></button><button type="button" className="btn btn-ghost" onClick={() => onChat(o.instructor)}><MessageCircle size={18} aria-hidden="true" />Escribir para acordar<span className="sr-only"> con {o.instructor_name}</span></button></div>
    </li>
  );
}

function OffersTab({ onChat }) {
  const { data, loading, error, reload } = useApi("/private/offers");
  const [book, setBook] = useState(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("");
  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.items || []).filter((o) => (!mode || o.mode === mode || o.mode === "both") && (!t || [o.title, o.skill_name, o.category, o.instructor_name, o.description].join(" ").toLowerCase().includes(t)));
  }, [data, q, mode]);
  if (error) return <ErrorRetry error={error} reload={reload} what="las ofertas" />;
  if (loading && !data) return <Spinner />;
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Field label="Buscar clase, habilidad o instructor">{(p) => <div className="relative"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" /><input {...p} type="search" className="input !pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. guitarra, inglés…" /></div>}</Field>
        <Field label="Modalidad">{(p) => <select {...p} className="input" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Todas</option><option value="in_person">Presencial</option><option value="virtual">Virtual</option></select>}</Field>
      </div>
      {(data?.items || []).length === 0 ? (
        <Empty icon={Banknote} title="Todavía no hay clases particulares disponibles">Cuando alguien con una habilidad acreditada publique una oferta, la verás aquí.</Empty>
      ) : items.length === 0 ? (
        <Empty icon={Search} title="Sin resultados" action={<button type="button" className="btn btn-ghost" onClick={() => { setQ(""); setMode(""); }}>Quitar filtros</button>}>Prueba con otra palabra o cambia la modalidad.</Empty>
      ) : (
        <>
          <p className="mb-3 text-sm font-semibold" role="status">{items.length} {items.length === 1 ? "oferta" : "ofertas"}</p>
          <ul className="grid gap-4 md:grid-cols-2">{items.map((o) => <OfferCard key={o.id} o={o} onBook={setBook} onChat={onChat} />)}</ul>
        </>
      )}
      {book && <BookModal offer={book} onClose={() => setBook(null)} onDone={reload} />}
    </>
  );
}

// ---------- Acciones sobre una clase ----------
const ACTION_CFG = {
  reject: { title: "Rechazar solicitud", btn: "Rechazar solicitud", ok: "Solicitud rechazada.", field: "reason", label: "Motivo (opcional)", min: 0 },
  arrange: { title: "Pago por acordar", btn: "Guardar acuerdo de pago", ok: "Anotamos el acuerdo de pago. Recuerda que el pago es directo entre ustedes.", field: "payment_note", label: "¿Cómo y cuándo acordaron el pago?", min: 5, hint: "Por ejemplo: transferencia el día de la clase. La plataforma no cobra ni verifica pagos." },
  confirm: { title: "Confirmar clase", btn: "Confirmar clase", ok: "Clase confirmada. Ya está en tu agenda.", field: null },
  cancel: { title: "Cancelar clase", btn: "Cancelar clase", ok: "Clase cancelada.", field: "reason", label: "Motivo (opcional)", min: 0 },
  dispute: { title: "Abrir una disputa", btn: "Abrir disputa", ok: "Disputa abierta. El equipo la revisará.", field: "reason", label: "Cuéntanos qué pasó", min: 10, hint: "Mínimo 10 caracteres. El equipo revisará el caso; la plataforma no gestiona pagos." },
};

function ActionModal({ b, kind, onClose, onDone }) {
  const toast = useToast();
  const cfg = ACTION_CFG[kind];
  const [text, setText] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setError("");
    if (cfg.field && text.trim().length < cfg.min) { setFieldErr(`Escribe al menos ${cfg.min} caracteres.`); return; }
    setFieldErr(""); setBusy(true);
    try {
      await api(`/private/bookings/${b.id}/${kind}`, { method: "POST", body: cfg.field ? { [cfg.field]: text } : {} });
      toast(cfg.ok); onDone(); onClose();
    } catch (er) { setError(er.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`${cfg.title} · ${b.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm font-semibold">{b.title} · {fmtDateTime(b.starts_at)} · {money(b.price_mxn)}</p>
        {kind === "confirm" && <Alert kind="warn">Al confirmar, declaras que acordaron el pago directamente entre ustedes. La plataforma no recibe, retiene ni verifica pagos.</Alert>}
        {kind === "cancel" && <Alert kind="info">Condiciones de cancelación acordadas: {b.terms}</Alert>}
        {cfg.field && <Field label={cfg.label} hint={cfg.hint} error={fieldErr}>{(p) => <textarea {...p} className="input" rows={4} maxLength={cfg.field === "payment_note" ? 300 : 500} value={text} onChange={(e) => setText(e.target.value)} />}</Field>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button><button className={`btn ${kind === "cancel" || kind === "reject" || kind === "dispute" ? "btn-danger" : "btn-primary"}`} disabled={busy}>{busy ? "Guardando…" : cfg.btn}</button></div>
      </form>
    </Modal>
  );
}

function BookingCard({ b, onChange }) {
  const toast = useToast();
  const [modal, setModal] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const started = (toDate(b.starts_at)?.getTime() || 0) <= Date.now();
  const other = b.role === "instructor" ? `Alumno: ${b.student_name}` : `Instructor: ${b.instructor_name}`;
  async function quick(action, okMsg) {
    setBusy(true);
    try { await api(`/private/bookings/${b.id}/${action}`, { method: "POST", body: {} }); toast(okMsg); onChange(); }
    catch (er) { toast(er.message, "error"); } finally { setBusy(false); }
  }
  const hist = (b.history || []);
  return (
    <li className="card flex flex-col gap-3 border-l-8 border-l-amber">
      <div className="flex flex-wrap items-center gap-2">
        <PrivateChip />
        <span className={`chip ${BK_ST[b.status] || ""}`}>{b.status_label || BK_LABEL[b.status] || b.status}</span>
        <span className="num text-xs font-semibold text-[#4b4638]">{b.code}</span>
        {b.source === "chat" && <span className="chip chip-info"><MessageCircle size={13} aria-hidden="true" />Acordada por chat</span>}
      </div>
      <div>
        <h3 className="text-xl font-bold">{b.title}</h3>
        <p className="text-sm">{b.skill_name} · {other}</p>
      </div>
      <p className="num text-2xl font-bold">{money(b.price_mxn)}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Fact icon={Calendar}>{fmtDateTime(b.starts_at)} <span className="text-[#4b4638]">(hora de Ciudad de México)</span></Fact>
        <Fact icon={Clock}>{fmtMin(b.minutes)}</Fact>
        <Fact icon={MapPin}>{b.mode_label || MODE[b.mode]}{b.place ? ` · ${b.place}` : ""}</Fact>
      </div>
      <dl className="space-y-1 text-sm">
        {b.conversation && <div><Link to={`/app/clases-particulares?chat=${b.conversation}`} className="font-bold underline">Abrir el chat de esta clase</Link></div>}
        {b.terms && <div><dt className="inline font-bold">Condiciones acordadas: </dt><dd className="inline">{b.terms}</dd></div>}
        {b.student_note && <div><dt className="inline font-bold">Mensaje del alumno: </dt><dd className="inline whitespace-pre-wrap break-words">{b.student_note}</dd></div>}
        {b.payment_note && <div><dt className="inline font-bold">Acuerdo de pago: </dt><dd className="inline whitespace-pre-wrap break-words">{b.payment_note}</dd></div>}
        {b.dispute_reason && <div><dt className="inline font-bold">Motivo de la disputa: </dt><dd className="inline whitespace-pre-wrap break-words">{b.dispute_reason}</dd></div>}
      </dl>
      <p className="rounded-lg bg-[#fdecc8] px-3 py-2 text-xs font-semibold text-[#5c3200]">Pago directo entre alumno e instructor. La plataforma no recibe, retiene ni verifica pagos.</p>
      {hist.length > 0 && (
        <div>
          <button type="button" className="text-sm font-bold underline" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Ocultar historial" : "Ver historial"}<span className="sr-only"> de {b.code}</span></button>
          {open && <ol className="mt-2 space-y-1.5 border-l-2 border-line pl-4 text-sm">{hist.map((h, i) => <li key={i}><strong>{h.action}</strong> · {h.by} · <span className="text-[#4b4638]">{fmtDateTime(h.at)}</span>{h.note && <p className="whitespace-pre-wrap break-words text-[#3c3829]">{h.note}</p>}</li>)}</ol>}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        {can("accept", b) && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => quick("accept", "Solicitud aceptada. Ahora acuerden cómo será el pago.")}>Aceptar<span className="sr-only"> {b.code}</span></button>}
        {can("reject", b) && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal("reject")}>Rechazar<span className="sr-only"> {b.code}</span></button>}
        {can("arrange", b) && <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal("arrange")}>Anotar acuerdo de pago<span className="sr-only"> de {b.code}</span></button>}
        {can("confirm", b) && <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal("confirm")}>Confirmar clase<span className="sr-only"> {b.code}</span></button>}
        {can("complete", b) && <button type="button" className="btn btn-dark btn-sm" disabled={busy || !started} onClick={() => quick("complete", "Clase finalizada. ¡Gracias por enseñar y aprender!")}>Marcar como finalizada<span className="sr-only"> {b.code}</span></button>}
        {can("cancel", b) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal("cancel")}>Cancelar<span className="sr-only"> {b.code}</span></button>}
        {can("dispute", b) && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal("dispute")}>Abrir disputa<span className="sr-only"> de {b.code}</span></button>}
      </div>
      {can("complete", b) && !started && <p className="text-xs text-[#4b4638]">Podrás marcarla como finalizada cuando llegue la hora de la clase.</p>}
      {modal && <ActionModal b={b} kind={modal} onClose={() => setModal("")} onDone={onChange} />}
    </li>
  );
}

function BookingList({ items, onChange, emptyTitle, emptyText, action }) {
  const active = items.filter((b) => ACTIVE.includes(b.status) || b.status === "disputed");
  const past = items.filter((b) => !active.includes(b));
  if (!items.length) return <Empty icon={Inbox} title={emptyTitle} action={action}>{emptyText}</Empty>;
  return (
    <>
      {active.length > 0 && <section className="mb-8"><h3 className="mb-3 text-2xl font-extrabold">En curso <span className="num text-base text-[#4b4638]">({active.length})</span></h3><ul className="grid gap-4 lg:grid-cols-2">{active.map((b) => <BookingCard key={b.id} b={b} onChange={onChange} />)}</ul></section>}
      {past.length > 0 && <section><h3 className="mb-3 text-2xl font-extrabold">Historial <span className="num text-base text-[#4b4638]">({past.length})</span></h3><ul className="grid gap-4 lg:grid-cols-2">{past.map((b) => <BookingCard key={b.id} b={b} onChange={onChange} />)}</ul></section>}
    </>
  );
}

// ---------- Mis ofertas ----------
const EMPTY_OFFER = { skill_name: "", title: "", description: "", price_mxn: "", minutes: "60", mode: "virtual", place: "", availability: "", cancel_terms: "" };

function OfferForm({ initial, accredited, usedSkills, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!initial?.id;
  const choices = accredited.filter((a) => !usedSkills.includes(a.skill_name.toLowerCase()));
  const [f, setF] = useState(initial ? { ...EMPTY_OFFER, ...initial, price_mxn: String(initial.price_mxn), minutes: String(initial.minutes) } : { ...EMPTY_OFFER, skill_name: choices[0]?.skill_name || "" });
  const [err, setErr] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError("");
    const x = {}; const price = Math.round(Number(f.price_mxn)), mins = Number(f.minutes);
    if (!editing && !f.skill_name) x.skill_name = "Elige una habilidad acreditada.";
    if (f.title.trim().length < 3) x.title = "Escribe un título (mínimo 3 caracteres).";
    if (!(price >= 1 && price <= 20000)) x.price_mxn = "El precio debe estar entre 1 y 20,000 MXN.";
    if (!(mins >= 15 && mins <= 240 && mins % 15 === 0)) x.minutes = "Elige una duración válida.";
    if (f.mode !== "virtual" && f.place.trim().length < 3) x.place = "Indica la zona o el lugar de la clase presencial.";
    if (f.availability.trim().length < 3) x.availability = "Describe tu disponibilidad (mínimo 3 caracteres).";
    if (f.cancel_terms.trim().length < 10) x.cancel_terms = "Escribe tus condiciones de cancelación (mínimo 10 caracteres).";
    setErr(x); if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api("/private/offers", { method: "POST", body: { id: initial?.id || "", skill_name: f.skill_name, title: f.title, description: f.description, price_mxn: price, minutes: mins, mode: f.mode, place: f.place, availability: f.availability, cancel_terms: f.cancel_terms } });
      toast(editing ? "Oferta actualizada." : "Oferta publicada. Ya puede recibir solicitudes.");
      onSaved(); onClose();
    } catch (er) { setError(er.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={editing ? "Editar oferta" : "Nueva oferta de clase particular"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <DirectPay />
        {editing ? <p className="text-sm"><strong>Habilidad:</strong> {f.skill_name}</p> : (
          <Field label="Habilidad acreditada" error={err.skill_name}>{(p) => <select {...p} className="input" value={f.skill_name} onChange={set("skill_name")} required>{choices.length === 0 && <option value="">No hay habilidades disponibles</option>}{choices.map((a) => <option key={a.skill_name} value={a.skill_name}>{a.skill_name}</option>)}</select>}</Field>
        )}
        <Field label="Título de la clase" error={err.title}>{(p) => <input {...p} className="input" maxLength={100} value={f.title} onChange={set("title")} placeholder="Ej. Guitarra para principiantes" required />}</Field>
        <Field label="Descripción (opcional)" hint="Qué aprenderá la persona y cómo das la clase.">{(p) => <textarea {...p} className="input" rows={3} maxLength={1500} value={f.description} onChange={set("description")} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio en MXN" error={err.price_mxn} hint="Entre 1 y 20,000 pesos mexicanos.">{(p) => <input {...p} type="number" inputMode="numeric" min={1} max={20000} step={1} className="input" value={f.price_mxn} onChange={set("price_mxn")} required />}</Field>
          <Field label="Duración" error={err.minutes}>{(p) => <select {...p} className="input" value={f.minutes} onChange={set("minutes")}>{Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map((m) => <option key={m} value={m}>{fmtMin(m)}</option>)}</select>}</Field>
        </div>
        <Field label="Modalidad">{(p) => <select {...p} className="input" value={f.mode} onChange={set("mode")}>{Object.entries(MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
        {f.mode !== "virtual" && <Field label="Zona o lugar (clase presencial)" error={err.place}>{(p) => <input {...p} className="input" maxLength={150} value={f.place} onChange={set("place")} placeholder="Ej. Colonia Roma, CDMX" />}</Field>}
        <Field label="Disponibilidad" error={err.availability} hint="Por ejemplo: lunes a viernes de 17:00 a 20:00.">{(p) => <textarea {...p} className="input" rows={2} maxLength={600} value={f.availability} onChange={set("availability")} required />}</Field>
        <Field label="Condiciones de cancelación" error={err.cancel_terms} hint="Quedan acordadas con cada solicitud. Mínimo 10 caracteres.">{(p) => <textarea {...p} className="input" rows={3} maxLength={600} value={f.cancel_terms} onChange={set("cancel_terms")} required />}</Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy || (!editing && choices.length === 0)}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Publicar oferta"}</button></div>
      </form>
    </Modal>
  );
}

function MyOffersTab({ data, reload }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busyId, setBusyId] = useState("");
  const accredited = data.accredited || [];
  const offers = data.offers || [];
  const used = offers.map((o) => o.skill_name.toLowerCase());
  const free = accredited.filter((a) => !used.includes(a.skill_name.toLowerCase()));
  async function toggle(o) {
    setBusyId(o.id);
    try { const r = await api(`/private/offers/${o.id}/toggle`, { method: "POST", body: {} }); toast(r.active ? `«${o.title}» está activa y visible.` : `«${o.title}» quedó desactivada.`); reload(); }
    catch (er) { toast(er.message, "error"); } finally { setBusyId(""); }
  }
  return (
    <>
      {accredited.length === 0 && (
        <div className="mb-4"><Alert kind="warn">Para dar clases particulares necesitas al menos una habilidad con acreditación aprobada. <Link to="/app/acreditaciones" className="font-bold underline">Presenta tu evidencia en Mis acreditaciones</Link>.</Alert></div>
      )}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm">Tus ofertas son clases con precio en pesos mexicanos. Solo se publican habilidades acreditadas y el pago es directo con cada alumno.</p>
        <button type="button" className="btn btn-primary" disabled={free.length === 0} onClick={() => setForm({})}><Plus size={18} aria-hidden="true" />Crear oferta</button>
      </div>
      {accredited.length > 0 && free.length === 0 && <p className="mb-4 text-sm font-semibold">Ya tienes una oferta para cada habilidad acreditada. Puedes editarlas o acreditar otra habilidad.</p>}
      {offers.length === 0 ? (
        accredited.length > 0 && <Empty icon={Banknote} title="Aún no tienes ofertas" action={<button type="button" className="btn btn-primary" onClick={() => setForm({})}>Crear mi primera oferta</button>}>Elige una de tus habilidades acreditadas y ponle precio, horario y condiciones.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {offers.map((o) => (
            <li key={o.id} className="card flex flex-col gap-2 border-l-8 border-l-amber">
              <div className="flex flex-wrap items-center gap-2"><PrivateChip />{o.active ? <span className="chip chip-ok">Activa</span> : <span className="chip">Desactivada</span>}</div>
              <h3 className="text-xl font-bold">{o.title}</h3>
              <p className="text-sm">{o.skill_name}</p>
              <p className="num text-2xl font-bold">{money(o.price_mxn)} <span className="font-sans text-sm font-semibold text-[#4b4638]">· {fmtMin(o.minutes)}</span></p>
              <p className="text-sm">{o.mode_label || MODE[o.mode]}{o.place ? ` · ${o.place}` : ""}</p>
              <p className="text-sm"><strong>Disponibilidad:</strong> {o.availability}</p>
              <p className="text-sm"><strong>Cancelación:</strong> {o.cancel_terms}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(o)}><Pencil size={15} aria-hidden="true" />Editar<span className="sr-only"> {o.title}</span></button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === o.id} onClick={() => toggle(o)}>{o.active ? "Desactivar" : "Activar"}<span className="sr-only"> {o.title}</span></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {form && <OfferForm initial={form.id ? form : null} accredited={accredited} usedSkills={used} onClose={() => setForm(null)} onSaved={reload} />}
    </>
  );
}

// ---------- Página ----------
export default function PrivateClasses() {
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const chatParam = sp.get("chat") || "";
  const toParam = sp.get("to") || "";
  const [tab, setTab] = useState(chatParam || toParam ? "chat" : "offers");
  const [openChat, setOpenChat] = useState(chatParam || null);
  const chats = useApi("/chat");
  const mine = useApi("/private/mine");
  // Abrir (o iniciar) una conversación desde un enlace: ?chat=<id> o ?to=<persona>.
  useEffect(() => { if (chatParam) { setTab("chat"); setOpenChat(chatParam); } }, [chatParam]);
  useEffect(() => {
    if (!toParam) return;
    let live = true;
    api("/chat/start", { method: "POST", body: { member: toParam } })
      .then((r) => { if (!live) return; setTab("chat"); setOpenChat(r.id); chats.reload(); setSp({ chat: r.id }, { replace: true }); })
      .catch((er) => { if (live) { toast(er.message, "error"); setSp({}, { replace: true }); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toParam]);
  async function startChat(memberId) {
    try { const r = await api("/chat/start", { method: "POST", body: { member: memberId } }); setOpenChat(r.id); setTab("chat"); chats.reload(); }
    catch (er) { toast(er.message, "error"); }
  }
  const openThread = (id) => { setOpenChat(id); if (!id) setSp({}, { replace: true }); };
  const refs = useRef({});
  const bookings = mine.data?.bookings || [];
  const asStudent = bookings.filter((b) => b.role === "student");
  const asTeacher = bookings.filter((b) => b.role === "instructor");
  const pendingIn = asTeacher.filter((b) => b.status === "pending").length;
  const unreadChats = (chats.data?.items || []).reduce((n, c) => n + (c.unread || 0), 0);
  const counts = { chat: unreadChats, mine: asStudent.filter((b) => ACTIVE.includes(b.status)).length, teach: pendingIn };
  const change = () => { mine.reload(); window.dispatchEvent(new Event("tl-notifs")); };

  function onKey(e, i) {
    let n = null;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = TABS.length - 1;
    if (n === null) return;
    e.preventDefault(); setTab(TABS[n][0]); refs.current[TABS[n][0]]?.focus();
  }

  let panel;
  if (tab === "offers") panel = <OffersTab onChat={startChat} />;
  else if (tab === "chat") panel = <PrivateChat chats={chats} openId={openChat} onOpen={openThread} />;
  else if (mine.error) panel = <ErrorRetry error={mine.error} reload={mine.reload} what="tus clases" />;
  else if (mine.loading && !mine.data) panel = <Spinner />;
  else if (tab === "mine") panel = <BookingList items={asStudent} onChange={change} emptyTitle="Aún no has solicitado clases" emptyText="Mira las ofertas y pide el horario que te convenga." action={<button type="button" className="btn btn-primary" onClick={() => setTab("offers")}>Ver ofertas</button>} />;
  else if (tab === "teach") panel = <BookingList items={asTeacher} onChange={change} emptyTitle="Todavía no recibes solicitudes" emptyText="Cuando alguien pida una de tus clases, podrás aceptarla o rechazarla aquí." action={<button type="button" className="btn btn-ghost" onClick={() => setTab("myoffers")}>Ver mis ofertas</button>} />;
  else panel = <MyOffersTab data={mine.data} reload={mine.reload} />;

  return (
    <>
      <PageHeader title="Clases particulares" subtitle="Conversa en privado y acuerda clases personalizadas con el precio, fecha, horario, duración y modalidad que ustedes decidan. Son independientes de las clases comunitarias que se pagan con créditos.">
        <PrivateChip />
      </PageHeader>
      <div className="mb-5"><DirectPay /></div>
      <div role="tablist" aria-label="Secciones de clases particulares" className="mb-5 flex gap-1 overflow-x-auto border-b-2 border-line pb-0">
        {TABS.map(([k, label], i) => (
          <button key={k} ref={(el) => { refs.current[k] = el; }} id={`tab-${k}`} type="button" role="tab" aria-selected={tab === k} aria-controls={`panel-${k}`} tabIndex={tab === k ? 0 : -1}
            onClick={() => setTab(k)} onKeyDown={(e) => onKey(e, i)}
            className={`-mb-0.5 min-h-11 shrink-0 whitespace-nowrap rounded-t-xl border-2 border-b-0 px-4 text-sm font-bold ${tab === k ? "border-ink bg-ink text-white" : "border-transparent hover:bg-sand"}`}>
            {label}{counts[k] > 0 && <span className="num ml-2 rounded-full bg-amber px-2 py-0.5 text-xs text-ink">{counts[k]}<span className="sr-only"> {k === "teach" ? "por responder" : k === "chat" ? "sin leer" : "en curso"}</span></span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>{panel}</div>
    </>
  );
}
