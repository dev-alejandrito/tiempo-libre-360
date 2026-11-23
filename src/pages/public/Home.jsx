import { ArrowRight, Clock3 as Clock, Users, Repeat2 as Repeat, ShieldCheck, MapPin, Sparkles, HandHeart } from "lucide-react";
import { Link } from "@/lib/router";

import { useApi } from "../../lib/hooks";
import { CATEGORIES } from "../../lib/util";

function Ring() {
  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden="true">
      <g className="spin-slow">
        {Array.from({ length: 60 }).map((_, i) => (
          <line key={i} x1="200" y1="14" x2="200" y2={i % 5 === 0 ? 38 : 26} stroke={i % 15 === 0 ? "#F4A93B" : "#6B7F99"} strokeWidth={i % 5 === 0 ? 4 : 2} strokeLinecap="round" transform={`rotate(${i * 6} 200 200)`} />
        ))}
      </g>
      <circle cx="200" cy="200" r="130" fill="#15253B" stroke="#213650" strokeWidth="2" />
      <circle cx="200" cy="200" r="104" fill="none" stroke="#F4A93B" strokeWidth="10" strokeDasharray="520 140" strokeLinecap="round" transform="rotate(-90 200 200)" />
      <path d="M200 140v62l38 24" fill="none" stroke="#F6F2E9" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <text x="200" y="300" textAnchor="middle" fill="#6EE7D0" fontFamily="JetBrains Mono, monospace" fontSize="22" fontWeight="700">1 min = 1 crédito</text>
    </svg>
  );
}

const STEPS = [
  [Users, "Cuenta lo que sabes", "Registra las habilidades que ofreces y las que quieres aprender, con tu nivel y disponibilidad. Sin certificados ni pruebas."],
  [Sparkles, "Encuentra coincidencias", "Te recomendamos personas según habilidades, nivel, modalidad, horarios y cercanía, siempre explicándote el motivo."],
  [Repeat, "Intercambia tiempo", "Solicita una sesión, acuerda el horario y, cuando ambos confirman, los créditos pasan de quien aprende a quien enseña."],
];

export default function Home() {
  const { data } = useApi("/public/stats");
  const stats = [["Personas en la comunidad", data?.members], ["Minutos compartidos", data?.minutes], ["Intercambios completados", data?.exchanges], ["Habilidades ofrecidas", data?.skills]];
  return (
    <>
      <section className="dark-surface grain relative overflow-hidden bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1.15fr_.85fr] md:py-24">
          <div className="rise">
            <p className="chip border-white/20 bg-white/10 text-white"><Clock size={14} aria-hidden="true" /> Banco de tiempo comunitario</p>
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] md:text-7xl">Tu tiempo tiene valor.<br /><span className="text-amber">Tus conocimientos también.</span></h1>
            <p className="mt-6 max-w-xl text-lg text-[#d9e2f0]">Enseña lo que sabes, aprende lo que quieres. Aquí no se paga con dinero: <strong className="text-white">1 minuto de servicio = 1 crédito</strong>, y todos pueden participar.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/registro" className="btn btn-primary">Crear mi cuenta gratis <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link to="/explorar" className="btn btn-light">Explorar habilidades</Link>
            </div>
            <p className="mt-4 text-sm text-[#b9c6da]">Recibes créditos de bienvenida al registrarte. Sin tarjeta, sin tienda.</p>
          </div>
          <div className="rise mx-auto aspect-square w-full max-w-sm" style={{ animationDelay: ".15s" }}><Ring /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-label="La comunidad en cifras">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(([l, v]) => (
            <div key={l} className="card"><dd className="num text-4xl font-bold">{v ?? "—"}</dd><dt className="mt-1 text-sm font-semibold text-[#3c3829]">{l}</dt></div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-3xl font-extrabold md:text-4xl">Tres pasos para empezar</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map(([Icon, t, d], i) => (
            <li key={t} className="card relative">
              <span className="num absolute right-4 top-3 text-5xl font-bold text-sand" aria-hidden="true">0{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-amber"><Icon size={24} aria-hidden="true" /></span>
              <h3 className="mt-4 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-[#3c3829]">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 text-center"><Link to="/como-funciona" className="btn btn-ghost">Ver cómo funciona en detalle</Link></div>
      </section>

      <section className="bg-sand">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold md:text-4xl">Confianza por diseño</h2>
            <p className="mt-3 text-[#3c3829]">Tu tiempo y tu privacidad están protegidos en cada paso.</p>
            <ul className="mt-6 space-y-4">
              {[[ShieldCheck, "Créditos protegidos", "Los créditos se reservan al pedir una sesión y solo se liberan cuando ambas personas confirman. Nunca hay saldos negativos."], [MapPin, "Cercanía sin revelar tu casa", "Solo si das tu consentimiento mostramos tu zona aproximada (alrededor de 1 km), nunca tu domicilio."], [HandHeart, "Todos pueden participar", "No pedimos títulos, fotos de documentos ni pruebas. Tu reputación se construye con minutos compartidos y valoraciones."]].map(([Icon, t, d]) => (
                <li key={t} className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-mint"><Icon size={22} aria-hidden="true" /></span><div><h3 className="font-bold">{t}</h3><p className="text-[#3c3829]">{d}</p></div></li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">¿Qué se puede intercambiar?</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => <li key={c}><Link to={`/explorar?categoria=${encodeURIComponent(c)}`} className="chip bg-white px-3.5 py-2 text-sm no-underline hover:bg-amber">{c}</Link></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="dark-surface bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl text-3xl font-extrabold md:text-4xl">Hoy puedes enseñar 30 minutos y aprender otros 30.</h2>
          <Link to="/registro" className="btn btn-primary">Unirme a la comunidad <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}
