// Chat privado entre dos personas para acordar clases personalizadas.
// Precio, fecha, horario, duración y modalidad se acuerdan libremente; el pago es directo entre ellas,
// fuera de la plataforma (aquí no se cobra, no se retiene y no se confirma ningún pago).
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, Handshake, MessageCircle, CalendarClock, Clock3, MapPin, Banknote } from "lucide-react";
import { Alert, Avatar, Empty, Field, Modal, Spinner, useToast } from "./ui";
import { Link } from "../lib/router";
import { api } from "../lib/pb";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, fmtMin } from "../lib/util";

const MXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = (n) => `${MXN.format(Number(n || 0))} MXN`;
const P_ST = { pending: ["Esperando respuesta", "chip-warn"], accepted: ["Acuerdo aceptado", "chip-ok"], rejected: ["Rechazada", "chip-bad"], withdrawn: ["Retirada", ""] };
// Fecha de hoy en Ciudad de México (UTC-6) para el selector.
const mxToday = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10);

function ProposalForm({ conv, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({ role: "teach", topic: "", price_mxn: "", date: "", time: "", minutes: "60", mode: "virtual", place: "", notes: "" });
  const [err, setErr] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const when = f.date && f.time ? new Date(`${f.date}T${f.time}:00-06:00`) : null;
  async function submit(e) {
    e.preventDefault(); setError("");
    const x = {}; const price = Number(f.price_mxn), mins = Number(f.minutes);
    if (f.topic.trim().length < 2) x.topic = "Escribe el tema o la habilidad.";
    if (f.price_mxn === "" || !(price >= 0 && price <= 100000)) x.price_mxn = "Escribe el precio acordado (0 a 100,000 MXN).";
    if (!f.date) x.date = "Elige la fecha.";
    if (!f.time) x.time = "Elige el horario.";
    if (when && when.getTime() < Date.now() + 3600000) x.time = "Elige un horario con al menos 1 hora de anticipación.";
    if (!(mins >= 10 && mins <= 600)) x.minutes = "Entre 10 y 600 minutos.";
    setErr(x); if (Object.keys(x).length) return;
    setBusy(true);
    try {
      await api(`/chat/${conv.id}/propose`, { method: "POST", body: { ...f, topic: f.topic.trim(), price_mxn: price, minutes: mins } });
      toast(`Propuesta enviada a ${conv.other.name}.`); onDone(); onClose();
    } catch (er) { setError(er.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Proponer una clase a ${conv.other.name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Alert kind="warn"><strong>Ustedes fijan libremente las condiciones.</strong> El pago se hace directamente entre ustedes, fuera de la plataforma. TIEMPO LIBRE 360 no cobra, no retiene y no confirma pagos.</Alert>
        <fieldset>
          <legend className="label">¿Quién da la clase?</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex min-h-11 items-center gap-2"><input type="radio" name="role" className="h-5 w-5" checked={f.role === "teach"} onChange={() => setF({ ...f, role: "teach" })} />Yo doy la clase</label>
            <label className="flex min-h-11 items-center gap-2"><input type="radio" name="role" className="h-5 w-5" checked={f.role === "learn"} onChange={() => setF({ ...f, role: "learn" })} />Yo recibo la clase</label>
          </div>
        </fieldset>
        <Field label="Tema o habilidad" error={err.topic}>{(p) => <input {...p} className="input" maxLength={100} value={f.topic} onChange={set("topic")} placeholder="Ej. Inglés conversacional" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio acordado (MXN)" error={err.price_mxn} hint="El que ustedes decidan. Puede ser 0.">{(p) => <input {...p} type="number" inputMode="decimal" min={0} max={100000} step="0.01" className="input" value={f.price_mxn} onChange={set("price_mxn")} />}</Field>
          <Field label="Duración (minutos)" error={err.minutes}>{(p) => <input {...p} type="number" inputMode="numeric" min={10} max={600} step={5} className="input" value={f.minutes} onChange={set("minutes")} />}</Field>
          <Field label="Fecha" error={err.date}>{(p) => <input {...p} type="date" className="input" min={mxToday()} value={f.date} onChange={set("date")} />}</Field>
          <Field label="Horario (hora de Ciudad de México)" error={err.time}>{(p) => <input {...p} type="time" className="input" value={f.time} onChange={set("time")} />}</Field>
        </div>
        <Field label="Modalidad">{(p) => <select {...p} className="input" value={f.mode} onChange={set("mode")}><option value="virtual">Virtual</option><option value="in_person">Presencial</option></select>}</Field>
        <Field label={f.mode === "virtual" ? "Enlace o plataforma (opcional)" : "Lugar o zona (opcional)"} hint="Evita compartir tu domicilio exacto hasta que confíes en la otra persona.">{(p) => <input {...p} className="input" maxLength={200} value={f.place} onChange={set("place")} />}</Field>
        <Field label="Condiciones o notas (opcional)" hint="Cancelaciones, forma de pago acordada, materiales…">{(p) => <textarea {...p} className="input" rows={3} maxLength={1000} value={f.notes} onChange={set("notes")} />}</Field>
        {when && !isNaN(when.getTime()) && <p className="text-sm font-semibold" role="status">La clase sería el {fmtDateTime(when.toISOString())} (hora de Ciudad de México).</p>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? "Enviando…" : "Enviar propuesta"}</button></div>
      </form>
    </Modal>
  );
}

function ProposalCard({ m, otherName, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const p = m.proposal || {};
  const st = P_ST[m.proposal_status] || [m.proposal_status, ""];
  const teacher = (p.role === "teach") === m.mine ? "Tú" : otherName;
  const student = teacher === "Tú" ? otherName : "Tú";
  async function act(action, ok) {
    if (action === "accept" && !window.confirm("Al aceptar, la clase queda acordada en Clases particulares. El pago es directo entre ustedes, fuera de la plataforma. ¿Aceptar?")) return;
    setBusy(action);
    try { const r = await api(`/chat/message/${m.id}/${action}`, { method: "POST", body: {} }); toast(action === "accept" ? `Acuerdo aceptado · ${r.code}` : ok); onChanged(); }
    catch (er) { toast(er.message, "error"); } finally { setBusy(""); }
  }
  return (
    <div className={`card max-w-md border-l-8 border-l-amber ${m.mine ? "ml-auto" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold"><Handshake size={18} aria-hidden="true" />Propuesta de clase</p>
        <span className={`chip ${st[1]}`}>{st[0]}</span>
      </div>
      <h4 className="mt-2 text-lg font-bold">{p.topic}</h4>
      <p className="text-sm">Da la clase: <strong>{teacher}</strong> · Recibe: <strong>{student}</strong></p>
      <p className="num mt-2 text-2xl font-bold">{money(p.price_mxn)}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5"><CalendarClock size={15} aria-hidden="true" />{fmtDateTime(p.starts_at)}</span>
        <span className="inline-flex items-center gap-1.5"><Clock3 size={15} aria-hidden="true" />{fmtMin(p.minutes)}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin size={15} aria-hidden="true" />{p.mode_label}{p.place ? ` · ${p.place}` : ""}</span>
      </div>
      {p.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm"><strong>Condiciones:</strong> {p.notes}</p>}
      <p className="mt-2 rounded-lg bg-[#fdecc8] px-3 py-2 text-xs font-semibold text-[#5c3200]">Pago directo entre ustedes, fuera de la plataforma.</p>
      {m.proposal_status === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.mine ? <button type="button" className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act("withdraw", "Propuesta retirada.")}>Retirar propuesta</button> : <>
            <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act("accept")}>{busy === "accept" ? "Aceptando…" : "Aceptar acuerdo"}</button>
            <button type="button" className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => act("reject", "Propuesta rechazada.")}>Rechazar</button>
          </>}
        </div>
      )}
      <p className="mt-2 text-xs text-[#4b4638]">{m.mine ? "Enviada por ti" : `Enviada por ${otherName}`} · {fmtDateTime(m.created)}</p>
    </div>
  );
}

function Thread({ id, onBack, onListChange }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [propose, setPropose] = useState(false);
  const endRef = useRef(null);
  const load = useMemo(() => async () => {
    try { const r = await api(`/chat/${id}`); setData(r); setError(""); onListChange?.(); }
    catch (er) { setError(er.message); }
  }, [id, onListChange]);
  useEffect(() => { setData(null); load(); }, [load]);
  // Mensajes en vivo: solo llegan los de conversaciones en las que participas.
  useEffect(() => {
    let t = null;
    const ch = supabase.channel(`chat-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `conversation=eq.${id}` }, () => { clearTimeout(t); t = setTimeout(load, 250); })
      .subscribe();
    const poll = setInterval(load, 30000);
    return () => { clearTimeout(t); clearInterval(poll); supabase.removeChannel(ch); };
  }, [id, load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [data?.messages?.length]);
  async function send(e) {
    e.preventDefault();
    const t = text.trim(); if (!t) return;
    setBusy(true);
    try { await api(`/chat/${id}/send`, { method: "POST", body: { text: t } }); setText(""); load(); }
    catch (er) { toast(er.message, "error"); } finally { setBusy(false); }
  }
  if (error) return <Alert kind="error">{error} <button type="button" className="font-bold underline" onClick={load}>Reintentar</button></Alert>;
  if (!data) return <Spinner />;
  return (
    <section className="card flex min-h-[60vh] flex-col gap-3" aria-label={`Conversación con ${data.other.name}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line pb-3">
        <button type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand lg:hidden" onClick={onBack}><ArrowLeft size={20} aria-hidden="true" /><span className="sr-only">Volver a las conversaciones</span></button>
        <Avatar name={data.other.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{data.other.name}</h3>
          <Link to={`/app/persona/${data.other.id}`} className="text-sm font-semibold underline">Ver perfil</Link>
        </div>
        {data.other.available && <button type="button" className="btn btn-primary btn-sm" onClick={() => setPropose(true)}><Handshake size={16} aria-hidden="true" />Proponer clase</button>}
      </header>
      <ol className="flex max-h-[55vh] flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
        {data.messages.length === 0 && <li className="py-8 text-center text-sm text-[#4b4638]">Escribe el primer mensaje. Cuando estén de acuerdo, usa «Proponer clase» para dejar por escrito precio, fecha, horario, duración y modalidad.</li>}
        {data.messages.map((m) => (
          <li key={m.id} className="flex flex-col">
            {m.kind === "proposal" ? <ProposalCard m={m} otherName={data.other.name} onChanged={load} />
              : m.kind === "system" ? <p className="mx-auto max-w-md rounded-full bg-sand px-4 py-1.5 text-center text-xs font-semibold">{m.body}</p>
              : <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.mine ? "ml-auto bg-ink text-white" : "bg-sand"}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-1 text-xs ${m.mine ? "text-[#b9c6da]" : "text-[#4b4638]"}`}>{fmtDateTime(m.created)}{m.mine && m.read ? " · Leído" : ""}</p>
                </div>}
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ol>
      {data.other.available ? (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line pt-3">
          <label htmlFor={`msg-${id}`} className="sr-only">Mensaje</label>
          <textarea id={`msg-${id}`} className="input min-h-11 flex-1" rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} placeholder="Escribe un mensaje…" />
          <button className="btn btn-dark" disabled={busy || !text.trim()}><Send size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Enviar</span></button>
        </form>
      ) : <Alert kind="info">Esta persona ya no está disponible para conversar.</Alert>}
      {propose && <ProposalForm conv={data} onClose={() => setPropose(false)} onDone={load} />}
    </section>
  );
}

export default function PrivateChat({ chats, openId, onOpen }) {
  const items = chats.data?.items || [];
  if (chats.error) return <Alert kind="error">No se pudieron cargar tus conversaciones: {chats.error} <button type="button" className="font-bold underline" onClick={chats.reload}>Reintentar</button></Alert>;
  if (chats.loading && !chats.data) return <Spinner />;
  return (
    <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start">
      <div className={openId ? "hidden lg:block" : ""}>
        {items.length === 0 ? (
          <Empty icon={MessageCircle} title="Aún no tienes conversaciones">Abre el perfil de una persona y pulsa «Mensaje privado», o escribe a un instructor desde las ofertas.</Empty>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li key={c.id}>
                <button type="button" aria-current={openId === c.id ? "true" : undefined} onClick={() => onOpen(c.id)} className={`card flex min-h-11 w-full items-center gap-3 text-left transition ${openId === c.id ? "border-ink ring-2 ring-amber" : "hover:border-ink"}`}>
                  <Avatar name={c.other.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate font-bold">{c.other.name}</span>{c.unread > 0 && <span className="num rounded-full bg-amber px-2 text-xs font-bold text-ink">{c.unread}<span className="sr-only"> sin leer</span></span>}</span>
                    <span className="block truncate text-sm text-[#3c3829]">{c.last ? `${c.last.mine ? "Tú: " : ""}${c.last.body}` : "Sin mensajes todavía"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={openId ? "" : "hidden lg:block"}>
        {openId ? <Thread key={openId} id={openId} onBack={() => onOpen(null)} onListChange={chats.reload} /> : <div className="card hidden text-center lg:block"><Banknote size={22} className="mx-auto mb-2" aria-hidden="true" />Elige una conversación para ver los mensajes.</div>}
      </div>
    </div>
  );
}
