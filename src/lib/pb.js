// Conexión con el servidor de TIEMPO LIBRE 360 (Lovable Cloud).
// - api(): endpoints propios de la plataforma (/api/tl/*), ejecutados en el servidor.
// - pb.collection(): lecturas/escrituras directas protegidas por permisos de la base de datos
//   (misma forma que antes para no tocar las pantallas).
import { supabase } from "@/integrations/supabase/client";
import { tlApi } from "./tl-api.functions";

let currentRecord = null;
let currentToken = "";
export function setAuthRecord(rec, token) { if (rec !== undefined) currentRecord = rec; currentToken = token || ""; }

export async function api(path, { method = "GET", body, query } = {}) {
  let r;
  try {
    const q = query ? Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== "")) : undefined;
    r = await tlApi({ data: { path, method, ...(body ? { body } : {}), ...(q ? { query: q } : {}) } });
  } catch (err) {
    const e = new Error("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    e.status = 0; throw e;
  }
  if (!r.ok) { const e = new Error(r.message || "No se pudo completar la operación."); e.status = r.status; throw e; }
  return JSON.parse(r.json);
}

export function errMsg(err) {
  return err?.response?.message || err?.message || "Algo salió mal. Inténtalo de nuevo.";
}

// ---------- filtros estilo PocketBase -> filtros de la base de datos ----------
function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(" || c === ")") { out.push({ t: c }); i++; continue; }
    if (s.startsWith("&&", i) || s.startsWith("||", i)) { out.push({ t: s.slice(i, i + 2) }); i += 2; continue; }
    const op = ["!~", "!=", ">=", "<=", "=", "~", ">", "<"].find((o) => s.startsWith(o, i));
    if (op) { out.push({ t: "op", v: op }); i += op.length; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, v = "";
      while (j < s.length && s[j] !== c) { if (s[j] === "\\" && j + 1 < s.length) { v += s[j + 1]; j += 2; } else { v += s[j]; j++; } }
      out.push({ t: "val", v }); i = j + 1; continue;
    }
    let j = i; while (j < s.length && /[\w.\-:]/.test(s[j])) j++;
    if (j === i) throw new Error("Filtro no válido");
    out.push({ t: "word", v: s.slice(i, j) }); i = j;
  }
  return out;
}
function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  function primary() {
    const t = peek();
    if (t && t.t === "(") { p++; const e = orExpr(); p++; return e; }
    const f = tokens[p++], op = tokens[p++], v = tokens[p++];
    let val = v.t === "val" ? v.v : v.v === "true" ? true : v.v === "false" ? false : v.v === "null" ? null : v.v;
    return { field: f.v, op: op.v, val };
  }
  function andExpr() { const xs = [primary()]; while (peek() && peek().t === "&&") { p++; xs.push(primary()); } return xs.length === 1 ? xs[0] : { and: xs }; }
  function orExpr() { const xs = [andExpr()]; while (peek() && peek().t === "||") { p++; xs.push(andExpr()); } return xs.length === 1 ? xs[0] : { or: xs }; }
  return orExpr();
}
const quote = (v) => { const s = String(v); return /[,.:()"\s]/.test(s) ? `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : s; };
function cond(c) {
  const v = c.val;
  if (v === null) return c.op === "!=" ? `${c.field}.not.is.null` : `${c.field}.is.null`;
  switch (c.op) {
    case "=": return typeof v === "boolean" ? `${c.field}.is.${v}` : `${c.field}.eq.${quote(v)}`;
    case "!=": return typeof v === "boolean" ? `${c.field}.not.is.${v}` : `${c.field}.neq.${quote(v)}`;
    case "~": return `${c.field}.ilike.${quote("*" + v + "*")}`;
    case "!~": return `${c.field}.not.ilike.${quote("*" + v + "*")}`;
    case ">": return `${c.field}.gt.${quote(v)}`;
    case "<": return `${c.field}.lt.${quote(v)}`;
    case ">=": return `${c.field}.gte.${quote(v)}`;
    case "<=": return `${c.field}.lte.${quote(v)}`;
    default: throw new Error("Operador no soportado");
  }
}
function toStr(n) {
  if (n.and) return `and(${n.and.map(toStr).join(",")})`;
  if (n.or) return `or(${n.or.map(toStr).join(",")})`;
  return cond(n);
}
function applyFilter(b, filter) {
  const f = String(filter || "").trim();
  if (!f) return b;
  const tree = parse(tokenize(f));
  if (tree.or) return b.or(tree.or.map(toStr).join(","));
  if (tree.and) { tree.and.forEach((n) => { b = b.or(n.or ? n.or.map(toStr).join(",") : toStr(n)); }); return b; }
  return b.or(toStr(tree));
}
function applySort(b, sort) {
  String(sort || "").split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => {
    const desc = s.startsWith("-"); const col = s.replace(/^[-+]/, "");
    b = b.order(col, { ascending: !desc });
  });
  return b;
}
const RELATED = { exchange: "exchanges" };
function selectFor(collection, expand) {
  const fields = String(expand || "").split(",").map((s) => s.trim()).filter(Boolean);
  const parts = ["*"];
  fields.forEach((f) => parts.push(`_x_${f}:${RELATED[f] || "members"}!${collection}_${f}_fkey(*)`));
  return { select: parts.join(", "), fields };
}
function shape(rows, fields) {
  return rows.map((r) => {
    if (!fields.length) return r;
    const out = { ...r, expand: {} };
    fields.forEach((f) => { const v = r[`_x_${f}`]; delete out[`_x_${f}`]; if (v) out.expand[f] = v; });
    return out;
  });
}
async function withRoles(collection, rows) {
  if (collection !== "members" || !rows.length) return rows;
  const { data } = await supabase.from("user_roles").select("user_id, role").in("user_id", rows.map((r) => r.id));
  const rank = { user: 0, moderator: 1, admin: 2 }, best = {};
  (data || []).forEach((x) => { if (!best[x.user_id] || rank[x.role] > rank[best[x.user_id]]) best[x.user_id] = x.role; });
  return rows.map((r) => ({ ...r, role: best[r.id] || "user" }));
}
function fail(error) { const e = new Error(error?.message || "No se pudo completar la operación."); e.status = error?.code === "42501" ? 403 : 400; return e; }
const pk = (collection) => (collection === "wallets" ? "member" : "id");

function collection(name) {
  return {
    async getList(page = 1, perPage = 30, opts = {}) {
      const { select, fields } = selectFor(name, opts.expand);
      let b = supabase.from(name).select(select, { count: "exact" });
      b = applyFilter(b, opts.filter); b = applySort(b, opts.sort);
      const from = (page - 1) * perPage;
      const { data, error, count } = await b.range(from, from + perPage - 1);
      if (error) throw fail(error);
      const items = await withRoles(name, shape(data || [], fields));
      return { page, perPage, totalItems: count || 0, totalPages: Math.ceil((count || 0) / perPage), items };
    },
    async getFullList(opts = {}) {
      const out = [];
      for (let page = 1; page < 200; page++) {
        const r = await this.getList(page, 1000, opts);
        out.push(...r.items);
        if (r.items.length < 1000) break;
      }
      return out;
    },
    async create(data) {
      const { data: row, error } = await supabase.from(name).insert(data).select("*").single();
      if (error) throw fail(error);
      return row;
    },
    async update(id, data) {
      const { data: rows, error } = await supabase.from(name).update(data).eq(pk(name), id).select("*");
      if (error) throw fail(error);
      if (!rows || !rows.length) throw fail({ message: "No tienes permiso para modificar este registro.", code: "42501" });
      if (name === "members" && currentRecord && id === currentRecord.id && typeof window !== "undefined") window.dispatchEvent(new Event("tl-me-changed"));
      return rows[0];
    },
    async delete(id) {
      const { data: rows, error } = await supabase.from(name).delete().eq(pk(name), id).select(pk(name));
      if (error) throw fail(error);
      if (!rows || !rows.length) throw fail({ message: "No tienes permiso para eliminar este registro.", code: "42501" });
      return true;
    },
  };
}

export const pb = {
  collection,
  authStore: {
    get record() { return currentRecord; },
    get token() { return currentToken; },
    get isValid() { return !!currentRecord; },
  },
};
