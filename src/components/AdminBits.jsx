import { useState } from "react";
import { Alert, Field, Modal, useToast } from "./ui";
import { api } from "../lib/pb";

// Small modal that asks for a written reason and then runs an action.
export function ReasonModal({ title, label, button, danger, path, extra = {}, field = "reason", minLen = 5, success = "Acción registrada con su motivo.", onClose, onDone, children }) {
  const toast = useToast();
  const [v, setV] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api(path, { method: "POST", body: { ...extra, [field]: v } }); toast(success); onDone?.(); onClose(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {children}
        <Field label={label}>{(p) => <textarea {...p} className="input" rows={3} minLength={minLen} maxLength={500} required value={v} onChange={(e) => setV(e.target.value)} />}</Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button><button className={`btn ${danger ? "btn-danger" : "btn-dark"}`} disabled={busy}>{busy ? "Guardando…" : button}</button></div>
      </form>
    </Modal>
  );
}

export function ResolveConflictModal({ ex, onClose, onDone }) {
  const toast = useToast();
  const [outcome, setOutcome] = useState("refund_requester");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setError("");
    try { await api(`/exchanges/${ex.id}/resolve`, { method: "POST", body: { outcome, note } }); toast("Conflicto resuelto."); onDone(); onClose(); } catch (err) { setError(err.message); }
  }
  return (
    <Modal title="Resolver conflicto" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl bg-sand p-3 text-sm"><strong>{ex.skill_name}</strong> · {ex.minutes} créditos ({ex.minutes} min) en custodia</p>
        <fieldset className="space-y-2"><legend className="label">Decisión</legend>
          <label className="flex items-start gap-3"><input type="radio" className="mt-1 h-5 w-5" checked={outcome === "refund_requester"} onChange={() => setOutcome("refund_requester")} /><span>Devolver los créditos a quien los reservó (la sesión no se realizó).</span></label>
          <label className="flex items-start gap-3"><input type="radio" className="mt-1 h-5 w-5" checked={outcome === "pay_provider"} onChange={() => setOutcome("pay_provider")} /><span>Liberar los créditos a quien impartió la sesión (se realizó).</span></label>
        </fieldset>
        <Field label="Justificación (la verán ambas personas)">{(p) => <textarea {...p} className="input" rows={3} required minLength={5} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        {error && <Alert kind="error">{error}</Alert>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Volver</button><button className="btn btn-dark">Confirmar decisión</button></div>
      </form>
    </Modal>
  );
}

export const personLabel = (m) => (m ? `${m.name}` : "—");
