import { useEffect, useState } from "react";
import { Alert, Field, Modal, PageHeader, Pagination, Spinner, useToast } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { api, errMsg, pb } from "../../lib/pb";
import { fmtDateTime } from "../../lib/util";

const FILTERS = [["", "Todos"], ["new", "Nuevo"], ["read", "Leído"], ["in_progress", "En atención"], ["answered", "Respondido"]];
const ST = {
  new: ["Nuevo", "chip-warn"],
  read: ["Leído", "chip-info"],
  in_progress: ["En atención", "chip-info"],
  answered: ["Respondido", "chip-ok"],
  send_error: ["Error de envío", "chip-bad"],
};

function gmailUrl(to, subject, body) {
  return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
}

function ReplyEditor({ m, onClose, onDone }) {
  const toast = useToast();
  const [subject, setSubject] = useState("Re: " + (m.subject || "Tu mensaje a TIEMPO LIBRE 360"));
  const [body, setBody] = useState(`Hola ${m.name},\n\nGracias por escribir a TIEMPO LIBRE 360.\n\n\n\nSaludos,\nEquipo TIEMPO LIBRE 360`);
  const [review, setReview] = useState(false);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api(`/admin/contact/${m.id}/replies`).then((r) => setHistory(r.items)).catch(() => setHistory([])); }, [m.id]);
  const valid = subject.trim().length >= 3 && body.trim().length >= 10;
  async function register(pending) {
    setBusy(true); setError("");
    try { await api(`/admin/contact/${m.id}/reply`, { method: "POST", body: { subject, body, pending } }); toast(pending ? "Respuesta guardada como pendiente de envío. Confírmala cuando la hayas enviado desde Gmail." : "Respuesta registrada en el historial. El mensaje quedó como respondido."); onDone(); onClose(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function confirmSent(h) {
    setBusy(true); setError("");
    try { await api(`/admin/contact/reply/${h.id}/confirm`, { method: "POST" }); toast("Envío confirmado. El mensaje quedó como respondido."); onDone(); onClose(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Responder a ${m.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Alert kind="info">Tu alojamiento todavía no puede enviar correos, así que esta plataforma no envía nada por sí sola. Abre Gmail con la respuesta preparada, envíala desde allí y después registra que la enviaste.</Alert>
        <p className="text-sm">Para: <strong className="break-all">{m.email}</strong></p>
        <Field label="Asunto">{(p) => <input {...p} className="input" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} />}</Field>
        <Field label="Respuesta" hint="Entre 10 y 5000 caracteres.">{(p) => <textarea {...p} className="input" rows={8} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />}</Field>
        {review && <div className="rounded-xl bg-sand p-3 text-sm"><p className="font-bold">Revisión final</p><p>Para: {m.email}</p><p>Asunto: {subject}</p><p className="mt-2 whitespace-pre-wrap break-words">{body}</p></div>}
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" disabled={!valid} onClick={() => setReview((v) => !v)}>{review ? "Ocultar revisión" : "Revisar"}</button>
          <a className={`btn btn-dark ${valid ? "" : "pointer-events-none opacity-50"}`} href={valid ? gmailUrl(m.email, subject, body) : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!valid}>Abrir en Gmail</a>
          <button type="button" className="btn btn-ghost" disabled={!valid || busy} onClick={() => register(true)}>Guardar como pendiente de envío</button>
          <button type="button" className="btn btn-primary" disabled={!valid || busy} onClick={() => register(false)}>{busy ? "Registrando…" : "Ya la envié: registrar respuesta"}</button>
        </div>
        <div>
          <h3 className="font-bold">Historial de respuestas</h3>
          {history === null ? <Spinner /> : history.length === 0 ? <p className="text-sm">Aún no hay respuestas registradas.</p> : (
            <ul className="mt-2 space-y-2">{history.map((h) => (
              <li key={h.id} className="rounded-xl border border-ink/15 p-3 text-sm"><p className="font-semibold">{h.subject} · {fmtDateTime(h.sent_at || h.created)}</p>{h.channel === "gmail_pending" ? <p className="text-xs font-semibold">Pendiente de envío: todavía no está confirmada como enviada.</p> : <p className="text-xs">Registrada por {h.author || "administración"} (enviada por Gmail, manualmente)</p>}
                {h.channel === "gmail_pending" && <div className="mt-2 flex flex-wrap gap-2"><a className="btn btn-dark btn-sm" href={gmailUrl(m.email, h.subject, h.body)} target="_blank" rel="noopener noreferrer">Abrir en Gmail</a><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => confirmSent(h)}>Confirmar que ya la envié</button></div>}<p className="mt-1 whitespace-pre-wrap break-words">{h.body}</p></li>))}</ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function AdminMessages() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [reply, setReply] = useState(null);
  const [status, setStatus] = useState("");
  const { items, total, loading, error, reload } = useList("contact_messages", { page, perPage: 15, sort: "-created", filter: status ? `status = "${status}"` : "" });
  
  async function set(m, status) { try { await api(`/admin/contact/${m.id}/status`, { method: "POST", body: { status } }); reload(); } catch (e) { toast(errMsg(e), "error"); } }
  async function del(m) { if (!window.confirm("¿Eliminar este mensaje?")) return; try { await pb.collection("contact_messages").delete(m.id, { requestKey: null }); reload(); } catch (e) { toast(errMsg(e), "error"); } }
  const pending = items.filter((m) => (m.status || "new") !== "answered").length;
  return (
    <>
      <PageHeader title="Mensajes de contacto" subtitle="Mensajes enviados desde la página pública de contacto. Todos se guardan aquí. Responde desde el editor y queda registro de cada respuesta." />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">{FILTERS.map(([v, l]) => <button key={v || "all"} type="button" aria-pressed={status === v} className={`btn btn-sm ${status === v ? "btn-dark" : "btn-ghost"}`} onClick={() => { setStatus(v); setPage(1); }}>{l}</button>)}</div>
      {error ? <Alert kind="error">No se pudieron cargar los mensajes: {error} <button type="button" className="underline" onClick={reload}>Reintentar</button></Alert> : loading && !items.length ? <Spinner /> : items.length === 0 ? <div className="card">{status ? "No hay mensajes con este estado." : "Aún no hay mensajes."}</div> : (
        <>
          <p className="mb-3 text-sm font-semibold">{total} {total === 1 ? "mensaje" : "mensajes"} · en esta página: {pending} sin responder, {items.length - pending} respondidos</p>
          <ul className="space-y-3">{items.map((m) => {
            const st = ST[m.status || "new"] || ST.new;
            return (
              <li key={m.id} className="card">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{m.subject || "(sin asunto)"}</h2><span className={`chip ${st[1]}`}>{st[0]}</span>{m.reply_count > 0 && <span className="chip chip-ok">{m.reply_count} {m.reply_count === 1 ? "respuesta" : "respuestas"}</span>}</div>
                <p className="text-sm">{m.name} · {m.email}</p>
                <p className="text-sm">Recibido: {fmtDateTime(m.created)}{m.answered_at ? ` · Respondido: ${fmtDateTime(m.answered_at)}` : ""}</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-sand p-3">{m.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { if (m.status === "new" || !m.status) set(m, "read"); setReply(m); }}>Responder</button>
                  {m.status !== "answered" && m.status !== "read" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set(m, "read")}>Marcar leído</button>}
                  {m.status !== "answered" && m.status !== "in_progress" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set(m, "in_progress")}>En atención</button>}
                  <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href={gmailUrl(m.email, "Re: " + (m.subject || "Tu mensaje"), "")}>Abrir Gmail</a>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => del(m)}>Eliminar</button>
                </div>
              </li>
            );
          })}</ul>
          <Pagination page={page} total={total} perPage={15} onPage={setPage} />
        </>
      )}
      {reply && <ReplyEditor m={reply} onClose={() => setReply(null)} onDone={reload} />}
    </>
  );
}
