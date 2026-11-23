import { useState } from "react";
import { PageHeader, Pagination, Spinner, useToast } from "../../components/ui";
import { useList } from "../../lib/hooks";
import { api, pb } from "../../lib/pb";
import { fmtDateTime } from "../../lib/util";

export default function AdminCommunity() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { items, total, loading, reload } = useList("community_posts", { page, perPage: 20, expand: "author", sort: "-created" });
  async function hide(p, hidden) { try { await api(`/admin/post/${p.id}/hide`, { method: "POST", body: { hidden } }); reload(); } catch (e) { toast(e.message, "error"); } }
  async function del(p) { if (!window.confirm("¿Eliminar esta publicación?")) return; try { await pb.collection("community_posts").delete(p.id, { requestKey: null }); reload(); } catch (e) { toast(e.message, "error"); } }
  return (
    <>
      <PageHeader title="Comunidad" subtitle="Modera los mensajes del muro de la comunidad." />
      {loading && !items.length ? <Spinner /> : items.length === 0 ? <div className="card">Todavía no hay publicaciones.</div> : (
        <>
          <ul className="space-y-3">{items.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1"><p className="text-sm"><strong>{p.expand?.author?.name}</strong> · {fmtDateTime(p.created)} {p.hidden && <span className="chip chip-bad ml-1">Oculta</span>}</p><p className="mt-1 whitespace-pre-wrap break-words">{p.body}</p></div>
              <div className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm" onClick={() => hide(p, !p.hidden)}>{p.hidden ? "Mostrar" : "Ocultar"}</button><button type="button" className="btn btn-danger btn-sm" onClick={() => del(p)}>Eliminar</button></div>
            </li>))}</ul>
          <Pagination page={page} total={total} perPage={20} onPage={setPage} />
        </>
      )}
    </>
  );
}
