// Despachador de /api/tl/* (mismas rutas que el servidor original).
import { getRequest } from "@tanstack/react-start/server";
import { db, q, TLError, fail, loadMe, str, isStaff, isAdmin } from "./core.server.js";
import * as M from "./main.server.js";
import * as X from "./ext.server.js";

// [método, patrón, nivel ("open" | "auth" | "staff" | "admin"), handler(ctx)]
const ROUTES = [
  ["GET", "/public/stats", "open", () => M.publicStats()],
  ["GET", "/public/explore", "open", async ({ query }) => ({ items: (await M.peopleSearch(null, query)).map((i) => ({ ...i, lat: null, lng: null })) })],
  ["GET", "/public/community", "open", () => M.publicCommunity()],
  ["POST", "/public/contact", "open", ({ body }) => M.contact(body)],

  ["GET", "/me/dashboard", "auth", ({ me }) => M.dashboard(me)],
  ["POST", "/me/reminders", "auth", ({ me }) => M.reminders(me)],
  ["GET", "/matches", "auth", async ({ me }) => ({ items: await M.matches(me) })],
  ["GET", "/people", "auth", async ({ me, query }) => ({ items: await M.peopleSearch(me, query) })],
  ["GET", "/person/:id", "auth", ({ me, p }) => M.personView(me, p.id)],
  ["GET", "/exchanges", "auth", ({ me }) => M.listExchanges(me)],
  ["GET", "/exchanges/:id", "auth", ({ me, p }) => M.exchangeDetail(me, p.id)],
  ["POST", "/exchanges", "auth", ({ me, body }) => M.createExchange(me, body)],
  ["POST", "/exchanges/:id/:action", "auth", ({ me, p, body }) => M.exchangeAction(me, p.id, p.action, body)],
  ["GET", "/challenges", "auth", async ({ me }) => { const s = await M.stats(me.id); return { items: await M.challengesFor(me, s), passport: s }; }],
  ["POST", "/challenges/:id/claim", "auth", ({ me, p }) => M.claimChallenge(me, p.id)],
  ["POST", "/notifications/read-all", "auth", async ({ me }) => { await q(db.from("notifications").update({ read: true }).eq("member", me.id).eq("read", false)); return { ok: true }; }],
  ["POST", "/report", "auth", ({ me, body }) => M.report(me, body)],
  ["POST", "/phone", "auth", ({ me, body }) => M.savePhone(me, body)],
  ["GET", "/availability/:id", "auth", ({ me, p, query }) => M.freeSlots(me, p.id, parseInt(query.minutes || "60", 10))],

  ["GET", "/admin/stats", "admin", () => M.adminStats()],
  ["GET", "/admin/suspicious", "staff", () => M.suspicious()],
  ["GET", "/admin/reconcile", "admin", () => M.reconcile()],
  ["GET", "/admin/classes", "staff", () => M.adminClasses()],
  ["POST", "/admin/user/:id/role", "admin", ({ me, p, body }) => M.adminRole(me, p.id, body)],
  ["POST", "/admin/user/:id/status", "staff", ({ me, p, body }) => M.adminStatus(me, p.id, body)],
  ["POST", "/admin/user/:id/verify", "admin", ({ me, p, body }) => M.adminVerify(me, p.id, body)],
  ["POST", "/admin/user/:id/credits", "admin", ({ me, p, body }) => M.adminCredits(me, p.id, body)],
  ["POST", "/admin/skill/:id/hide", "staff", ({ me, p, body }) => M.adminSkillHide(me, p.id, body)],
  ["POST", "/admin/report/:id/resolve", "staff", ({ me, p, body }) => M.adminReportResolve(me, p.id, body)],
  ["POST", "/admin/post/:id/hide", "staff", ({ me, p, body }) => M.adminPostHide(me, p.id, body)],
  ["GET", "/admin/integrations", "admin", () => M.integrationsGet()],
  ["POST", "/admin/integrations", "admin", ({ me, body }) => M.integrationsSave(me, body)],
  ["GET", "/admin/contact/:id/replies", "admin", ({ p }) => M.contactReplies(p.id)],
  ["POST", "/admin/contact/reply/:rid/confirm", "admin", ({ me, p }) => M.contactReplyConfirm(me, p.rid)],
  ["POST", "/admin/contact/:id/status", "admin", ({ me, p, body }) => M.contactStatus(me, p.id, body)],
  ["POST", "/admin/contact/:id/reply", "admin", ({ me, p, body }) => M.contactReply(me, p.id, body)],

  ["GET", "/accred", "auth", ({ me }) => X.acList(me)],
  ["POST", "/accred", "auth", ({ me, body }) => X.acCreate(me, body)],
  ["POST", "/accred/:id/resubmit", "auth", ({ me, p, body }) => X.acResubmit(me, p.id, body)],
  ["GET", "/admin/accred", "staff", ({ query }) => X.acAdminList(str(query.status, 20))],
  ["POST", "/admin/accred/:id/review", "staff", ({ me, p, body }) => X.acReview(me, p.id, body)],

  ["POST", "/feedback", "auth", ({ me, body }) => X.fbCreate(me, body)],
  ["GET", "/feedback", "auth", ({ me }) => X.fbList(me)],
  ["GET", "/feedback/:id", "auth", ({ me, p }) => X.fbGet(me, p.id)],
  ["POST", "/feedback/:id/reply", "auth", ({ me, p, body }) => X.fbUserReply(me, p.id, body)],
  ["GET", "/admin/feedback", "staff", ({ query }) => X.fbAdminList(str(query.status, 20), str(query.category, 20))],
  ["POST", "/admin/feedback/:id/reply", "staff", ({ me, p, body }) => X.fbStaffReply(me, p.id, body)],
  ["POST", "/admin/feedback/:id/status", "staff", ({ me, p, body }) => X.fbStatus(me, p.id, body)],

  ["GET", "/private/offers", "auth", ({ me }) => X.offersList(me)],
  ["GET", "/private/mine", "auth", ({ me }) => X.privateMine(me)],
  ["POST", "/private/offers", "auth", ({ me, body }) => X.offerSave(me, body)],
  ["POST", "/private/offers/:id/toggle", "auth", ({ me, p }) => X.offerToggle(me, p.id)],
  ["POST", "/private/bookings", "auth", ({ me, body }) => X.bkCreate(me, body)],
  ["POST", "/private/bookings/:id/:action", "auth", ({ me, p, body }) => X.bkAction(me, p.id, p.action, body)],
  ["GET", "/admin/private", "staff", ({ me, query }) => X.privateAdminList(me, str(query.status, 20))],
  ["POST", "/admin/private/:id/resolve", "staff", ({ me, p, body }) => X.bkResolve(me, p.id, body)],

  ["GET", "/chat", "auth", ({ me }) => X.chatList(me)],
  ["POST", "/chat/start", "auth", ({ me, body }) => X.chatStart(me, body)],
  ["POST", "/chat/message/:mid/:action", "auth", ({ me, p }) => X.chatProposalAction(me, p.mid, p.action)],
  ["GET", "/chat/:id", "auth", ({ me, p }) => X.chatGet(me, p.id)],
  ["POST", "/chat/:id/send", "auth", ({ me, p, body }) => X.chatSend(me, p.id, body)],
  ["POST", "/chat/:id/propose", "auth", ({ me, p, body }) => X.chatPropose(me, p.id, body)],
];

function match(pattern, path) {
  const a = pattern.split("/"), b = path.split("/");
  if (a.length !== b.length) return null;
  const params = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) { if (!b[i]) return null; params[a[i].slice(1)] = decodeURIComponent(b[i]); }
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

// Identidad verificada a partir del token de sesión (si lo hay).
async function currentUserId() {
  const req = getRequest();
  const h = req && req.headers ? req.headers.get("authorization") : "";
  if (!h || !h.startsWith("Bearer ")) return null;
  const token = h.slice(7);
  if (token.split(".").length !== 3) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user.id;
}

export async function handleTl({ path, method, body, query }) {
  try {
    const clean = "/" + String(path || "").split("?")[0].replace(/^\/+|\/+$/g, "");
    let route = null, params = null;
    for (const r of ROUTES) { if (r[0] !== method) continue; const p = match(r[1], clean); if (p) { route = r; params = p; break; } }
    if (!route) fail("No encontrado.", 404);
    const ctx = { p: params, body: body && typeof body === "object" ? body : {}, query: query && typeof query === "object" ? Object.fromEntries(Object.entries(query).map(([k, v]) => [k, v === undefined || v === null ? "" : String(v)])) : {}, me: null };
    if (route[2] !== "open") {
      const uid = await currentUserId();
      if (!uid) fail("Inicia sesión para continuar.", 401);
      const me = await loadMe(uid);
      if (!me) fail("Inicia sesión para continuar.", 401);
      if (me.status === "suspended") fail("Tu cuenta está suspendida. Contacta con la comunidad.", 403);
      if (route[2] === "staff" && !isStaff(me)) fail("No tienes permisos para esta acción.", 403);
      if (route[2] === "admin" && !isAdmin(me)) fail("Solo la administración puede hacer esto.", 403);
      ctx.me = me;
    }
    const out = await route[3](ctx);
    return { ok: true, status: 200, message: "", json: JSON.stringify(out === undefined ? { ok: true } : out) };
  } catch (err) {
    if (err instanceof TLError) return { ok: false, status: err.code, message: err.message, json: "null" };
    console.error("tl error", err);
    return { ok: false, status: 500, message: "Ocurrió un problema inesperado. Inténtalo de nuevo.", json: "null" };
  }
}

// ----- protección de inicio de sesión: 5 fallos en 15 min => 15 min de bloqueo (por correo) -----
const MAX = 5, WINDOW = 15 * 60000, LOCK = 15 * 60000;
export async function loginCheck(email) {
  const id = String(email || "").trim().toLowerCase().slice(0, 200);
  if (!id) return { locked: false };
  const rec = await q(db.from("login_attempts").select("*").eq("identity", id).maybeSingle());
  const now = Date.now();
  if (rec && Number(rec.locked_until) > now) {
    const minutes = Math.max(1, Math.ceil((Number(rec.locked_until) - now) / 60000));
    return { locked: true, message: "Demasiados intentos fallidos. Por seguridad, espera " + minutes + " minuto(s) antes de volver a intentarlo o usa «¿Olvidaste tu contraseña?»." };
  }
  return { locked: false };
}
export async function loginResult(email, ok) {
  const id = String(email || "").trim().toLowerCase().slice(0, 200);
  if (!id) return { ok: true };
  const now = Date.now();
  const rec = await q(db.from("login_attempts").select("*").eq("identity", id).maybeSingle());
  if (ok) {
    // Solo se reinicia si la sesión de quien llama corresponde a ese correo.
    const uid = await currentUserId();
    if (!uid) return { ok: true };
    const me = await loadMe(uid);
    if (!me || me.email !== id) return { ok: true };
    if (rec) await q(db.from("login_attempts").update({ fails: 0, locked_until: 0 }).eq("identity", id));
    return { ok: true };
  }
  const fresh = rec && Number(rec.last_fail) > 0 && now - Number(rec.last_fail) < WINDOW;
  let fails = (fresh ? Number(rec.fails) : 0) + 1, locked = rec ? Number(rec.locked_until) : 0;
  if (fails >= MAX) { locked = now + LOCK; fails = 0; }
  await q(db.from("login_attempts").upsert({ identity: id, fails, last_fail: now, locked_until: locked }, { onConflict: "identity" }));
  return { ok: true };
}
