import { Trophy, MessageCircleHeart as MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Avatar, Empty, PageHeader, Spinner, useToast } from "../../components/ui";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { errMsg, pb } from "../../lib/pb";
import { fmtDate, fmtMin } from "../../lib/util";

const KINDS = { tip: "Consejo", thanks: "Agradecimiento", question: "Pregunta", offer: "Propuesta" };

export default function Community() {
  const { me } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useApi("/public/community");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("tip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await pb.collection("community_posts").create({ author: me.id, kind, body }, { requestKey: null });
      setBody(""); toast("Tu mensaje ya está en la comunidad."); reload();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  const s = data?.stats;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader title="Comunidad" subtitle="Consejos, agradecimientos y propuestas de quienes comparten su tiempo." />
      {loading ? <Spinner /> : (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section aria-label="Muro de la comunidad" className="space-y-4">
            {me ? (
              <form onSubmit={post} className="card space-y-3">
                <h2 className="text-xl font-bold">Comparte con la comunidad</h2>
                <div><label htmlFor="pk" className="label">Tipo de mensaje</label><select id="pk" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label htmlFor="pb" className="label">Tu mensaje</label><textarea id="pb" className="input" rows={3} maxLength={500} required value={body} onChange={(e) => setBody(e.target.value)} /></div>
                {error && <Alert kind="error">{error}</Alert>}
                <button className="btn btn-dark" disabled={busy}>{busy ? "Publicando…" : "Publicar"}</button>
              </form>
            ) : <Alert kind="info"><Link to="/ingresar" className="font-bold underline">Inicia sesión</Link> o <Link to="/registro" className="font-bold underline">crea tu cuenta</Link> para publicar mensajes.</Alert>}
            {data?.posts?.length ? data.posts.map((p) => (
              <article key={p.id} className="card flex gap-3">
                <Avatar name={p.author} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{p.author}</h3><span className="chip chip-info">{KINDS[p.kind]}</span><span className="text-sm text-[#4b4638]">{fmtDate(p.created)}</span></div>
                  <p className="mt-1 whitespace-pre-wrap break-words">{p.body}</p>
                </div>
              </article>
            )) : <Empty icon={MessageCircle} title="El muro está esperando su primer mensaje">Comparte un consejo o da las gracias a alguien con quien hayas intercambiado.</Empty>}
          </section>
          <aside className="space-y-4" aria-label="Datos de la comunidad">
            <div className="card-dark dark-surface">
              <h2 className="text-xl font-bold text-amber">La comunidad hoy</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                {[["Personas", s?.members], ["Minutos", s?.minutes], ["Intercambios", s?.exchanges], ["Habilidades", s?.skills]].map(([l, v]) => <div key={l}><dd className="num text-3xl font-bold">{v ?? 0}</dd><dt className="text-sm text-[#d5deec]">{l}</dt></div>)}
              </dl>
            </div>
            <div className="card">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Trophy size={20} aria-hidden="true" /> Más tiempo enseñado</h2>
              {s?.top?.length ? <ol className="mt-3 space-y-2">{s.top.map((t, i) => <li key={t.name + i} className="flex items-center justify-between"><span><span className="num mr-2 font-bold">{i + 1}.</span>{t.name}</span><span className="num font-bold">{fmtMin(t.minutes)}</span></li>)}</ol> : <p className="mt-2 text-[#3c3829]">Aún no hay minutos compartidos. ¡Sé el primero!</p>}
            </div>
            <div className="card">
              <h2 className="text-xl font-bold">Retos comunitarios</h2>
              <ul className="mt-3 space-y-3">
                {(data?.challenges || []).map((c) => <li key={c.id}><p className="font-bold">{c.title} {c.badge && <span className="chip chip-warn ml-1">{c.badge}</span>}</p><p className="text-sm text-[#3c3829]">{c.description}</p></li>)}
              </ul>
              <Link to={me ? "/app/retos" : "/registro"} className="btn btn-ghost btn-sm mt-4">{me ? "Ver mis retos" : "Unirme a los retos"}</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
