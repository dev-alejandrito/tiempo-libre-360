import { Bell } from "lucide-react";
import { Link } from "@/lib/router";

import { Empty, PageHeader, Spinner, useToast } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { api, pb } from "../../lib/pb";
import { fmtDateTime } from "../../lib/util";

export default function Notifications() {
  const toast = useToast();
  const { items, loading, reload } = useList("notifications", { perPage: 60, sort: "-created" });
  const refresh = () => { reload(); window.dispatchEvent(new Event("tl-notifs")); };
  async function readAll() { try { await api("/notifications/read-all", { method: "POST" }); refresh(); } catch (e) { toast(e.message, "error"); } }
  async function read(n) { if (!n.read) { await pb.collection("notifications").update(n.id, { read: true }, { requestKey: null }).catch(() => {}); refresh(); } }
  async function remove(n) { await pb.collection("notifications").delete(n.id, { requestKey: null }).catch(() => {}); refresh(); }
  return (
    <>
      <PageHeader title="Notificaciones" subtitle="Avisos de solicitudes, sesiones, créditos y moderación.">
        {items.some((n) => !n.read) && <button type="button" className="btn btn-ghost btn-sm" onClick={readAll}>Marcar todas como leídas</button>}
      </PageHeader>
      {loading ? <Spinner /> : items.length === 0 ? <Empty icon={Bell} title="Sin notificaciones">Cuando pase algo importante te lo contaremos aquí.</Empty> : (
        <ul className="space-y-3">{items.map((n) => (
          <li key={n.id} className={`card flex flex-col items-stretch gap-4 sm:flex-row sm:items-start ${n.read ? "" : "border-2 border-teal"}`}>
            <div className="w-full min-w-0 flex-1 [overflow-wrap:anywhere]">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{n.title}</h2>{!n.read && <span className="chip chip-info">Nueva</span>}</div>
              {n.body && <p className="text-[#3c3829]">{n.body}</p>}
              <p className="mt-1 text-sm text-[#4b4638]">{fmtDateTime(n.created)}</p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
              {n.link && <Link to={n.link} onClick={() => read(n)} className="btn btn-dark btn-sm min-w-0 flex-1 whitespace-nowrap sm:flex-none">Abrir</Link>}
              {!n.read && <button type="button" className="btn btn-ghost btn-sm min-w-0 flex-1 whitespace-nowrap sm:flex-none" onClick={() => read(n)}>Marcar leída</button>}
              <button type="button" className="btn btn-danger btn-sm min-w-0 flex-1 whitespace-nowrap sm:flex-none" onClick={() => remove(n)}>Borrar<span className="sr-only"> notificación</span></button>
            </div>
          </li>))}</ul>
      )}
    </>
  );
}
