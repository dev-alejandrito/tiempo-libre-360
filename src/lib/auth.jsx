import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation } from "./router";
import { supabase } from "@/integrations/supabase/client";
import { setAuthRecord } from "./pb";
import { tlLoginCheck, tlLoginResult } from "./tl-api.functions";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Perfil + rol de la persona con sesión (el rol vive en una tabla aparte y protegida).
async function loadRecord(user) {
  const [{ data: m }, { data: roles }] = await Promise.all([
    supabase.from("members").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (!m) return null;
  const rs = (roles || []).map((r) => r.role);
  const role = rs.includes("admin") ? "admin" : rs.includes("moderator") ? "moderator" : "user";
  return { ...m, email: m.email || user.email || "", role };
}

function authError(error) {
  const msg = String(error?.message || "");
  const e = new Error(msg);
  if (/banned/i.test(msg)) { e.status = 403; e.message = "Tu cuenta está suspendida. Contacta con la comunidad."; }
  else if (/not confirmed/i.test(msg)) { e.status = 403; e.message = "Esta cuenta anterior aún no está habilitada. Utiliza la recuperación de contraseña o contacta con administración."; }
  else if (/invalid login credentials/i.test(msg)) { e.status = 400; e.message = "Correo o contraseña incorrectos."; }
  else if (/rate limit|too many/i.test(msg)) { e.status = 429; e.message = "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."; }
  else if (/already registered|already exists/i.test(msg)) { e.status = 400; e.message = "Ese correo ya tiene una cuenta o no es válido."; }
  else if (/password/i.test(msg) && /(least|short|weak|characters)/i.test(msg)) { e.status = 400; e.message = "La contraseña debe tener al menos 8 caracteres y no ser una contraseña común."; }
  else { e.status = error?.status || 400; e.message = msg || "No se pudo completar la operación."; }
  return e;
}

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null);
  const [idle, setIdle] = useState(false);
  const [ready, setReady] = useState(false);
  const userRef = useRef(null);

  const apply = useCallback(async (session) => {
    const user = session?.user || null;
    userRef.current = user;
    if (!user) { setAuthRecord(null, ""); setMe(null); setReady(true); return null; }
    let rec = null;
    try { rec = await loadRecord(user); } catch (_) { rec = null; }
    if (rec && rec.status === "suspended") { await supabase.auth.signOut(); setAuthRecord(null, ""); setMe(null); setReady(true); return null; }
    setAuthRecord(rec, session.access_token);
    setMe(rec);
    setReady(true);
    return rec;
  }, []);

  useEffect(() => {
    let live = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === "TOKEN_REFRESHED" && session && userRef.current?.id === session.user.id) { setAuthRecord(undefined, session.access_token); return; }
      setTimeout(() => { if (live) apply(session); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => { if (live) apply(data.session); });
    const onChanged = () => supabase.auth.getSession().then(({ data }) => apply(data.session));
    window.addEventListener("tl-me-changed", onChanged);
    return () => { live = false; sub.subscription.unsubscribe(); window.removeEventListener("tl-me-changed", onChanged); };
  }, [apply]);

  // Cierre de sesión por inactividad (30 min) y al volver a la pestaña tras mucho tiempo.
  useEffect(() => {
    if (!me) return undefined;
    const LIMIT = 30 * 60 * 1000;
    let last = Date.now();
    const stamp = () => { last = Date.now(); };
    const check = () => { if (Date.now() - last > LIMIT) { setIdle(true); supabase.auth.signOut(); } };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"];
    evs.forEach((n) => window.addEventListener(n, stamp, { passive: true }));
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(check, 30000);
    return () => { evs.forEach((n) => window.removeEventListener(n, stamp)); document.removeEventListener("visibilitychange", onVis); clearInterval(t); };
  }, [me]);

  const login = useCallback(async (email, password) => {
    const lock = await tlLoginCheck({ data: { email } }).catch(() => ({ locked: false }));
    if (lock.locked) { const e = new Error(lock.message); e.status = 429; throw e; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (/invalid login credentials/i.test(error.message || "")) await tlLoginResult({ data: { email, ok: false } }).catch(() => {});
      throw authError(error);
    }
    await tlLoginResult({ data: { email, ok: true } }).catch(() => {});
    setIdle(false);
    const rec = await apply(data.session);
    if (!rec) { const e = new Error("Tu cuenta está suspendida o no está disponible. Contacta con la comunidad."); e.status = 403; throw e; }
    return rec;
  }, [apply]);

  // Lovable Cloud permite acceso inmediato; nunca fingimos una sesión si el registro no la devuelve.
  const register = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } });
    if (error) throw authError(error);
    if (!data.session) throw new Error("No se pudo abrir tu sesión. Intenta iniciar sesión o recuperar tu contraseña.");
    const rec = await apply(data.session);
    if (!rec) throw new Error("Tu cuenta no está disponible. Contacta con administración.");
    return { confirmed: true };
  }, [apply]);

  const logout = useCallback(() => { supabase.auth.signOut(); }, []);
  const refresh = useCallback(async () => { const { data } = await supabase.auth.getSession(); return apply(data.session); }, [apply]);

  const role = me?.role || "user";
  const value = { me, ready, idle, login, register, logout, refresh, isStaff: role === "admin" || role === "moderator", isAdmin: role === "admin" };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function RequireAuth({ children, staff, admin }) {
  const { me, ready, isStaff, isAdmin } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="p-10 text-center">Cargando…</div>;
  if (!me) return <Navigate to="/ingresar" state={{ from: loc.pathname + (loc.search || "") }} replace />;
  if ((staff && !isStaff) || (admin && !isAdmin)) return <Navigate to="/app" replace />;
  return children;
}
