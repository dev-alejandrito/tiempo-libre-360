import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "@/lib/router";
import { Alert, Field, Logo } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { errMsg } from "../../lib/pb";
import { supabase } from "@/integrations/supabase/client";

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[80vh] md:grid-cols-2">
      <div className="dark-surface grain hidden flex-col justify-between bg-ink p-10 text-white md:flex">
        <Logo light />
        <div><h2 className="text-4xl font-extrabold leading-tight">Tu tiempo tiene valor.<br /><span className="text-amber">Tus conocimientos también.</span></h2><p className="mt-4 max-w-sm text-[#d5deec]">1 minuto de servicio = 1 crédito. Sin dinero, sin tienda, para todos.</p></div>
        <p className="text-sm text-[#b9c6da]">Tus datos privados siempre quedan protegidos.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 text-[#3c3829]">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { login, me, idle } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: "", password: "" });
  const [state, setState] = useState({ busy: false, error: "" });
  if (me) return <Navigate to={loc.state?.from || "/app"} replace />;
  async function submit(e) {
    e.preventDefault(); setState({ busy: true, error: "" });
    try { await login(f.email.trim(), f.password); nav(loc.state?.from || "/app", { replace: true }); }
    catch (err) { setState({ busy: false, error: errMsg(err) }); }
  }
  return (
    <Shell title="Iniciar sesión" subtitle="Bienvenido de nuevo." footer={<>¿No tienes cuenta? <Link to="/registro" className="font-bold underline">Regístrate</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Correo electrónico">{(p) => <input {...p} className="input" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Contraseña">{(p) => <input {...p} className="input" type="password" autoComplete="current-password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
        {idle && !state.error && <Alert kind="info">Cerramos tu sesión por inactividad para proteger tu cuenta. Vuelve a iniciar sesión.</Alert>}
        {state.error && <Alert kind="error">{state.error}</Alert>}
        <button className="btn btn-primary w-full" disabled={state.busy}>{state.busy ? "Entrando…" : "Entrar"}</button>
        <p className="text-center text-sm"><Link to="/recuperar" className="font-bold underline">¿Olvidaste tu contraseña?</Link></p>
      </form>
    </Shell>
  );
}

export function Register() {
  const { register, me } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", agree: false });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, error: "" });
  const [sent, setSent] = useState("");
  if (me) return <Navigate to="/app" replace />;
  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = "Escribe tu nombre.";
    if (f.password.length < 8) er.password = "Usa al menos 8 caracteres.";
    if (!f.agree) er.agree = "Necesitamos que aceptes las normas de convivencia.";
    setErrors(er);
    if (Object.keys(er).length) return;
    setState({ busy: true, error: "" });
    try {
      const r = await register({ name: f.name.trim(), email: f.email.trim(), password: f.password });
      if (r?.confirmed) nav("/app/perfil", { replace: true });
      else { setSent(f.email.trim()); setState({ busy: false, error: "" }); }
    }
    catch (err) { setState({ busy: false, error: errMsg(err) }); }
  }
  if (sent) return (
    <Shell title="Revisa tu correo" subtitle="Ya casi está lista tu cuenta." footer={<>¿Ya confirmaste? <Link to="/ingresar" className="font-bold underline">Inicia sesión</Link></>}>
      <Alert kind="info">Te enviamos un enlace de confirmación a <strong>{sent}</strong>. Ábrelo para activar tu cuenta; después podrás entrar con tu correo y contraseña. Si no lo ves, revisa la carpeta de spam.</Alert>
    </Shell>
  );
  return (
    <Shell title="Crea tu cuenta" subtitle="Gratis. Recibirás créditos de bienvenida." footer={<>¿Ya tienes cuenta? <Link to="/ingresar" className="font-bold underline">Inicia sesión</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nombre y apellido" error={errors.name}>{(p) => <input {...p} className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
        <Field label="Correo electrónico">{(p) => <input {...p} className="input" type="email" autoComplete="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres." error={errors.password}>{(p) => <input {...p} className="input" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
        <div>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} aria-invalid={errors.agree ? "true" : undefined} /><span className="text-sm">Acepto tratar a todas las personas con respeto, no usar dinero real en los intercambios y que mis datos se usen para conectar con la comunidad. He leído el <Link to="/legal/privacidad" target="_blank" className="font-bold underline">Aviso de privacidad</Link>, los <Link to="/legal/terminos" target="_blank" className="font-bold underline">Términos y condiciones</Link>, las <Link to="/legal/convivencia" target="_blank" className="font-bold underline">Normas de convivencia</Link> y la información sobre <Link to="/legal/creditos" target="_blank" className="font-bold underline">créditos</Link>.</span></label>
          {errors.agree && <p className="mt-1 text-sm font-semibold text-danger">{errors.agree}</p>}
        </div>
        {state.error && <Alert kind="error">{state.error}</Alert>}
        <button className="btn btn-primary w-full" disabled={state.busy}>{state.busy ? "Creando…" : "Crear mi cuenta"}</button>
      </form>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/restablecer" }); } catch (_) { /* mensaje genérico: nunca revelamos si el correo existe */ }
    setBusy(false); setDone(true);
  }
  return (
    <Shell title="Recuperar contraseña" subtitle="Escribe el correo con el que te registraste." footer={<Link to="/ingresar" className="font-bold underline">Volver a iniciar sesión</Link>}>
      {done ? (
        <Alert kind="info">Si ese correo tiene una cuenta, recibirás un enlace de un solo uso para elegir una contraseña nueva. Revisa también la carpeta de spam. Si no llega en unos minutos, escribe al administrador desde la página de Contacto.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Correo electrónico">{(p) => <input {...p} className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Enviando…" : "Solicitar enlace"}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [f, setF] = useState({ password: "", confirm: "" }); const [state, setState] = useState({ busy: false, error: "", ok: false });
  // El enlace del correo abre una sesión temporal de recuperación.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY" || session) setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const t = setTimeout(() => setReady((r) => r || false), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (f.password.length < 8) return setState({ busy: false, error: "La contraseña debe tener al menos 8 caracteres.", ok: false });
    if (f.password !== f.confirm) return setState({ busy: false, error: "Las contraseñas no coinciden.", ok: false });
    setState({ busy: true, error: "", ok: false });
    const { error } = await supabase.auth.updateUser({ password: f.password });
    if (error) return setState({ busy: false, error: /session|expired|invalid/i.test(error.message || "") ? "El enlace no es válido, ya se usó o caducó. Solicita uno nuevo." : "No se pudo cambiar la contraseña: elige una más segura (mínimo 8 caracteres).", ok: false });
    setState({ busy: false, error: "", ok: true });
    await supabase.auth.signOut();
    setTimeout(() => nav("/ingresar", { replace: true }), 2500);
  }
  return (
    <Shell title="Nueva contraseña" subtitle="Elige una contraseña nueva para tu cuenta." footer={<Link to="/recuperar" className="font-bold underline">Solicitar un enlace nuevo</Link>}>
      {state.ok ? <Alert kind="info">Contraseña actualizada. Ya puedes iniciar sesión.</Alert> : (
        <form onSubmit={submit} className="space-y-4">
          {!ready && <Alert kind="info">Abre esta página desde el enlace que te enviamos por correo. Si ya lo hiciste y no avanza, solicita un enlace nuevo.</Alert>}
          <Field label="Contraseña nueva">{(p) => <input {...p} className="input" type="password" autoComplete="new-password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />}</Field>
          <Field label="Confirmar contraseña">{(p) => <input {...p} className="input" type="password" autoComplete="new-password" required minLength={8} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />}</Field>
          {state.error && <Alert kind="error">{state.error}</Alert>}
          <button className="btn btn-primary w-full" disabled={state.busy || !ready}>{state.busy ? "Guardando…" : "Cambiar contraseña"}</button>
        </form>
      )}
    </Shell>
  );
}
