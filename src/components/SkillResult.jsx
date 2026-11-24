import { MapPin } from "lucide-react";
import { Link } from "@/lib/router";

import { Avatar, Stars, UserVerifiedBadge, VerifiedBadge } from "./ui";
import { LEVELS, MODES } from "../lib/util";

export default function SkillResult({ item, authed, onRequest }) {
  const { skill, person } = item;
  const profile = authed ? `/app/persona/${person.id}` : "/registro";
  return (
    <li className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={person.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{skill.name}</h3>
          <p className="text-sm text-[#3c3829]">{person.name}<UserVerifiedBadge show={person.userVerified} />{person.headline ? ` · ${person.headline}` : ""}</p>
        </div>
      </div>
      {skill.description && <p className="line-clamp-3 text-[#3c3829]">{skill.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        {skill.verified && <VerifiedBadge small />}
        <span className="chip">{skill.category}</span>
        <span className="chip chip-info">{LEVELS[skill.level]}</span>
        <span className="chip">{MODES[skill.mode]}</span>
        {(item.distance || person.city) && <span className="chip chip-ok"><MapPin size={12} aria-hidden="true" />{item.distance || person.city}</span>}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        {person.ratingCount ? <span className="inline-flex items-center gap-1.5"><Stars value={person.ratingAvg} /><span className="num">{person.ratingAvg}</span><span className="text-[#4b4638]">({person.ratingCount})</span></span> : <span className="text-[#4b4638]">Aún sin valoraciones</span>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link to={profile} className="btn btn-ghost btn-sm">{authed ? "Ver perfil" : "Únete para ver perfil"}</Link>
        {authed ? <button type="button" className="btn btn-primary btn-sm" onClick={() => onRequest(item)}>Solicitar sesión</button>
          : <Link to="/ingresar" state={{ from: "/app/buscar" }} className="btn btn-primary btn-sm">Iniciar sesión para solicitar</Link>}
      </div>
    </li>
  );
}
