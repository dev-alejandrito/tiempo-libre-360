import { BadgeCheck, Plus, Send, ShieldCheck, Pencil, RotateCw } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Empty, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { FileLinks, FilePicker, SinglePicker, checkFiles, checkSingle } from "../../components/Attachments";
import { uploadPrivate } from "../../lib/storage";
import { useAuth } from "../../lib/auth";
import { useApi, useList } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { CATEGORIES, fmtDateTime } from "../../lib/util";

const KINDS = { certificate: "Certificado", article: "Artículo", publication: "Publicación", project: "Proyecto", portfolio: "Portafolio", demo: "Demostración práctica" };
const ST = {
  none: ["Sin evidencia", "chip"],
  pending: ["Pendiente", "chip-warn"],
  review: ["En revisión", "chip-info"],
  correction: ["Requiere corrección", "chip-warn"],
  approved: ["Aprobada", "chip-ok"],
  rejected: ["Rechazada", "chip-bad"],
  suspended: ["Suspendida", "chip-bad"],
};
const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const STATUS_HELP = {
  pending: "Tu evidencia llegó al equipo y espera turno de revisión.",
  review: "Alguien del equipo la está revisando ahora.",
  correction: "Te pedimos algunos ajustes. Corrige y vuelve a enviarla.",
  approved: "Habilidad verificada: ya muestra la insignia y puedes ofrecerla como instructor.",
  rejected: "No pudimos aprobarla. Puedes presentar otra evidencia.",
  suspended: "Tu acreditación está en pausa; tus ofertas de esta habilidad se desactivaron.",
};

export function StatusChip({ status }) {
  const [label, cls] = ST[status] || [status, "chip"];
  return <span className={`chip ${cls}`}>{label}</span>;
}

function EvidenceForm({ initial, prefill, skills, onClose, onSaved }) {
  const toast = useToast();
  const listId = useId();
  const resub = !!initial;
  const [f, setF] = useState(() => ({
    skill_name: initial?.skill_name || prefill?.skill_name || "",
    category: initial?.category || prefill?.category || CATEGORIES[0],
    kind: initial?.kind || "",
    title: initial?.title || "",
    description: initial?.description || "",
    links: initial?.links || "",
    member_notes: initial?.member_notes || "",
  }));
  const [files, setFiles] = useState([]);
  const [video, setVideo] = useState(null);
  const [cert, setCert] = useState(null);
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const prevFiles = initial?.files || [];
  const prevVideo = prevFiles.find((x) => x.kind === "video");
  const prevCert = prevFiles.find((x) => x.kind === "certificate");
  const existing = prevFiles.filter((x) => x.kind !== "video" && x.kind !== "certificate").length;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  function onSkill(e) {
    const v = e.target.value;
    const hit = skills.find((s) => norm(s.name) === norm(v));
    setF({ ...f, skill_name: v, category: hit && CATEGORIES.includes(hit.category) ? hit.category : f.category });
  }
  function validate() {
    const e = {};
    const links = f.links.split(/[\s,]+/).filter(Boolean);
    if (f.skill_name.trim().length < 2) e.skill_name = "Escribe la habilidad que quieres acreditar.";
    if (!KINDS[f.kind]) e.kind = "Elige el tipo de evidencia.";
    if (f.title.trim().length < 3) e.title = "Escribe un título de al menos 3 caracteres.";
    if (f.description.trim().length < 10) e.description = "Describe tu evidencia (mínimo 10 caracteres).";
    if (links.length > 5) e.links = "Puedes añadir hasta 5 enlaces.";
    else if (links.some((u) => !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(u))) e.links = "Cada enlace debe empezar con http:// o https://.";
    const fe = checkFiles(files, existing);
    if (fe) e.files = fe;
    if (!video && !prevVideo) e.video = "Adjunta un video demostrativo: es obligatorio.";
    else if (video) { const m = checkSingle(video, "video"); if (m) e.video = m; }
    if (!cert && !prevCert) e.cert = "Adjunta un certificado: es obligatorio.";
    else if (cert) { const m = checkSingle(cert, "certificate"); if (m) e.cert = m; }
    return e;
  }
  async function submit(ev) {
    ev.preventDefault(); setError("");
    const e = validate(); setErrs(e);
    if (Object.keys(e).length) return;
    try {
      // Los archivos se suben a tu carpeta privada; solo tú y el equipo de revisión pueden verlos.
      const uploaded = [];
      if (video) { setBusy("Subiendo video…"); uploaded.push(await uploadPrivate(video, "accreditations", "video")); }
      if (cert) { setBusy("Subiendo certificado…"); uploaded.push(await uploadPrivate(cert, "accreditations", "certificate")); }
      for (const x of files) { setBusy("Subiendo archivos…"); uploaded.push(await uploadPrivate(x, "accreditations", "other")); }
      setBusy("Enviando…");
      const body = { ...f, skill_name: f.skill_name.trim(), title: f.title.trim(), links: f.links.split(/[\s,]+/).filter(Boolean).join("\n"), files: uploaded };
      const r = await api(resub ? `/accred/${initial.id}/resubmit` : "/accred", { method: "POST", body });
      toast(resub ? "Corrección enviada. Volverá a revisión." : r?.duplicate ? "Ya habías enviado esta evidencia; sigue en revisión." : "Evidencia enviada. Te avisaremos cuando la revisemos.");
      onSaved(); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(""); }
  }
  return (
    <Modal title={resub ? `Corregir evidencia: ${initial.skill_name}` : "Solicitar verificación de habilidad"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {resub && initial.feedback && <Alert kind="warn"><strong>Observaciones de la revisión:</strong> <span className="whitespace-pre-wrap break-words">{initial.feedback}</span></Alert>}
        <Alert kind="info">Para verificar una habilidad necesitas <strong>un video demostrativo y un certificado</strong>. El equipo de administración los revisa y, solo si los aprueba, tu habilidad mostrará la insignia de <strong>verificada</strong>. Esta revisión es interna de la comunidad; <strong>no es una certificación profesional ni oficial</strong>.</Alert>
        <Field label="Habilidad que quieres acreditar" error={errs.skill_name} hint={resub ? "La habilidad no cambia al corregir." : "Elige una de tus habilidades o escribe otra."}>
          {(p) => <><input {...p} className="input" list={listId} maxLength={80} value={f.skill_name} onChange={onSkill} readOnly={resub} autoComplete="off" /><datalist id={listId}>{skills.map((s) => <option key={s.name} value={s.name} />)}</datalist></>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoría">{(p) => <select {...p} className="input" value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
          <Field label="Tipo de evidencia" error={errs.kind}>{(p) => <select {...p} className="input" value={f.kind} onChange={set("kind")}><option value="">Elige un tipo…</option>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
        </div>
        <Field label="Título" error={errs.title} hint="Por ejemplo: «Diploma de inglés B2» o «Mi portafolio de ilustración».">{(p) => <input {...p} className="input" maxLength={120} value={f.title} onChange={set("title")} />}</Field>
        <Field label="Descripción" error={errs.description} hint="Cuéntanos qué demuestra esta evidencia. Mínimo 10 caracteres.">{(p) => <textarea {...p} className="input" rows={4} maxLength={2000} value={f.description} onChange={set("description")} />}</Field>
        <div className="grid gap-3 md:grid-cols-2">
          <SinglePicker kind="video" file={video} onChange={setVideo} error={errs.video} label="Video demostrativo (obligatorio)" hint="MP4, WEBM o MOV · máximo 100 MB. Muestra cómo realizas la habilidad." current={prevVideo?.name} />
          <SinglePicker kind="certificate" file={cert} onChange={setCert} error={errs.cert} label="Certificado (obligatorio)" hint="PDF, JPG, PNG o WEBP · máximo 10 MB. Diploma, constancia o documento que respalde tu habilidad." current={prevCert?.name} />
        </div>
        <Field label="Enlaces (opcional, uno por línea, máximo 5)" error={errs.links} hint="Portafolio, publicaciones o trabajos. Deben empezar con http:// o https://.">{(p) => <textarea {...p} className="input" rows={3} maxLength={1000} value={f.links} onChange={set("links")} placeholder="https://" />}</Field>
        <Field label="Observaciones para quien revisa (opcional)">{(p) => <textarea {...p} className="input" rows={2} maxLength={1000} value={f.member_notes} onChange={set("member_notes")} />}</Field>
        {resub && prevFiles.length > 0 && <div><p className="label">Archivos ya enviados</p><FileLinks files={initial.files} /></div>}
        <FilePicker files={files} onChange={setFiles} existing={existing} error={errs.files} label="Archivos adicionales (opcional)" />
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!!busy}><Send size={16} aria-hidden="true" />{busy || (resub ? "Reenviar corrección" : "Solicitar verificación")}</button>
        </div>
      </form>
    </Modal>
  );
}

function EvidenceCard({ a, onResubmit }) {
  const links = (a.links || "").split("\n").filter(Boolean);
  const hist = (a.history || []).slice().reverse();
  return (
    <li className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-bold">{a.skill_name}</h3>
          <p className="break-words text-sm text-[#3c3829]">{KINDS[a.kind] || a.kind} · {a.title}</p>
        </div>
        <StatusChip status={a.status} />
      </div>
      <p className="text-sm">{STATUS_HELP[a.status]}</p>
      {a.feedback && <div className="rounded-xl border border-[#efc877] bg-[#fdf3dc] p-3 text-sm"><p className="font-bold">Observaciones de la revisión</p><p className="mt-1 whitespace-pre-wrap break-words">{a.feedback}</p></div>}
      <p className="whitespace-pre-wrap break-words text-[#3c3829]">{a.description}</p>
      {links.length > 0 && <ul className="space-y-1 text-sm">{links.map((u) => <li key={u} className="break-all"><a href={u} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-teal underline">{u}<span className="sr-only"> (se abre en una pestaña nueva)</span></a></li>)}</ul>}
      <FileLinks files={a.files} />
      {a.member_notes && <p className="text-sm"><strong>Tus observaciones:</strong> <span className="whitespace-pre-wrap break-words">{a.member_notes}</span></p>}
      <p className="text-xs text-[#4b4638]">Enviada: {fmtDateTime(a.created)}{a.reviewed_at ? ` · Última revisión: ${fmtDateTime(a.reviewed_at)}` : ""}</p>
      {hist.length > 0 && (
        <details className="rounded-xl bg-sand px-3 py-2 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Historial ({hist.length})</summary>
          <ol className="mt-1 space-y-2 border-l-2 border-line pl-3">
            {hist.map((h, i) => <li key={i}><strong>{h.action}</strong> · <span className="text-[#4b4638]">{fmtDateTime(h.at)}</span>{h.note && <p className="whitespace-pre-wrap break-words">{h.note}</p>}</li>)}
          </ol>
        </details>
      )}
      {a.status === "correction" && <div><button type="button" className="btn btn-primary btn-sm" onClick={() => onResubmit(a)}><Pencil size={15} aria-hidden="true" />Corregir y reenviar<span className="sr-only"> {a.skill_name}</span></button></div>}
    </li>
  );
}

export default function Accreditations() {
  const { me } = useAuth();
  const { data, loading, error, reload } = useApi("/accred");
  const mine = useList("skills", { filter: `owner = "${me.id}" && kind = "offer"`, sort: "-created" });
  const [form, setForm] = useState(null); // {initial?, prefill?}
  const items = data?.items || [];
  const approved = useMemo(() => {
    const seen = new Set(); const out = [];
    (data?.approved || []).forEach((n) => { if (!seen.has(norm(n))) { seen.add(norm(n)); out.push(n); } });
    return out;
  }, [data]);
  const skills = useMemo(() => {
    const m = new Map();
    mine.items.forEach((s) => m.set(norm(s.name), { name: s.name, category: s.category }));
    items.forEach((a) => { if (!m.has(norm(a.skill_name))) m.set(norm(a.skill_name), { name: a.skill_name, category: a.category }); });
    return [...m.values()];
  }, [mine.items, items]);
  const noEvidence = mine.items.filter((s) => !items.some((a) => norm(a.skill_name) === norm(s.name))).filter((s, i, arr) => arr.findIndex((x) => norm(x.name) === norm(s.name)) === i);
  const open = (o) => setForm(o);

  return (
    <>
      <PageHeader title="Verificación de habilidades" subtitle="Solicita la verificación de lo que sabes hacer con un video demostrativo y un certificado. Cuando la administración la aprueba, tu habilidad muestra la insignia de verificada y puedes ofrecerla como instructor.">
        <button type="button" className="btn btn-primary" onClick={() => open({})}><Plus size={18} aria-hidden="true" />Solicitar verificación</button>
      </PageHeader>
      <div className="mb-6"><Alert kind="info">Esta revisión es interna de la comunidad; <strong>NO es una certificación profesional ni oficial</strong>. Para aprender no necesitas acreditación. Tu perfil solo muestra las acreditaciones aprobadas.</Alert></div>
      {loading && !data ? <Spinner /> : error ? (
        <Alert kind="error">No pudimos cargar tus acreditaciones: {error} <button type="button" className="inline-flex min-h-11 items-center gap-1 font-bold underline" onClick={reload}><RotateCw size={14} aria-hidden="true" />Reintentar</button></Alert>
      ) : (
        <>
          <section className="card-dark dark-surface mb-8" aria-labelledby="ya-ofreces">
            <h2 id="ya-ofreces" className="flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck size={24} className="text-amber" aria-hidden="true" />Habilidades verificadas</h2>
            {approved.length === 0 ? <p className="mt-2 text-[#d5deec]">Todavía no tienes ninguna aprobada. Presenta tu primera evidencia y la revisamos.</p> : (
              <>
                <ul className="mt-3 flex flex-wrap gap-2">{approved.map((n) => <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1 text-sm font-bold text-ink"><BadgeCheck size={15} aria-hidden="true" />{n}</li>)}</ul>
                <p className="mt-3 text-sm text-[#d5deec]">Ofrécelas en <Link to="/app/mis-habilidades" className="font-bold text-amber underline">Mis habilidades</Link> o como <Link to="/app/clases-particulares" className="font-bold text-amber underline">clase particular</Link>.</p>
              </>
            )}
          </section>

          {noEvidence.length > 0 && (
            <section className="mb-8" aria-labelledby="sin-ev">
              <h2 id="sin-ev" className="mb-3 text-2xl font-extrabold">Habilidades sin evidencia</h2>
              <ul className="grid gap-3 md:grid-cols-2">{noEvidence.map((s) => (
                <li key={s.id} className="card flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0"><p className="break-words font-bold">{s.name}</p><StatusChip status="none" /></div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => open({ prefill: { skill_name: s.name, category: s.category } })}>Presentar evidencia<span className="sr-only"> de {s.name}</span></button>
                </li>))}</ul>
            </section>
          )}

          <section aria-labelledby="mis-ev">
            <h2 id="mis-ev" className="mb-3 text-2xl font-extrabold">Mis evidencias <span className="num text-base text-[#4b4638]">({items.length})</span></h2>
            {items.length === 0 ? (
              <Empty icon={BadgeCheck} title="Aún no has solicitado verificaciones" action={<button type="button" className="btn btn-primary" onClick={() => open({})}>Solicitar mi primera verificación</button>}>Necesitas un video donde muestres tu habilidad y un certificado que la respalde.</Empty>
            ) : <ul className="grid gap-4 lg:grid-cols-2">{items.map((a) => <EvidenceCard key={a.id} a={a} onResubmit={(x) => open({ initial: x })} />)}</ul>}
          </section>
        </>
      )}
      {form && <EvidenceForm initial={form.initial} prefill={form.prefill} skills={skills} onClose={() => setForm(null)} onSaved={reload} />}
    </>
  );
}
