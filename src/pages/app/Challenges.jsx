import { Trophy, Award } from "lucide-react";
import { useState } from "react";

import { Alert, Empty, PageHeader, Progress, Spinner, useToast } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";

export default function Challenges() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi("/challenges");
  const [busy, setBusy] = useState("");
  async function claim(c) {
    setBusy(c.id);
    try { const r = await api(`/challenges/${c.id}/claim`, { method: "POST" }); toast(r.reward > 0 ? `¡Reto superado! Ganaste ${r.reward} créditos.` : `¡Reto superado! Ganaste la insignia ${r.badge}.`); reload(); window.dispatchEvent(new Event("tl-notifs")); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(""); }
  }
  const items = data?.items || [];
  return (
    <>
      <PageHeader title="Retos y logros" subtitle="Metas comunitarias con recompensa. Reclama tu premio cuando completes cada reto." />
      {loading ? <Spinner /> : error ? <Alert kind="error">{error}</Alert> : items.length === 0 ? <Empty icon={Trophy} title="No hay retos activos">La administración publicará nuevos retos pronto.</Empty> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2"><h2 className="text-xl font-bold">{c.title}</h2>{c.claimed ? <span className="chip chip-ok">Conseguido</span> : c.done ? <span className="chip chip-warn">¡Listo para reclamar!</span> : null}</div>
              <p className="text-[#3c3829]">{c.description}</p>
              <div><div className="mb-1 flex justify-between text-sm font-semibold"><span>Progreso</span><span className="num">{c.progress} / {c.target}{c.kind.startsWith("minutes") ? " min" : ""}</span></div><Progress value={c.progress} max={c.target} label={c.title} /></div>
              <div className="flex flex-wrap items-center gap-2 text-sm">{c.reward > 0 && <span className="chip chip-info">+{c.reward} créditos</span>}{c.badge && <span className="chip chip-warn"><Award size={12} aria-hidden="true" />Insignia {c.badge}</span>}</div>
              <button type="button" className="btn btn-primary btn-sm mt-auto self-start" disabled={!c.done || c.claimed || busy === c.id} onClick={() => claim(c)}>{c.claimed ? "Ya reclamado" : "Reclamar recompensa"}</button>
            </li>))}
        </ul>
      )}
    </>
  );
}
