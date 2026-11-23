import { useState } from "react";
import { PageHeader, Pagination, Spinner, useToast } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { LEVELS, MODES } from "../../lib/util";

export default function AdminSkills() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const parts = [kind && `kind = "${kind}"`, q && `(name ~ "${q.replace(/"/g, "")}" || category ~ "${q.replace(/"/g, "")}")`].filter(Boolean).join(" && ");
  const { items, total, loading, reload } = useList("skills", { page, perPage: 20, filter: parts, expand: "owner", sort: "-created" });
  async function hide(s, hidden) {
    try { await api(`/admin/skill/${s.id}/hide`, { method: "POST", body: { hidden } }); toast(hidden ? "Habilidad oculta." : "Habilidad visible de nuevo."); reload(); } catch (e) { toast(e.message, "error"); }
  }
  return (
    <>
      <PageHeader title="Habilidades" subtitle="Revisa lo que se ofrece y se busca. Oculta contenido que incumpla las normas." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <div><label htmlFor="sq" className="label">Buscar</label><input id="sq" className="input" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
        <div><label htmlFor="sk" className="label">Tipo</label><select id="sk" className="input" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">Todas</option><option value="offer">Ofrecidas</option><option value="want">Buscadas</option></select></div>
      </div>
      {loading && !items.length ? <Spinner /> : (
        <>
          <div className="table-wrap"><table className="tbl">
            <caption className="sr-only">Habilidades</caption>
            <thead><tr><th scope="col">Habilidad</th><th scope="col">Persona</th><th scope="col">Tipo</th><th scope="col">Nivel / modalidad</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
            <tbody>{items.map((s) => (
              <tr key={s.id}><td><strong>{s.name}</strong><br /><span className="text-sm">{s.category}</span>{s.description && <p className="max-w-xs text-sm">{s.description}</p>}</td><td>{s.expand?.owner?.name || "—"}</td><td>{s.kind === "offer" ? "Ofrece" : "Quiere aprender"}</td><td>{LEVELS[s.level]}<br />{MODES[s.mode]}</td>
                <td>{s.hidden ? <span className="chip chip-bad">Oculta</span> : s.active ? <span className="chip chip-ok">Visible</span> : <span className="chip">Pausada</span>}</td>
                <td><button type="button" className={`btn btn-sm ${s.hidden ? "btn-ghost" : "btn-danger"}`} onClick={() => hide(s, !s.hidden)}>{s.hidden ? "Mostrar" : "Ocultar"}<span className="sr-only"> {s.name}</span></button></td></tr>))}</tbody>
          </table></div>
          <Pagination page={page} total={total} perPage={20} onPage={setPage} />
        </>
      )}
    </>
  );
}
