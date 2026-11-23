import { SearchX as Search } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/router";

import { PageHeader, Spinner, Empty } from "../../components/ui";
import Filters from "../../components/Filters";
import SkillResult from "../../components/SkillResult";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";

export default function Explore() {
  const [sp] = useSearchParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ q: sp.get("q") || "", category: sp.get("categoria") || "", mode: "", level: "" });
  const { data, loading, error } = useApi("/public/explore", f);
  const items = data?.items || [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title="Explorar habilidades" subtitle="Descubre lo que la comunidad ofrece. Solo mostramos nombres abreviados y zonas aproximadas." />
      <Filters value={f} onChange={setF} />
      <div className="mt-6" aria-live="polite">
        {loading ? <Spinner /> : error ? <p className="text-danger">{error}</p> : items.length === 0 ? (
          <Empty icon={Search} title="Aún no hay resultados" action={<Link className="btn btn-primary" to={me ? "/app/mis-habilidades" : "/registro"}>Sé quien ofrezca la primera habilidad</Link>}>Prueba otra búsqueda o categoría. La comunidad crece cada día y tú puedes aportar la primera habilidad.</Empty>
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold">{items.length} resultado(s)</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => <SkillResult key={it.skill.id} item={it} authed={!!me} onRequest={() => nav(`/app/persona/${it.person.id}`)} />)}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
