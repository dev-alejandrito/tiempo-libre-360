import { ArrowLeft, Paperclip, Award, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert, Empty, Field, PageHeader, Spinner, useToast } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { useAuth } from "../../lib/auth";

const FILTERS = [["pending", "Pendiente"], ["review", "En revisión"], ["correction", "Requiere corrección"], ["approved", "Aprobada"], ["rejected", "Rechazada"], ["suspended", "Suspendida"], ["", "Todas"]];
const ST = {
  pending: ["Pendiente", "chip-warn"],
  review: ["En revisión", "chip-info"],
  correction: ["Requiere corrección", "chip-warn"],
  approved: ["Aprobada", "chip-ok"],
  rejected: ["Rechazada", "chip-bad"],
  suspended: ["Suspendida", "chip-bad"],
};
const KINDS = { certificate: "Certificado", article: "Artículo", publication: "Publicación", project: "Proyecto", portfolio: "Portafolio", demo: "Demostración" };

// Mismas reglas que el servidor (AC_ACTIONS): acción → estados desde los que se permite.
const ACTIONS = [
  { key: "review", label: "Pasar a revisión", from: ["pending", "correction", "rejected", "suspended"], need: false, cls: "btn-ghost", done: "Evidencia pasada a revisión." },
  { key: "approve", label: "Aprobar", from: ["pending", "review", "rejected", "suspended"], need: false, cls: "btn-primary", done: "Habilidad verificada. Ya muestra la insignia y la persona puede ofrecerla como instructor." },
  { key: "correction", label: "Solicitar corrección", from: ["pending", "review"], need: true, cls: "btn-dark", done: "Corrección solicitada: la persona recibió tu mensaje." },
  { key: "reject", label: "Rechazar", from: ["pending", "review"], need: true, cls: "btn-danger", done: "Evidencia rechazada y la persona fue avisada." },
  { key: "suspend", label: "Suspender", from: ["approved"], need: true, cls: "btn-danger", done: "Acreditación suspendida. Se desactivaron sus ofertas de esta habilidad." },
];

const fmtDT = (s) => {
  const d = s ? new Date(String(s).replace(" ", "T")) : null;
  return d && !isNaN(d) ? d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
};

function safeLinks(s) {
  return String(s || "").split(/[\s,]+/).filter(Boolean).filter((u) => {
    try { const p = new URL(u).protocol; return p === "http:" || p === "https:"; } catch { return false; }
  });
}

// Los archivos son privados: el servidor entrega enlaces temporales solo al personal y al dueño.
function FileButtons({ files }) {
  const toast = useToast();
  if (!files?.length) return <p className="text-sm">Sin archivos adjuntos.</p>;
  const videos = files.filter((f) => f.kind === "video");
  const rest = files.filter((f) => f.kind !== "video");
  const open = (f) => { if (!f.url) return toast("No se pudo abrir el archivo. Vuelve a cargar la página.", "error"); const w = window.open(f.url, "_blank", "noopener,noreferrer"); if (!w) window.location.assign(f.url); };
  return (
    <div className="space-y-3">
      {videos.map((f, i) => (
        <figure key={"v" + i} className="rounded-xl border border-line bg-white p-2">
          {f.url ? <video controls preload="metadata" src={f.url} className="max-h-96 w-full rounded-lg bg-ink" /> : <p className="text-sm">Video no disponible.</p>}
          <figcaption className="mt-1 text-sm"><strong>Video demostrativo:</strong> {f.name}</figcaption>
        </figure>
      ))}
      {rest.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {rest.map((f, i) => (
            <li key={"f" + i}>
              <button type="button" className="btn btn-ghost btn-sm max-w-full" onClick={() => open(f)}>
                <Paperclip size={16} aria-hidden="true" /><span className="truncate">{f.kind === "certificate" ? "Certificado: " : ""}{f.name}</span><span className="sr-only"> (se abre en una pestaña nueva)</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(!videos.length || !rest.some((f) => f.kind === "certificate")) && <Alert kind="warn">Falta {!videos.length ? "el video demostrativo" : ""}{!videos.length && !rest.some((f) => f.kind === "certificate") ? " y " : ""}{!rest.some((f) => f.kind === "certificate") ? "el certificado" : ""}. No se puede aprobar sin ambos: solicita una corrección.</Alert>}
    </div>
  );
}

function ReviewPanel({ a, onDone }) {
  const toast = useToast();
  const [feedback, setFeedback] = useState("");
  const [notes, setNotes] = useState("");
  const [fbErr, setFbErr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const { me } = useAuth();
  const mine = a.member === me?.id;
  const available = ACTIONS.filter((x) => x.from.includes(a.status));

  async function run(x) {
    setError(""); setFbErr("");
    if (x.need && feedback.trim().length < 5) { setFbErr("Escribe el motivo para la persona (mínimo 5 caracteres)."); document.getElementById("ac-feedback")?.focus(); return; }
    if (x.key === "suspend" && !window.confirm("Al suspender esta acreditación se desactivarán las ofertas de esta habilidad. ¿Continuar?")) return;
    setBusy(x.key);
    try {
      await api(`/admin/accred/${a.id}/review`, { method: "POST", body: { action: x.key, feedback: feedback.trim(), notes: notes.trim() } });
      toast(x.done); setFeedback(""); setNotes(""); onDone();
    } catch (err) { setError(err.message); toast(err.message, "error"); } finally { setBusy(""); }
  }

  if (mine) return <Alert kind="warn">Esta es tu propia evidencia, así que no puedes revisarla. Debe hacerlo otra persona del equipo.</Alert>;
  if (!available.length) return <p className="text-sm">No hay acciones disponibles con el estado actual.</p>;
  return (
    <div className="space-y-4">
      <Field label="Mensaje para la persona" hint="La persona lo verá. Obligatorio al rechazar, solicitar corrección o suspender." error={fbErr} id="ac-feedback">
        {(p) => <textarea {...p} className="input" rows={3} maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />}
      </Field>
      <Field label="Nota interna" hint="Solo la ve el personal.">
        {(p) => <textarea {...p} className="input" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      {error && <Alert kind="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        {available.map((x) => <button key={x.key} type="button" className={`btn ${x.cls}`} disabled={!!busy} onClick={() => run(x)}>{busy === x.key ? "Guardando…" : x.label}</button>)}
      </div>
    </div>
  );
}

function Detail({ a, onBack, onDone }) {
  const st = ST[a.status] || [a.status_label || a.status, ""];
  const links = safeLinks(a.links);
  const history = [...(a.history || [])].reverse();
  return (
    <article className="card space-y-5" aria-labelledby="ac-title">
      <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Volver a la lista</button>
      <header>
        <div className="flex flex-wrap items-center gap-2"><span className={`chip ${st[1]}`}>{st[0]}</span><span className="chip">{KINDS[a.kind] || a.kind}</span></div>
        <h2 id="ac-title" className="mt-2 break-words text-2xl font-extrabold">{a.title}</h2>
        <p className="mt-1 text-sm">Persona: <strong>{a.member_name}</strong> · Habilidad: <strong>{a.skill_name}</strong>{a.category ? ` · ${a.category}` : ""}</p>
        <p className="text-sm">Enviada: {fmtDT(a.created)} · Última actualización: {fmtDT(a.updated)}{a.reviewed_by ? ` · Revisó: ${a.reviewed_by}` : ""}</p>
      </header>

      <section aria-labelledby="ac-desc"><h3 id="ac-desc" className="label">Descripción</h3><p className="whitespace-pre-wrap break-words rounded-xl bg-sand p-3">{a.description}</p></section>
      {a.member_notes && <section aria-labelledby="ac-mn"><h3 id="ac-mn" className="label">Observaciones de la persona</h3><p className="whitespace-pre-wrap break-words rounded-xl bg-sand p-3">{a.member_notes}</p></section>}
      <section aria-labelledby="ac-links">
        <h3 id="ac-links" className="label">Enlaces</h3>
        {links.length ? <ul className="space-y-1">{links.map((u) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-teal underline">{u}<span className="sr-only"> (se abre en una pestaña nueva)</span></a></li>)}</ul> : <p className="text-sm">Sin enlaces.</p>}
      </section>
      <section aria-labelledby="ac-files"><h3 id="ac-files" className="label">Evidencias: video y certificado</h3><FileButtons files={a.files} /></section>

      {(a.feedback || a.admin_notes) && (
        <section className="grid gap-3 sm:grid-cols-2" aria-label="Últimos mensajes de la revisión">
          {a.feedback && <div className="rounded-xl border border-line bg-white p-3 text-sm"><p className="font-bold">Último mensaje a la persona</p><p className="mt-1 whitespace-pre-wrap break-words">{a.feedback}</p></div>}
          {a.admin_notes && <div className="rounded-xl border border-[#efc877] bg-[#fdf3dc] p-3 text-sm"><p className="flex items-center gap-1 font-bold"><Lock size={14} aria-hidden="true" />Nota interna actual</p><p className="mt-1 whitespace-pre-wrap break-words">{a.admin_notes}</p></div>}
        </section>
      )}

      <section aria-labelledby="ac-review" className="rounded-2xl border border-line bg-paper p-4">
        <h3 id="ac-review" className="mb-3 text-lg font-bold">Revisión</h3>
        <ReviewPanel key={a.id + a.status} a={a} onDone={onDone} />
        <p className="mt-4 text-sm font-semibold">Esta revisión es interna de la comunidad; no es una certificación profesional ni oficial.</p>
      </section>

      <section aria-labelledby="ac-hist">
        <h3 id="ac-hist" className="mb-2 text-lg font-bold">Historial</h3>
        {history.length === 0 ? <p className="text-sm">Sin movimientos todavía.</p> : (
          <ol className="space-y-2">
            {history.map((h, i) => (
              <li key={i} className="rounded-xl border border-line bg-white p-3 text-sm">
                <p className="font-semibold">{h.action || "Movimiento"}</p>
                <p>{fmtDT(h.at)}{h.by ? ` · ${h.by}` : ""}</p>
                {h.note && <p className="mt-1 whitespace-pre-wrap break-words"><strong>Mensaje para la persona:</strong> {h.note}</p>}
                {h.internal && <p className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-[#efc877] bg-[#fdf3dc] p-2"><strong>Nota interna:</strong> {h.internal}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}

export default function AdminAccreditations() {
  const { data, loading, error, reload } = useApi("/admin/accred");
  const [status, setStatus] = useState("pending");
  const [sel, setSel] = useState(null);
  const items = data?.items || [];
  const counts = useMemo(() => { const c = { "": items.length }; items.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1; }); return c; }, [items]);
  const shown = useMemo(() => items.filter((a) => !status || a.status === status), [items, status]);
  const current = items.find((a) => a.id === sel) || null;
  const pending = counts.pending || 0;

  return (
    <>
      <PageHeader title="Verificación de habilidades" subtitle={`Solicitudes con video demostrativo y certificado. Al aprobar, la habilidad muestra la insignia de verificada. ${pending === 0 ? "No hay evidencias pendientes." : pending === 1 ? "Hay 1 evidencia pendiente de revisar." : `Hay ${pending} evidencias pendientes de revisar.`}`} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {FILTERS.map(([v, l]) => (
          <button key={v || "all"} type="button" aria-pressed={status === v} className={`btn btn-sm ${status === v ? "btn-dark" : "btn-ghost"}`} onClick={() => { setStatus(v); setSel(null); }}>
            {l} <span className="num">({counts[v] || 0})</span>
          </button>
        ))}
      </div>
      {error ? <Alert kind="error">No se pudieron cargar las acreditaciones: {error} <button type="button" className="font-bold underline" onClick={reload}>Reintentar</button></Alert>
        : loading && !data ? <Spinner />
        : (
          <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
            <div className={current ? "hidden lg:block" : ""}>
              {shown.length === 0 ? (
                <Empty icon={Award} title={status ? "No hay evidencias con este estado" : "Aún no hay evidencias"}>{status === "pending" ? "Todo al día: no hay evidencias esperando revisión." : "Cuando alguien envíe una evidencia aparecerá aquí."}</Empty>
              ) : (
                <ul className="space-y-2">
                  {shown.map((a) => {
                    const st = ST[a.status] || [a.status, ""];
                    return (
                      <li key={a.id}>
                        <button type="button" aria-current={sel === a.id ? "true" : undefined} onClick={() => setSel(a.id)} className={`card block min-h-11 w-full text-left transition ${sel === a.id ? "border-ink ring-2 ring-amber" : "hover:border-ink"}`}>
                          <span className="flex flex-wrap items-center gap-2"><span className={`chip ${st[1]}`}>{st[0]}</span><span className="text-xs">{fmtDT(a.updated)}</span></span>
                          <span className="mt-1 block break-words font-bold">{a.skill_name}</span>
                          <span className="block break-words text-sm">{a.member_name} · {KINDS[a.kind] || a.kind}</span>
                          <span className="block break-words text-sm">{a.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className={current ? "" : "hidden lg:block"}>
              {current ? <Detail a={current} onBack={() => setSel(null)} onDone={reload} /> : <div className="card hidden text-center lg:block">Elige una evidencia de la lista para revisarla.</div>}
            </div>
          </div>
        )}
    </>
  );
}
