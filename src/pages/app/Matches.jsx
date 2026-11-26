import { HeartHandshake, MapPin, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Avatar, Empty, PageHeader, Spinner, Stars, UserVerifiedBadge, VerifiedBadge } from "../../components/ui";
import RequestModal from "../../components/RequestModal";
import { useApi } from "../../lib/hooks";
import { LEVELS, MODES } from "../../lib/util";

const KIND = { mutual: ["Intercambio mutuo", "chip-ok"], learn: ["Puede enseñarte", "chip-info"], teach: ["Quiere aprender de ti", "chip-warn"] };

export function MatchCard({ m, onRequest }) {
  const [k, cls] = KIND[m.kind];
  return (
    <li className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={m.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{m.name}<UserVerifiedBadge show={m.userVerified} /></h3>
          <p className="truncate text-sm text-[#3c3829]">{m.headline || "Miembro de la comunidad"}</p>
        </div>
        <div className="text-right"><div className="num text-2xl font-bold leading-none">{m.score}<span className="text-sm">%</span></div><div className="text-xs font-semibold">afinidad</div></div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={`chip ${cls}`}>{k}</span>
        {m.distance && <span className="chip chip-ok"><MapPin size={12} aria-hidden="true" />{m.distance}</span>}
        {m.overlap > 0 && <span className="chip">{m.overlap} h en común</span>}
        {m.ratingCount > 0 && <span className="chip"><Stars value={m.ratingAvg} size={12} /> {m.ratingAvg}</span>}
      </div>
      <div>
        <h4 className="text-sm font-bold">¿Por qué te lo recomendamos?</h4>
        <ul className="mt-1 space-y-1 text-sm">{m.reasons.map((r) => <li key={r} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal" aria-hidden="true" />{r}</li>)}</ul>
      </div>
      {m.learn && <p className="rounded-xl bg-sand p-2.5 text-sm"><strong>{m.learn.name}</strong> {m.learn.verified && <VerifiedBadge small />} · {LEVELS[m.learn.level]} · {MODES[m.learn.mode]}</p>}
      <div className="mt-auto flex flex-wrap gap-2">
        <Link to={`/app/persona/${m.id}`} className="btn btn-ghost btn-sm">Ver perfil</Link>
        {m.learn && <button type="button" className="btn btn-primary btn-sm" onClick={() => onRequest(m)}>Solicitar sesión</button>}
      </div>
    </li>
  );
}

export default function Matches() {
  const { data, loading, error, reload } = useApi("/matches");
  const [req, setReq] = useState(null);
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Coincidencias" subtitle="Personas recomendadas según habilidades, nivel, modalidad, disponibilidad y cercanía. Solo ves datos públicos y abreviados." />
      {loading ? <Spinner /> : error ? <Alert kind="error">{error}</Alert> : items.length === 0 ? (
        <Empty icon={HeartHandshake} title="Aún no hay coincidencias" action={<Link to="/app/quiero-aprender" className="btn btn-primary">Añadir lo que quiero aprender</Link>}>Añade habilidades que quieras aprender y que ofreces, y completa tu disponibilidad. Cuando alguien encaje contigo aparecerá aquí.</Empty>
      ) : <ul className="grid gap-4 md:grid-cols-2">{items.map((m) => <MatchCard key={m.id} m={m} onRequest={setReq} />)}</ul>}
      {req && <RequestModal person={{ id: req.id, name: req.name }} skill={req.learn} onClose={() => setReq(null)} onDone={reload} />}
    </>
  );
}
