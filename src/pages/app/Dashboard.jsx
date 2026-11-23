import { Wallet, Lock, ArrowDownLeft, ArrowUpRight, Inbox, CalendarClock } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Alert, LineChart, PageHeader, Progress, Spinner, Stat } from "../../components/ui";
import RequestModal from "../../components/RequestModal";
import { MatchCard } from "./Matches";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { fmtCredits, fmtDateTime, fmtMin } from "../../lib/util";

export default function Dashboard() {
  const { me } = useAuth();
  const { data: d, loading, error, reload } = useApi("/me/dashboard");
  const [req, setReq] = useState(null);
  if (loading) return <Spinner />;
  if (error) return <Alert kind="error">{error}</Alert>;
  const pts = d.ledger.map((l) => ({ v: l.avail_after + l.reserved_after }));
  const todo = [d.incoming > 0 && [`${d.incoming} solicitud(es) esperan tu respuesta`, "/app/solicitudes"], d.awaitingReply > 0 && [`${d.awaitingReply} propuesta(s) de horario por responder`, "/app/solicitudes"], d.unread > 0 && [`${d.unread} notificación(es) sin leer`, "/app/notificaciones"]].filter(Boolean);
  return (
    <>
      <PageHeader title={`Hola, ${me.name.split(" ")[0]}`} subtitle="Tu tiempo tiene valor. Tus conocimientos también." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat dark icon={Wallet} label="Disponible" value={fmtCredits(d.wallet.available)} sub="créditos para usar" />
        <Stat icon={Lock} label="Reservado" value={fmtCredits(d.wallet.reserved)} sub="en solicitudes" />
        <Stat icon={ArrowDownLeft} label="Recibido" value={fmtCredits(d.wallet.received)} sub="créditos ganados" />
        <Stat icon={ArrowUpRight} label="Utilizado" value={fmtCredits(d.wallet.used)} sub="créditos gastados" />
      </div>
      {todo.length > 0 && (
        <section className="mt-6 card border-2 border-amber" aria-label="Pendientes"><h2 className="text-xl font-bold">Para hacer hoy</h2>
          <ul className="mt-2 space-y-1">{todo.map(([t, to]) => <li key={t}><Link to={to} className="font-semibold underline">{t}</Link></li>)}</ul></section>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card"><h2 className="flex items-center gap-2 text-xl font-bold"><CalendarClock size={20} aria-hidden="true" />Próximas sesiones</h2>
          {d.upcoming.length === 0 ? <p className="mt-3 text-[#3c3829]">No tienes sesiones agendadas. <Link to="/app/coincidencias" className="font-bold underline">Encuentra a alguien</Link> y pide la primera.</p> : (
            <ul className="mt-3 divide-y divide-line">{d.upcoming.map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="font-bold">{x.skill_name}</p><p className="text-sm">{x.role === "requester" ? "Aprendes de" : "Enseñas a"} {x.other.name} · {fmtMin(x.minutes)}</p></div><span className="num text-sm font-bold">{fmtDateTime(x.scheduled_start)}</span></li>)}</ul>)}
          <Link to="/app/calendario" className="btn btn-ghost btn-sm mt-3">Abrir calendario</Link>
        </section>
        <section className="card"><h2 className="text-xl font-bold">Tus créditos en el tiempo</h2>
          {pts.length > 1 ? <div className="mt-2"><LineChart points={pts} label="Evolución de tus créditos" /></div> : <p className="mt-3 text-[#3c3829]">Tu gráfica aparecerá con tus primeros movimientos.</p>}
          <Link to="/app/creditos" className="btn btn-ghost btn-sm mt-3">Ver cartera</Link>
        </section>
      </div>
      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-extrabold">Coincidencias para ti</h2><Link to="/app/coincidencias" className="font-bold underline">Ver todas</Link></div>
        {d.matches.length === 0 ? <div className="card"><p>Aún no tenemos coincidencias. Completa <Link to="/app/quiero-aprender" className="font-bold underline">lo que quieres aprender</Link> y <Link to="/app/mis-habilidades" className="font-bold underline">lo que ofreces</Link>.</p></div> : <ul className="grid gap-4 md:grid-cols-3">{d.matches.map((m) => <MatchCard key={m.id} m={m} onRequest={setReq} />)}</ul>}
      </section>
      {d.challenges.length > 0 && (
        <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-extrabold">Retos en curso</h2><Link to="/app/retos" className="font-bold underline">Ver retos</Link></div>
          <ul className="grid gap-4 md:grid-cols-3">{d.challenges.map((c) => <li key={c.id} className="card"><h3 className="font-bold">{c.title}</h3><div className="mt-2 flex justify-between text-sm"><span>{c.done ? "¡Listo para reclamar!" : "Progreso"}</span><span className="num">{c.progress}/{c.target}</span></div><Progress value={c.progress} max={c.target} label={c.title} /></li>)}</ul></section>
      )}
      {req && <RequestModal person={{ id: req.id, name: req.name }} skill={req.learn} onClose={() => setReq(null)} onDone={reload} />}
    </>
  );
}
