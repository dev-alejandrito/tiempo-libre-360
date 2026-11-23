import { Plus, Pencil, Trash2 as Trash, Sparkles, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Empty, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useList } from "../../lib/hooks";
import { errMsg, pb } from "../../lib/pb";
import { CATEGORIES, DURATIONS, LEVELS, MODES, SUGGESTIONS } from "../../lib/util";

function SkillForm({ kind, initial, onClose, onSaved }) {
  const { me } = useAuth();
  const toast = useToast();
  const [f, setF] = useState(initial || { name: "", category: CATEGORIES[0], description: "", level: "beginner", mode: "both", active: true, durations: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const body = { name: f.name, category: f.category, description: f.description, level: f.level, mode: f.mode, active: f.active };
      if (kind === "offer") body.durations = (f.durations || "").split(",").filter(Boolean).join(",");
      if (initial?.id) await pb.collection("skills").update(initial.id, body, { requestKey: null });
      else await pb.collection("skills").create({ ...body, owner: me.id, kind }, { requestKey: null });
      toast("Habilidad guardada."); onSaved(); onClose();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  const sugg = SUGGESTIONS[f.category] || [];
  return (
    <Modal title={initial?.id ? "Editar habilidad" : kind === "offer" ? "Ofrecer una habilidad" : "Quiero aprender"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Categoría">{(p) => <select {...p} className="input" value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
        <Field label="Nombre de la habilidad">{(p) => <input {...p} className="input" required minLength={2} maxLength={80} value={f.name} onChange={set("name")} />}</Field>
        {sugg.length > 0 && !f.name && <div className="flex flex-wrap gap-2" aria-label="Sugerencias">{sugg.map((s) => <button key={s} type="button" className="chip hover:bg-amber" onClick={() => setF({ ...f, name: s })}>{s}</button>)}</div>}
        {kind === "offer" && (() => { const sel = (f.durations || "").split(",").filter(Boolean).map(Number); const toggle = (m) => { const n = sel.includes(m) ? sel.filter((x) => x !== m) : [...sel, m]; setF({ ...f, durations: DURATIONS.filter((d) => n.includes(d)).join(",") }); };
          return <fieldset><legend className="font-bold">Duraciones que ofreces</legend><p className="hint">Elige las duraciones de clase que aceptas (1 minuto = 1 crédito). Si no marcas ninguna, se ofrecen todas.</p>
            <div className="mt-2 flex flex-wrap gap-2">{DURATIONS.map((m) => <label key={m} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold"><input type="checkbox" checked={sel.includes(m)} onChange={() => toggle(m)} />{m} min</label>)}</div></fieldset>; })()}
        {kind === "offer" && <Alert kind="info">Para ofrecer una habilidad como instructor necesitas una acreditación aprobada. <Link to="/app/acreditaciones" className="font-bold underline">Ir a Mis acreditaciones</Link></Alert>}
        <Field label="Descripción" hint={kind === "offer" ? "Cuenta qué puedes enseñar y cómo sueles hacerlo." : "Cuenta qué te gustaría lograr."}>{(p) => <textarea {...p} className="input" rows={3} maxLength={500} value={f.description} onChange={set("description")} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={kind === "offer" ? "Tu nivel" : "Tu nivel actual"}>{(p) => <select {...p} className="input" value={f.level} onChange={set("level")}>{Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
          <Field label="Modalidad">{(p) => <select {...p} className="input" value={f.mode} onChange={set("mode")}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
        </div>
        <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Activa (visible para coincidencias y búsquedas)</label>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button></div>
      </form>
    </Modal>
  );
}

export default function MySkills({ kind }) {
  const { me } = useAuth();
  const toast = useToast();
  const { items, loading, reload } = useList("skills", { filter: `owner = "${me.id}" && kind = "${kind}"`, sort: "-created" });
  const [edit, setEdit] = useState(null);
  const offer = kind === "offer";
  async function remove(s) {
    if (!window.confirm(`¿Eliminar «${s.name}»?`)) return;
    try { await pb.collection("skills").delete(s.id, { requestKey: null }); toast("Habilidad eliminada."); reload(); } catch (err) { toast(errMsg(err), "error"); }
  }
  async function toggle(s) {
    try { await pb.collection("skills").update(s.id, { active: !s.active }, { requestKey: null }); reload(); } catch (err) { toast(errMsg(err), "error"); }
  }
  return (
    <>
      <PageHeader title={offer ? "Mis habilidades" : "Habilidades que quiero aprender"} subtitle={offer ? "Lo que puedes enseñar o ayudar a hacer. Cada minuto que compartas suma un crédito." : "Lo que te gustaría aprender. Con esto buscamos a las personas ideales para ti."}>
        <button type="button" className="btn btn-primary" onClick={() => setEdit({})}><Plus size={18} aria-hidden="true" />{offer ? "Añadir habilidad" : "Añadir interés"}</button>
      </PageHeader>
      {loading ? <Spinner /> : items.length === 0 ? (
        <Empty icon={offer ? Sparkles : GraduationCap} title={offer ? "Todavía no ofreces nada" : "Aún no has añadido intereses"} action={<button type="button" className="btn btn-primary" onClick={() => setEdit({})}>Añadir ahora</button>}>
          {offer ? "Todos sabemos algo que otros quieren aprender. No necesitas certificados." : "Añade lo que quieres aprender para recibir coincidencias."}
        </Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((s) => (
            <li key={s.id} className="card flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2"><h2 className="text-xl font-bold">{s.name}</h2>{s.hidden ? <span className="chip chip-bad">Oculta por moderación</span> : s.active ? <span className="chip chip-ok">Activa</span> : <span className="chip">Pausada</span>}</div>
              <div className="flex flex-wrap gap-1.5"><span className="chip">{s.category}</span><span className="chip chip-info">{LEVELS[s.level]}</span><span className="chip">{MODES[s.mode]}</span></div>
              {s.description && <p className="text-[#3c3829]">{s.description}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(s)}><Pencil size={15} aria-hidden="true" />Editar<span className="sr-only"> {s.name}</span></button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(s)}>{s.active ? "Pausar" : "Activar"}<span className="sr-only"> {s.name}</span></button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(s)}><Trash size={15} aria-hidden="true" />Eliminar<span className="sr-only"> {s.name}</span></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {edit && <SkillForm kind={kind} initial={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
