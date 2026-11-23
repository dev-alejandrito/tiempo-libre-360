import { Users, Repeat2 as Repeat, Clock3 as Clock, Coins, Flag, Sparkles } from "lucide-react";
import { useState } from "react";

import { Alert, BarChart, PageHeader, Spinner, Stat } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { STATUS } from "../../lib/util";

export default function AdminHome() {
  const { data: s, loading, error } = useApi("/admin/stats");
  if (loading) return <Spinner />;
  if (error) return <Alert kind="error">{error}</Alert>;
  const cats = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <>
      <PageHeader title="Estadísticas" subtitle="Vista general de la comunidad." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat dark icon={Users} label="Personas" value={s.members} sub={`${s.active} activas · ${s.suspended} suspendidas`} />
        <Stat icon={Sparkles} label="Habilidades" value={s.skillsOffered + s.skillsWanted} sub={`${s.skillsOffered} ofrecidas · ${s.skillsWanted} buscadas`} />
        <Stat icon={Repeat} label="Intercambios" value={s.exchanges} sub={`${s.byStatus.completed || 0} completados`} />
        <Stat icon={Clock} label="Minutos compartidos" value={s.minutes} sub="en sesiones completadas" />
        <Stat icon={Coins} label="Créditos en circulación" value={s.creditsAvailable + s.creditsReserved} sub={`${s.creditsReserved} reservados`} />
        <Stat icon={Flag} label="Reportes abiertos" value={s.openReports} sub={s.openReports ? "Requieren revisión" : "Todo al día"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card"><h2 className="mb-2 text-xl font-bold">Actividad de las últimas 8 semanas</h2>
          <BarChart data={s.weeks} series={[{ key: "members", label: "Altas", color: "#0C1626" }, { key: "exchanges", label: "Solicitudes", color: "#F4A93B" }]} /></section>
        <section className="card"><h2 className="mb-2 text-xl font-bold">Intercambios por estado</h2>
          {Object.keys(s.byStatus).length === 0 ? <p>Sin intercambios todavía.</p> : <ul className="space-y-2">{Object.entries(s.byStatus).map(([k, v]) => <li key={k} className="flex items-center justify-between"><span className={`chip ${STATUS[k]?.cls}`}>{STATUS[k]?.label || k}</span><span className="num text-lg font-bold">{v}</span></li>)}</ul>}
        </section>
        <section className="card lg:col-span-2"><h2 className="mb-2 text-xl font-bold">Minutos completados por categoría</h2>
          {cats.length === 0 ? <p>Aún no hay minutos completados.</p> : <BarChart data={cats.map(([k, v]) => ({ label: k.slice(0, 7), a: v }))} series={[{ key: "a", label: "Minutos", color: "#0B6F6A" }]} />}
        </section>
      </div>
    </>
  );
}
