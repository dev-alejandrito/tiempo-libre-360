import { ArrowLeft, Paperclip, Search, Inbox, Lock } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, Empty, Field, PageHeader, Spinner, useToast } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";

const STATUS = [["new", "Nuevo", "chip-warn"], ["review", "En revisión", "chip-info"], ["waiting", "En espera de información", "chip-info"], ["attended", "Atendido", "chip-ok"], ["closed", "Cerrado", ""]];
const ST = Object.fromEntries(STATUS.map(([k, l, c]) => [k, [l, c]]));
const DEFAULT_CATS = { user: "Problema con una persona", class: "Problema con una clase", exchange: "Problema con un intercambio", direct_payment: "Pago directo", security: "Seguridad", platform: "Problema con la plataforma", complaint: "Queja general", suggestion: "Sugerencia" };

const when = (s) => {
  const d = s ? new Date(String(s).replace(" ", "T")) : null;
  return d && !isNaN(d) ? d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
};

function openProtected(f, toast) {
  // Enlace temporal entregado por el servidor solo al personal.
  if (!f.url) { toast("No se pudo abrir el archivo adjunto. Vuelve a cargar la página.", "error"); return; }
  const w = window.open(f.url, "_blank", "noopener,noreferrer");
  if (!w) window.location.assign(f.url);
}

function Files({ files }) {
  const toast = useToast();
  if (!files?.length) return null;
  return (
    <div>
      <h3 className="label">Archivos adjuntos</h3>
      <ul className="flex flex-wrap gap-2">{files.map((f) => <li key={f.url}><button type="button" className="btn btn-ghost btn-sm" onClick={() => openProtected(f, toast)}><Paperclip size={16} aria-hidden="true" /><span className="max-w-[16rem] truncate">{f.name}</span><span className="sr-only"> (se abre en una pestaña nueva)</span></button></li>)}</ul>
    </div>
  );
}

function Editor({ r, onDone }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [status, setStatus] = useState(r.status);
  const [busy, setBusy] = useState(false);
  const [busySt, setBusySt] = useState(false);
  const [error, setError] = useState("");
  const [errorSt, setErrorSt] = useState("");

  async function send(e) {
    e.preventDefault();
    if (text.trim().length < 2) { setError("Escribe el mensaje antes de enviarlo."); return; }
    setBusy(true); setError("");
    try {
      await api(`/admin/feedback/${r.id}/reply`, { method: "POST", body: { text, internal } });
      toast(internal ? "Nota interna guardada. La persona no la verá." : "Respuesta enviada a la persona.");
      setText(""); onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function changeStatus(e) {
    e.preventDefault();
    if (status === r.status) return;
    setBusySt(true); setErrorSt("");
    try {
      await api(`/admin/feedback/${r.id}/status`, { method: "POST", body: { status } });
      toast(`Estado cambiado a «${ST[status][0]}». La persona fue avisada.`);
      onDone();
    } catch (err) { setErrorSt(err.message); } finally { setBusySt(false); }
  }
  return (
    <div className="space-y-5">
      <form onSubmit={changeStatus} className="rounded-2xl border border-line bg-sand/60 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Field label="Estado del reporte">{(p) => <select {...p} className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</Field>
          </div>
          <button className="btn btn-dark" disabled={busySt || status === r.status}>{busySt ? "Guardando…" : "Cambiar estado"}</button>
        </div>
        {errorSt && <div className="mt-3"><Alert kind="error">{errorSt}</Alert></div>}
      </form>

      <form onSubmit={send} className={`space-y-3 rounded-2xl border p-4 ${internal ? "border-[#efc877] bg-[#fdf3dc]" : "border-line bg-white"}`}>
        <Field label={internal ? "Nota interna" : "Respuesta para la persona"} error={error} hint={internal ? "Solo la ve el personal." : "La persona recibirá un aviso con tu respuesta."}>
          {(p) => <textarea {...p} className="input" rows={5} maxLength={2000} value={text} onChange={(e) => { setText(e.target.value); setError(""); }} />}
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input type="checkbox" role="switch" className="h-6 w-6 shrink-0 accent-[#8a4b00]" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
          Nota interna (la persona no la verá)
        </label>
        <button className={`btn ${internal ? "btn-dark" : "btn-primary"}`} disabled={busy}>{busy ? "Enviando…" : internal ? "Guardar nota interna" : "Responder a la persona"}</button>
      </form>
    </div>
  );
}

function Detail({ r, onBack, onDone }) {
  const st = ST[r.status] || [r.status_label || r.status, ""];
  return (
    <article className="card space-y-5" aria-label={`Reporte ${r.code}`}>
      <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Volver a la lista</button>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="num rounded-md bg-ink px-2 py-0.5 text-sm font-bold text-white">{r.code}</span>
          <span className={`chip ${st[1]}`}>{st[0]}</span>
          <span className="chip chip-info">{r.category_label || DEFAULT_CATS[r.category] || r.category}</span>
        </div>
        <h2 className="mt-2 break-words text-2xl font-extrabold">{r.subject}</h2>
        <p className="mt-1 text-sm">Enviado el {when(r.created)} · Última actividad: {when(r.updated)}</p>
      </header>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-bold">Persona</dt><dd className="break-words">{r.member_name}<br /><span className="break-all">{r.member_email || "Sin correo"}</span></dd></div>
        <div><dt className="font-bold">Persona relacionada</dt><dd className="break-words">{r.related_member || "No indicada"}</dd></div>
        <div><dt className="font-bold">Clase o intercambio relacionado</dt><dd className="num break-all">{r.related_exchange || "No indicado"}</dd></div>
      </dl>

      <div>
        <h3 className="label">Descripción</h3>
        <p className="whitespace-pre-wrap break-words rounded-xl bg-sand p-3">{r.description}</p>
      </div>
      <Files files={r.files} />

      <section aria-labelledby={`conv-${r.id}`}>
        <h3 id={`conv-${r.id}`} className="mb-2 text-lg font-bold">Conversación</h3>
        {r.thread.length === 0 ? <p className="text-sm">Todavía no hay respuestas.</p> : (
          <ol className="space-y-3">{r.thread.map((t, i) => (
            <li key={i} className={`rounded-2xl border p-3 ${t.internal ? "border-[#efc877] bg-[#fdf3dc]" : t.from === "staff" ? "border-[#9fd0cd] bg-[#e6f4f3]" : "border-line bg-white"}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <strong>{t.name || (t.from === "staff" ? "Equipo" : "Persona")}</strong>
                <span>{t.from === "staff" ? "· Personal" : "· Persona"}</span>
                {t.internal && <span className="chip chip-warn"><Lock size={12} aria-hidden="true" />Nota interna</span>}
                <span className="ml-auto">{when(t.at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words">{t.text}</p>
            </li>))}</ol>
        )}
      </section>
      <Editor key={r.id + r.status + r.thread.length} r={r} onDone={onDone} />
    </article>
  );
}

export default function AdminFeedback() {
  const { data, loading, error, reload } = useApi("/admin/feedback");
  const [status, setStatus] = useState("");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const items = data?.items;
  const cats = data?.categories || DEFAULT_CATS;
  const counts = useMemo(() => { const c = {}; (items || []).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; }); return c; }, [items]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items || []).filter((r) => (!status || r.status === status) && (!cat || r.category === cat) && (!t || r.code.toLowerCase().includes(t) || r.subject.toLowerCase().includes(t)));
  }, [items, status, cat, q]);
  const current = (items || []).find((r) => r.id === sel);
  const open = (counts.new || 0);

  return (
    <>
      <PageHeader title="Sugerencias, quejas y reportes" subtitle={items ? `${items.length} ${items.length === 1 ? "reporte" : "reportes"} · ${open} ${open === 1 ? "nuevo" : "nuevos"} sin atender. Las respuestas públicas llegan a la persona; las notas internas solo las ve el personal.` : "Reportes enviados por la comunidad."} />
      {error && !items ? <Alert kind="error">No se pudieron cargar los reportes: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert> : loading && !items ? <Spinner /> : (
        <>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            <button type="button" aria-pressed={status === ""} className={`btn btn-sm ${status === "" ? "btn-dark" : "btn-ghost"}`} onClick={() => setStatus("")}>Todos ({items.length})</button>
            {STATUS.map(([k, l]) => <button key={k} type="button" aria-pressed={status === k} className={`btn btn-sm ${status === k ? "btn-dark" : "btn-ghost"}`} onClick={() => setStatus(k)}>{l} ({counts[k] || 0})</button>)}
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field label="Categoría">{(p) => <select {...p} className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas las categorías</option>{Object.entries(cats).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</Field>
            <Field label="Buscar por código o asunto">{(p) => <div className="relative"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" /><input {...p} type="search" className="input pl-10" placeholder="Por ejemplo: QS-A2B3C4" value={q} onChange={(e) => setQ(e.target.value)} /></div>}</Field>
          </div>
          {error && <div className="mb-3"><Alert kind="error">No se pudo actualizar la lista: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert></div>}
          {items.length === 0 ? <Empty icon={Inbox} title="Aún no hay reportes">Cuando alguien envíe una queja o sugerencia, aparecerá aquí.</Empty> : (
            <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div className={current ? "hidden lg:block" : ""}>
                {shown.length === 0 ? <div className="card">Ningún reporte coincide con estos filtros.</div> : (
                  <ul className="space-y-2">{shown.map((r) => {
                    const s = ST[r.status] || [r.status, ""];
                    return (
                      <li key={r.id}>
                        <button type="button" aria-current={sel === r.id ? "true" : undefined} onClick={() => setSel(r.id)} className={`block min-h-11 w-full rounded-2xl border p-3 text-left transition ${sel === r.id ? "border-ink bg-white ring-2 ring-amber" : "border-line bg-[#fffdf8] hover:border-ink"}`}>
                          <span className="flex flex-wrap items-center gap-2"><span className="num text-sm font-bold">{r.code}</span><span className={`chip ${s[1]}`}>{s[0]}</span></span>
                          <span className="mt-1 block break-words font-bold">{r.subject}</span>
                          <span className="block text-sm">{r.category_label || cats[r.category] || r.category} · {r.member_name}</span>
                          <span className="block text-sm">{when(r.updated)}</span>
                        </button>
                      </li>);
                  })}</ul>
                )}
              </div>
              <div className={current ? "" : "hidden lg:block"}>
                {current ? <Detail r={current} onBack={() => setSel("")} onDone={reload} /> : <Empty icon={Inbox} title="Elige un reporte">Selecciona uno de la lista para ver la conversación y responder.</Empty>}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
