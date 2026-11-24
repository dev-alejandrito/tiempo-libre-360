import { MapPin, Flag, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "@/lib/router";

import { Alert, Avatar, Field, Modal, PageHeader, Spinner, Stars, UserVerifiedBadge, VerifiedBadge, useToast } from "../../components/ui";
import { AvailabilityView } from "../../components/AvailabilityEditor";
import RequestModal from "../../components/RequestModal";
import { PassportStats } from "./Passport";
import { useApi } from "../../lib/hooks";
import { api } from "../../lib/pb";
import { LEVELS, MODES, fmtDate } from "../../lib/util";

const ACC_KINDS = { certificate: "Certificado", article: "Artículo", publication: "Publicación", project: "Proyecto", portfolio: "Portafolio", demo: "Demostración práctica" };

export default function PersonPage() {
  const { id } = useParams();
  const { data: p, loading, error, reload } = useApi("/person/" + id);
  const [req, setReq] = useState(null);
  const [rep, setRep] = useState(false);
  const nav = useNavigate();
  if (loading) return <Spinner />;
  if (error) return <Alert kind="error">{error} <Link to="/app/buscar" className="font-bold underline">Volver a buscar</Link></Alert>;
  return (
    <>
      <div className="card-dark dark-surface mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={p.name} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold">{p.name}<UserVerifiedBadge show={p.userVerified} /></h1>
          <p className="text-[#d5deec]">{p.headline || "Miembro de la comunidad"}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {(p.distance || p.city) && <span className="chip chip-ok"><MapPin size={12} aria-hidden="true" />{p.distance || p.city}</span>}
            <span className="chip">Desde {fmtDate(p.joined)}</span>
            {p.passport.ratingCount > 0 && <span className="chip"><Stars value={p.passport.ratingAvg} size={12} /> {p.passport.ratingAvg} ({p.passport.ratingCount})</span>}
          </div>
        </div>
        {!p.isMe && <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => nav(`/app/clases-particulares?to=${p.id}`)}><MessageCircle size={16} aria-hidden="true" />Mensaje privado</button>
          <button type="button" className="btn btn-light btn-sm" onClick={() => setRep(true)}><Flag size={16} aria-hidden="true" />Reportar</button>
        </div>}
      </div>
      {p.bio && <section className="card mb-6"><h2 className="text-xl font-bold">Sobre {p.name}</h2><p className="mt-2 whitespace-pre-wrap">{p.bio}</p></section>}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card"><h2 className="text-xl font-bold">Ofrece</h2>
          {p.offers.length === 0 ? <p className="mt-2 text-[#3c3829]">Aún no ofrece habilidades.</p> : <ul className="mt-3 space-y-3">{p.offers.map((s) => (
            <li key={s.id} className="rounded-xl border border-line bg-white p-3">
              <h3 className="font-bold">{s.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">{s.verified && <VerifiedBadge small />}<span className="chip">{s.category}</span><span className="chip chip-info">{LEVELS[s.level]}</span><span className="chip">{MODES[s.mode]}</span></div>
              {s.description && <p className="mt-2 text-sm text-[#3c3829]">{s.description}</p>}
              {!p.isMe && <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => setReq(s)}>Solicitar sesión</button>}
            </li>))}</ul>}
        </section>
        <section className="card"><h2 className="text-xl font-bold">Quiere aprender</h2>
          {p.wants.length === 0 ? <p className="mt-2 text-[#3c3829]">Sin intereses indicados.</p> : <ul className="mt-3 space-y-2">{p.wants.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2"><strong>{s.name}</strong><span className="chip">{LEVELS[s.level]}</span><span className="chip">{MODES[s.mode]}</span></li>)}</ul>}
          <h2 className="mt-6 text-xl font-bold">Disponibilidad semanal</h2>
          <div className="mt-2"><AvailabilityView slots={p.availability} /></div>
        </section>
      </div>
      {p.accreditations?.length > 0 && (
        <section className="card mt-6"><h2 className="text-xl font-bold">Habilidades verificadas</h2>
          <ul className="mt-3 space-y-2">{p.accreditations.map((a, i) => <li key={i} className="flex flex-wrap items-center gap-2 text-sm"><VerifiedBadge small /><span className="chip chip-ok">{a.skill_name}</span><span>{a.title}</span><span className="chip">{ACC_KINDS[a.kind] || a.kind}</span></li>)}</ul>
          <p className="hint mt-3">Revisión interna de la comunidad, no es una certificación profesional.</p>
        </section>
      )}
      <h2 className="mb-3 mt-8 text-2xl font-extrabold">Pasaporte de confianza</h2>
      <PassportStats p={p} />
      {req && <RequestModal person={{ id: p.id, name: p.name }} skill={req} onClose={() => setReq(null)} onDone={reload} />}
      {rep && <ReportModal person={p} onClose={() => setRep(false)} />}
    </>
  );
}

function ReportModal({ person, onClose }) {
  const toast = useToast();
  const [reason, setReason] = useState("Comportamiento inapropiado");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api("/report", { method: "POST", body: { reported: person.id, reason, details } }); toast("Gracias. Moderación revisará tu reporte."); onClose(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Reportar a ${person.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Motivo">{(p) => <select {...p} className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{["Comportamiento inapropiado", "Contenido ofensivo", "Suplantación o datos falsos", "Pide dinero real", "Incumplimiento de acuerdos", "Otro motivo"].map((r) => <option key={r}>{r}</option>)}</select>}</Field>
        <Field label="Detalles">{(p) => <textarea {...p} className="input" rows={4} maxLength={1500} value={details} onChange={(e) => setDetails(e.target.value)} />}</Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-dark" disabled={busy}>Enviar reporte</button></div>
      </form>
    </Modal>
  );
}
