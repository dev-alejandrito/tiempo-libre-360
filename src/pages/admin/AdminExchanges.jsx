import { useState } from "react";
import { PageHeader, Pagination, Spinner } from "../../components/ui";
import { ResolveConflictModal } from "../../components/AdminBits";
import { useList } from "../../lib/hooks";
import { STATUS, fmtDateTime } from "../../lib/util";

export default function AdminExchanges() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [res, setRes] = useState(null);
  const { items, total, loading, reload } = useList("exchanges", { page, perPage: 20, filter: status ? `status = "${status}"` : "", expand: "requester,provider", sort: "-created" });
  return (
    <>
      <PageHeader title="Intercambios" subtitle="Seguimiento de todas las solicitudes y sesiones. Los conflictos se resuelven aquí." />
      <div className="mb-4 max-w-xs"><label htmlFor="es" className="label">Estado</label><select id="es" className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
      {loading && !items.length ? <Spinner /> : (
        <>
          <div className="table-wrap"><table className="tbl">
            <caption className="sr-only">Intercambios</caption>
            <thead><tr><th scope="col">Habilidad</th><th scope="col">Aprende</th><th scope="col">Enseña</th><th scope="col">Minutos</th><th scope="col">Sesión</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
            <tbody>{items.map((x) => (
              <tr key={x.id}><td><strong>{x.skill_name}</strong></td><td>{x.expand?.requester?.name}</td><td>{x.expand?.provider?.name}</td><td className="num">{x.minutes}</td><td className="whitespace-nowrap">{fmtDateTime(x.scheduled_start || x.proposed_start)}</td>
                <td><span className={`chip ${STATUS[x.status].cls}`}>{STATUS[x.status].label}</span>{x.late_cancel && <span className="chip chip-warn ml-1">Tardía</span>}</td>
                <td>{x.status === "disputed" ? <button type="button" className="btn btn-dark btn-sm" onClick={() => setRes(x)}>Resolver</button> : "—"}</td></tr>))}</tbody>
          </table></div>
          <Pagination page={page} total={total} perPage={20} onPage={setPage} />
        </>
      )}
      {res && <ResolveConflictModal ex={res} onClose={() => setRes(null)} onDone={reload} />}
    </>
  );
}
