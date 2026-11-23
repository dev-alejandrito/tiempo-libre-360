import { useState } from "react";
import { PageHeader, Pagination, Spinner } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { fmtDateTime } from "../../lib/util";

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const { items, total, loading } = useList("audit_log", { page, perPage: 25, sort: "-created" });
  return (
    <>
      <PageHeader title="Auditoría" subtitle="Registro permanente de las acciones de moderación y administración. No se puede editar ni borrar." />
      {loading && !items.length ? <Spinner /> : (
        <>
          <div className="table-wrap"><table className="tbl">
            <caption className="sr-only">Registro de auditoría</caption>
            <thead><tr><th scope="col">Fecha</th><th scope="col">Quién</th><th scope="col">Acción</th><th scope="col">Objetivo</th><th scope="col">Detalle</th></tr></thead>
            <tbody>{items.map((a) => <tr key={a.id}><td className="whitespace-nowrap">{fmtDateTime(a.created)}</td><td>{a.actor_name}</td><td><span className="chip">{a.action}</span></td><td className="text-sm">{a.target}</td><td>{a.detail}</td></tr>)}</tbody>
          </table></div>
          <Pagination page={page} total={total} perPage={25} onPage={setPage} />
        </>
      )}
    </>
  );
}
