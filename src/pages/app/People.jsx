import { SearchX, LayoutGrid as List, Map as MapIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Empty, PageHeader, Spinner } from "../../components/ui";
import Filters from "../../components/Filters";
import SkillResult from "../../components/SkillResult";
import RequestModal from "../../components/RequestModal";
import MapView from "../../components/MapView";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function People() {
  const { me } = useAuth();
  const [f, setF] = useState({ q: "", category: "", mode: "", level: "", maxkm: "" });
  const [view, setView] = useState("list");
  const [req, setReq] = useState(null);
  const { data, loading, error, reload } = useApi("/people", f);
  const items = data?.items || [];
  const shares = !!(me.share_location && me.lat);
  const circles = useMemo(() => items.filter((i) => i.lat).map((i) => ({ lat: i.lat, lng: i.lng, popup: `<strong>${esc(i.person.name)}</strong><br/>${esc(i.skill.name)}<br/>${esc(i.distance || "")}` })), [items]);
  return (
    <>
      <PageHeader title="Buscar personas" subtitle="Encuentra quién puede enseñarte lo que quieres. Los mapas muestran zonas aproximadas, nunca domicilios.">
        <div className="inline-flex rounded-full border-2 border-ink p-0.5" role="group" aria-label="Vista">
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`btn btn-sm !border-0 ${view === "list" ? "btn-dark" : "!bg-transparent"}`}><List size={16} aria-hidden="true" />Lista</button>
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} className={`btn btn-sm !border-0 ${view === "map" ? "btn-dark" : "!bg-transparent"}`}><MapIcon size={16} aria-hidden="true" />Mapa</button>
        </div>
      </PageHeader>
      <Filters value={f} onChange={setF} withDistance />
      {!shares && <div className="mt-4"><Alert kind="info">Para ver quién está cerca, <Link to="/app/perfil" className="font-bold underline">comparte tu zona aproximada</Link> en tu perfil. Es opcional y puedes quitarla cuando quieras.</Alert></div>}
      <div className="mt-6" aria-live="polite">
        {loading ? <Spinner /> : error ? <Alert kind="error">{error}</Alert> : view === "map" ? (
          <div className="space-y-3">
            {shares ? <MapView label="Mapa de personas cercanas" me={{ lat: me.lat, lng: me.lng }} circles={circles} height={440} /> : <Empty icon={MapIcon} title="Activa tu ubicación aproximada">El mapa solo muestra personas que, como tú, han dado su consentimiento.</Empty>}
            <p className="hint">{circles.length} persona(s) con zona compartida en estos resultados. Cada círculo cubre unos 800 m y no indica una dirección.</p>
          </div>
        ) : items.length === 0 ? <Empty icon={SearchX} title="No encontramos personas con esos filtros">Prueba con menos filtros o una categoría distinta. También puedes revisar tus <Link className="font-bold underline" to="/app/coincidencias">coincidencias</Link>.</Empty> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((it) => <SkillResult key={it.skill.id} item={it} authed onRequest={setReq} />)}</ul>
        )}
      </div>
      {req && <RequestModal person={req.person} skill={req.skill} onClose={() => setReq(null)} onDone={reload} />}
    </>
  );
}
