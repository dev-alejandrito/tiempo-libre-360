import { useEffect, useState } from "react";
import { Alert, Field, PageHeader, Spinner, useToast } from "../../components/ui";
import { api, errMsg, pb } from "../../lib/pb";
import SocialSettings from "../../components/SocialSettings";

const FIELDS = [
  ["welcome_credits", "Créditos de bienvenida", "Se entregan a cada persona al registrarse (1 minuto = 1 crédito; 120 créditos = 120 minutos).", 0, 600],
  ["max_minutes", "Duración máxima de una sesión (minutos)", "Se ofrecen 15, 30, 45, 60, 90 y 120 minutos, hasta este máximo. Cada minuto cuesta 1 crédito.", 15, 120],
  ["late_cancel_hours", "Horas de antelación para no contar como cancelación tardía", "Se anota en el pasaporte de confianza.", 1, 168],
  ["max_open_requests", "Solicitudes abiertas por persona", "Evita reservar créditos de forma masiva.", 1, 50],
];

const SETS = [["members", "Personas"], ["skills", "Habilidades"], ["exchanges", "Intercambios"], ["credit_ledger", "Movimientos de créditos"], ["wallets", "Carteras"], ["ratings", "Valoraciones"], ["reports", "Reportes"], ["audit_log", "Auditoría"], ["contact_messages", "Mensajes de contacto"], ["community_posts", "Comunidad"]];
function download(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
async function exportSet(key, fmt) {
  const rows = (await pb.collection(key).getFullList({ requestKey: null, sort: "-created" })).map(({ collectionId, collectionName, expand, tokenKey, ...r }) => r);
  const day = new Date().toISOString().slice(0, 10);
  if (fmt === "json") return download(`${key}-${day}.json`, JSON.stringify(rows, null, 2), "application/json");
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => { const t = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  download(`${key}-${day}.csv`, "\ufeff" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"), "text/csv");
}

export default function AdminConfig() {
  const toast = useToast();
  const [vals, setVals] = useState(null);
  const [int, setInt] = useState(null);
  const [form, setForm] = useState({ twilio_sid: "", twilio_token: "", twilio_wa_from: "", twilio_sms_from: "", wa_enabled: false, sms_enabled: false });
  const [err, setErr] = useState("");

  async function load() {
    await api("/public/stats").catch(() => {});
    const rows = await pb.collection("site_settings").getFullList({ requestKey: null });
    const m = {}; rows.forEach((r) => { m[r.key] = r; });
    setVals(m);
    const i = await api("/admin/integrations");
    setInt(i); setForm((f) => ({ ...f, twilio_wa_from: i.wa_from, twilio_sms_from: i.sms_from, wa_enabled: i.wa_enabled, sms_enabled: i.sms_enabled }));
  }
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  async function saveSettings(e) {
    e.preventDefault(); setErr("");
    try {
      for (const [k, , , min, max] of FIELDS) {
        const v = Number(vals[k]?.value);
        if (!(v >= min && v <= max)) throw new Error(`Revisa «${FIELDS.find((x) => x[0] === k)[1]}»: debe estar entre ${min} y ${max}.`);
        if (vals[k]?.id) await pb.collection("site_settings").update(vals[k].id, { value: String(v) }, { requestKey: null });
        else await pb.collection("site_settings").create({ key: k, value: String(v) }, { requestKey: null });
      }
      toast("Configuración guardada."); load();
    } catch (e2) { setErr(errMsg(e2)); }
  }
  async function saveInt(e) {
    e.preventDefault(); setErr("");
    try { await api("/admin/integrations", { method: "POST", body: form }); setForm((f) => ({ ...f, twilio_sid: "", twilio_token: "" })); toast("Mensajería guardada."); load(); } catch (e2) { setErr(e2.message); }
  }
  if (!vals || !int) return err ? <Alert kind="error">{err}</Alert> : <Spinner />;
  return (
    <>
      <PageHeader title="Configuración" subtitle="Reglas de la comunidad y canales de aviso." />
      {err && <div className="mb-4"><Alert kind="error">{err}</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveSettings} className="card space-y-4">
          <h2 className="text-xl font-bold">Reglas de la comunidad</h2>
          {FIELDS.map(([k, label, hint, min, max]) => (
            <Field key={k} label={label} hint={hint}>{(p) => <input {...p} className="input max-w-40" type="number" min={min} max={max} value={vals[k]?.value ?? ""} onChange={(e) => setVals({ ...vals, [k]: { ...(vals[k] || {}), value: e.target.value } })} />}</Field>
          ))}
          <button className="btn btn-dark">Guardar reglas</button>
        </form>
        <div className="space-y-6">
          <section className="card space-y-2">
            <h2 className="text-xl font-bold">Correo electrónico</h2>
            <Alert kind="warn">El envío de correos todavía no está activado en tu paquete de alojamiento, por eso las notificaciones se muestran dentro de la plataforma y los mensajes de contacto se guardan en <strong>Mensajes de contacto</strong>. Cuando el alojamiento tenga una dirección de envío, se podrá activar.</Alert>
          </section>
        </div>
      </div>
      <section className="card mt-6">
        <h2 className="text-xl font-bold">Exportar los datos de la comunidad</h2>
        <p className="mt-1 text-[#3c3829]">Descarga una copia de tu información cuando quieras, en formato abierto (CSV para hojas de cálculo, JSON para otros sistemas). Contiene datos personales: guárdala con cuidado.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SETS.map(([k, label]) => (
            <li key={k} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-3"><span className="font-semibold">{label}</span>
              <span className="flex gap-1.5"><button type="button" className="btn btn-ghost btn-sm" onClick={() => exportSet(k, "csv").catch((e) => toast(errMsg(e), "error"))}>CSV<span className="sr-only"> de {label}</span></button><button type="button" className="btn btn-ghost btn-sm" onClick={() => exportSet(k, "json").catch((e) => toast(errMsg(e), "error"))}>JSON<span className="sr-only"> de {label}</span></button></span></li>
          ))}
        </ul>
      </section>
      <SocialSettings />
    </>
  );
}
