import { LifeBuoy, Send, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Alert, Empty, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { FileLinks, FilePicker, checkFiles } from "../../components/Attachments";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { uploadMany } from "../../lib/storage";
import { fmtDateTime } from "../../lib/util";

const DEFAULT_CATS = { user: "Problema con una persona", class: "Problema con una clase", exchange: "Problema con un intercambio", direct_payment: "Pago directo", security: "Seguridad", platform: "Problema con la plataforma", complaint: "Queja general", suggestion: "Sugerencia" };
const ST_CLS = { new: "chip-warn", review: "chip-info", waiting: "chip-warn", attended: "chip-ok", closed: "" };
const fmtErr = (e) => e?.message || "No se pudo enviar. Inténtalo de nuevo.";

function NewReport({ cats, onClose, onDone }) {
  const toast = useToast();
  const ex = useApi("/exchanges");
  const [f, setF] = useState({ category: "", subject: "", description: "", related_member: "", related_exchange: "" });
  const [files, setFiles] = useState([]);
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const exchanges = ex.data?.items || [];
  async function submit(e) {
    e.preventDefault(); setError("");
    const er = {};
    if (!f.category) er.category = "Elige una categoría.";
    if (f.subject.trim().length < 3) er.subject = "Escribe un asunto (mínimo 3 caracteres).";
    if (f.description.trim().length < 10) er.description = "Cuéntanos qué ocurrió (mínimo 10 caracteres).";
    const fe = checkFiles(files); if (fe) er.files = fe;
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const uploaded = files.length ? await uploadMany(files, "feedback") : [];
      const r = await api("/feedback", { method: "POST", body: { category: f.category, subject: f.subject.trim(), description: f.description.trim(), related_member: f.related_member.trim(), related_exchange: f.related_exchange, website: "", files: uploaded } });
      toast(r?.code ? `Recibimos tu reporte ${r.code}. Te responderemos aquí mismo.` : "Recibimos tu reporte. Te responderemos aquí mismo.");
      onDone(); onClose();
    } catch (err) { setError(fmtErr(err)); } finally { setBusy(false); }
  }
  return (
    <Modal title="Nueva queja o sugerencia" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Alert kind="info">Tu reporte es privado: solo lo ve el equipo de TIEMPO LIBRE 360. Las demás personas nunca lo verán.</Alert>
        <Field label="Categoría" error={errs.category}>{(p) => <select {...p} className="input" required value={f.category} onChange={set("category")}><option value="">Elige una categoría…</option>{Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
        <Field label="Asunto" error={errs.subject}>{(p) => <input {...p} className="input" maxLength={150} value={f.subject} onChange={set("subject")} />}</Field>
        <Field label="¿Qué ocurrió o qué propones?" hint="Entre 10 y 3000 caracteres. Mientras más detalle, mejor podremos ayudarte." error={errs.description}>{(p) => <textarea {...p} className="input" rows={5} maxLength={3000} value={f.description} onChange={set("description")} />}</Field>
        <Field label="Persona relacionada (opcional)" hint="Su nombre o el nombre que ves en su perfil.">{(p) => <input {...p} className="input" maxLength={100} value={f.related_member} onChange={set("related_member")} />}</Field>
        <Field label="Clase o intercambio relacionado (opcional)" hint={ex.error ? "No pudimos cargar tus intercambios; puedes enviar el reporte sin elegir uno." : "Solo aparecen los intercambios en los que participas."}>{(p) => (
          <select {...p} className="input" value={f.related_exchange} onChange={set("related_exchange")} disabled={ex.loading}>
            <option value="">{ex.loading ? "Cargando…" : "Ninguno"}</option>
            {exchanges.map((x) => <option key={x.id} value={x.id}>{x.skill_name || "Intercambio"}{x.other?.name ? ` con ${x.other.name}` : ""}{x.scheduled_start ? ` · ${fmtDateTime(x.scheduled_start)}` : ""}</option>)}
          </select>
        )}</Field>
        <FilePicker files={files} onChange={setFiles} error={errs.files} label="Capturas o documentos (opcional)" />
        <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
          <label>No rellenar este campo<input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
        </div>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}><Send size={16} aria-hidden="true" />{busy ? "Enviando…" : "Enviar reporte"}</button></div>
      </form>
    </Modal>
  );
}

function ReportCard({ r, onChange }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const closed = r.status === "closed";
  async function reply(e) {
    e.preventDefault(); setErr("");
    if (text.trim().length < 2) { setErr("Escribe tu mensaje."); return; }
    setBusy(true);
    try { await api(`/feedback/${r.id}/reply`, { method: "POST", body: { text: text.trim() } }); toast("Tu mensaje llegó al equipo."); setText(""); onChange(); }
    catch (er) { setErr(fmtErr(er)); } finally { setBusy(false); }
  }
  const errId = "fb-err-" + r.id;
  return (
    <li className="card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip num">{r.code}</span>
        <span className={`chip ${ST_CLS[r.status] || ""}`}>{r.status_label}</span>
        <span className="chip">{r.category_label}</span>
      </div>
      <h2 className="mt-2 text-xl font-bold break-words">{r.subject}</h2>
      <p className="text-sm text-[#4b4638]">Enviado el {fmtDateTime(r.created)}</p>
      <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-sand p-3">{r.description}</p>
      {(r.related_member || r.related_exchange) && <p className="mt-2 text-sm">{r.related_member && <>Persona relacionada: <strong>{r.related_member}</strong>. </>}{r.related_exchange && <>Incluye un intercambio relacionado.</>}</p>}
      {r.files?.length > 0 && <div className="mt-3"><p className="mb-1 text-sm font-semibold">Archivos adjuntos</p><FileLinks files={r.files} /></div>}
      <div className="mt-4">
        <h3 className="font-bold">Conversación</h3>
        {r.thread.length === 0 ? <p className="mt-1 text-sm text-[#3c3829]">Todavía no hay respuestas. Te avisaremos cuando el equipo escriba.</p> : (
          <ol className="mt-2 space-y-2">{r.thread.map((t, i) => (
            <li key={i} className={`max-w-[92%] rounded-2xl border p-3 text-sm ${t.from === "staff" ? "border-[#9fd0cd] bg-[#d8eeee]" : "ml-auto border-line bg-white"}`}>
              <p className="font-bold">{t.name} <span className="font-normal text-[#4b4638]">· {fmtDateTime(t.at)}</span></p>
              <p className="mt-1 whitespace-pre-wrap break-words">{t.text}</p>
            </li>))}</ol>
        )}
      </div>
      {closed ? <p className="mt-4 text-sm font-semibold">Este reporte está cerrado. Si necesitas algo más, envía uno nuevo.</p> : (
        <form onSubmit={reply} className="mt-4 space-y-2" noValidate>
          <Field label="Tu respuesta" error={err}>{(p) => <textarea {...p} id={undefined} className="input" rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} aria-describedby={err ? errId : undefined} />}</Field>
          <button className="btn btn-dark btn-sm" disabled={busy}><Send size={15} aria-hidden="true" />{busy ? "Enviando…" : "Enviar respuesta"}<span className="sr-only"> al reporte {r.code}</span></button>
        </form>
      )}
    </li>
  );
}

export default function Feedback() {
  const { data, loading, error, reload } = useApi("/feedback");
  const [open, setOpen] = useState(false);
  if (loading && !data) return <Spinner />;
  const items = data?.items || [];
  const cats = data?.categories || DEFAULT_CATS;
  return (
    <>
      <PageHeader title="Sugerencias, quejas y reportes" subtitle="Envía sugerencias, quejas o reportes sobre otras personas o problemas de la plataforma. Cada reporte recibe un código único y solo lo ve el equipo.">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} aria-hidden="true" />Nuevo reporte</button>
      </PageHeader>
      {error ? <Alert kind="error">No pudimos cargar tus reportes: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert> : items.length === 0 ? (
        <Empty icon={LifeBuoy} title="Aún no has enviado reportes" action={<button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Enviar el primero</button>}>Si algo no funcionó como esperabas, o tienes una idea para mejorar, aquí puedes decírnoslo en privado.</Empty>
      ) : (
        <>
          <p className="mb-3 flex items-center gap-2 text-sm"><ShieldCheck size={16} aria-hidden="true" />Solo tú puedes ver estos reportes y las respuestas del equipo.</p>
          <ul className="space-y-4">{items.map((r) => <ReportCard key={r.id} r={r} onChange={reload} />)}</ul>
        </>
      )}
      {open && <NewReport cats={cats} onClose={() => setOpen(false)} onDone={reload} />}
    </>
  );
}
