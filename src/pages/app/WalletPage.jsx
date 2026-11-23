import { Wallet, Lock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { Alert, LineChart, PageHeader, Pagination, Spinner, Stat } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useList } from "../../lib/hooks";
import { fmtCredits, fmtDateTime } from "../../lib/util";

const TYPES = { bonus: "Bienvenida", reserve: "Reserva", refund: "Devolución", payment: "Pago de sesión", earning: "Sesión impartida", adjustment: "Ajuste", reward: "Reto completado" };

export default function WalletPage() {
  const { me } = useAuth();
  const [page, setPage] = useState(1);
  const w = useList("wallets", { filter: `member = "${me.id}"`, perPage: 1, sort: "" });
  const l = useList("credit_ledger", { filter: `member = "${me.id}"`, page, perPage: 15, sort: "-created" });
  const chart = useList("credit_ledger", { filter: `member = "${me.id}"`, perPage: 40, sort: "-created" });
  const wallet = w.items[0];
  if (w.loading && !wallet) return <Spinner />;
  const pts = [...chart.items].reverse().map((i) => ({ v: i.avail_after + i.reserved_after }));
  return (
    <>
      <PageHeader title="Cartera de créditos" subtitle="1 minuto de servicio = 1 crédito (60 minutos = 60 créditos). Todos los movimientos quedan registrados y no pueden modificarse." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat dark icon={Wallet} label="Disponible" value={fmtCredits(wallet?.available)} sub="Puedes usarlos ahora" />
        <Stat icon={Lock} label="Reservado" value={fmtCredits(wallet?.reserved)} sub="En solicitudes abiertas" />
        <Stat icon={ArrowDownLeft} label="Recibido" value={fmtCredits(wallet?.received)} sub="Total ganado" />
        <Stat icon={ArrowUpRight} label="Utilizado" value={fmtCredits(wallet?.used)} sub="Pagado en sesiones" />
      </div>
      {pts.length > 1 && <section className="card mt-6"><h2 className="mb-2 text-xl font-bold">Tus créditos en el tiempo</h2><LineChart points={pts} label="Evolución de tu saldo total" /></section>}
      <h2 className="mb-3 mt-8 text-2xl font-extrabold">Historial de movimientos</h2>
      {l.items.length === 0 ? <Alert kind="info">Aún no hay movimientos.</Alert> : (
        <>
          <div className="table-wrap"><table className="tbl">
            <caption className="sr-only">Movimientos de créditos</caption>
            <thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col">Detalle</th><th scope="col" className="text-right">Disponible</th><th scope="col" className="text-right">Reservado</th><th scope="col" className="text-right">Saldo disp.</th></tr></thead>
            <tbody>{l.items.map((m) => (
              <tr key={m.id}><td className="whitespace-nowrap">{fmtDateTime(m.created)}</td><td><span className="chip">{TYPES[m.type]}</span></td><td>{m.note}</td>
                <td className={`num text-right font-bold ${m.avail_delta > 0 ? "text-ok" : m.avail_delta < 0 ? "text-danger" : ""}`}>{m.avail_delta > 0 ? "+" : ""}{m.avail_delta}</td>
                <td className="num text-right">{m.reserved_delta > 0 ? "+" : ""}{m.reserved_delta}</td><td className="num text-right">{m.avail_after}</td></tr>))}</tbody>
          </table></div>
          <Pagination page={page} total={l.total} perPage={15} onPage={setPage} />
        </>
      )}
    </>
  );
}
