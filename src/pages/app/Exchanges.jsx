import { Inbox, Repeat2 as Repeat } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Empty, PageHeader, Spinner, Alert } from "../../components/ui";
import ExchangeCard from "../../components/ExchangeCard";
import { useApi } from "../../lib/hooks";

function Group({ title, items, onChange }) {
  if (!items.length) return null;
  return (
    <section className="mb-8"><h2 className="mb-3 text-2xl font-extrabold">{title} <span className="num text-base text-[#4b4638]">({items.length})</span></h2>
      <ul className="space-y-4">{items.map((x) => <ExchangeCard key={x.id} x={x} onChange={onChange} />)}</ul></section>
  );
}

export default function Exchanges({ mode }) {
  const { data, loading, error, reload } = useApi("/exchanges");
  const [tab, setTab] = useState("in");
  const all = data?.items || [];
  const change = () => { reload(); window.dispatchEvent(new Event("tl-notifs")); };
  if (loading && !data) return <Spinner />;
  if (error) return <Alert kind="error">{error}</Alert>;

  if (mode === "requests") {
    const open = all.filter((x) => x.status === "pending" || x.status === "negotiating");
    const incoming = open.filter((x) => x.role === "provider"), sent = open.filter((x) => x.role === "requester");
    const list = tab === "in" ? incoming : sent;
    return (
      <>
        <PageHeader title="Solicitudes" subtitle="Acepta, rechaza o negocia el horario. Los créditos se reservan al enviar y se devuelven si no se concreta." />
        <div className="mb-4 inline-flex rounded-full border-2 border-ink p-0.5" role="group" aria-label="Tipo de solicitudes">
          <button type="button" aria-pressed={tab === "in"} onClick={() => setTab("in")} className={`btn btn-sm !border-0 ${tab === "in" ? "btn-dark" : "!bg-transparent"}`}>Recibidas ({incoming.length})</button>
          <button type="button" aria-pressed={tab === "out"} onClick={() => setTab("out")} className={`btn btn-sm !border-0 ${tab === "out" ? "btn-dark" : "!bg-transparent"}`}>Enviadas ({sent.length})</button>
        </div>
        {list.length === 0 ? <Empty icon={Inbox} title={tab === "in" ? "No tienes solicitudes recibidas" : "No has enviado solicitudes"} action={<Link to="/app/coincidencias" className="btn btn-primary">Ver coincidencias</Link>}>{tab === "in" ? "Cuando alguien quiera aprender contigo aparecerá aquí." : "Busca a alguien y solicita una sesión."}</Empty> : <ul className="space-y-4">{list.map((x) => <ExchangeCard key={x.id} x={x} onChange={change} />)}</ul>}
      </>
    );
  }
  const now = new Date();
  const sched = all.filter((x) => x.status === "scheduled");
  const toConfirm = sched.filter((x) => new Date(String(x.scheduled_start).replace(" ", "T")) <= now);
  const upcoming = sched.filter((x) => !toConfirm.includes(x)).sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  const disputed = all.filter((x) => x.status === "disputed");
  const history = all.filter((x) => ["completed", "rejected", "cancelled"].includes(x.status));
  return (
    <>
      <PageHeader title="Mis clases" subtitle="Tus próximas clases, las que esperan confirmación, el enlace de las virtuales y tu historial." />
      {all.filter((x) => x.status !== "pending" && x.status !== "negotiating").length === 0 ? <Empty icon={Repeat} title="Aún no tienes intercambios" action={<Link to="/app/buscar" className="btn btn-primary">Buscar personas</Link>}>Cuando una solicitud sea aceptada, la sesión aparecerá aquí.</Empty> : (
        <>
          <Group title="Por confirmar" items={toConfirm} onChange={change} />
          <Group title="Próximas sesiones" items={upcoming} onChange={change} />
          <Group title="En conflicto" items={disputed} onChange={change} />
          <Group title="Historial" items={history} onChange={change} />
        </>
      )}
    </>
  );
}
