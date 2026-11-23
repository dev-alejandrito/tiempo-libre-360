import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "@/lib/router";

import { Alert, PageHeader, Spinner } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { fmtDateTime } from "../../lib/util";

const SEV = { high: ["Prioridad alta", "chip-bad"], medium: ["A revisar", "chip-warn"], low: ["Informativo", "chip-info"] };

export default function AdminActivity() {
  const { data, loading, error, reload } = useApi("/admin/suspicious");
  return (
    <>
      <PageHeader title="Actividad sospechosa" subtitle="Señales automáticas para la moderación: saldos que no cuadran, cancelaciones frecuentes, reportes repetidos y posibles intercambios de conveniencia. Son avisos para revisar, no sanciones.">
        <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>Actualizar</button>
      </PageHeader>
      {loading && !data ? <Spinner /> : error ? <Alert kind="error">{error}</Alert> : (
        <>
          <p className="mb-4 text-sm text-[#3c3829]">Revisado {fmtDateTime(data.checkedAt)} · {data.wallets} carteras y {data.movements} movimientos comprobados.</p>
          {data.flags.length === 0 ? (
            <div className="card flex items-center gap-3"><ShieldCheck size={28} aria-hidden="true" className="text-teal" /><p className="font-semibold">Todo en orden: no hay señales de actividad sospechosa ahora mismo.</p></div>
          ) : (
            <ul className="space-y-3">{data.flags.map((f, i) => (
              <li key={i} className="card flex flex-wrap items-start gap-3">
                <ShieldAlert size={24} aria-hidden="true" className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{f.type}</h2><span className={`chip ${SEV[f.severity][1]}`}>{SEV[f.severity][0]}</span></div>
                  <p className="font-semibold">{f.name}</p>
                  <p className="text-[#3c3829]">{f.detail}</p>
                </div>
                <Link to="/admin/usuarios" className="btn btn-ghost btn-sm">Ir a usuarios</Link>
              </li>))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
