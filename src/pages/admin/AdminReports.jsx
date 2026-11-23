import { useState } from "react";
import { PageHeader, Pagination, Spinner, useToast } from "../../components/ui";
import { ReasonModal, ResolveConflictModal } from "../../components/AdminBits";
import { useList } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { fmtDateTime } from "../../lib/util";

const ST = { open: ["Abierto", "chip-bad"], in_review: ["En revisión", "chip-warn"], resolved: ["Resuelto", "chip-ok"], dismissed: ["Descartado", "chip"] };

export default function AdminReports() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("open");
  const [modal, setModal] = useState(null);
  const { items, total, loading, reload } = useList("reports", { page, perPage: 15, filter: status ? `status = "${status}"` : "", expand: "reporter,reported,exchange", sort: "-created" });
  async function review(r) { try { await api(`/admin/report/${r.id}/resolve`, { method: "POST", body: { status: "in_review" } }); toast("Marcado en revisión."); reload(); } catch (e) { toast(e.message, "error"); } }
  return (
    <>
      <PageHeader title="Reportes y moderación" subtitle="Reportes de personas y conflictos en sesiones. Las decisiones se registran en la auditoría." />
      <div className="mb-4 max-w-xs"><label htmlFor="rs" className="label">Estado</label><select id="rs" className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></div>
      {loading && !items.length ? <Spinner /> : items.length === 0 ? <div className="card">No hay reportes con este estado.</div> : (
        <>
          <ul className="space-y-4">{items.map((r) => (
            <li key={r.id} className="card">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{r.reason}</h2><span className={`chip ${ST[r.status][1]}`}>{ST[r.status][0]}</span><span className="chip">{r.kind === "conflict" ? "Conflicto" : "Reporte"}</span></div>
              <p className="text-sm">De <strong>{r.expand?.reporter?.name}</strong>{r.expand?.reported && <> sobre <strong>{r.expand.reported.name}</strong></>} · {fmtDateTime(r.created)}</p>
              {r.details && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-sand p-3">{r.details}</p>}
              {r.expand?.exchange && <p className="mt-2 text-sm">Sesión: <strong>{r.expand.exchange.skill_name}</strong> · {r.expand.exchange.minutes} min · estado: {r.expand.exchange.status}</p>}
              {r.resolution && <p className="mt-2 text-sm"><strong>Resolución:</strong> {r.resolution}</p>}
              {(r.status === "open" || r.status === "in_review") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.status === "open" && <button type="button" className="btn btn-ghost btn-sm" onClick={() => review(r)}>Marcar en revisión</button>}
                  {r.expand?.exchange?.status === "disputed" && <button type="button" className="btn btn-dark btn-sm" onClick={() => setModal({ t: "conflict", ex: r.expand.exchange })}>Resolver conflicto</button>}
                  {r.expand?.reported && <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal({ t: "suspend", m: r.expand.reported })}>Suspender a {r.expand.reported.name}</button>}
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ t: "resolve", r })}>Cerrar reporte</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ t: "dismiss", r })}>Descartar</button>
                </div>)}
            </li>))}</ul>
          <Pagination page={page} total={total} perPage={15} onPage={setPage} />
        </>
      )}
      {modal?.t === "conflict" && <ResolveConflictModal ex={modal.ex} onClose={() => setModal(null)} onDone={reload} />}
      {modal?.t === "suspend" && <ReasonModal title={`Suspender a ${modal.m.name}`} label="Motivo de la suspensión" button="Suspender cuenta" success="Cuenta suspendida y sus sesiones abiertas cerradas." danger path={`/admin/user/${modal.m.id}/status`} extra={{ status: "suspended" }} onClose={() => setModal(null)} onDone={reload} />}
      {modal?.t === "resolve" && <ReasonModal title="Cerrar reporte" label="Resolución (se la comunicaremos a quien reportó)" button="Cerrar como resuelto" success="Reporte cerrado como resuelto." field="resolution" path={`/admin/report/${modal.r.id}/resolve`} extra={{ status: "resolved" }} onClose={() => setModal(null)} onDone={reload} />}
      {modal?.t === "dismiss" && <ReasonModal title="Descartar reporte" label="Motivo del descarte" button="Descartar" success="Reporte descartado." field="resolution" path={`/admin/report/${modal.r.id}/resolve`} extra={{ status: "dismissed" }} onClose={() => setModal(null)} onDone={reload} />}
    </>
  );
}
