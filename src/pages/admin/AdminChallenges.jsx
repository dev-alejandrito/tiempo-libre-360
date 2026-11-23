import { Plus } from "lucide-react";
import { useState } from "react";

import { Alert, Field, Modal, PageHeader, Spinner, useToast } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { api, errMsg, pb } from "../../lib/pb";

const KINDS = { exchanges_completed: "Intercambios completados", minutes_taught: "Minutos enseñados", minutes_learned: "Minutos aprendidos", skills_added: "Habilidades registradas", ratings_received: "Valoraciones recibidas" };

function Form({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(initial || { title: "", description: "", kind: "exchanges_completed", target: 1, reward: 1, badge: "", active: true });
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setError("");
    const body = { title: f.title, description: f.description, kind: f.kind, target: Number(f.target), reward: Number(f.reward), badge: f.badge, active: f.active };
    try { if (initial?.id) await pb.collection("challenges").update(initial.id, body, { requestKey: null }); else await pb.collection("challenges").create(body, { requestKey: null }); toast("Reto guardado."); onSaved(); onClose(); } catch (err) { setError(errMsg(err)); }
  }
  return (
    <Modal title={initial?.id ? "Editar reto" : "Nuevo reto"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Título">{(p) => <input {...p} className="input" required value={f.title} onChange={set("title")} />}</Field>
        <Field label="Descripción">{(p) => <textarea {...p} className="input" rows={2} value={f.description} onChange={set("description")} />}</Field>
        <Field label="Qué se mide">{(p) => <select {...p} className="input" value={f.kind} onChange={set("kind")}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta" hint="Minutos si mides tiempo">{(p) => <input {...p} className="input" type="number" min={1} required value={f.target} onChange={set("target")} />}</Field>
          <Field label="Créditos de premio" hint="1 minuto = 1 crédito. 0 = solo insignia">{(p) => <input {...p} className="input" type="number" min={0} max={600} value={f.reward} onChange={set("reward")} />}</Field>
        </div>
        <Field label="Insignia (opcional)">{(p) => <input {...p} className="input" value={f.badge} onChange={set("badge")} />}</Field>
        <label className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Reto activo</label>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary">Guardar</button></div>
      </form>
    </Modal>
  );
}

export default function AdminChallenges() {
  const toast = useToast();
  const { items, loading, reload } = useList("challenges", { perPage: 100, sort: "target" });
  const [edit, setEdit] = useState(null);
  async function del(c) { if (!window.confirm(`¿Eliminar el reto «${c.title}»?`)) return; try { await pb.collection("challenges").delete(c.id, { requestKey: null }); reload(); } catch (e) { toast(errMsg(e), "error"); } }
  return (
    <>
      <PageHeader title="Retos comunitarios" subtitle="Crea metas con premio en créditos o insignias. Cada persona solo puede reclamar cada reto una vez.">
        <button type="button" className="btn btn-primary" onClick={() => setEdit({})}><Plus size={18} aria-hidden="true" />Nuevo reto</button>
      </PageHeader>
      {loading ? <Spinner /> : (
        <div className="table-wrap"><table className="tbl">
          <caption className="sr-only">Retos</caption>
          <thead><tr><th scope="col">Reto</th><th scope="col">Mide</th><th scope="col">Meta</th><th scope="col">Premio</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
          <tbody>{items.map((c) => (
            <tr key={c.id}><td><strong>{c.title}</strong><p className="text-sm">{c.description}</p></td><td>{KINDS[c.kind]}</td><td className="num">{c.target}</td><td>{c.reward > 0 ? `${c.reward} cr.` : ""} {c.badge && <span className="chip chip-warn">{c.badge}</span>}</td><td>{c.active ? <span className="chip chip-ok">Activo</span> : <span className="chip">Inactivo</span>}</td>
              <td><div className="flex gap-1.5"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(c)}>Editar<span className="sr-only"> {c.title}</span></button><button type="button" className="btn btn-danger btn-sm" onClick={() => del(c)}>Eliminar<span className="sr-only"> {c.title}</span></button></div></td></tr>))}</tbody>
        </table></div>
      )}
      {edit && <Form initial={edit.id ? edit : null} onClose={() => setEdit(null)} onSaved={reload} />}
    </>
  );
}
