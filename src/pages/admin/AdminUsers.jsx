import { useState } from "react";
import { Alert, Field, Modal, PageHeader, Pagination, Spinner, useToast } from "../../components/ui";
import { ReasonModal } from "../../components/AdminBits";
import { useList } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/pb";
import { fmtDate } from "../../lib/util";

const ROLES = { user: "Miembro", moderator: "Moderación", admin: "Administración" };

function CreditsModal({ m, onClose, onDone }) {
  const toast = useToast();
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setError("");
    try { await api(`/admin/user/${m.id}/credits`, { method: "POST", body: { amount, note } }); toast("Ajuste registrado."); onDone(); onClose(); } catch (err) { setError(err.message); }
  }
  return (
    <Modal title={`Ajustar créditos de ${m.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Créditos a sumar (o restar con un número negativo)" hint="1 minuto = 1 crédito (máximo 600 por ajuste). Nunca puede dejar el saldo disponible en negativo.">{(p) => <input {...p} className="input" type="number" min={-600} max={600} step={1} required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />}</Field>
        <Field label="Motivo (queda en el historial y la auditoría)">{(p) => <textarea {...p} className="input" rows={3} required minLength={5} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button><button className="btn btn-dark">Registrar ajuste</button></div>
      </form>
    </Modal>
  );
}

export default function AdminUsers() {
  const { me, isAdmin } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const filter = q ? `name ~ "${q.replace(/"/g, "")}" || email ~ "${q.replace(/"/g, "")}"` : "";
  const { items, total, loading, reload } = useList("members", { page, perPage: 15, filter, sort: "-created" }, []);
  const ids = items.map((i) => `member = "${i.id}"`).join(" || ");
  const wallets = useList("wallets", { perPage: 100, filter: ids || 'member = "none"', sort: "" }, [items.length, page]);
  const wmap = Object.fromEntries(wallets.items.map((w) => [w.member, w]));
  async function setRole(m, role) {
    try { await api(`/admin/user/${m.id}/role`, { method: "POST", body: { role } }); toast("Rol actualizado."); reload(); } catch (err) { toast(err.message, "error"); reload(); }
  }
  async function activate(m) {
    try { await api(`/admin/user/${m.id}/status`, { method: "POST", body: { status: "active" } }); toast("Cuenta reactivada."); reload(); } catch (err) { toast(err.message, "error"); }
  }
  return (
    <>
      <PageHeader title={isAdmin ? "Usuarios y roles" : "Usuarios"} subtitle="Gestiona cuentas, roles, suspensiones y créditos. Cada acción queda en la auditoría." />
      <div className="mb-4 max-w-md"><label htmlFor="uq" className="label">Buscar por nombre o correo</label><input id="uq" className="input" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      {loading && !items.length ? <Spinner /> : (
        <>
          <div className="table-wrap"><table className="tbl">
            <caption className="sr-only">Personas registradas</caption>
            <thead><tr><th scope="col">Persona</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Créditos (disp./res.)</th><th scope="col">Alta</th><th scope="col">Acciones</th></tr></thead>
            <tbody>{items.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.name}</strong><br /><span className="text-sm">{m.email || "(correo oculto)"}</span></td>
                <td>{isAdmin && m.id !== me.id ? <><label className="sr-only" htmlFor={`r${m.id}`}>Rol de {m.name}</label><select id={`r${m.id}`} className="input !min-h-9 !w-40 !py-1" value={m.role || "user"} onChange={(e) => setRole(m, e.target.value)}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></> : <span className="chip">{ROLES[m.role || "user"]}</span>}</td>
                <td>{m.status === "suspended" ? <span className="chip chip-bad">Suspendida</span> : <span className="chip chip-ok">Activa</span>}</td>
                <td className="num">{wmap[m.id] ? `${wmap[m.id].available} / ${wmap[m.id].reserved}` : "—"}</td>
                <td className="whitespace-nowrap">{fmtDate(m.created)}</td>
                <td><div className="flex flex-wrap gap-1.5">
                  {m.id !== me.id && (m.status === "suspended" ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => activate(m)}>Reactivar</button> : <button type="button" className="btn btn-danger btn-sm" onClick={() => setModal({ t: "suspend", m })}>Suspender</button>)}
                  {isAdmin && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ t: "credits", m })}>Créditos</button>}
                </div></td>
              </tr>))}</tbody>
          </table></div>
          <Pagination page={page} total={total} perPage={15} onPage={setPage} />
        </>
      )}
      {modal?.t === "suspend" && <ReasonModal title={`Suspender a ${modal.m.name}`} label="Motivo de la suspensión" button="Suspender cuenta" success="Cuenta suspendida y sus sesiones abiertas cerradas." danger path={`/admin/user/${modal.m.id}/status`} extra={{ status: "suspended" }} onClose={() => setModal(null)} onDone={reload}><Alert kind="warn">La persona no podrá iniciar sesión hasta que la reactives.</Alert></ReasonModal>}
      {modal?.t === "credits" && <CreditsModal m={modal.m} onClose={() => setModal(null)} onDone={() => { reload(); wallets.reload(); }} />}
    </>
  );
}
