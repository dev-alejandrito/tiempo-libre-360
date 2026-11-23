import { CircleCheck, Phone, Mail } from "lucide-react";
import { useState } from "react";

import { Alert, Field, PageHeader } from "../../components/ui";

import WhatsAppButton from "../../components/WhatsAppButton";

import { api } from "../../lib/pb";
import SocialLinks from "../../components/SocialLinks";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "../../lib/contact";

function CopyButton({ value, label }) {
  const [ok, setOk] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 2000); } catch (_) { window.prompt(label, value); }
  }
  return <button type="button" onClick={copy} className="btn btn-ghost min-h-11 text-sm" aria-live="polite">{ok ? "Copiado" : label}</button>;
}

export default function Contact() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" });
  const [state, setState] = useState({ busy: false, done: false, error: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (state.busy) return;
    if (f.name.trim().length < 2) return setState({ busy: false, done: false, error: "Escribe tu nombre." });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setState({ busy: false, done: false, error: "Escribe un correo válido para poder responderte." });
    if (f.subject.trim().length < 3) return setState({ busy: false, done: false, error: "Escribe un asunto (mínimo 3 caracteres)." });
    if (f.message.trim().length < 10) return setState({ busy: false, done: false, error: "Cuéntanos un poco más en tu mensaje (mínimo 10 caracteres)." });
    setState({ busy: true, done: false, error: "" });
    try { await api("/public/contact", { method: "POST", body: f }); setState({ busy: false, done: true, error: "" }); setF({ name: "", email: "", subject: "", message: "" }); }
    catch (err) { setState({ busy: false, done: false, error: err.message }); }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader title="Contacto" subtitle="¿Dudas, ideas o problemas? Escríbenos y lo revisará el equipo de la comunidad." />
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <form onSubmit={submit} className="card space-y-4">
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><label>No rellenar este campo<input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website || ""} onChange={set("website")} /></label></div>
          <Field label="Tu nombre">{(p) => <input {...p} className="input" required value={f.name} onChange={set("name")} autoComplete="name" />}</Field>
          <Field label="Tu correo" hint="Solo lo usamos para responderte.">{(p) => <input {...p} className="input" type="email" required value={f.email} onChange={set("email")} autoComplete="email" />}</Field>
          <Field label="Asunto">{(p) => <input {...p} className="input" required minLength={3} value={f.subject} onChange={set("subject")} maxLength={150} />}</Field>
          <Field label="Mensaje">{(p) => <textarea {...p} className="input" rows={6} required minLength={10} maxLength={3000} value={f.message} onChange={set("message")} />}</Field>
          {state.error && <Alert kind="error">{state.error}</Alert>}
          {state.done && <Alert kind="ok">Gracias, recibimos tu mensaje. El equipo lo tiene guardado y te responderá en cuanto pueda.</Alert>}
          <button className="btn btn-primary" disabled={state.busy}>{state.busy ? "Enviando…" : "Enviar mensaje"}</button>
        </form>
        <div className="space-y-6">
        <section className="card" aria-labelledby="contacto-directo">
          <h2 id="contacto-directo" className="text-xl font-bold">Contacto directo</h2>
          <ul className="mt-4 space-y-3">
            <li className="flex flex-wrap items-center gap-2"><a className="flex min-h-11 items-center gap-3 font-semibold text-ink hover:underline" href={"tel:" + CONTACT_PHONE_TEL} target="_blank" rel="noopener noreferrer"><Phone size={20} aria-hidden="true" /> Teléfono: {CONTACT_PHONE_DISPLAY}</a><CopyButton value={CONTACT_PHONE_DISPLAY} label="Copiar teléfono" /></li>
            <li><WhatsAppButton /></li>
            <li className="flex flex-wrap items-center gap-2"><a className="flex min-h-11 items-center gap-3 break-all font-semibold text-ink hover:underline" href={"mailto:" + CONTACT_EMAIL} target="_blank" rel="noopener noreferrer"><Mail size={20} aria-hidden="true" /> {CONTACT_EMAIL}</a><CopyButton value={CONTACT_EMAIL} label="Copiar correo" /></li>
          </ul>
          <h3 className="mt-5 font-bold">Redes sociales</h3>
          <SocialLinks className="mt-2" empty={<p className="hint mt-2">Las redes sociales se mostrarán aquí en cuanto se configuren.</p>} />
        </section>
        <aside className="card-dark dark-surface h-fit">
          <CircleCheck size={28} className="text-mint" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold">Tu mensaje queda guardado</h2>
          <p className="mt-2 text-[#d5deec]">Cada mensaje llega al panel de administración de la comunidad. Si ya tienes cuenta, también puedes reportar un problema directamente desde el perfil de una persona.</p>
        </aside>
        </div>
      </div>
    </div>
  );
}
