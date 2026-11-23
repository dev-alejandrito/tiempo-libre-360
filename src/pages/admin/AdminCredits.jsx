import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Alert, PageHeader, Pagination, Spinner } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { fmtDateTime } from "../../lib/util";

const TYPES = { bonus: "Bienvenida", reserve: "Reserva", refund: "Devolución", payment: "Pago", earning: "Cobro", adjustment: "Ajuste", reward: "Reto" };

export default function AdminCredits() {
  const [page, setPage] = useState(1);
  const [rec, setRec] = useState(null);
  const [busy, setBusy] = useState(false);
  const { items, total, loading } = useList("credit_ledger", { page, perPage: 20, expand: "member,actor", sort: "-created" });
  async function check() {
    setBusy(true);
    try { setRec(await api("/admin/reconcile")); } catch (e) { setRec({ error: e.message }); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader title="Créditos" subtitle="Libro de movimientos de toda la comunidad. Nada se puede editar ni borrar; los ajustes se hacen desde Usuarios.">
        <button type="button" className="btn btn-dark btn-sm" onClick={check} disabled={busy}><ShieldCheck size={16} aria-hidden="true" />{busy ? "Verificando…" : "Verificar integridad de saldos"}</button>
      </PageHeader>
      {rec && (rec.error ? <Alert kind="error">{rec.error}</Alert> : rec.ok ? <div className="mb-4"><Alert kind="ok">Todo en orden: {rec.wallets} carteras y {rec.movements} movimientos coinciden exactamente.</Alert></div> : <div className="mb-4"><Alert kind="error">{rec.issues.length} cartera(s) no coinciden con su historial. Revisa: {rec.issues.map((i) => i.member).join(", ")}</Alert></div>)}
      {loading && !items.length ? <Spinner /> : (
        <>
          <div className="table-wrap"><table className="tbl">
            <caption className="sr-only">Movimientos</caption>
            <thead><tr><th scope="col">Fecha</th><th scope="col">Persona</th><th scope="col">Tipo</th><th scope="col">Detalle</th><th scope="col" className="text-right">Disp.</th><th scope="col" className="text-right">Res.</th><th scope="col">Hecho por</th></tr></thead>
            <tbody>{items.map((m) => (
              <tr key={m.id}><td className="whitespace-nowrap">{fmtDateTime(m.created)}</td><td>{m.expand?.member?.name}</td><td><span className="chip">{TYPES[m.type]}</span></td><td>{m.note}</td>
                <td className={`num text-right font-bold ${m.avail_delta > 0 ? "text-ok" : m.avail_delta < 0 ? "text-danger" : ""}`}>{m.avail_delta > 0 ? "+" : ""}{m.avail_delta}</td><td className="num text-right">{m.reserved_delta > 0 ? "+" : ""}{m.reserved_delta}</td><td>{m.expand?.actor?.name || "Sistema"}</td></tr>))}</tbody>
          </table></div>
          <Pagination page={page} total={total} perPage={20} onPage={setPage} />
        </>
      )}
    </>
  );
}
