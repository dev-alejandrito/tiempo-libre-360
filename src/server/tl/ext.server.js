// TIEMPO LIBRE 360 — verificación de habilidades, quejas/sugerencias, clases particulares y chat privado.
// Estos datos son privados: solo se leen y escriben desde aquí, con la identidad verificada.
import { db, q, fail, str, norm, displayName, randomString, isUuid, isStaff, getMember, membersMap, audit, notify, notifyStaff, signFiles, BUCKET } from "./core.server.js";

const MS = 60000;
function readJson(v) { return Array.isArray(v) ? v : []; }
function pushHist(list, entry) { const h = readJson(list).slice(); h.push(entry); return h.slice(-100); }

// ---------- archivos subidos por la persona ----------
const EXT = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
const DOC_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
const VIDEO_EXT = ["mp4", "webm", "mov"];
export const LIMITS = { doc: 5 * 1024 * 1024, cert: 10 * 1024 * 1024, video: 100 * 1024 * 1024 };
const extOf = (n) => String(n || "").split(".").pop().toLowerCase();

// Valida archivos ya subidos al almacenamiento privado: deben estar en la carpeta de la persona y existir.
async function takeFiles(me, folder, list, allowed) {
  const files = (Array.isArray(list) ? list : []).slice(0, 10).map((f) => ({
    path: str(f && f.path, 300), name: str(f && f.name, 120) || "archivo", kind: str(f && f.kind, 20) || "other", size: Number((f && f.size) || 0), type: str(f && f.type, 60),
  }));
  for (const f of files) {
    if (!f.path.startsWith(me.id + "/" + folder + "/") || f.path.includes("..")) fail("Archivo no válido. Vuelve a adjuntarlo.");
    const ext = extOf(f.path);
    if (!allowed.includes(ext)) fail("Tipo de archivo no permitido: «" + f.name + "».");
    f.type = EXT[ext] || f.type;
  }
  if (files.length) {
    const { data, error } = await db.storage.from(BUCKET).createSignedUrls(files.map((f) => f.path), 60);
    if (error || !data || data.some((d) => d.error || !d.signedUrl)) fail("No encontramos alguno de los archivos subidos. Vuelve a adjuntarlo.");
  }
  return files;
}

// ================= VERIFICACIÓN DE HABILIDADES (acreditaciones) =================
export const AC_LABEL = { pending: "Pendiente", review: "En revisión", correction: "Requiere corrección", approved: "Aprobada", rejected: "Rechazada", suspended: "Suspendida" };
const AC_KINDS = ["certificate", "article", "publication", "project", "portfolio", "demo"];
export async function hasApproved(memberId, skillName) {
  const n = norm(skillName);
  const rows = await q(db.from("accreditations").select("skill_name").eq("member", memberId).eq("status", "approved").limit(100));
  return rows.some((a) => norm(a.skill_name) === n);
}
// Requisito: al menos un video demostrativo y un certificado.
export function evidenceMissing(files) {
  const f = readJson(files);
  const out = [];
  if (!f.some((x) => x.kind === "video")) out.push("un video demostrativo");
  if (!f.some((x) => x.kind === "certificate")) out.push("un certificado");
  return out;
}
async function acView(a, staff, names) {
  const v = {
    id: a.id, skill_name: a.skill_name, category: a.category, kind: a.kind, title: a.title,
    description: a.description, links: a.links, member_notes: a.member_notes, status: a.status,
    status_label: AC_LABEL[a.status] || a.status, feedback: a.feedback, files: await signFiles(a.files),
    created: a.created, updated: a.updated, reviewed_at: a.reviewed_at || "",
    history: readJson(a.history).map((h) => (staff ? h : { at: h.at, action: h.action, note: h.public ? h.note : "", to: h.to })),
  };
  if (staff) { v.admin_notes = a.admin_notes; v.member = a.member; v.member_name = names[a.member] ? displayName(names[a.member].name) : "Miembro"; v.reviewed_by = a.reviewed_by; }
  return v;
}
function acLinks(s) {
  const out = String(s || "").split(/[\s,]+/).filter(Boolean).slice(0, 5);
  out.forEach((u) => { if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(u)) fail("Los enlaces deben empezar con http:// o https://."); });
  return out.join("\n");
}
function acClean(b) {
  const o = { skill_name: str(b.skill_name, 80), category: str(b.category, 60), kind: str(b.kind, 20) || "certificate", title: str(b.title, 120), description: str(b.description, 2000), member_notes: str(b.member_notes, 1000), links: acLinks(str(b.links, 1000)) };
  if (o.skill_name.length < 2) fail("Escribe la habilidad que quieres verificar.");
  if (!AC_KINDS.includes(o.kind)) fail("Elige el tipo de evidencia.");
  if (o.title.length < 3) fail("Escribe un título para la evidencia (mínimo 3 caracteres).");
  if (o.description.length < 10) fail("Describe tu evidencia (mínimo 10 caracteres).");
  return o;
}
async function acFiles(me, list) {
  const files = await takeFiles(me, "accreditations", list, [...DOC_EXT, ...VIDEO_EXT]);
  for (const f of files) {
    const ext = extOf(f.path);
    if (f.kind === "video") { if (!VIDEO_EXT.includes(ext)) fail("El video debe ser MP4, WEBM o MOV."); if (f.size > LIMITS.video) fail("El video debe pesar 100 MB o menos."); }
    else if (f.kind === "certificate") { if (!DOC_EXT.includes(ext)) fail("El certificado debe ser PDF, JPG, PNG o WEBP."); if (f.size > LIMITS.cert) fail("El certificado debe pesar 10 MB o menos."); }
    else { f.kind = "other"; if (!DOC_EXT.includes(ext)) fail("Los archivos adicionales deben ser PDF, JPG, PNG o WEBP."); if (f.size > LIMITS.doc) fail("Cada archivo adicional debe pesar 5 MB o menos."); }
  }
  if (files.filter((f) => f.kind === "other").length > 3) fail("Puedes adjuntar hasta 3 archivos adicionales.");
  return files;
}
export async function acList(me) {
  const rows = await q(db.from("accreditations").select("*").eq("member", me.id).order("created", { ascending: false }).limit(100));
  const items = []; for (const a of rows) items.push(await acView(a, false, {}));
  return { items, approved: rows.filter((a) => a.status === "approved").map((a) => a.skill_name) };
}
export async function acCreate(me, b) {
  const o = acClean(b);
  const files = await acFiles(me, b.files);
  const missing = evidenceMissing(files);
  if (missing.length) fail("Para solicitar la verificación debes adjuntar " + missing.join(" y ") + ".");
  const count = (await q(db.from("accreditations").select("id").eq("member", me.id).limit(60))).length;
  if (count >= 50) fail("Alcanzaste el máximo de evidencias.");
  const open = await q(db.from("accreditations").select("title, skill_name").eq("member", me.id).in("status", ["pending", "review"]).limit(20));
  if (open.length >= 5) fail("Ya tienes 5 evidencias esperando revisión. Espera a que se revisen.");
  if (open.some((a) => a.title === o.title && norm(a.skill_name) === norm(o.skill_name))) return { ok: true, duplicate: true };
  const r = await q(db.from("accreditations").insert({
    ...o, member: me.id, status: "pending", files,
    history: [{ at: new Date().toISOString(), by: me.name, action: "Evidencia enviada", to: "pending", public: true }],
  }).select("id").single());
  await notifyStaff("accreditation", "Nueva solicitud de verificación", displayName(me.name) + ": " + o.skill_name, "/admin/acreditaciones");
  return { ok: true, id: r.id };
}
export async function acResubmit(me, id, b) {
  const a = isUuid(id) ? await q(db.from("accreditations").select("*").eq("id", id).maybeSingle()) : null;
  if (!a || a.member !== me.id) fail("No encontramos esa evidencia.", 404);
  if (a.status !== "correction") fail("Solo puedes corregir evidencias que lo requieran.");
  const o = acClean({ ...b, skill_name: a.skill_name });
  const added = await acFiles(me, b.files);
  let files = readJson(a.files);
  // Un video o certificado nuevo reemplaza al anterior del mismo tipo.
  for (const k of ["video", "certificate"]) if (added.some((f) => f.kind === k)) files = files.filter((f) => f.kind !== k);
  files = files.concat(added);
  if (files.filter((f) => f.kind === "other").length > 3) fail("Puedes tener hasta 3 archivos adicionales.");
  const missing = evidenceMissing(files);
  if (missing.length) fail("Para reenviar debes adjuntar " + missing.join(" y ") + ".");
  await q(db.from("accreditations").update({
    category: o.category, kind: o.kind, title: o.title, description: o.description, member_notes: o.member_notes, links: o.links, files, status: "pending", updated: new Date().toISOString(),
    history: pushHist(a.history, { at: new Date().toISOString(), by: me.name, action: "Corrección enviada", from: "correction", to: "pending", public: true }),
  }).eq("id", a.id).eq("status", "correction"));
  await notifyStaff("accreditation", "Evidencia corregida", displayName(me.name) + ": " + o.skill_name, "/admin/acreditaciones");
  return { ok: true };
}
async function deactivateOffers(memberId, skillName) {
  if (await hasApproved(memberId, skillName)) return 0;
  let n = 0; const key = norm(skillName);
  for (const s of await q(db.from("skills").select("id, name").eq("owner", memberId).eq("kind", "offer").eq("active", true).limit(100))) {
    if (norm(s.name) === key) { await q(db.from("skills").update({ active: false }).eq("id", s.id)); n++; }
  }
  for (const s of await q(db.from("private_offers").select("id, skill_name").eq("instructor", memberId).eq("active", true).limit(100))) {
    if (norm(s.skill_name) === key) { await q(db.from("private_offers").update({ active: false }).eq("id", s.id)); n++; }
  }
  return n;
}
const AC_ACTIONS = { review: ["review", ["pending", "correction", "rejected", "suspended"]], approve: ["approved", ["pending", "review", "rejected", "suspended"]], reject: ["rejected", ["pending", "review"]], correction: ["correction", ["pending", "review"]], suspend: ["suspended", ["approved"]] };
export async function acAdminList(status) {
  let b = db.from("accreditations").select("*").order("updated", { ascending: false }).limit(300);
  if (status) b = b.eq("status", status);
  const rows = await q(b);
  const names = await membersMap(rows.map((a) => a.member));
  const items = []; for (const a of rows) items.push(await acView(a, true, names));
  return { items, labels: AC_LABEL };
}
export async function acReview(me, id, b) {
  const a = isUuid(id) ? await q(db.from("accreditations").select("*").eq("id", id).maybeSingle()) : null;
  if (!a) fail("No encontramos esa evidencia.", 404);
  if (a.member === me.id) fail("No puedes revisar tu propia evidencia. Debe hacerlo otra persona del equipo.", 403);
  const action = str(b.action, 20), act = AC_ACTIONS[action];
  if (!act) fail("Acción no válida.");
  const from = a.status;
  if (!act[1].includes(from)) fail("Esa acción no se puede hacer con el estado actual (" + (AC_LABEL[from] || from) + ").");
  const feedback = str(b.feedback, 1000), notes = str(b.notes, 1000);
  if (["reject", "correction", "suspend"].includes(action) && feedback.length < 5) fail("Escribe el motivo o las observaciones para la persona (mínimo 5 caracteres).");
  if (action === "approve") { const missing = evidenceMissing(a.files); if (missing.length) fail("No se puede aprobar: falta " + missing.join(" y ") + ". Solicita una corrección."); }
  const now = new Date().toISOString();
  const patch = { status: act[0], reviewed_by: me.name, reviewed_at: now, updated: now, history: pushHist(a.history, { at: now, by: me.name, action: "Estado: " + AC_LABEL[act[0]], from, to: act[0], note: feedback, internal: notes, public: !!feedback }) };
  if (feedback) patch.feedback = feedback;
  if (notes) patch.admin_notes = notes;
  const upd = await q(db.from("accreditations").update(patch).eq("id", a.id).eq("status", from).select("id"));
  if (!upd.length) fail("Esta evidencia cambió mientras tanto. Vuelve a cargar.", 409);
  let off = 0; if (act[0] !== "approved" && act[0] !== "review") off = await deactivateOffers(a.member, a.skill_name);
  await audit(me, "accreditation_" + action, a.id, a.skill_name + " → " + act[0] + (off ? " (" + off + " ofertas desactivadas)" : ""));
  await notify(a.member, "accreditation", act[0] === "approved" ? "¡Habilidad verificada: " + a.skill_name + "!" : "Tu verificación: " + AC_LABEL[act[0]], (a.skill_name + (feedback ? " — " + feedback : "")).slice(0, 200), "/app/acreditaciones");
  return { ok: true, status: act[0] };
}

// ================= SUGERENCIAS, QUEJAS Y REPORTES =================
export const FB_CATS = { user: "Problema con una persona", class: "Problema con una clase", exchange: "Problema con un intercambio", direct_payment: "Pago directo", security: "Seguridad", platform: "Problema con la plataforma", complaint: "Queja general", suggestion: "Sugerencia" };
export const FB_LABEL = { new: "Nuevo", review: "En revisión", waiting: "En espera de información", attended: "Atendido", closed: "Cerrado" };
async function fbView(r, staff, names) {
  const thread = readJson(r.thread).filter((t) => staff || !t.internal).map((t) => ({ at: t.at, from: t.from, name: staff ? t.name : (t.from === "staff" ? "Equipo TIEMPO LIBRE 360" : "Tú"), text: t.text, internal: !!t.internal }));
  const v = { id: r.id, code: r.code, category: r.category, category_label: FB_CATS[r.category], subject: r.subject, description: r.description, related_member: r.related_member, related_exchange: r.related_exchange || "", status: r.status, status_label: FB_LABEL[r.status], files: await signFiles(r.files), thread, created: r.created, updated: r.updated };
  if (staff) { const m = names[r.member]; v.member = r.member; v.member_name = m ? displayName(m.name) : "Miembro"; v.member_email = m ? m.email : ""; }
  return v;
}
export async function fbCreate(me, b) {
  const cat = str(b.category, 20), subject = str(b.subject, 150), desc = str(b.description, 3000);
  if (str(b.website, 100)) return { ok: true };
  if (!FB_CATS[cat]) fail("Elige una categoría.");
  if (subject.length < 3) fail("Escribe un asunto (mínimo 3 caracteres).");
  if (desc.length < 10) fail("Cuéntanos qué ocurrió (mínimo 10 caracteres).");
  const files = await takeFiles(me, "feedback", b.files, DOC_EXT);
  if (files.length > 3) fail("Puedes adjuntar hasta 3 archivos.");
  if (files.some((f) => f.size > LIMITS.doc)) fail("Cada archivo debe pesar 5 MB o menos.");
  const recent = await q(db.from("feedback_reports").select("id").eq("member", me.id).gt("created", new Date(Date.now() - 3600000).toISOString()).limit(10));
  if (recent.length >= 5) fail("Enviaste varios reportes seguidos. Espera un rato antes de enviar otro.", 429);
  const dup = await q(db.from("feedback_reports").select("code").eq("member", me.id).eq("subject", subject).eq("description", desc).limit(1));
  if (dup.length) return { ok: true, duplicate: true, code: dup[0].code };
  const relEx = str(b.related_exchange, 40);
  if (relEx) {
    const ex = isUuid(relEx) ? await q(db.from("exchanges").select("requester, provider").eq("id", relEx).maybeSingle()) : null;
    if (!ex || (ex.requester !== me.id && ex.provider !== me.id)) fail("Esa clase o intercambio no es tuyo o no existe.");
  }
  const code = "QS-" + randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
  const r = await q(db.from("feedback_reports").insert({ code, member: me.id, category: cat, subject, description: desc, related_member: str(b.related_member, 100), related_exchange: relEx || null, status: "new", thread: [], files }).select("id").single());
  await notifyStaff("feedback", "Nueva queja o sugerencia " + code, FB_CATS[cat] + ": " + subject.slice(0, 80), "/admin/quejas");
  return { ok: true, code, id: r.id };
}
export async function fbList(me) {
  const rows = await q(db.from("feedback_reports").select("*").eq("member", me.id).order("created", { ascending: false }).limit(100));
  const items = []; for (const r of rows) items.push(await fbView(r, false, {}));
  return { items, categories: FB_CATS };
}
async function fbOwn(me, id) {
  const r = isUuid(id) ? await q(db.from("feedback_reports").select("*").eq("id", id).maybeSingle()) : null;
  if (!r || r.member !== me.id) fail("No encontramos ese reporte.", 404);
  return r;
}
export async function fbGet(me, id) { return await fbView(await fbOwn(me, id), false, {}); }
export async function fbUserReply(me, id, b) {
  const r = await fbOwn(me, id), text = str(b.text, 2000);
  if (r.status === "closed") fail("Este reporte está cerrado. Envía uno nuevo si necesitas algo más.");
  if (text.length < 2) fail("Escribe tu mensaje.");
  const patch = { thread: pushHist(r.thread, { at: new Date().toISOString(), from: "user", name: me.name, text, internal: false }), updated: new Date().toISOString() };
  if (r.status === "waiting" || r.status === "attended") patch.status = "review";
  await q(db.from("feedback_reports").update(patch).eq("id", r.id));
  await notifyStaff("feedback", "Respuesta en " + r.code, text.slice(0, 80), "/admin/quejas");
  return { ok: true };
}
export async function fbAdminList(status, cat) {
  let b = db.from("feedback_reports").select("*").order("updated", { ascending: false }).limit(300);
  if (status) b = b.eq("status", status);
  if (cat) b = b.eq("category", cat);
  const rows = await q(b);
  const names = await membersMap(rows.map((r) => r.member));
  const items = []; for (const r of rows) items.push(await fbView(r, true, names));
  return { items, categories: FB_CATS, labels: FB_LABEL };
}
export async function fbStaffReply(me, id, b) {
  const r = isUuid(id) ? await q(db.from("feedback_reports").select("*").eq("id", id).maybeSingle()) : null;
  if (!r) fail("No encontramos ese reporte.", 404);
  const text = str(b.text, 2000), internal = b.internal === true || b.internal === "true";
  if (text.length < 2) fail("Escribe el mensaje.");
  const patch = { thread: pushHist(r.thread, { at: new Date().toISOString(), from: "staff", name: me.name, text, internal }), updated: new Date().toISOString() };
  if (!internal && r.status === "new") patch.status = "review";
  await q(db.from("feedback_reports").update(patch).eq("id", r.id));
  if (!internal) await notify(r.member, "feedback", "Respuesta a tu reporte " + r.code, text.slice(0, 160), "/app/quejas");
  await audit(me, internal ? "feedback_note" : "feedback_reply", r.id, r.code);
  return { ok: true };
}
export async function fbStatus(me, id, b) {
  const r = isUuid(id) ? await q(db.from("feedback_reports").select("*").eq("id", id).maybeSingle()) : null;
  if (!r) fail("No encontramos ese reporte.", 404);
  const st = str(b.status, 20);
  if (!FB_LABEL[st]) fail("Estado no válido.");
  if (st === r.status) return { ok: true };
  await q(db.from("feedback_reports").update({ status: st, closed_at: st === "closed" ? new Date().toISOString() : null, updated: new Date().toISOString() }).eq("id", r.id));
  await audit(me, "feedback_status", r.id, r.code + " → " + st);
  await notify(r.member, "feedback", "Tu reporte " + r.code + ": " + FB_LABEL[st], "", "/app/quejas");
  return { ok: true };
}

// ================= CLASES PARTICULARES (MXN, pago directo, sin créditos) =================
export const BK_LABEL = { pending: "Pendiente", accepted: "Aceptada", rejected: "Rechazada", payment_pending: "Pago por acordar", confirmed: "Confirmada", completed: "Finalizada", cancelled: "Cancelada", disputed: "En disputa" };
const ACTIVE = ["pending", "accepted", "payment_pending", "confirmed"];
const BLOCKING = ["accepted", "payment_pending", "confirmed"];
const MODE_LABEL = { in_person: "Presencial", virtual: "Virtual", both: "Presencial o virtual" };
function offerView(o, names) {
  const v = { id: o.id, skill_name: o.skill_name, category: o.category, title: o.title, description: o.description, price_mxn: Number(o.price_mxn), minutes: Number(o.minutes), mode: o.mode, mode_label: MODE_LABEL[o.mode], place: o.place, availability: o.availability, cancel_terms: o.cancel_terms, active: o.active, instructor: o.instructor, verified: true };
  if (names) v.instructor_name = names[o.instructor] ? displayName(names[o.instructor].name) : "Miembro";
  return v;
}
function bkView(b, me, names) {
  const role = b.instructor === me.id ? "instructor" : b.student === me.id ? "student" : "staff";
  const nm = (id) => (names[id] ? displayName(names[id].name) : "Miembro");
  return { id: b.id, code: b.code, offer: b.offer || "", conversation: b.conversation || "", source: b.conversation ? "chat" : "offer", title: b.title, skill_name: b.skill_name, price_mxn: Number(b.price_mxn), minutes: Number(b.minutes), mode: b.mode, mode_label: MODE_LABEL[b.mode], place: b.place, starts_at: b.starts_at, ends_at: b.ends_at, terms: b.terms, student_note: b.student_note, payment_note: b.payment_note, dispute_reason: b.dispute_reason, status: b.status, status_label: BK_LABEL[b.status], role, instructor_name: nm(b.instructor), student_name: nm(b.student), history: readJson(b.history), created: b.created };
}
export async function offersList(me) {
  const rows = (await q(db.from("private_offers").select("*").eq("active", true).order("created", { ascending: false }).limit(200))).filter((o) => o.instructor !== me.id);
  const names = await membersMap(rows.map((o) => o.instructor));
  const accs = rows.length ? await q(db.from("accreditations").select("member, skill_name").eq("status", "approved").in("member", [...new Set(rows.map((o) => o.instructor))])) : [];
  const ok = (o) => accs.some((a) => a.member === o.instructor && norm(a.skill_name) === norm(o.skill_name));
  return { items: rows.filter((o) => ok(o) && names[o.instructor] && names[o.instructor].status === "active").map((o) => offerView(o, names)) };
}
export async function privateMine(me) {
  const acc = await q(db.from("accreditations").select("skill_name, category").eq("member", me.id).eq("status", "approved").limit(100));
  const offers = await q(db.from("private_offers").select("*").eq("instructor", me.id).order("created", { ascending: false }).limit(100));
  const bks = await q(db.from("private_bookings").select("*").or(`instructor.eq.${me.id},student.eq.${me.id}`).order("starts_at", { ascending: false }).limit(200));
  const names = await membersMap(bks.flatMap((b) => [b.instructor, b.student]));
  return { accredited: acc, offers: offers.map((o) => offerView(o, null)), bookings: bks.map((b) => bkView(b, me, names)) };
}
export async function offerSave(me, b) {
  const id = str(b.id, 40);
  const price = Math.round(Number(b.price_mxn)), minutes = Math.round(Number(b.minutes));
  const mode = str(b.mode, 12), title = str(b.title, 100), desc = str(b.description, 1500), terms = str(b.cancel_terms, 600), place = str(b.place, 150), avail = str(b.availability, 600);
  if (title.length < 3) fail("Escribe un título para tu clase (mínimo 3 caracteres).");
  if (!(price >= 1 && price <= 20000)) fail("El precio debe estar entre 1 y 20,000 MXN.");
  if (!(minutes >= 15 && minutes <= 240 && minutes % 15 === 0)) fail("La duración debe ser de 15 a 240 minutos, en pasos de 15.");
  if (!MODE_LABEL[mode]) fail("Elige si la clase es presencial, virtual o ambas.");
  if (mode !== "virtual" && place.length < 3) fail("Indica en qué zona o lugar das la clase presencial.");
  if (terms.length < 10) fail("Escribe tus condiciones de cancelación (mínimo 10 caracteres).");
  if (avail.length < 3) fail("Describe tu disponibilidad (por ejemplo: lunes a viernes de 17:00 a 20:00).");
  const fields = { title, description: desc, price_mxn: price, minutes, mode, place, availability: avail, cancel_terms: terms, updated: new Date().toISOString() };
  if (id) {
    const o = isUuid(id) ? await q(db.from("private_offers").select("*").eq("id", id).maybeSingle()) : null;
    if (!o || o.instructor !== me.id) fail("No encontramos esa oferta.", 404);
    await q(db.from("private_offers").update(fields).eq("id", o.id));
    return { ok: true, id: o.id };
  }
  const skill = str(b.skill_name, 80);
  if (!(await hasApproved(me.id, skill))) fail("Solo puedes ofrecer clases particulares de habilidades verificadas. Revisa Mis acreditaciones.", 403);
  if ((await q(db.from("private_offers").select("id").eq("instructor", me.id).limit(30))).length >= 10) fail("Alcanzaste el máximo de 10 ofertas.");
  const ac = (await q(db.from("accreditations").select("id, skill_name, category").eq("member", me.id).eq("status", "approved").limit(100))).find((a) => norm(a.skill_name) === norm(skill));
  const r = await q(db.from("private_offers").insert({ ...fields, instructor: me.id, skill_name: skill, accreditation: ac ? ac.id : null, category: ac ? ac.category : "", active: true }).select("id").single());
  return { ok: true, id: r.id };
}
export async function offerToggle(me, id) {
  const o = isUuid(id) ? await q(db.from("private_offers").select("*").eq("id", id).maybeSingle()) : null;
  if (!o || o.instructor !== me.id) fail("No encontramos esa oferta.", 404);
  const on = !o.active;
  if (on && !(await hasApproved(me.id, o.skill_name))) fail("Tu verificación de esta habilidad ya no está aprobada.", 403);
  await q(db.from("private_offers").update({ active: on }).eq("id", o.id));
  return { ok: true, active: on };
}
async function overlapping(field, id, s, en, exceptId, statuses) {
  const rows = await q(db.from("private_bookings").select("id").eq(field, id).in("status", statuses).lt("starts_at", en.toISOString()).gt("ends_at", s.toISOString()).limit(5));
  return rows.filter((x) => x.id !== exceptId);
}
const newCode = () => "CP-" + randomString(6, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
export async function bkCreate(me, b) {
  const o = isUuid(b.offer) ? await q(db.from("private_offers").select("*").eq("id", b.offer).maybeSingle()) : null;
  if (!o) fail("No encontramos esa oferta.", 404);
  const ins = o.instructor;
  if (!o.active || !(await hasApproved(ins, o.skill_name))) fail("Esta oferta ya no está disponible.");
  if (ins === me.id) fail("No puedes reservar tu propia clase.");
  const im = await getMember(ins); if (!im || im.status !== "active") fail("Esta oferta ya no está disponible.");
  const s = new Date(str(b.starts_at, 40));
  if (isNaN(s.getTime())) fail("Elige una fecha y hora válidas.");
  if (s.getTime() < Date.now() + 2 * 3600000) fail("Elige un horario con al menos 2 horas de anticipación.");
  if (s.getTime() > Date.now() + 120 * 86400000) fail("Solo puedes solicitar clases dentro de los próximos 120 días.");
  s.setUTCSeconds(0, 0);
  const mm = Number(o.minutes), en = new Date(s.getTime() + mm * MS);
  let mode = str(b.mode, 12); if (o.mode !== "both") mode = o.mode;
  if (mode !== "in_person" && mode !== "virtual") fail("Elige si la clase será presencial o virtual.");
  const note = str(b.note, 500);
  if ((await q(db.from("private_bookings").select("id").eq("student", me.id).eq("status", "pending").limit(20))).length >= 5) fail("Ya tienes 5 solicitudes pendientes. Espera respuesta antes de pedir otra.");
  if ((await q(db.from("private_bookings").select("id").eq("student", me.id).eq("offer", o.id).eq("starts_at", s.toISOString()).in("status", ACTIVE).limit(1))).length) fail("Ya solicitaste esa clase en ese horario.");
  if ((await overlapping("instructor", ins, s, en, "", BLOCKING)).length) fail("Ese horario ya está ocupado con otra clase de esta persona. Elige otro.");
  if ((await overlapping("student", me.id, s, en, "", ACTIVE)).length) fail("Ya tienes otra clase particular en ese horario.");
  const code = newCode();
  const rec = await q(db.from("private_bookings").insert({
    code, offer: o.id, instructor: ins, student: me.id, skill_name: o.skill_name, title: o.title, price_mxn: o.price_mxn, minutes: mm, mode, place: o.place,
    starts_at: s.toISOString(), ends_at: en.toISOString(), terms: o.cancel_terms, student_note: note, status: "pending",
    history: [{ at: new Date().toISOString(), by: me.name, action: "Solicitud enviada", to: "pending" }],
  }).select("id, code").single());
  await notify(ins, "private_class", "Nueva solicitud de clase particular", displayName(me.name) + " pidió «" + o.title + "»", "/app/clases-particulares");
  return { ok: true, id: rec.id, code: rec.code };
}
const BK_RULES = {
  accept: { who: "instructor", from: ["pending"], to: "accepted", msg: "Solicitud aceptada" },
  reject: { who: "instructor", from: ["pending"], to: "rejected", msg: "Solicitud rechazada" },
  arrange: { who: "any", from: ["accepted"], to: "payment_pending", msg: "Pago por acordar" },
  confirm: { who: "instructor", from: ["payment_pending"], to: "confirmed", msg: "Clase confirmada" },
  complete: { who: "any", from: ["confirmed"], to: "completed", msg: "Clase finalizada" },
  cancel: { who: "any", from: ACTIVE, to: "cancelled", msg: "Clase cancelada" },
  dispute: { who: "any", from: ["accepted", "payment_pending", "confirmed", "completed"], to: "disputed", msg: "Disputa abierta" },
};
export async function bkAction(me, id, action, b) {
  const rule = BK_RULES[action];
  if (!rule) fail("Acción no válida.", 404);
  const reason = str(b.reason, 500), pay = str(b.payment_note, 300);
  const rec = isUuid(id) ? await q(db.from("private_bookings").select("*").eq("id", id).maybeSingle()) : null;
  if (!rec) fail("No encontramos esa clase.", 404);
  const isIns = rec.instructor === me.id, isStu = rec.student === me.id;
  if (!isIns && !isStu) fail("No encontramos esa clase.", 404);
  if (rule.who === "instructor" && !isIns) fail("Solo la persona que da la clase puede hacer esto.", 403);
  const from = rec.status;
  if (!rule.from.includes(from)) fail("Esa acción no está disponible con el estado actual (" + BK_LABEL[from] + ").");
  const other = isIns ? rec.student : rec.instructor;
  const patch = { status: rule.to, updated: new Date().toISOString() };
  if (action === "accept") {
    if (rec.offer && !(await hasApproved(rec.instructor, rec.skill_name))) fail("Tu verificación de esta habilidad ya no está aprobada.", 403);
    if (new Date(rec.starts_at).getTime() < Date.now()) fail("Ese horario ya pasó.");
    if ((await overlapping("instructor", rec.instructor, new Date(rec.starts_at), new Date(rec.ends_at), rec.id, BLOCKING)).length) fail("Ya aceptaste otra clase en ese horario.");
  }
  if (action === "arrange") { if (pay.length < 5) fail("Anota cómo y cuándo acordaron el pago (mínimo 5 caracteres). La plataforma no cobra ni verifica pagos."); patch.payment_note = pay; }
  if (action === "complete" && new Date(rec.starts_at).getTime() > Date.now()) fail("Podrás finalizarla cuando llegue la hora de la clase.");
  if (action === "dispute" && reason.length < 10) fail("Cuéntanos qué pasó (mínimo 10 caracteres).");
  if (action === "dispute") patch.dispute_reason = reason;
  patch.history = pushHist(rec.history, { at: new Date().toISOString(), by: me.name, action: rule.msg, from, to: rule.to, note: reason || pay });
  const upd = await q(db.from("private_bookings").update(patch).eq("id", rec.id).eq("status", from).select("id"));
  if (!upd.length) fail("Esta clase cambió mientras tanto. Vuelve a cargar.", 409);
  await notify(other, "private_class", rule.msg + " · " + rec.code, rec.title, "/app/clases-particulares");
  if (rec.conversation) await systemMessage(rec.conversation, me.id, rule.msg + " · " + rec.code + (pay ? " — Acuerdo de pago: " + pay : ""));
  if (action === "dispute") { await notifyStaff("private_class", "Disputa en clase particular " + rec.code, reason.slice(0, 100), "/admin/clases-particulares"); await audit(me, "private_dispute", rec.id, rec.code); }
  return { ok: true, status: rule.to };
}
export async function privateAdminList(me, status) {
  let b = db.from("private_bookings").select("*").order("starts_at", { ascending: false }).limit(300);
  if (status) b = b.eq("status", status);
  const rows = await q(b);
  const names = await membersMap(rows.flatMap((x) => [x.instructor, x.student]));
  return { items: rows.map((x) => bkView(x, me, names)), labels: BK_LABEL };
}
export async function bkResolve(me, id, b) {
  const rec = isUuid(id) ? await q(db.from("private_bookings").select("*").eq("id", id).maybeSingle()) : null;
  if (!rec) fail("No encontramos esa clase.", 404);
  if (rec.instructor === me.id || rec.student === me.id) fail("No puedes resolver una disputa en la que participas.", 403);
  if (rec.status !== "disputed") fail("Solo se resuelven clases en disputa.");
  const st = str(b.status, 12), note = str(b.note, 500);
  if (st !== "completed" && st !== "cancelled") fail("Elige cómo queda la clase: finalizada o cancelada.");
  if (note.length < 5) fail("Escribe la resolución (mínimo 5 caracteres).");
  await q(db.from("private_bookings").update({ status: st, updated: new Date().toISOString(), history: pushHist(rec.history, { at: new Date().toISOString(), by: "Administración", action: "Disputa resuelta: " + BK_LABEL[st], from: "disputed", to: st, note }) }).eq("id", rec.id));
  await audit(me, "private_resolve", rec.id, rec.code + " → " + st);
  for (const m of [rec.instructor, rec.student]) await notify(m, "private_class", "Disputa resuelta · " + rec.code, note.slice(0, 160), "/app/clases-particulares");
  return { ok: true };
}

// ================= CHAT PRIVADO PARA ACORDAR CLASES PERSONALIZADAS =================
// Los usuarios acuerdan libremente precio, fecha, horario, duración y modalidad.
// El pago es directo entre ellos y fuera de la plataforma: aquí no se cobra ni se confirma ningún pago.
const CHAT_MODES = { in_person: "Presencial", virtual: "Virtual" };
async function convFor(me, id) {
  const c = isUuid(id) ? await q(db.from("conversations").select("*").eq("id", id).maybeSingle()) : null;
  if (!c || (c.member_a !== me.id && c.member_b !== me.id)) fail("No encontramos esa conversación.", 404);
  c.other = c.member_a === me.id ? c.member_b : c.member_a;
  return c;
}
async function systemMessage(convId, senderId, text) {
  try {
    await q(db.from("chat_messages").insert({ conversation: convId, sender: senderId, kind: "system", body: str(text, 500) }));
    await q(db.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId));
  } catch (err) { console.error("system message failed", err); }
}
async function chatNotify(conv, me, title, body) {
  const ref = "chat:" + conv.id;
  const open = await q(db.from("notifications").select("id").eq("member", conv.other).eq("ref", ref).eq("read", false).limit(1));
  if (open.length) return; // ya hay un aviso sin leer de esta conversación
  await notify(conv.other, "chat", title, body, "/app/clases-particulares?chat=" + conv.id, ref);
}
function msgView(m, meId) {
  return { id: m.id, mine: m.sender === meId, kind: m.kind, body: m.body, proposal: m.proposal || null, proposal_status: m.proposal_status || "", booking: m.booking || "", created: m.created, read: !!m.read_at };
}
export async function chatList(me) {
  const convs = await q(db.from("conversations").select("*").or(`member_a.eq.${me.id},member_b.eq.${me.id}`).order("last_message_at", { ascending: false }).limit(100));
  const others = convs.map((c) => (c.member_a === me.id ? c.member_b : c.member_a));
  const names = await membersMap(others);
  const items = [];
  for (const c of convs) {
    const other = c.member_a === me.id ? c.member_b : c.member_a;
    const last = await q(db.from("chat_messages").select("*").eq("conversation", c.id).order("created", { ascending: false }).limit(1));
    const { count } = await db.from("chat_messages").select("id", { count: "exact", head: true }).eq("conversation", c.id).neq("sender", me.id).is("read_at", null);
    const l = last[0];
    items.push({ id: c.id, other: { id: other, name: names[other] ? displayName(names[other].name) : "Miembro", available: !!(names[other] && names[other].status === "active") }, last: l ? { kind: l.kind, body: l.kind === "proposal" ? "Propuesta de clase: " + ((l.proposal && l.proposal.topic) || "") : l.body, mine: l.sender === me.id, created: l.created } : null, unread: count || 0, last_message_at: c.last_message_at });
  }
  return { items };
}
export async function chatStart(me, b) {
  const otherId = str(b.member, 40);
  if (otherId === me.id) fail("No puedes iniciar una conversación contigo.");
  const other = await getMember(otherId);
  if (!other || other.status !== "active") fail("Esta persona no está disponible.", 404);
  const [a, bb] = me.id < otherId ? [me.id, otherId] : [otherId, me.id];
  const found = await q(db.from("conversations").select("id").eq("member_a", a).eq("member_b", bb).maybeSingle());
  if (found) return { id: found.id };
  const recent = await q(db.from("conversations").select("id").or(`member_a.eq.${me.id},member_b.eq.${me.id}`).gt("created", new Date(Date.now() - 86400000).toISOString()).limit(30));
  if (recent.length >= 20) fail("Iniciaste muchas conversaciones hoy. Vuelve a intentarlo mañana.", 429);
  const { data, error } = await db.from("conversations").insert({ member_a: a, member_b: bb }).select("id").single();
  if (error) { const again = await q(db.from("conversations").select("id").eq("member_a", a).eq("member_b", bb).maybeSingle()); if (again) return { id: again.id }; throw error; }
  return { id: data.id };
}
export async function chatGet(me, id) {
  const c = await convFor(me, id);
  const om = await getMember(c.other);
  const rows = (await q(db.from("chat_messages").select("*").eq("conversation", c.id).order("created", { ascending: false }).limit(200))).reverse();
  await db.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("conversation", c.id).neq("sender", me.id).is("read_at", null);
  await db.from("notifications").update({ read: true }).eq("member", me.id).eq("ref", "chat:" + c.id).eq("read", false);
  return { id: c.id, other: { id: c.other, name: om ? displayName(om.name) : "Miembro", available: !!(om && om.status === "active") }, messages: rows.map((m) => msgView(m, me.id)) };
}
async function chatRate(me) {
  const n = (await q(db.from("chat_messages").select("id").eq("sender", me.id).gt("created", new Date(Date.now() - 60000).toISOString()).limit(25))).length;
  if (n >= 20) fail("Estás enviando mensajes muy rápido. Espera un momento.", 429);
}
async function otherActive(c) { const om = await getMember(c.other); if (!om || om.status !== "active") fail("Esta persona ya no está disponible."); }
export async function chatSend(me, id, b) {
  const c = await convFor(me, id);
  await otherActive(c);
  const text = str(b.text, 2000);
  if (text.length < 1) fail("Escribe un mensaje.");
  await chatRate(me);
  const m = await q(db.from("chat_messages").insert({ conversation: c.id, sender: me.id, kind: "text", body: text }).select("*").single());
  await q(db.from("conversations").update({ last_message_at: m.created }).eq("id", c.id));
  await chatNotify(c, me, "Nuevo mensaje de " + displayName(me.name), text.slice(0, 120));
  return { ok: true, message: msgView(m, me.id) };
}
// Convierte fecha (AAAA-MM-DD) y hora (HH:MM) de Ciudad de México (UTC-6) a un instante.
export function mxToDate(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !/^\d{2}:\d{2}$/.test(String(time || ""))) return null;
  const d = new Date(date + "T" + time + ":00-06:00");
  return isNaN(d.getTime()) ? null : d;
}
export function cleanProposal(b, now = Date.now()) {
  const role = str(b.role, 10);
  if (role !== "teach" && role !== "learn") fail("Indica si tú darás la clase o la recibirás.");
  const topic = str(b.topic, 100);
  if (topic.length < 2) fail("Escribe el tema o la habilidad de la clase.");
  const priceRaw = String(b.price_mxn === undefined || b.price_mxn === null ? "" : b.price_mxn).trim();
  const price = Math.round(Number(priceRaw) * 100) / 100;
  if (priceRaw === "" || !isFinite(price) || price < 0 || price > 100000) fail("Escribe el precio acordado en pesos mexicanos (entre 0 y 100,000).");
  const minutes = Math.round(Number(b.minutes));
  if (!(minutes >= 10 && minutes <= 600)) fail("La duración debe estar entre 10 y 600 minutos.");
  const mode = str(b.mode, 12);
  if (!CHAT_MODES[mode]) fail("Elige si la clase será presencial o virtual.");
  const start = mxToDate(str(b.date, 10), str(b.time, 5));
  if (!start) fail("Elige una fecha y un horario válidos.");
  if (start.getTime() < now + 60 * MS) fail("Elige un horario con al menos 1 hora de anticipación.");
  if (start.getTime() > now + 365 * 86400000) fail("La fecha debe estar dentro del próximo año.");
  const place = str(b.place, 200), notes = str(b.notes, 1000);
  return { role, topic, price_mxn: price, minutes, mode, mode_label: CHAT_MODES[mode], date: str(b.date, 10), time: str(b.time, 5), starts_at: start.toISOString(), place, notes };
}
export async function chatPropose(me, id, b) {
  const c = await convFor(me, id);
  await otherActive(c);
  await chatRate(me);
  const p = cleanProposal(b);
  const pending = await q(db.from("chat_messages").select("id").eq("conversation", c.id).eq("kind", "proposal").eq("proposal_status", "pending").limit(10));
  if (pending.length >= 5) fail("Hay varias propuestas sin responder en esta conversación. Espera respuesta o retira alguna.");
  const m = await q(db.from("chat_messages").insert({ conversation: c.id, sender: me.id, kind: "proposal", body: "", proposal: p, proposal_status: "pending" }).select("*").single());
  await q(db.from("conversations").update({ last_message_at: m.created }).eq("id", c.id));
  await chatNotify(c, me, displayName(me.name) + " te propuso una clase", p.topic + " · " + p.price_mxn + " MXN");
  return { ok: true, message: msgView(m, me.id) };
}
export async function chatProposalAction(me, mid, action) {
  const m = isUuid(mid) ? await q(db.from("chat_messages").select("*").eq("id", mid).maybeSingle()) : null;
  if (!m || m.kind !== "proposal") fail("No encontramos esa propuesta.", 404);
  const c = await convFor(me, m.conversation);
  if (m.proposal_status !== "pending") fail("Esta propuesta ya fue respondida.");
  const p = m.proposal || {};
  const mine = m.sender === me.id;
  if (action === "withdraw") {
    if (!mine) fail("Solo quien hizo la propuesta puede retirarla.", 403);
    await q(db.from("chat_messages").update({ proposal_status: "withdrawn" }).eq("id", m.id).eq("proposal_status", "pending"));
    await systemMessage(c.id, me.id, "Propuesta retirada: " + p.topic);
    return { ok: true, status: "withdrawn" };
  }
  if (mine) fail("La otra persona debe responder a tu propuesta.", 403);
  if (action === "reject") {
    await q(db.from("chat_messages").update({ proposal_status: "rejected" }).eq("id", m.id).eq("proposal_status", "pending"));
    await systemMessage(c.id, me.id, "Propuesta rechazada: " + p.topic);
    await notify(m.sender, "chat", displayName(me.name) + " no aceptó tu propuesta", p.topic, "/app/clases-particulares?chat=" + c.id);
    return { ok: true, status: "rejected" };
  }
  if (action !== "accept") fail("Acción no válida.", 404);
  await otherActive(c);
  const s = new Date(p.starts_at);
  if (isNaN(s.getTime()) || s.getTime() < Date.now()) fail("El horario de esta propuesta ya pasó. Pide una nueva propuesta.");
  const en = new Date(s.getTime() + Number(p.minutes) * MS);
  const instructor = p.role === "teach" ? m.sender : me.id;
  const student = instructor === m.sender ? me.id : m.sender;
  if ((await overlapping("instructor", instructor, s, en, "", BLOCKING)).length) fail("Quien da la clase ya tiene otra clase particular confirmada en ese horario.");
  if ((await overlapping("student", student, s, en, "", BLOCKING)).length) fail("Quien recibe la clase ya tiene otra clase particular en ese horario.");
  const claimed = await q(db.from("chat_messages").update({ proposal_status: "accepted" }).eq("id", m.id).eq("proposal_status", "pending").select("id"));
  if (!claimed.length) fail("Esta propuesta ya fue respondida.");
  const code = newCode();
  const bk = await q(db.from("private_bookings").insert({
    code, offer: null, conversation: c.id, instructor, student, skill_name: p.topic, title: p.topic, price_mxn: p.price_mxn, minutes: p.minutes, mode: p.mode, place: p.place || "",
    starts_at: s.toISOString(), ends_at: en.toISOString(), terms: p.notes || "", status: "accepted",
    history: [{ at: m.created, by: displayName(m.sender === me.id ? me.name : (await getMember(m.sender))?.name), action: "Propuesta enviada por chat", to: "pending" }, { at: new Date().toISOString(), by: me.name, action: "Acuerdo aceptado en el chat", from: "pending", to: "accepted" }],
  }).select("id, code").single());
  await q(db.from("chat_messages").update({ booking: bk.id }).eq("id", m.id));
  await systemMessage(c.id, me.id, "Acuerdo aceptado · " + bk.code + ". Queda en Clases particulares. El pago es directo entre ustedes, fuera de la plataforma.");
  await notify(m.sender, "private_class", displayName(me.name) + " aceptó tu propuesta · " + bk.code, p.topic, "/app/clases-particulares?chat=" + c.id);
  return { ok: true, status: "accepted", booking: bk.id, code: bk.code };
}
