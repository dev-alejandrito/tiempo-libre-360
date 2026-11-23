import { useEffect, useState } from "react";
import { Alert, Field, useToast } from "./ui";
import { errMsg, pb } from "../lib/pb";
import { SOCIALS, safeUrl } from "../lib/social";

export default function SocialSettings() {
  const toast = useToast();
  const [rows, setRows] = useState({});
  const [vals, setVals] = useState({});
  const [err, setErr] = useState("");
  async function load() {
    const list = await pb.collection("site_settings").getFullList({ requestKey: null });
    const m = {}, v = {};
    list.forEach((r) => { m[r.key] = r; if (r.key.startsWith("social_")) v[r.key] = r.value; });
    setRows(m); setVals(v);
  }
  useEffect(() => { load().catch((e) => setErr(errMsg(e))); }, []);
  async function save(e) {
    e.preventDefault(); setErr("");
    try {
      for (const [k, label] of SOCIALS) {
        const raw = (vals[k] || "").trim();
        if (raw && !safeUrl(raw)) throw new Error(`«${label}»: escribe el enlace completo, empezando por https://`);
        const prev = rows[k];
        if (prev) { if (prev.value !== raw) await pb.collection("site_settings").update(prev.id, { value: raw }, { requestKey: null }); }
        else if (raw) await pb.collection("site_settings").create({ key: k, value: raw }, { requestKey: null });
      }
      toast("Redes sociales guardadas."); load();
    } catch (e2) { setErr(errMsg(e2)); }
  }
  return (
    <form onSubmit={save} className="card mt-6 space-y-3">
      <h2 className="text-xl font-bold">Redes sociales</h2>
      <p className="hint">Estos enlaces aparecen en Contacto y en el pie de página. Deja vacío lo que aún no tengas: no se mostrará nada.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {SOCIALS.map(([k, label]) => (
          <Field key={k} label={label} hint="Ejemplo: https://www.instagram.com/tu_perfil">
            {(p) => <input {...p} className="input" type="url" inputMode="url" placeholder="https://" value={vals[k] || ""} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />}
          </Field>
        ))}
      </div>
      {err && <Alert kind="error">{err}</Alert>}
      <button className="btn btn-dark">Guardar redes sociales</button>
    </form>
  );
}
