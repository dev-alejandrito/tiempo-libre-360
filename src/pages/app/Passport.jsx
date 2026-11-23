import { Award, Clock3 as Clock, Repeat2 as Repeat, Star } from "lucide-react";
import { Link } from "@/lib/router";

import { Alert, PageHeader, Spinner, Stars, Stat, BarChart } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { useApi } from "../../lib/hooks";
import { fmtDate, fmtMin } from "../../lib/util";

function metas(s) {
  return [
    ["Publica tu primera habilidad para enseñar", s.offers, 1, "/app/mis-habilidades"],
    ["Cuéntanos qué quieres aprender", s.wants, 1, "/app/quiero-aprender"],
    ["Completa tu primer intercambio", s.completed, 1, "/app/intercambios"],
    ["Comparte 60 minutos en total", s.minutesShared, 60, "/app/intercambios"],
    ["Llega a 3 intercambios completados", s.completed, 3, "/app/intercambios"],
    ["Recibe tu primera valoración", s.ratingCount, 1, "/app/intercambios"],
  ];
}

function Metas({ s }) {
  const list = metas(s);
  const done = list.filter((m) => m[1] >= m[2]).length;
  return (
    <section className="card" aria-labelledby="metas-t"><h3 id="metas-t" className="text-xl font-bold">Metas de aprendizaje sugeridas</h3>
      <p className="mt-1 text-[#3c3829]">{done} de {list.length} metas cumplidas. Se calculan con tu actividad real.</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {list.map(([t, v, goal, to]) => { const ok = v >= goal; return (
          <li key={t} className="rounded-xl bg-sand p-3">
            <p className="font-bold">{ok ? "Cumplida: " : ""}{t}</p>
            <progress className="mt-2 h-2 w-full" max={goal} value={Math.min(v, goal)} aria-label={t}></progress>
            <div className="mt-1 flex items-center justify-between text-sm"><span>{Math.min(v, goal)} / {goal}</span>{!ok && <Link className="font-bold underline underline-offset-4" to={to}>Ir ahora</Link>}</div>
          </li>); })}
      </ul>
    </section>
  );
}

export function PassportStats({ p }) {
  const s = p.passport;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Clock} label="Tiempo compartido" value={fmtMin(s.minutesShared)} sub={`${fmtMin(s.minutesTaught)} enseñados · ${fmtMin(s.minutesLearned)} aprendidos`} dark />
        <Stat icon={Repeat} label="Intercambios" value={s.completed} sub={`${s.cancelled} cancelaciones (${s.lateCancels} tardías)`} />
        <Stat icon={Star} label="Valoración" value={s.ratingCount ? s.ratingAvg : "—"} sub={`${s.ratingCount} valoración(es)`} />
        <Stat icon={Award} label="Insignias" value={s.badges.length + (p.challengeBadges?.length || 0)} sub="ganadas hasta ahora" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card"><h3 className="text-xl font-bold">Insignias</h3>
          {s.badges.length + (p.challengeBadges?.length || 0) === 0 ? <p className="mt-2 text-[#3c3829]">Aún sin insignias. Completa tu primer intercambio para conseguir la primera.</p> : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {s.badges.map((b) => <li key={b.key} className="flex gap-3 rounded-xl bg-sand p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-amber"><Award size={20} aria-hidden="true" /></span><div><p className="font-bold">{b.name}</p><p className="text-sm text-[#3c3829]">{b.desc}</p></div></li>)}
              {(p.challengeBadges || []).map((b) => <li key={b} className="flex gap-3 rounded-xl bg-sand p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber text-ink"><Award size={20} aria-hidden="true" /></span><div><p className="font-bold">{b}</p><p className="text-sm text-[#3c3829]">Insignia de reto</p></div></li>)}
            </ul>)}
        </section>
        <section className="card"><h3 className="text-xl font-bold">Minutos enseñados y aprendidos</h3>
          <div className="mt-3"><BarChart data={[{ label: "Enseñadas", a: s.minutesTaught }, { label: "Aprendidas", a: s.minutesLearned }]} series={[{ key: "a", label: "Minutos", color: "#0B6F6A" }]} height={100} /></div>
        </section>
      </div>
      <section className="card"><h3 className="text-xl font-bold">Valoraciones recientes</h3>
        {p.ratings.length === 0 ? <p className="mt-2 text-[#3c3829]">Todavía no hay valoraciones.</p> : <ul className="mt-3 divide-y divide-line">{p.ratings.map((r, i) => <li key={i} className="py-3"><div className="flex flex-wrap items-center gap-2"><Stars value={r.stars} /><span className="font-semibold">{r.by}</span><span className="text-sm text-[#4b4638]">{fmtDate(r.created)}</span></div>{r.comment && <p className="mt-1">{r.comment}</p>}</li>)}</ul>}
      </section>
    </div>
  );
}

export default function Passport() {
  const { me } = useAuth();
  const { data, loading, error } = useApi("/person/" + me.id);
  return (
    <>
      <PageHeader title="Pasaporte de confianza" subtitle="Tu reputación se construye con tiempo compartido, intercambios, valoraciones e insignias. Sin certificados." >
        <Link to={`/app/persona/${me.id}`} className="btn btn-ghost btn-sm">Ver cómo me ven otros</Link>
      </PageHeader>
      {loading ? <Spinner /> : error ? <Alert kind="error">{error}</Alert> : <><PassportStats p={data} /><div className="mt-4"><Metas s={data.passport} /></div></>}
    </>
  );
}
