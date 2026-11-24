// TIEMPO LIBRE 360 — intercambios, coincidencias, pasaporte, retos y administración.
import {
  db, q, all, fail, str, toDate, norm, displayName, LEVELS, LEVEL_ES, round1, num, randomString, isUuid,
  haversine, distLabel, parseAvail, mins, overlapHours, isStaff, getMember, membersMap, DURATIONS, skillDurations,
  settings, audit, notify, notifyStaff, wallet, move, walletView, rolesFor,
} from "./core.server.js";

// ---------- pasaporte e insignias ----------
export async function stats(memberId) {
  const done = await q(db.from("exchanges").select("provider, minutes").eq("status", "completed").or(`requester.eq.${memberId},provider.eq.${memberId}`).limit(1000));
  let taught = 0, learned = 0;
  done.forEach((x) => { const h = Number(x.minutes); if (x.provider === memberId) taught += h; else learned += h; });
  const rs = await q(db.from("ratings").select("stars").eq("ratee", memberId).limit(1000));
  let sum = 0; rs.forEach((r) => { sum += Number(r.stars); });
  const cancels = await q(db.from("exchanges").select("late_cancel").eq("status", "cancelled").eq("cancelled_by", memberId).limit(1000));
  const late = cancels.filter((c) => c.late_cancel).length;
  const sk = await q(db.from("skills").select("kind").eq("owner", memberId).eq("hidden", false).limit(200));
  let offers = 0, wants = 0; sk.forEach((s) => { if (s.kind === "offer") offers++; else wants++; });
  const s = {
    completed: done.length, minutesTaught: taught, minutesLearned: learned, minutesShared: taught + learned,
    ratingCount: rs.length, ratingAvg: rs.length ? round1(sum / rs.length) : 0,
    cancelled: cancels.length, lateCancels: late, offers, wants,
  };
  s.badges = badges(s);
  return s;
}
export function badges(s) {
  const b = [];
  if (s.completed >= 1) b.push({ key: "first", name: "Primer intercambio", desc: "Completó su primera sesión." });
  if (s.completed >= 5) b.push({ key: "connector", name: "Conector", desc: "5 intercambios completados." });
  if (s.completed >= 15) b.push({ key: "pillar", name: "Pilar de la comunidad", desc: "15 intercambios completados." });
  if (s.minutesTaught >= 600) b.push({ key: "teacher", name: "Maestro del tiempo", desc: "600 minutos (10 horas) compartidos enseñando." });
  if (s.minutesLearned >= 600) b.push({ key: "learner", name: "Aprendiz incansable", desc: "600 minutos (10 horas) aprendiendo." });
  if (s.ratingCount >= 3 && s.ratingAvg >= 4.5) b.push({ key: "loved", name: "Muy valorado", desc: "Media de 4,5 o más en al menos 3 valoraciones." });
  if (s.completed >= 3 && s.lateCancels === 0) b.push({ key: "punctual", name: "Siempre presente", desc: "Sin cancelaciones tardías." });
  if (s.offers >= 3) b.push({ key: "multi", name: "Multitalento", desc: "Ofrece 3 o más habilidades." });
  return b;
}

// Habilidades verificadas (acreditación aprobada por la administración), por persona.
export async function approvedMap(memberIds) {
  const out = {};
  const ids = [...new Set(memberIds.filter(isUuid))];
  if (!ids.length) return out;
  const rows = await q(db.from("accreditations").select("member, skill_name").eq("status", "approved").in("member", ids.slice(0, 1000)));
  rows.forEach((r) => { (out[r.member] = out[r.member] || new Set()).add(norm(r.skill_name)); });
  return out;
}
export const userVerified = (m) => !!(m && m.verified_at && m.status === "active");
const isVerified = (amap, memberId, name) => !!(amap[memberId] && amap[memberId].has(norm(name)));

export async function personView(me, id) {
  const m = await getMember(id);
  if (!m) fail("No encontramos a esa persona.", 404);
  if (m.status === "suspended" && !isStaff(me) && m.id !== me.id) fail("Esta persona no está disponible.", 404);
  const sk = await q(db.from("skills").select("*").eq("owner", id).eq("hidden", false).eq("active", true).order("created", { ascending: false }).limit(100));
  const amap = await approvedMap([id]);
  const view = (s) => ({ id: s.id, kind: s.kind, name: s.name, category: s.category, description: s.description, level: s.level, mode: s.mode, durations: skillDurations(s), verified: isVerified(amap, id, s.name) });
  const share = m.share_location;
  const rs = await q(db.from("ratings").select("*").eq("ratee", id).order("created", { ascending: false }).limit(8));
  const rm = await membersMap(rs.map((r) => r.rater));
  const ratings = rs.map((r) => ({ stars: r.stars, comment: r.comment, by: rm[r.rater] ? displayName(rm[r.rater].name) : "Miembro", created: r.created }));
  let dist = null;
  if (share && me.share_location && id !== me.id && m.lat && me.lat) dist = distLabel(haversine(me.lat, me.lng, m.lat, m.lng));
  const claims = await q(db.from("challenge_claims").select("challenge").eq("member", id).limit(100));
  let challengeBadges = [];
  if (claims.length) {
    const chs = await q(db.from("challenges").select("id, badge").in("id", claims.map((c) => c.challenge)));
    challengeBadges = chs.map((c) => c.badge).filter(Boolean);
  }
  const accs = await q(db.from("accreditations").select("skill_name, title, kind, reviewed_at").eq("member", id).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(30));
  return {
    accreditations: accs.map((a) => ({ skill_name: a.skill_name, title: a.title, kind: a.kind, verified: true })),
    id: m.id, name: id === me.id ? m.name : displayName(m.name), userVerified: userVerified(m), headline: m.headline, bio: m.bio,
    city: share ? m.city : "", distance: dist, joined: m.created,
    offers: sk.filter((s) => s.kind === "offer").map(view),
    wants: sk.filter((s) => s.kind === "want").map(view),
    availability: parseAvail(m), passport: await stats(id), ratings, challengeBadges, isMe: id === me.id,
  };
}

// ---------- coincidencias ----------
function similarity(a, b) {
  const na = norm(a.name), nb = norm(b.name);
  if (!na || !nb) return null;
  if (na === nb) return "exact";
  if (na.includes(nb) || nb.includes(na)) return "similar";
  const ta = na.split(" ").filter((t) => t.length >= 4), tb = nb.split(" ");
  for (const t of ta) if (tb.includes(t)) return "similar";
  if (a.category && a.category === b.category) return "category";
  return null;
}
function modesOk(a, b) { return a === "both" || b === "both" || a === b; }
async function groupSkills() {
  const rows = await all(() => db.from("skills").select("*").eq("hidden", false).eq("active", true), 5000);
  const g = {}; rows.forEach((s) => { (g[s.owner] = g[s.owner] || []).push(s); });
  return g;
}
async function ratingMap() {
  const rs = await all(() => db.from("ratings").select("ratee, stars"), 10000);
  const m = {};
  rs.forEach((r) => { const k = r.ratee; m[k] = m[k] || { sum: 0, n: 0 }; m[k].sum += Number(r.stars); m[k].n++; });
  return m;
}
const ptsFor = (sim) => (sim === "exact" ? 40 : sim === "similar" ? 30 : 12);
const skillBrief = (s) => ({ id: s.id, name: s.name, level: s.level, mode: s.mode, category: s.category });

export async function matches(me) {
  const groups = await groupSkills(), rmap = await ratingMap();
  const mine = groups[me.id] || [];
  const myWants = mine.filter((s) => s.kind === "want"), myOffers = mine.filter((s) => s.kind === "offer");
  const myAv = parseAvail(me);
  const others = await all(() => db.from("members").select("*").eq("status", "active").neq("id", me.id), 3000);
  const out = [];
  others.forEach((m) => {
    const sk = groups[m.id] || [];
    const offers = sk.filter((s) => s.kind === "offer"), wants = sk.filter((s) => s.kind === "want");
    let learn = null, teach = null;
    myWants.forEach((w) => offers.forEach((o) => {
      const sim = similarity(w, o); if (!sim || !modesOk(w.mode, o.mode)) return;
      let pts = ptsFor(sim); const lvlOk = (LEVELS[o.level] || 0) >= (LEVELS[w.level] || 0);
      if (lvlOk) pts += 10;
      if (!learn || pts > learn.pts) learn = { pts, w, o, sim, lvlOk };
    }));
    myOffers.forEach((o) => wants.forEach((w) => {
      const sim = similarity(w, o); if (!sim || !modesOk(w.mode, o.mode)) return;
      const pts = ptsFor(sim) * 0.6;
      if (!teach || pts > teach.pts) teach = { pts, w, o, sim };
    }));
    if (!learn && !teach) return;
    let score = (learn ? learn.pts : 0) + (teach ? teach.pts : 0) + (learn && teach ? 12 : 0);
    const reasons = [];
    if (learn) {
      reasons.push(learn.sim === "exact" ? "Ofrece «" + learn.o.name + "», justo lo que quieres aprender." : learn.sim === "similar" ? "Ofrece «" + learn.o.name + "», muy cercano a «" + learn.w.name + "»." : "Enseña dentro de la categoría «" + learn.o.category + "» que te interesa.");
      reasons.push(learn.lvlOk ? "Su nivel (" + LEVEL_ES[learn.o.level] + ") se ajusta al tuyo." : "Su nivel (" + LEVEL_ES[learn.o.level] + ") es algo menor al que buscas.");
      const lm = learn.o.mode, wm = learn.w.mode;
      reasons.push(lm === "both" || wm === "both" ? "Modalidad compatible (presencial o virtual)." : "Ambos prefieren " + (lm === "virtual" ? "sesiones virtuales" : "sesiones presenciales") + ".");
    }
    if (teach) reasons.push("Quiere aprender «" + teach.w.name + "», que tú ofreces" + (learn ? ": intercambio mutuo." : "."));
    const ov = overlapHours(myAv, parseAvail(m));
    if (ov > 0) { score += Math.min(15, ov * 3); reasons.push("Coinciden en " + ov + " h de disponibilidad semanal."); }
    let dlabel = null;
    if (m.share_location && me.share_location && m.lat && me.lat) {
      const dist = haversine(me.lat, me.lng, m.lat, m.lng);
      if (dist <= 50) { score += dist <= 5 ? 12 : 8; reasons.push("Vive " + distLabel(dist) + " de ti."); dlabel = distLabel(dist); }
    }
    const rt = rmap[m.id]; const avg = rt ? round1(rt.sum / rt.n) : 0;
    if (avg >= 4.5) score += 3;
    out.push({
      id: m.id, name: displayName(m.name), userVerified: userVerified(m), headline: m.headline, city: m.share_location ? m.city : "",
      distance: dlabel, score: Math.min(99, Math.round(score)), reasons, kind: learn && teach ? "mutual" : learn ? "learn" : "teach",
      learn: learn ? skillBrief(learn.o) : null, teach: teach ? skillBrief(teach.w) : null, overlap: ov, ratingAvg: avg, ratingCount: rt ? rt.n : 0,
    });
  });
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 40);
}

export async function peopleSearch(me, qy) {
  const query = norm(qy.q || ""), cat = str(qy.category, 60), mode = str(qy.mode, 20), level = str(qy.level, 20);
  const maxkm = parseFloat(qy.maxkm) || 0;
  const skills = await all(() => {
    let b = db.from("skills").select("*").eq("kind", "offer").eq("hidden", false).eq("active", true).order("created", { ascending: false });
    if (cat) b = b.eq("category", cat);
    if (level) b = b.eq("level", level);
    return b;
  }, 1500);
  const members = {};
  (await all(() => db.from("members").select("*").eq("status", "active"), 5000)).forEach((m) => { members[m.id] = m; });
  const rmap = await ratingMap();
  const amap = await approvedMap(Object.keys(members));
  const out = [];
  skills.forEach((s) => {
    const m = members[s.owner]; if (!m) return;
    if (me && m.id === me.id) return;
    if (mode && !(s.mode === "both" || s.mode === mode)) return;
    if (query) {
      const hay = norm(s.name + " " + s.category + " " + s.description + " " + m.headline);
      if (query.split(" ").some((t) => t && !hay.includes(t))) return;
    }
    let dist = null, lat = null, lng = null;
    const both = me && me.share_location && m.share_location && me.lat && m.lat;
    if (both) { dist = haversine(me.lat, me.lng, m.lat, m.lng); lat = m.lat; lng = m.lng; }
    if (maxkm && (dist === null || dist > maxkm)) return;
    const rt = rmap[m.id];
    out.push({
      skill: { id: s.id, name: s.name, category: s.category, description: s.description, level: s.level, mode: s.mode, durations: skillDurations(s), verified: isVerified(amap, m.id, s.name) },
      person: { id: m.id, name: displayName(m.name), userVerified: userVerified(m), headline: m.headline, city: m.share_location ? m.city : "", ratingAvg: rt ? round1(rt.sum / rt.n) : 0, ratingCount: rt ? rt.n : 0 },
      distance: dist === null ? null : distLabel(dist), _d: dist === null ? 99999 : dist, lat, lng,
    });
  });
  out.sort((a, b) => a._d - b._d);
  return out.slice(0, 120).map((o) => { delete o._d; return o; });
}

// ---------- intercambios ----------
async function evt(exId, actorId, action, note) {
  await q(db.from("exchange_events").insert({ exchange: exId, actor: actorId || null, action, note: str(note, 400) }));
}
export async function exView(ex, meId, cache) {
  const iAmReq = ex.requester === meId;
  const otherId = iAmReq ? ex.provider : ex.requester;
  if (!(otherId in cache)) cache[otherId] = await getMember(otherId);
  const o = cache[otherId];
  const rated = !!(await q(db.from("ratings").select("id").eq("exchange", ex.id).eq("rater", meId).maybeSingle()));
  return {
    id: ex.id, role: iAmReq ? "requester" : "provider", other: { id: otherId, name: o ? displayName(o.name) : "Miembro" },
    skill_name: ex.skill_name, category: ex.category, minutes: Number(ex.minutes), mode: ex.mode, status: ex.status,
    message: ex.message, proposed_start: ex.proposed_start || "", proposed_by_me: ex.proposed_by === meId,
    scheduled_start: ex.scheduled_start || "", my_confirmed: !!ex[iAmReq ? "requester_confirmed" : "provider_confirmed"],
    other_confirmed: !!ex[iAmReq ? "provider_confirmed" : "requester_confirmed"], cancel_reason: ex.cancel_reason,
    cancelled_by_me: ex.cancelled_by === meId, late_cancel: !!ex.late_cancel, meeting_note: ex.meeting_note,
    meeting_url: ex.status === "scheduled" && ex.meeting_status === "activo" ? ex.meeting_url : "", meeting_status: ex.meeting_status,
    created: ex.created, completed_at: ex.completed_at || "", rated,
  };
}
async function settle(ex, actorId, outcome, note) {
  const h = Number(ex.minutes);
  if (outcome === "pay") {
    await move(ex.requester, "payment", { reserved: -h, used: h }, "pay:" + ex.id, "Pago por «" + ex.skill_name + "»", ex.id, actorId);
    await move(ex.provider, "earning", { avail: h, received: h }, "earn:" + ex.id, "Cobro por «" + ex.skill_name + "»", ex.id, actorId);
  } else {
    await move(ex.requester, "refund", { reserved: -h, avail: h }, "refund:" + ex.id, note || "Devolución de créditos reservados", ex.id, actorId);
  }
}
function futureDate(v, label) {
  const d = new Date(v);
  if (isNaN(d.getTime())) fail("Indica una fecha y hora válidas para " + label + ".");
  if (d.getTime() < Date.now() + 5 * 60000) fail("La fecha propuesta debe ser futura.");
  if (d.getTime() > Date.now() + 365 * 86400000) fail("La fecha propuesta es demasiado lejana.");
  return d.toISOString();
}

// Zona horaria America/Mexico_City = UTC-6 todo el año.
export const MX_OFFSET = 6 * 3600000;
const ACTIVE = ["pending", "negotiating", "scheduled", "disputed"];
export function mxParts(ms) { const d = new Date(ms - MX_OFFSET); return { day: (d.getUTCDay() + 6) % 7, min: d.getUTCHours() * 60 + d.getUTCMinutes(), date: d.toISOString().slice(0, 10) }; }
function exSlot(x) { const t = x.status === "scheduled" ? x.scheduled_start : x.proposed_start; return t ? toDate(t).getTime() : 0; }
async function activeFor(userId) {
  return await q(db.from("exchanges").select("*").or(`provider.eq.${userId},requester.eq.${userId}`).in("status", ACTIVE).limit(500));
}
async function assertFree(providerId, requesterId, startIso, minutes, excludeId) {
  const a = new Date(startIso).getTime(), b = a + minutes * 60000;
  const who = [[providerId, "Ese horario ya está ocupado para esta persona. Elige otro de la agenda."], [requesterId, "Ya tienes otra clase o solicitud en ese horario."]];
  for (const [uid, msg] of who) {
    const list = await activeFor(uid);
    for (const x of list) {
      if (x.id === excludeId) continue;
      const s0 = exSlot(x); if (!s0) continue;
      if (s0 < b && a < s0 + Number(x.minutes) * 60000) fail(msg);
    }
  }
}
export function fitsAvail(prov, startIso, minutes) {
  const av = parseAvail(prov); if (!av.length) return true;
  const a = new Date(startIso).getTime(), p = mxParts(a), qq = mxParts(a + minutes * 60000);
  if (p.date !== qq.date) return false;
  return av.some((r) => r.day === p.day && mins(r.start) <= p.min && qq.min <= mins(r.end));
}
export async function freeSlots(me, providerId, minutes) {
  const prov = await getMember(providerId);
  if (!prov) fail("Persona no encontrada.", 404);
  if (prov.status !== "active") return { configured: false, slots: [] };
  if (!DURATIONS.includes(minutes)) fail("Duración no válida.");
  const av = parseAvail(prov); if (!av.length) return { configured: false, slots: [] };
  const busy = (await activeFor(providerId)).map((x) => [exSlot(x), exSlot(x) + Number(x.minutes) * 60000]);
  (await activeFor(me.id)).forEach((x) => busy.push([exSlot(x), exSlot(x) + Number(x.minutes) * 60000]));
  const step = minutes < 30 ? 15 : 30, out = [], now = Date.now(), dayMs = 86400000;
  const base = Math.floor((now - MX_OFFSET) / dayMs) * dayMs + MX_OFFSET;
  for (let d = 0; d < 14 && out.length < 240; d++) {
    const dayStart = base + d * dayMs, dow = mxParts(dayStart + 12 * 3600000).day;
    for (const r of av) {
      if (r.day !== dow) continue;
      for (let m = mins(r.start); m + minutes <= mins(r.end); m += step) {
        const a = dayStart + m * 60000, b = a + minutes * 60000;
        if (a < now + 2 * 3600000) continue;
        if (busy.some((x) => x[0] < b && a < x[1])) continue;
        out.push(new Date(a).toISOString());
      }
    }
  }
  return { configured: true, tz: "America/Mexico_City", slots: out };
}
export async function adminClasses() {
  const all300 = await q(db.from("exchanges").select("*").order("created", { ascending: false }).limit(300));
  const mm = await membersMap(all300.flatMap((x) => [x.provider, x.requester]));
  const nm = (id) => (mm[id] ? displayName(mm[id].name) : "—");
  const rows = all300.map((x) => ({ id: x.id, status: x.status, mode: x.mode, minutes: Number(x.minutes), start: x.status === "scheduled" ? x.scheduled_start : x.proposed_start, provider: nm(x.provider), requester: nm(x.requester), meeting_status: x.meeting_status, has_link: !!x.meeting_url }));
  const act = all300.filter((x) => ACTIVE.includes(x.status)).sort((a, b) => exSlot(a) - exSlot(b));
  const conflicts = [];
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const A = act[i], B = act[j];
    const share = A.provider === B.provider || A.requester === B.requester || A.provider === B.requester || A.requester === B.provider;
    if (share && exSlot(A) < exSlot(B) + Number(B.minutes) * 60000 && exSlot(B) < exSlot(A) + Number(A.minutes) * 60000) conflicts.push({ a: A.id, b: B.id, start: A.proposed_start });
  }
  let pending = 0; const now = Date.now();
  all300.filter((x) => x.status === "scheduled").forEach((x) => { const left = exSlot(x) - now; if (left > 0 && left < 25 * 3600000) pending++; });
  const notifErr = (await q(db.from("notifications").select("id").eq("type", "delivery_error").limit(100))).length;
  return { rows: rows.slice(0, 100), conflicts, virtual_active: rows.filter((r) => r.meeting_status === "activo").length, virtual_cancelled: rows.filter((r) => r.meeting_status === "cancelado").length, reminders_due_24h: pending, notification_errors: notifErr, tz: "America/Mexico_City" };
}

export async function listExchanges(me) {
  const rows = await q(db.from("exchanges").select("*").or(`requester.eq.${me.id},provider.eq.${me.id}`).order("created", { ascending: false }).limit(500));
  const cache = {};
  const items = [];
  for (const x of rows) items.push(await exView(x, me.id, cache));
  return { items };
}
export async function exchangeDetail(me, id) {
  if (!isUuid(id)) fail("No encontramos ese intercambio.", 404);
  const ex = await q(db.from("exchanges").select("*").eq("id", id).maybeSingle());
  if (!ex) fail("No encontramos ese intercambio.", 404);
  if (ex.requester !== me.id && ex.provider !== me.id && !isStaff(me)) fail("Este intercambio no es tuyo.", 403);
  const evs = await q(db.from("exchange_events").select("*").eq("exchange", ex.id).order("created", { ascending: true }).limit(200));
  const mm = await membersMap(evs.map((v) => v.actor).filter(Boolean));
  return { exchange: await exView(ex, me.id, {}), events: evs.map((v) => ({ action: v.action, note: v.note, by: v.actor && mm[v.actor] ? displayName(mm[v.actor].name) : "Sistema", created: v.created })) };
}

export async function createExchange(me, b) {
  const cfg = await settings();
  const providerId = str(b.provider, 40), skillId = str(b.skill, 40);
  if (providerId === me.id) fail("No puedes solicitarte un servicio a ti mismo.");
  const prov = await getMember(providerId);
  const skill = isUuid(skillId) ? await q(db.from("skills").select("*").eq("id", skillId).maybeSingle()) : null;
  if (!prov || !skill) fail("No encontramos esa habilidad o persona.", 404);
  if (prov.status !== "active") fail("Esta persona no está disponible ahora mismo.");
  if (skill.owner !== providerId || skill.kind !== "offer" || skill.hidden || !skill.active) fail("Esa habilidad ya no está disponible.");
  const minutes = parseInt(b.minutes, 10), maxM = num(cfg.max_minutes, 120);
  if (!DURATIONS.includes(minutes) || minutes > maxM) fail("Elige una duración de " + DURATIONS.filter((d) => d <= maxM).join(", ") + " minutos (1 minuto = 1 crédito).");
  if (!skillDurations(skill).includes(minutes)) fail("Esta habilidad solo se ofrece en sesiones de " + skillDurations(skill).join(", ") + " minutos.");
  let mode = str(b.mode, 20); const sm = skill.mode;
  if (sm !== "both") mode = sm; else if (mode !== "virtual" && mode !== "in_person") fail("Elige si prefieres sesión virtual o presencial.");
  const start = futureDate(b.start, "la sesión");
  const msg = str(b.message, 500);
  if (!fitsAvail(prov, start, minutes)) fail("Ese horario queda fuera de la disponibilidad de esta persona (hora de Ciudad de México). Elige uno de la agenda.");
  const openN = (await q(db.from("exchanges").select("id").eq("requester", me.id).in("status", ["pending", "negotiating"]).limit(100))).length;
  if (openN >= num(cfg.max_open_requests, 8)) fail("Tienes demasiadas solicitudes abiertas. Espera respuestas antes de enviar más.");
  const dup = await q(db.from("exchanges").select("id").eq("requester", me.id).eq("provider", providerId).eq("skill", skillId).in("status", ["pending", "negotiating"]).limit(1));
  if (dup.length) fail("Ya tienes una solicitud abierta con esta persona para esta habilidad.");
  const w = await wallet(me.id);
  if (Number(w.available) < minutes) fail("No tienes suficientes créditos disponibles.");
  await assertFree(providerId, me.id, start, minutes, null);
  const { data: ex, error } = await db.from("exchanges").insert({
    requester: me.id, provider: providerId, skill: skillId, skill_name: skill.name, category: skill.category,
    minutes, mode, status: "pending", message: msg, proposed_start: start, proposed_by: me.id,
  }).select("*").single();
  if (error) { if (error.code === "23505") fail("Ese horario ya está ocupado para esta persona. Elige otro de la agenda."); throw error; }
  try {
    await move(me.id, "reserve", { avail: -minutes, reserved: minutes }, "reserve:" + ex.id, "Reserva para «" + skill.name + "»", ex.id, me.id);
  } catch (err) { await db.from("exchanges").delete().eq("id", ex.id); throw err; }
  await evt(ex.id, me.id, "request", msg);
  await notify(providerId, "request", "Nueva solicitud de " + displayName(me.name), "Quiere aprender «" + skill.name + "» (" + minutes + " min = " + minutes + " créditos).", "/app/solicitudes");
  return { id: ex.id };
}

async function saveEx(ex, fromStatus, patch) {
  const { data, error } = await db.from("exchanges").update(patch).eq("id", ex.id).eq("status", fromStatus).select("*");
  if (error) { if (error.code === "23505") fail("Ese horario ya está ocupado para esta persona. Elige otro de la agenda."); throw error; }
  if (!data || !data.length) fail("Este intercambio cambió mientras tanto. Vuelve a cargar la página.", 409);
  Object.assign(ex, data[0]);
  return ex;
}

export async function exchangeAction(me, id, action, b) {
  b = b || {};
  const cfg = await settings();
  const out = { ok: true };
  const after = [];
  if (!isUuid(id)) fail("No encontramos ese intercambio.", 404);
  const ex = await q(db.from("exchanges").select("*").eq("id", id).maybeSingle());
  if (!ex) fail("No encontramos ese intercambio.", 404);
  const req = ex.requester, prov = ex.provider, status = ex.status;
  const staff = isStaff(me);
  const party = me.id === req || me.id === prov;
  if (!party && !(action === "resolve" && staff)) fail("Este intercambio no es tuyo.", 403);
  const other = me.id === req ? prov : req;
  const sname = ex.skill_name;
  const meName = displayName(me.name);
  const now = Date.now();

  if (action === "accept") {
    if (status === "pending") { if (me.id !== prov) fail("Solo quien ofrece la habilidad puede aceptar la solicitud."); }
    else if (status === "negotiating") { if (ex.proposed_by === me.id) fail("Esperando a que la otra persona acepte tu propuesta."); }
    else fail("Esta solicitud ya no se puede aceptar.");
    const t = ex.proposed_start; if (!t || toDate(t).getTime() < now) fail("El horario propuesto ya pasó. Propón uno nuevo.");
    await assertFree(prov, req, t, Number(ex.minutes), ex.id);
    const virtual = ex.mode === "virtual";
    await saveEx(ex, status, { status: "scheduled", scheduled_start: t, requester_confirmed: false, provider_confirmed: false, meeting_url: virtual ? "https://meet.jit.si/TL360-" + randomString(24) : "", meeting_status: virtual ? "activo" : "" });
    await evt(ex.id, me.id, "accept", "Sesión agendada");
    after.push([other, "accepted", meName + " aceptó la sesión de «" + sname + "»", "Quedó agendada. Revisa tu calendario.", "/app/intercambios"]);
  } else if (action === "propose") {
    if (!["pending", "negotiating", "scheduled"].includes(status)) fail("Ya no se pueden proponer horarios en este intercambio.");
    const t = futureDate(b.start, "la nueva propuesta");
    await assertFree(prov, req, t, Number(ex.minutes), ex.id);
    await saveEx(ex, status, { proposed_start: t, proposed_by: me.id, status: "negotiating", scheduled_start: null, meeting_status: ex.meeting_url ? "reprogramando" : ex.meeting_status, requester_confirmed: false, provider_confirmed: false });
    await evt(ex.id, me.id, "propose", str(b.note, 300));
    after.push([other, "proposal", meName + " propone otro horario para «" + sname + "»", "Acéptalo o propón otro.", "/app/solicitudes"]);
  } else if (action === "reject") {
    if (me.id !== prov || status !== "pending") fail("Solo quien ofrece la habilidad puede rechazar una solicitud pendiente.");
    await saveEx(ex, status, { status: "rejected", cancel_reason: str(b.reason, 300) });
    await settle(ex, me.id, "refund", "Solicitud rechazada: créditos devueltos");
    await evt(ex.id, me.id, "reject", str(b.reason, 300));
    after.push([req, "rejected", meName + " no puede atender «" + sname + "»", "Tus créditos reservados volvieron a tu saldo.", "/app/solicitudes"]);
  } else if (action === "cancel") {
    if (!["pending", "negotiating", "scheduled"].includes(status)) fail("Este intercambio ya no se puede cancelar.");
    let late = false;
    if (status === "scheduled" && ex.scheduled_start) late = (toDate(ex.scheduled_start).getTime() - now) < num(cfg.late_cancel_hours, 12) * 3600000;
    const reason = str(b.reason, 300);
    if (status === "scheduled" && reason.length < 3) fail("Cuéntale a la otra persona el motivo de la cancelación.");
    await saveEx(ex, status, { status: "cancelled", cancelled_by: me.id, cancel_reason: reason, late_cancel: late, meeting_status: ex.meeting_url ? "cancelado" : ex.meeting_status });
    await settle(ex, me.id, "refund", "Intercambio cancelado: créditos devueltos");
    await evt(ex.id, me.id, "cancel", (late ? "[Cancelación tardía] " : "") + reason);
    after.push([other, "cancelled", meName + " canceló «" + sname + "»", "Los créditos reservados fueron devueltos a quien los pagó.", "/app/intercambios"]);
  } else if (action === "note") {
    if (!["scheduled", "negotiating", "pending"].includes(status)) fail("Ya no se puede editar el lugar o enlace.");
    await saveEx(ex, status, { meeting_note: str(b.note, 300) });
    await evt(ex.id, me.id, "note", str(b.note, 300));
    after.push([other, "note", meName + " actualizó el lugar o enlace de «" + sname + "»", str(b.note, 140), "/app/intercambios"]);
  } else if (action === "confirm") {
    if (status !== "scheduled") fail("Solo se pueden confirmar sesiones agendadas.");
    if (toDate(ex.scheduled_start).getTime() > now) fail("Podrás confirmar cuando llegue la hora de la sesión.");
    const f = me.id === req ? "requester_confirmed" : "provider_confirmed";
    if (ex[f]) fail("Ya confirmaste esta sesión. Falta la confirmación de la otra persona.");
    const both = me.id === req ? ex.provider_confirmed : ex.requester_confirmed;
    if (both) {
      await saveEx(ex, status, { [f]: true, status: "completed", completed_at: new Date().toISOString() });
      await settle(ex, me.id, "pay");
      await evt(ex.id, me.id, "confirm", "Ambas partes confirmaron: créditos liberados");
      out.completed = true;
      after.push([prov, "completed", "Sesión completada: +" + Number(ex.minutes) + " créditos", "«" + sname + "» fue confirmada por ambos. ¡Valora la experiencia!", "/app/intercambios"]);
      after.push([req, "completed", "Sesión completada", "«" + sname + "» fue confirmada por ambos. ¡Valora la experiencia!", "/app/intercambios"]);
    } else {
      await saveEx(ex, status, { [f]: true });
      await evt(ex.id, me.id, "confirm", "Confirmó la sesión");
      after.push([other, "confirm", meName + " confirmó que «" + sname + "» se realizó", "Confirma tú también para liberar los créditos.", "/app/intercambios"]);
    }
  } else if (action === "dispute") {
    if (status !== "scheduled") fail("Solo se puede abrir un conflicto en sesiones agendadas.");
    if (toDate(ex.scheduled_start).getTime() > now) fail("Podrás abrir un conflicto cuando llegue la hora de la sesión.");
    const reason = str(b.reason, 500); if (reason.length < 10) fail("Describe qué ocurrió (al menos 10 caracteres).");
    await saveEx(ex, status, { status: "disputed" });
    await q(db.from("reports").insert({ reporter: me.id, reported: other, exchange: ex.id, kind: "conflict", reason: "Conflicto en «" + sname + "»", details: reason, status: "open" }));
    await evt(ex.id, me.id, "dispute", reason);
    after.push([other, "dispute", "Se abrió un conflicto en «" + sname + "»", "El equipo de moderación lo revisará. Tus créditos siguen reservados.", "/app/intercambios"]);
    after.push(["__staff__", "dispute", "Nuevo conflicto por revisar", "«" + sname + "» — " + reason.slice(0, 120), "/admin/reportes"]);
  } else if (action === "resolve") {
    if (!staff) fail("Solo la moderación puede resolver conflictos.", 403);
    if (party) fail("No puedes resolver un conflicto en el que participas. Otra persona del equipo debe revisarlo.", 403);
    if (status !== "disputed") fail("Este intercambio no está en conflicto.");
    const outcome = str(b.outcome, 20), note = str(b.note, 500);
    if (note.length < 5) fail("Escribe una breve justificación de la decisión.");
    if (outcome === "pay_provider") { await saveEx(ex, status, { status: "completed", completed_at: new Date().toISOString(), requester_confirmed: true, provider_confirmed: true }); await settle(ex, me.id, "pay"); }
    else if (outcome === "refund_requester") { await saveEx(ex, status, { status: "cancelled", cancelled_by: me.id, cancel_reason: "Resuelto por moderación: " + note }); await settle(ex, me.id, "refund", "Conflicto resuelto: créditos devueltos"); }
    else fail("Elige cómo resolver el conflicto.");
    await evt(ex.id, me.id, "resolve:" + outcome, note);
    await q(db.from("reports").update({ status: "resolved", resolution: note, handled_by: me.id }).eq("exchange", ex.id).in("status", ["open", "in_review"]));
    await audit(me, "conflict.resolve", "exchange:" + ex.id, outcome + " — " + note);
    const msg = outcome === "pay_provider" ? "Se liberaron los créditos a quien impartió la sesión." : "Se devolvieron los créditos a quien los reservó.";
    after.push([req, "resolved", "Conflicto resuelto en «" + sname + "»", msg + " " + note, "/app/intercambios"]);
    after.push([prov, "resolved", "Conflicto resuelto en «" + sname + "»", msg + " " + note, "/app/intercambios"]);
  } else if (action === "rate") {
    if (status !== "completed") fail("Solo puedes valorar intercambios completados.");
    const stars = parseInt(b.stars, 10); if (!(stars >= 1 && stars <= 5)) fail("Elige entre 1 y 5 estrellas.");
    const { error } = await db.from("ratings").insert({ exchange: ex.id, rater: me.id, ratee: other, stars, comment: str(b.comment, 400) });
    if (error) fail("Ya valoraste este intercambio.");
    await evt(ex.id, me.id, "rate", stars + " estrellas");
    after.push([other, "rating", meName + " te dejó una valoración de " + stars + " ★", str(b.comment, 120), "/app/pasaporte"]);
  } else fail("Acción no reconocida.");
  for (const n of after) { if (n[0] === "__staff__") await notifyStaff(n[1], n[2], n[3], n[4]); else await notify(n[0], n[1], n[2], n[3], n[4]); }
  return out;
}

// ---------- retos ----------
function progressFor(kind, s) {
  return kind === "exchanges_completed" ? s.completed : kind === "minutes_taught" || kind === "hours_taught" ? s.minutesTaught : kind === "minutes_learned" || kind === "hours_learned" ? s.minutesLearned : kind === "skills_added" ? s.offers + s.wants : kind === "ratings_received" ? s.ratingCount : 0;
}
export async function challengesFor(me, s) {
  s = s || (await stats(me.id));
  const claims = {};
  (await q(db.from("challenge_claims").select("challenge").eq("member", me.id).limit(200))).forEach((c) => { claims[c.challenge] = true; });
  const rows = await q(db.from("challenges").select("*").eq("active", true).order("target", { ascending: true }).limit(100));
  return rows.map((c) => {
    const p = progressFor(c.kind, s), t = Number(c.target);
    return { id: c.id, title: c.title, description: c.description, kind: c.kind, target: t, reward: Number(c.reward), badge: c.badge, progress: Math.min(p, t), done: p >= t, claimed: !!claims[c.id] };
  });
}
export async function claimChallenge(me, cid) {
  const c = isUuid(cid) ? await q(db.from("challenges").select("*").eq("id", cid).maybeSingle()) : null;
  if (!c) fail("Reto no encontrado.", 404);
  if (!c.active) fail("Este reto ya no está activo.");
  const s = await stats(me.id);
  if (progressFor(c.kind, s) < Number(c.target)) fail("Aún no cumples este reto.");
  const { error } = await db.from("challenge_claims").insert({ member: me.id, challenge: cid });
  if (error) fail("Ya reclamaste este reto.");
  const r = Number(c.reward);
  if (r > 0) await move(me.id, "reward", { avail: r, received: r }, "reward:" + cid + ":" + me.id, "Reto completado: " + c.title, null, null);
  await notify(me.id, "challenge", "¡Reto completado: " + c.title + "!", r > 0 ? "Ganaste " + r + " créditos." : "Ganaste la insignia " + c.badge + ".", "/app/retos");
  return { reward: r, badge: c.badge };
}

// ---------- panel / público ----------
export async function dashboard(me) {
  const w = await wallet(me.id);
  const up = await q(db.from("exchanges").select("*").or(`requester.eq.${me.id},provider.eq.${me.id}`).eq("status", "scheduled").order("scheduled_start", { ascending: true }).limit(50));
  const cache = {};
  const incoming = (await q(db.from("exchanges").select("id").eq("provider", me.id).eq("status", "pending").limit(50))).length;
  const waiting = (await q(db.from("exchanges").select("proposed_by").or(`requester.eq.${me.id},provider.eq.${me.id}`).eq("status", "negotiating").limit(50))).filter((x) => x.proposed_by !== me.id).length;
  const { count: unread } = await db.from("notifications").select("id", { count: "exact", head: true }).eq("member", me.id).eq("read", false);
  const led = (await q(db.from("credit_ledger").select("created, avail_after, reserved_after").eq("member", me.id).order("created", { ascending: false }).limit(40))).reverse().map((l) => ({ created: l.created, avail_after: Number(l.avail_after), reserved_after: Number(l.reserved_after) }));
  const s = await stats(me.id);
  const upcoming = [];
  for (const x of up.slice(0, 4)) upcoming.push(await exView(x, me.id, cache));
  return {
    wallet: walletView(w), stats: s, incoming, awaitingReply: waiting, unread: unread || 0, upcoming, ledger: led,
    matches: (await matches(me)).slice(0, 3), challenges: (await challengesFor(me, s)).filter((c) => !c.claimed).slice(0, 3),
  };
}
export async function publicStats() {
  const members = await all(() => db.from("members").select("id, name").eq("status", "active"), 10000);
  const done = await all(() => db.from("exchanges").select("provider, minutes").eq("status", "completed"), 10000);
  let minutes = 0; const taught = {};
  done.forEach((x) => { minutes += Number(x.minutes); taught[x.provider] = (taught[x.provider] || 0) + Number(x.minutes); });
  const sk = await all(() => db.from("skills").select("category").eq("kind", "offer").eq("hidden", false).eq("active", true), 10000);
  const cats = {}; sk.forEach((s) => { cats[s.category] = (cats[s.category] || 0) + 1; });
  const mm = {}; members.forEach((m) => { mm[m.id] = m; });
  const top = Object.keys(taught).filter((k) => mm[k]).sort((a, b) => taught[b] - taught[a]).slice(0, 5).map((k) => ({ name: displayName(mm[k].name), minutes: taught[k] }));
  return { members: members.length, minutes, exchanges: done.length, skills: sk.length, categories: cats, top };
}
export async function publicCommunity() {
  const posts = await q(db.from("community_posts").select("*").eq("hidden", false).order("created", { ascending: false }).limit(40));
  const mm = await membersMap(posts.map((p) => p.author));
  const ch = await q(db.from("challenges").select("*").eq("active", true).order("target", { ascending: true }).limit(20));
  return {
    posts: posts.map((p) => ({ id: p.id, kind: p.kind, body: p.body, author: mm[p.author] ? displayName(mm[p.author].name) : "Miembro", authorVerified: userVerified(mm[p.author]), authorId: p.author, created: p.created })),
    challenges: ch.map((c) => ({ id: c.id, title: c.title, description: c.description, target: Number(c.target), reward: Number(c.reward), badge: c.badge })),
    stats: await publicStats(),
  };
}

// Recordatorios de sesión (sin cron: se crean al abrir el panel).
export async function reminders(me) {
  const now = Date.now();
  let created = 0;
  const rows = await q(db.from("exchanges").select("*").or(`requester.eq.${me.id},provider.eq.${me.id}`).eq("status", "scheduled").order("scheduled_start", { ascending: true }).limit(50));
  const cache = {};
  for (const x of rows) {
    const t = x.scheduled_start; if (!t) continue;
    const left = toDate(t).getTime() - now;
    if (left <= 0 || left > 24 * 3600000) continue;
    const tag = left <= 3600000 ? "1h" : "24h";
    const refs = tag === "24h" ? ["rem:24h:" + x.id, "rem:1h:" + x.id] : ["rem:1h:" + x.id];
    const exist = await q(db.from("notifications").select("id").eq("member", me.id).in("ref", refs).limit(1));
    if (exist.length) continue;
    const view = await exView(x, me.id, cache);
    const m = Math.round(left / 60000);
    const when = tag === "1h" ? "en " + m + " minutos" : "en unas " + Math.round(left / 3600000) + " horas";
    await notify(me.id, "reminder", "Recordatorio: «" + view.skill_name + "» empieza " + when, "Sesión de " + view.minutes + " minutos con " + view.other.name + (view.mode === "virtual" ? " (virtual)" : " (presencial)") + "." + (view.meeting_url ? " Enlace: " + view.meeting_url : ""), "/app/calendario", "rem:" + tag + ":" + x.id);
    created++;
  }
  return { created };
}

// ---------- administración ----------
export async function reconcile() {
  const ws = await all(() => db.from("wallets").select("*"), 20000);
  const led = await all(() => db.from("credit_ledger").select("member, avail_delta, reserved_delta"), 200000);
  const sums = {};
  led.forEach((l) => { const k = l.member; sums[k] = sums[k] || { a: 0, r: 0 }; sums[k].a += Number(l.avail_delta); sums[k].r += Number(l.reserved_delta); });
  const issues = [];
  ws.forEach((w) => {
    const s = sums[w.member] || { a: 0, r: 0 };
    if (Math.abs(s.a - Number(w.available)) > 0.0001 || Math.abs(s.r - Number(w.reserved)) > 0.0001) issues.push({ member: w.member, wallet: walletView(w), ledger: { available: s.a, reserved: s.r } });
  });
  return { wallets: ws.length, movements: led.length, ok: issues.length === 0, issues };
}
export async function suspicious() {
  const flags = [];
  const now = Date.now(), day = 86400000;
  const names = {};
  const nameOfId = async (id) => { if (!(id in names)) { const m = await getMember(id); names[id] = m ? m.name : "Miembro eliminado"; } return names[id]; };
  const rec = await reconcile();
  for (const i of rec.issues) flags.push({ severity: "high", type: "Saldo que no cuadra", member: i.member, name: await nameOfId(i.member), detail: "La cartera no coincide con el historial de movimientos. Revisa antes de tocar nada." });
  const recent = await all(() => db.from("exchanges").select("*").gt("created", new Date(now - 30 * day).toISOString()), 5000);
  const perReq = {}, cancels = {}, lates = {}, pairs = {};
  recent.forEach((x) => {
    const r = x.requester, st = x.status;
    if (toDate(x.created).getTime() > now - day) perReq[r] = (perReq[r] || 0) + 1;
    if (st === "cancelled") { const c = x.cancelled_by; if (c) { cancels[c] = (cancels[c] || 0) + 1; if (x.late_cancel) lates[c] = (lates[c] || 0) + 1; } }
    if (st === "completed" && toDate(x.created).getTime() > now - 14 * day) { const k = [r, x.provider].sort().join("|"); pairs[k] = (pairs[k] || 0) + 1; }
  });
  for (const m of Object.keys(perReq)) if (perReq[m] >= 10) flags.push({ severity: "medium", type: "Ráfaga de solicitudes", member: m, name: await nameOfId(m), detail: perReq[m] + " solicitudes en las últimas 24 horas." });
  for (const m of Object.keys(cancels)) if (cancels[m] >= 4 || (lates[m] || 0) >= 2) flags.push({ severity: "medium", type: "Cancelaciones frecuentes", member: m, name: await nameOfId(m), detail: cancels[m] + " cancelaciones en 30 días (" + (lates[m] || 0) + " tardías)." });
  for (const k of Object.keys(pairs)) if (pairs[k] >= 3) { const p = k.split("|"); flags.push({ severity: "medium", type: "Intercambios repetidos entre las mismas personas", member: p[0], name: (await nameOfId(p[0])) + " y " + (await nameOfId(p[1])), detail: pairs[k] + " sesiones completadas entre ambas en 14 días. Comprueba que sean reales." }); }
  const reps = {};
  (await q(db.from("reports").select("reported").gt("created", new Date(now - 30 * day).toISOString()).not("reported", "is", null).limit(1000))).forEach((r) => { reps[r.reported] = (reps[r.reported] || 0) + 1; });
  for (const m of Object.keys(reps)) if (reps[m] >= 2) flags.push({ severity: reps[m] >= 3 ? "high" : "medium", type: "Varios reportes", member: m, name: await nameOfId(m), detail: reps[m] + " reportes o conflictos en 30 días." });
  const order = { high: 0, medium: 1, low: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);
  return { flags, checkedAt: new Date().toISOString(), wallets: rec.wallets, movements: rec.movements };
}
export async function adminStats() {
  const members = await all(() => db.from("members").select("id, status, created"), 20000);
  const ex = await all(() => db.from("exchanges").select("status, minutes, category, created"), 20000);
  const byStatus = {}, byCat = {}; let minutes = 0;
  ex.forEach((x) => { const s = x.status; byStatus[s] = (byStatus[s] || 0) + 1; if (s === "completed") { minutes += Number(x.minutes); const c = x.category || "Otras"; byCat[c] = (byCat[c] || 0) + Number(x.minutes); } });
  const ws = await all(() => db.from("wallets").select("available, reserved"), 20000);
  let avail = 0, res = 0; ws.forEach((w) => { avail += Number(w.available); res += Number(w.reserved); });
  const weeks = []; const wk = 7 * 86400000, now = Date.now();
  for (let i = 7; i >= 0; i--) {
    const from = now - (i + 1) * wk, to = now - i * wk;
    weeks.push({ label: "S-" + i, members: members.filter((m) => { const t = toDate(m.created).getTime(); return t > from && t <= to; }).length, exchanges: ex.filter((x) => { const t = toDate(x.created).getTime(); return t > from && t <= to; }).length });
  }
  const openReports = (await q(db.from("reports").select("id").in("status", ["open", "in_review"]).limit(500))).length;
  const skills = await all(() => db.from("skills").select("kind"), 20000);
  return {
    members: members.length, active: members.filter((m) => m.status !== "suspended").length, suspended: members.filter((m) => m.status === "suspended").length,
    skillsOffered: skills.filter((s) => s.kind === "offer").length, skillsWanted: skills.filter((s) => s.kind === "want").length,
    exchanges: ex.length, byStatus, minutes, byCat, creditsAvailable: avail, creditsReserved: res, weeks, openReports,
  };
}

export async function report(me, b) {
  const reason = str(b.reason, 150), details = str(b.details, 1500);
  if (reason.length < 3) fail("Indica el motivo del reporte.");
  let reported = null;
  if (b.reported) { reported = await getMember(str(b.reported, 40)); if (!reported) fail("No encontramos a esa persona.", 404); if (reported.id === me.id) fail("No puedes reportarte a ti mismo."); }
  const open = await q(db.from("reports").select("id").eq("reporter", me.id).eq("status", "open").limit(20));
  if (open.length >= 5) fail("Ya tienes varios reportes abiertos. Espera a que sean revisados.", 429);
  await q(db.from("reports").insert({ reporter: me.id, reported: reported ? reported.id : null, kind: "report", reason, details, status: "open" }));
  await notifyStaff("report", "Nuevo reporte por revisar", reason, "/admin/reportes");
  return { ok: true };
}
export async function savePhone(me, b) {
  const phone = str(b.phone, 20).replace(/[\s-]/g, "");
  if (phone && !/^\+\d{7,15}$/.test(phone)) fail("Escribe el teléfono con prefijo internacional (+ y de 7 a 15 dígitos).");
  await q(db.from("members").update({ phone, notify_whatsapp: phone ? !!b.whatsapp : false, notify_sms: phone ? !!b.sms : false }).eq("id", me.id));
  return { ok: true };
}
export async function contact(b) {
  if (str(b.website, 200)) return { ok: true };
  const name = str(b.name, 100), email = str(b.email, 200).toLowerCase(), subject = str(b.subject, 150), message = str(b.message, 3000);
  if (name.length < 2) fail("Escribe tu nombre.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Escribe un correo válido para poder responderte.");
  if (subject.length < 3) fail("Escribe un asunto (mínimo 3 caracteres).");
  if (message.length < 10) fail("Cuéntanos un poco más en tu mensaje (mínimo 10 caracteres).");
  const hourAgo = new Date(Date.now() - 3600000).toISOString(), dayAgo = new Date(Date.now() - 86400000).toISOString();
  const same = await q(db.from("contact_messages").select("id").eq("email", email).eq("message", message).gt("created", dayAgo).limit(1));
  if (same.length) return { ok: true, duplicate: true };
  const allRecent = await q(db.from("contact_messages").select("id").gt("created", hourAgo).limit(60));
  if (allRecent.length >= 40) fail("Estamos recibiendo muchos mensajes en este momento. Inténtalo de nuevo en un rato o escríbenos por correo.", 429);
  const recent = await q(db.from("contact_messages").select("id").eq("email", email).gt("created", hourAgo).limit(10));
  if (recent.length >= 3) fail("Ya recibimos varios mensajes tuyos. Te responderemos pronto.", 429);
  await q(db.from("contact_messages").insert({ name, email, subject, message, status: "new" }));
  await notifyStaff("contact", "Nuevo mensaje de contacto", name + ": " + (subject || message).slice(0, 100), "/admin/mensajes");
  return { ok: true };
}

// ----- acciones del personal -----
export async function adminRole(me, id, b) {
  const role = str(b.role, 20);
  if (!["user", "moderator", "admin"].includes(role)) fail("Rol no válido.");
  const m = await getMember(id); if (!m) fail("Usuario no encontrado.", 404);
  if (m.id === me.id) fail("No puedes cambiar tu propio rol. Pídeselo a otra persona administradora.");
  const before = (await rolesFor([m.id]))[m.id] || "user";
  await q(db.from("user_roles").delete().eq("user_id", m.id));
  await q(db.from("user_roles").insert({ user_id: m.id, role }));
  await audit(me, "user.role", "member:" + m.id, m.name + ": " + before + " → " + role);
  await notify(m.id, "role", "Tu rol cambió a " + role, "", "/app");
  return { ok: true };
}
export async function adminStatus(me, id, b) {
  const status = str(b.status, 20), reason = str(b.reason, 300);
  if (!["active", "suspended"].includes(status)) fail("Estado no válido.");
  const m = await getMember(id); if (!m) fail("Usuario no encontrado.", 404);
  if (m.id === me.id) fail("No puedes suspenderte a ti mismo.");
  const role = (await rolesFor([m.id]))[m.id] || "user";
  if (role !== "user" && me.role !== "admin") fail("Solo la administración puede suspender a otro equipo de moderación.", 403);
  if (status === "suspended" && reason.length < 5) fail("Indica el motivo de la suspensión.");
  await q(db.from("members").update({ status }).eq("id", m.id));
  // Suspender cierra sus sesiones abiertas e impide iniciar sesión; reactivar lo revierte.
  const { error } = await db.auth.admin.updateUserById(m.id, { ban_duration: status === "suspended" ? "876000h" : "none" });
  if (error) console.error("ban update failed", error);
  await audit(me, "user." + status, "member:" + m.id, m.name + " — " + reason);
  return { ok: true };
}
export async function adminVerify(me, id, b) {
  if (me.role !== "admin") fail("Solo la administración puede verificar usuarios.", 403);
  const m = await getMember(id); if (!m) fail("Usuario no encontrado.", 404);
  if (m.id === me.id) fail("No puedes verificar tu propia cuenta.", 403);
  const on = !!b.verified;
  if (on && m.status !== "active") fail("No se puede verificar una cuenta suspendida.");
  await q(db.from("members").update({ verified_at: on ? new Date().toISOString() : null, verified_by: on ? me.id : null }).eq("id", m.id));
  await audit(me, on ? "user.verify" : "user.unverify", "member:" + m.id, m.name);
  if (on) await notify(m.id, "verified", "Tu cuenta fue verificada por la administración", "Ahora aparece la insignia de usuario verificado junto a tu nombre.", "/app/perfil");
  return { ok: true };
}
export async function adminCredits(me, id, b) {
  const amount = parseInt(b.amount, 10), note = str(b.note, 300);
  if (!amount || Math.abs(amount) > 600) fail("Indica una cantidad entre -600 y 600 créditos (distinta de cero). 1 minuto = 1 crédito.");
  if (note.length < 5) fail("Todo ajuste necesita un motivo (mínimo 5 caracteres).");
  const m = await getMember(id); if (!m) fail("Usuario no encontrado.", 404);
  if (m.id === me.id) fail("No puedes ajustar tu propio saldo. Tus créditos se rigen por las mismas reglas que los de cualquier persona: se mueven solo con intercambios confirmados.", 403);
  const key = "adj:" + m.id + ":" + Date.now() + ":" + randomString(8);
  await move(m.id, "adjustment", { avail: amount, received: amount > 0 ? amount : 0 }, key, "Ajuste administrativo: " + note, null, me.id);
  await audit(me, "credits.adjust", "member:" + m.id, (amount > 0 ? "+" : "") + amount + " — " + note);
  await notify(m.id, "credits", (amount > 0 ? "Recibiste " : "Se descontaron ") + Math.abs(amount) + " créditos", note, "/app/creditos");
  return { ok: true };
}
export async function adminSkillHide(me, id, b) {
  const hidden = !!b.hidden;
  const s = isUuid(id) ? await q(db.from("skills").select("*").eq("id", id).maybeSingle()) : null;
  if (!s) fail("Habilidad no encontrada.", 404);
  await q(db.from("skills").update({ hidden }).eq("id", s.id));
  await audit(me, hidden ? "skill.hide" : "skill.show", "skill:" + s.id, s.name);
  if (hidden) await notify(s.owner, "moderation", "Ocultamos tu habilidad «" + s.name + "»", "Revisa que cumpla las normas de la comunidad.", "/app/mis-habilidades");
  return { ok: true };
}
export async function adminReportResolve(me, id, b) {
  const status = str(b.status, 20), resolution = str(b.resolution, 600);
  if (!["in_review", "resolved", "dismissed"].includes(status)) fail("Estado no válido.");
  if (status !== "in_review" && resolution.length < 5) fail("Escribe una breve resolución.");
  const r = isUuid(id) ? await q(db.from("reports").select("*").eq("id", id).maybeSingle()) : null;
  if (!r) fail("Reporte no encontrado.", 404);
  await q(db.from("reports").update({ status, resolution, handled_by: me.id }).eq("id", r.id));
  await audit(me, "report." + status, "report:" + r.id, resolution);
  if (status !== "in_review") await notify(r.reporter, "report", "Revisamos tu reporte", resolution, "/app");
  return { ok: true };
}
export async function adminPostHide(me, id, b) {
  const hidden = !!b.hidden;
  const p = isUuid(id) ? await q(db.from("community_posts").select("*").eq("id", id).maybeSingle()) : null;
  if (!p) fail("Publicación no encontrada.", 404);
  await q(db.from("community_posts").update({ hidden }).eq("id", p.id));
  await audit(me, hidden ? "post.hide" : "post.show", "post:" + p.id, String(p.body).slice(0, 80));
  return { ok: true };
}
export async function integrationsGet() {
  const c = {};
  (await q(db.from("integrations").select("key, value"))).forEach((r) => { c[r.key] = r.value; });
  return { configured: !!(c.twilio_sid && c.twilio_token), sid_hint: c.twilio_sid ? c.twilio_sid.slice(0, 4) + "•••" : "", wa_from: c.twilio_wa_from || "", sms_from: c.twilio_sms_from || "", wa_enabled: c.wa_enabled === "1", sms_enabled: c.sms_enabled === "1" };
}
export async function integrationsSave(me, b) {
  const put = async (k, v) => { await q(db.from("integrations").upsert({ key: k, value: v, updated: new Date().toISOString() }, { onConflict: "key" })); };
  if (b.twilio_sid) await put("twilio_sid", str(b.twilio_sid, 80));
  if (b.twilio_token) await put("twilio_token", str(b.twilio_token, 120));
  if (b.twilio_wa_from !== undefined) await put("twilio_wa_from", str(b.twilio_wa_from, 30));
  if (b.twilio_sms_from !== undefined) await put("twilio_sms_from", str(b.twilio_sms_from, 30));
  await put("wa_enabled", b.wa_enabled ? "1" : "0"); await put("sms_enabled", b.sms_enabled ? "1" : "0");
  await audit(me, "integrations.update", "integrations", "Canales de mensajería actualizados");
  return { ok: true };
}

// ----- mensajes de contacto (respuestas manuales; la plataforma no envía correo) -----
export async function contactReplies(id) {
  const items = await q(db.from("contact_replies").select("*").eq("message", id).order("created", { ascending: false }).limit(50));
  return { items: items.map((r) => ({ id: r.id, subject: r.subject, to_email: r.to_email, body: r.body, channel: r.channel, author: r.author, sent_at: r.sent_at || "", created: r.created })) };
}
export async function contactStatus(me, id, b) {
  const status = str(b.status, 20);
  if (!["new", "read", "in_progress"].includes(status)) fail("Estado no válido.");
  const m = isUuid(id) ? await q(db.from("contact_messages").select("*").eq("id", id).maybeSingle()) : null;
  if (!m) fail("Mensaje no encontrado.", 404);
  if (m.status === "answered" && status === "new") fail("Un mensaje respondido no vuelve a «nuevo».");
  const patch = { status }; if (status === "read" && !m.read_at) patch.read_at = new Date().toISOString();
  await q(db.from("contact_messages").update(patch).eq("id", m.id));
  await audit(me, "contact." + status, "contact:" + m.id, "");
  return { ok: true };
}
export async function contactReply(me, id, b) {
  const subject = str(b.subject, 150), body = str(b.body, 5000);
  if (subject.length < 3) fail("Escribe un asunto (mínimo 3 caracteres).");
  if (body.length < 10) fail("Escribe una respuesta de al menos 10 caracteres.");
  const m = isUuid(id) ? await q(db.from("contact_messages").select("*").eq("id", id).maybeSingle()) : null;
  if (!m) fail("Mensaje no encontrado.", 404);
  const to = m.email;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) fail("El correo del remitente no es válido.");
  const dup = await q(db.from("contact_replies").select("id").eq("message", m.id).eq("body", body).gt("created", new Date(Date.now() - 600000).toISOString()).limit(1));
  if (dup.length) fail("Esta misma respuesta ya se registró hace unos minutos. No se duplicó.", 409);
  const now = new Date().toISOString();
  const pending = b.pending === true || b.pending === "true";
  const r = await q(db.from("contact_replies").insert({ message: m.id, subject, to_email: to, body, channel: pending ? "gmail_pending" : "manual_gmail", author: me.name, sent_at: pending ? null : now }).select("id").single());
  if (pending) { if (m.status !== "answered") await q(db.from("contact_messages").update({ status: "in_progress" }).eq("id", m.id)); }
  else await q(db.from("contact_messages").update({ status: "answered", answered_at: now, reply_count: (m.reply_count || 0) + 1 }).eq("id", m.id));
  await audit(me, pending ? "contact.reply_pending" : "contact.reply", "contact:" + m.id, pending ? "gmail_pending" : "manual_gmail");
  return { ok: true, id: r.id, pending };
}
export async function contactReplyConfirm(me, rid) {
  const r = isUuid(rid) ? await q(db.from("contact_replies").select("*").eq("id", rid).maybeSingle()) : null;
  if (!r) fail("Respuesta no encontrada.", 404);
  if (r.channel !== "gmail_pending") fail("Esta respuesta ya estaba confirmada.", 409);
  const now = new Date().toISOString();
  await q(db.from("contact_replies").update({ channel: "manual_gmail", sent_at: now }).eq("id", r.id));
  const m = await q(db.from("contact_messages").select("*").eq("id", r.message).single());
  await q(db.from("contact_messages").update({ status: "answered", answered_at: now, reply_count: (m.reply_count || 0) + 1 }).eq("id", m.id));
  await audit(me, "contact.reply_confirmed", "contact:" + m.id, "manual_gmail");
  return { ok: true };
}
