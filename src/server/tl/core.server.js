// TIEMPO LIBRE 360 — lógica compartida del servidor (antes pb_hooks/tl_lib.js).
// Todo movimiento de créditos pasa por move() -> función tl_move de la base de datos
// (libro primero, clave única, nunca negativo).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const db = supabaseAdmin;

export class TLError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export function fail(msg, code) { throw new TLError(code || 400, msg); }

export function dbError(e) {
  const m = String((e && e.message) || e || "");
  const t = m.match(/TL:(\d+):(.*)$/);
  if (t) return new TLError(parseInt(t[1], 10), t[2]);
  if (e && e.code === "P0001" && m) return new TLError(400, m);
  const err = new Error(m || "db error"); err.pg = e; return err;
}
// Ejecuta una consulta y devuelve data o lanza el error.
export async function q(builder) {
  const { data, error } = await builder;
  if (error) throw dbError(error);
  return data;
}
// Recorre todas las páginas (la API devuelve 1000 filas por petición).
export async function all(build, max = 100000) {
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    const rows = await q(build().range(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

// ---------- helpers ----------
export function str(v, max) { return String(v === undefined || v === null ? "" : v).trim().slice(0, max || 500); }
export function toDate(s) { return new Date(String(s).replace(" ", "T")); }
export function norm(s) {
  const map = { "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n", "à": "a", "è": "e", "ì": "i", "ò": "o", "ù": "u" };
  return String(s || "").toLowerCase().replace(/[áéíóúüñàèìòù]/g, (c) => map[c]).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
export function displayName(name) {
  const p = String(name || "").trim().split(/\s+/);
  return p.length > 1 ? p[0] + " " + p[1].charAt(0).toUpperCase() + "." : (p[0] || "Miembro");
}
export const LEVELS = { beginner: 1, intermediate: 2, advanced: 3 };
export const LEVEL_ES = { beginner: "principiante", intermediate: "intermedio", advanced: "avanzado" };
export function round1(n) { return Math.round(n * 10) / 10; }
export function num(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }
export function randomString(n, alphabet) {
  const abc = alphabet || "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(n); crypto.getRandomValues(bytes);
  let s = ""; for (let i = 0; i < n; i++) s += abc[bytes[i] % abc.length];
  return s;
}
export function isUuid(v) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || "")); }

export function haversine(a1, o1, a2, o2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (a2 - a1) * rad, dLon = (o2 - o1) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * rad) * Math.cos(a2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function distLabel(km) {
  if (km < 2) return "menos de 2 km";
  if (km <= 10) return "a unos " + Math.ceil(km) + " km";
  return "a unos " + (Math.round(km / 5) * 5) + " km";
}
export function parseAvail(m) { const a = m && m.availability; return Array.isArray(a) ? a : []; }
export function mins(t) { const p = String(t || "0:0").split(":"); return parseInt(p[0], 10) * 60 + (parseInt(p[1], 10) || 0); }
export function overlapHours(a, b) {
  let total = 0;
  for (const x of a) for (const y of b) {
    if (x.day !== y.day) continue;
    const s = Math.max(mins(x.start), mins(y.start)), en = Math.min(mins(x.end), mins(y.end));
    if (en > s) total += (en - s) / 60;
  }
  return round1(total);
}

// ---------- roles ----------
export function isStaff(m) { return !!m && (m.role === "admin" || m.role === "moderator"); }
export function isAdmin(m) { return !!m && m.role === "admin"; }
export async function rolesFor(ids) {
  const out = {};
  if (!ids.length) return out;
  const rows = await q(db.from("user_roles").select("user_id, role").in("user_id", ids));
  const rank = { user: 0, moderator: 1, admin: 2 };
  for (const r of rows) { if (!out[r.user_id] || rank[r.role] > rank[out[r.user_id]]) out[r.user_id] = r.role; }
  return out;
}
export async function loadMe(userId) {
  const m = await q(db.from("members").select("*").eq("id", userId).maybeSingle());
  if (!m) return null;
  const roles = await rolesFor([userId]);
  m.role = roles[userId] || "user";
  return m;
}
export async function getMember(id) {
  if (!isUuid(id)) return null;
  return await q(db.from("members").select("*").eq("id", id).maybeSingle());
}
export async function membersMap(ids) {
  const uniq = [...new Set(ids.filter(isUuid))];
  const out = {};
  for (let i = 0; i < uniq.length; i += 200) {
    const rows = await q(db.from("members").select("*").in("id", uniq.slice(i, i + 200)));
    rows.forEach((r) => { out[r.id] = r; });
  }
  return out;
}
export async function nameOf(id) { const m = await getMember(id); return m ? displayName(m.name) : "Miembro"; }

// ---------- settings ----------
export const DURATIONS = [15, 30, 45, 60, 90, 120];
export function skillDurations(skill) {
  const out = String(skill.durations || "").split(",").map((x) => parseInt(x, 10)).filter((x) => DURATIONS.includes(x));
  return out.length ? out : DURATIONS.slice();
}
const DEFAULTS = { welcome_credits: "120", max_minutes: "120", late_cancel_hours: "12", max_open_requests: "8", community_open: "1", site_name: "TIEMPO LIBRE 360" };
export async function settings() {
  const out = { ...DEFAULTS };
  const rows = await q(db.from("site_settings").select("key, value"));
  rows.forEach((r) => { out[r.key] = r.value; });
  return out;
}

// ---------- auditoría ----------
export async function audit(actor, action, target, detail) {
  try {
    await q(db.from("audit_log").insert({ actor: actor ? actor.id : null, actor_name: actor ? actor.name : "Sistema", action, target: str(target, 200), detail: str(detail, 1000) }));
  } catch (err) { console.error("audit failed", err); }
}

// ---------- notificaciones (en la app + WhatsApp/SMS opcional vía Twilio) ----------
export async function integ() {
  const o = {};
  const rows = await q(db.from("integrations").select("key, value"));
  rows.forEach((r) => { o[r.key] = r.value; });
  return o;
}
async function sendExternal(member, text) {
  try {
    const phone = member.phone;
    if (!phone || !/^\+\d{7,15}$/.test(phone)) return;
    if (!member.notify_whatsapp && !member.notify_sms) return;
    const cfg = await integ();
    if (!cfg.twilio_sid || !cfg.twilio_token) return;
    const jobs = [];
    if (member.notify_whatsapp && cfg.wa_enabled === "1" && cfg.twilio_wa_from) jobs.push(["whatsapp", "whatsapp:" + phone, "whatsapp:" + cfg.twilio_wa_from]);
    if (member.notify_sms && cfg.sms_enabled === "1" && cfg.twilio_sms_from) jobs.push(["sms", phone, cfg.twilio_sms_from]);
    for (const j of jobs) {
      let status = "sent", error = "";
      try {
        const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(cfg.twilio_sid) + "/Messages.json", {
          method: "POST",
          headers: { Authorization: "Basic " + btoa(cfg.twilio_sid + ":" + cfg.twilio_token), "Content-Type": "application/x-www-form-urlencoded" },
          body: "To=" + encodeURIComponent(j[1]) + "&From=" + encodeURIComponent(j[2]) + "&Body=" + encodeURIComponent(text),
        });
        if (res.status >= 300) { status = "failed"; error = "HTTP " + res.status; }
      } catch (err) { status = "failed"; error = String(err).slice(0, 200); }
      await q(db.from("outbound_messages").insert({ member: member.id, channel: j[0], recipient: phone.slice(0, 4) + "•••" + phone.slice(-2), body: text.slice(0, 300), status, error }));
    }
  } catch (err) { console.error("external notify failed", err); }
}
export async function notify(memberId, type, title, body, link, ref) {
  try {
    await q(db.from("notifications").insert({ member: memberId, type, title: str(title, 200), body: str(body, 400), link: link || "", read: false, ref: ref || "" }));
    const m = await getMember(memberId);
    if (m) await sendExternal(m, "TIEMPO LIBRE 360: " + title + (body ? " — " + str(body, 140) : ""));
  } catch (err) { console.error("notify failed", err); }
}
export async function notifyStaff(type, title, body, link) {
  try {
    const rows = await q(db.from("user_roles").select("user_id").in("role", ["admin", "moderator"]));
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const mm = await membersMap(ids);
    for (const id of ids) if (mm[id] && mm[id].status === "active") await notify(id, type, title, body, link);
  } catch (err) { console.error("notifyStaff failed", err); }
}

// ---------- créditos ----------
export async function wallet(memberId) {
  let w = await q(db.from("wallets").select("*").eq("member", memberId).maybeSingle());
  if (!w) { await q(db.from("wallets").upsert({ member: memberId }, { onConflict: "member", ignoreDuplicates: true })); w = await q(db.from("wallets").select("*").eq("member", memberId).single()); }
  return w;
}
export async function move(memberId, type, d, key, note, exchangeId, actorId) {
  return await q(db.rpc("tl_move", {
    p_member: memberId, p_type: type, p_avail: d.avail || 0, p_reserved: d.reserved || 0, p_received: d.received || 0, p_used: d.used || 0,
    p_key: key, p_note: str(note, 300), p_exchange: exchangeId || null, p_actor: actorId || null,
  }));
}
export function walletView(w) {
  return { available: Number(w.available), reserved: Number(w.reserved), received: Number(w.received), used: Number(w.used) };
}

// ---------- archivos privados ----------
export const BUCKET = "evidencias";
export async function signFiles(list) {
  const files = (Array.isArray(list) ? list : []).filter((f) => f && f.path);
  if (!files.length) return [];
  const { data, error } = await db.storage.from(BUCKET).createSignedUrls(files.map((f) => f.path), 3600);
  if (error) { console.error("sign failed", error); return files.map((f) => ({ name: f.name, kind: f.kind || "other", type: f.type || "", size: f.size || 0, url: "" })); }
  return files.map((f, i) => ({ name: f.name, kind: f.kind || "other", type: f.type || "", size: f.size || 0, url: (data[i] && data[i].signedUrl) || "" }));
}
