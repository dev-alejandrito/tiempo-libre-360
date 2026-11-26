import { MapPin, LocateFixed, CircleCheck, Circle } from "lucide-react";
import { useState } from "react";
import { Link } from "@/lib/router";

import { Alert, Avatar, Field, PageHeader, Progress, useToast } from "../../components/ui";
import AvailabilityEditor from "../../components/AvailabilityEditor";
import MapView from "../../components/MapView";
import { useAuth } from "../../lib/auth";
import { useApi } from "../../lib/hooks";
import { api, errMsg, pb } from "../../lib/pb";
import { uploadPrivate } from '../../lib/storage';

const parseAv = (v) => (Array.isArray(v) ? v : []);

export default function Profile() {
  const { me, refresh } = useAuth();
  const toast = useToast();
  const { data, reload } = useApi("/person/" + me.id);
  const [imageBusy, setImageBusy] = useState('');
  const [f, setF] = useState({ name: me.name || "", headline: me.headline || "", bio: me.bio || "", city: me.city || "", share: !!me.share_location, lat: me.lat || 0, lng: me.lng || 0, availability: parseAv(me.availability) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const hasLoc = f.share && f.lat && f.lng;
  const checks = [
    ["Escribe un titular y una breve presentación", !!(f.headline && f.bio)],
    ["Ofrece al menos una habilidad", (data?.offers?.length || 0) > 0, "/app/mis-habilidades"],
    ["Indica algo que quieras aprender", (data?.wants?.length || 0) > 0, "/app/quiero-aprender"],
    ["Define tu disponibilidad semanal (mejora tus coincidencias)", f.availability.length > 0],
    ["Comparte tu zona aproximada para ver personas cercanas (opcional)", !!hasLoc],
  ];
  const score = checks.filter((c) => c[1]).length;

  function locate() {
    if (!navigator.geolocation) return setError("Tu navegador no permite obtener la ubicación. Puedes marcar tu zona en el mapa.");
    navigator.geolocation.getCurrentPosition(
      (p) => setF((x) => ({ ...x, share: true, lat: Math.round(p.coords.latitude * 100) / 100, lng: Math.round(p.coords.longitude * 100) / 100 })),
      () => setError("No pudimos obtener tu ubicación. Marca tu zona aproximada en el mapa."),
    );
  }
  async function save(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      await pb.collection("members").update(me.id, { name: f.name.trim(), headline: f.headline.trim(), bio: f.bio.trim(), city: f.city.trim(), share_location: f.share, lat: f.share ? f.lat : 0, lng: f.share ? f.lng : 0, availability: f.availability }, { requestKey: null });
      toast("Perfil guardado.");
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  async function uploadImage(event, kind) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(file.name) || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Elige una imagen JPG, PNG o WEBP de hasta 5 MB.'); return;
    }
    setError(''); setImageBusy(kind);
    try {
      const uploaded = await uploadPrivate(file, 'profile', kind);
      await api('/me/profile-image', { method: 'POST', body: { kind, path: uploaded.path } });
      await refresh(); reload(); toast(kind === 'avatar' ? 'Fotografía guardada.' : 'Portada guardada.');
    } catch (err) { setError(errMsg(err)); } finally { setImageBusy(''); }
  }
  return (
    <>
      <PageHeader title="Perfil inteligente" subtitle="Cuanto más completo, mejores son tus coincidencias." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={save} className="space-y-6">
          <section className="card space-y-4">
            <h2 className="text-xl font-bold">Sobre ti</h2>
            {data?.cover_url && <img src={data.cover_url} alt="Tu portada" className="h-36 w-full rounded-lg object-cover" />}
            <Avatar name={me.name} size={72} src={data?.avatar_url} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fotografía" hint="JPG, PNG o WEBP · hasta 5 MB.">{(p) => <input {...p} className="input" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!imageBusy} onChange={(e) => uploadImage(e, 'avatar')} />}</Field>
              <Field label="Portada" hint="JPG, PNG o WEBP · hasta 5 MB.">{(p) => <input {...p} className="input" type="file" accept="image/jpeg,image/png,image/webp" disabled={!!imageBusy} onChange={(e) => uploadImage(e, 'cover')} />}</Field>
            </div>
            {imageBusy && <p role="status" className="hint">Guardando imagen…</p>}
            <Field label="Nombre y apellido">{(p) => <input {...p} className="input" required value={f.name} onChange={set("name")} />}</Field>
            <Field label="Titular" hint="Una frase corta, por ejemplo: «Profe de inglés y amante del senderismo».">{(p) => <input {...p} className="input" maxLength={120} value={f.headline} onChange={set("headline")} />}</Field>
            <Field label="Presentación">{(p) => <textarea {...p} className="input" rows={4} maxLength={800} value={f.bio} onChange={set("bio")} />}</Field>
          </section>
          <section className="card space-y-4">
            <h2 className="text-xl font-bold">Ubicación aproximada</h2>
            <Alert kind="info">Solo con tu consentimiento mostramos una zona de alrededor de 1 km a otras personas que también la comparten. Nunca mostramos tu domicilio.</Alert>
            <Field label="Ciudad o barrio (visible solo si compartes tu zona)">{(p) => <input {...p} className="input" value={f.city} onChange={set("city")} maxLength={80} />}</Field>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={f.share} onChange={(e) => setF({ ...f, share: e.target.checked })} /><span>Doy mi consentimiento para compartir mi <strong>zona aproximada</strong> y ver personas cercanas.</span></label>
            {f.share && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-ghost btn-sm" onClick={locate}><LocateFixed size={16} aria-hidden="true" />Usar mi ubicación actual</button></div>
                <MapView label="Mapa para marcar tu zona aproximada" center={hasLoc ? [f.lat, f.lng] : undefined} me={hasLoc ? { lat: f.lat, lng: f.lng } : null} height={280} onPick={(lat, lng) => setF((x) => ({ ...x, lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 }))} />
                <p className="hint">{hasLoc ? "Zona marcada. Toca otro punto del mapa para cambiarla." : "Toca el mapa para marcar tu zona aproximada."}</p>
              </div>
            )}
          </section>
          <section className="card space-y-4">
            <h2 className="text-xl font-bold">Disponibilidad semanal</h2>
            <p className="hint">Marca los días y horarios en los que sueles poder hacer sesiones.</p>
            <AvailabilityEditor value={f.availability} onChange={(a) => setF({ ...f, availability: a })} />
          </section>
          {error && <Alert kind="error">{error}</Alert>}
          <button className="btn btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar perfil"}</button>
        </form>
        <aside className="card h-fit lg:sticky lg:top-6">
          <h2 className="text-xl font-bold">Tu perfil al {Math.round((score / checks.length) * 100)}%</h2>
          <div className="mt-3"><Progress value={score} max={checks.length} label="Perfil completado" /></div>
          <ul className="mt-4 space-y-3">
            {checks.map(([t, ok, to]) => (
              <li key={t} className="flex gap-2 text-sm">{ok ? <CircleCheck size={18} className="shrink-0 text-ok" aria-hidden="true" /> : <Circle size={18} className="shrink-0 text-[#7a7466]" aria-hidden="true" />}<span>{ok ? <span className="sr-only">Hecho: </span> : <span className="sr-only">Pendiente: </span>}{!ok && to ? <Link to={to} className="font-semibold underline">{t}</Link> : t}</span></li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-sand p-3 text-sm"><MapPin size={16} aria-hidden="true" />Tus datos privados (como tu correo) nunca se muestran a otras personas.</div>
        </aside>
      </div>
    </>
  );
}
