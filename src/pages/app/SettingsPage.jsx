import { useState } from "react";
import { Link } from "@/lib/router";
import { Alert, Field, PageHeader, useToast } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { api, errMsg } from "../../lib/pb";
import { supabase } from "@/integrations/supabase/client";
import PasswordInput from "../../components/PasswordInput";

export default function SettingsPage() {
  const { me, logout, refresh } = useAuth();
  const toast = useToast();
  const [pw, setPw] = useState({ old: "", next: "", again: "" });
  const [pwErr, setPwErr] = useState("");
  const [ph, setPh] = useState({ phone: me.phone || "", whatsapp: !!me.notify_whatsapp, sms: !!me.notify_sms });
  const [phErr, setPhErr] = useState("");
  const [busy, setBusy] = useState("");

  async function changePw(e) {
    e.preventDefault(); setPwErr("");
    if (pw.next.length < 8) return setPwErr("La nueva contraseña debe tener al menos 8 caracteres.");
    if (pw.next !== pw.again) return setPwErr("Las contraseñas nuevas no coinciden.");
    setBusy("pw");
    try {
      // Se comprueba la contraseña actual antes de cambiarla.
      const check = await supabase.auth.signInWithPassword({ email: me.email, password: pw.old });
      if (check.error) throw Object.assign(new Error("La contraseña actual no es correcta."), { status: 400 });
      const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.old });
      if (error) throw new Error(/current/i.test(error.message || "") ? "La contraseña actual no es correcta." : "No se pudo cambiar: elige una contraseña más segura (mínimo 8 caracteres).");
      setPw({ old: "", next: "", again: "" }); toast("Contraseña actualizada.");
    } catch (err) { setPwErr(errMsg(err)); } finally { setBusy(""); }
  }
  async function savePhone(e) {
    e.preventDefault(); setPhErr(""); setBusy("ph");
    try { await api("/phone", { method: "POST", body: ph }); await refresh(); toast("Preferencias de avisos guardadas."); } catch (err) { setPhErr(err.message); } finally { setBusy(""); }
  }
  return (
    <>
      <PageHeader title="Configuración" subtitle="Tu cuenta, tu seguridad y cómo quieres recibir avisos." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-3">
          <h2 className="text-xl font-bold">Tu cuenta</h2>
          <p><strong>Nombre:</strong> {me.name}</p>
          <p><strong>Correo:</strong> {me.email}</p>
          <p className="hint">Tu correo nunca se muestra a otras personas. Para cambiar tu nombre, titular o ubicación ve a <Link className="font-bold underline" to="/app/perfil">tu perfil</Link>.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Cerrar sesión</button>
        </section>
        <form onSubmit={changePw} className="card space-y-3">
          <h2 className="text-xl font-bold">Seguridad</h2>
          <p className="hint">Elige una contraseña personal y permanente: la usarás siempre con tu correo para entrar. Se guarda cifrada y nadie, ni la administración, puede verla.</p>
          <h3 className="font-bold">Cambiar contraseña</h3>
          <Field label="Contraseña actual">{(p) => <PasswordInput {...p} className="input" autoComplete="current-password" required value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} />}</Field>
          <Field label="Nueva contraseña" hint="Mínimo 8 caracteres.">{(p) => <PasswordInput {...p} className="input" autoComplete="new-password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
          <Field label="Repite la nueva contraseña">{(p) => <PasswordInput {...p} className="input" autoComplete="new-password" required value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} />}</Field>
          {pwErr && <Alert kind="error">{pwErr}</Alert>}
          <button className="btn btn-dark" disabled={busy === "pw"}>Actualizar contraseña</button>
        </form>
      </div>
    </>
  );
}
