import { Link, Navigate, useParams } from "@/lib/router";
import { useEffect } from "react";
import { LEGAL, LEGAL_UPDATED, LEGAL_PENDING } from "../../lib/legal";

function Txt({ children }) {
  return String(children).split(/(\[\[.*?\]\])/g).map((t, i) => t.startsWith("[[")
    ? <mark key={i} className="rounded bg-[#fdecc8] px-1 font-semibold text-[#5c3200]" title="Pendiente de confirmar por el propietario">[Por confirmar: {t.slice(2, -2)}]</mark>
    : <span key={i}>{t}</span>);
}

function DocNav({ current }) {
  return (
    <nav aria-label="Documentos legales" className="flex flex-wrap gap-2">
      {LEGAL.map((d) => <Link key={d.slug} to={"/legal/" + d.slug} aria-current={d.slug === current ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${d.slug === current ? "border-ink bg-ink text-white" : "border-ink/30 bg-white text-ink hover:bg-paper"}`}>{d.short}</Link>)}
    </nav>
  );
}

export function LegalIndex() {
  useEffect(() => { document.title = "Información legal — TIEMPO LIBRE 360"; }, []);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold md:text-4xl">Información legal y de confianza</h1>
      <p className="mt-2 max-w-2xl text-[#3c3829]">Todo lo que necesitas saber sobre tus datos, tus créditos y las reglas de la comunidad, en lenguaje claro.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {LEGAL.map((d) => <li key={d.slug} className="card"><h2 className="text-xl font-bold"><Link to={"/legal/" + d.slug} className="underline underline-offset-4">{d.title}</Link></h2><p className="mt-1 text-[#3c3829]">{d.intro}</p></li>)}
      </ul>
    </div>
  );
}

export function LegalDoc() {
  const { slug } = useParams();
  const d = LEGAL.find((x) => x.slug === slug);
  useEffect(() => { if (d) document.title = d.title + " — TIEMPO LIBRE 360"; window.scrollTo(0, 0); }, [d]);
  if (!d) return <Navigate to="/legal" replace />;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <DocNav current={slug} />
      <h1 className="mt-8 text-3xl font-extrabold md:text-4xl">{d.title}</h1>
      <p className="mt-2 text-lg text-[#3c3829]">{d.intro}</p>
      <p className="mt-1 text-sm text-[#3c3829]">Vigente desde: <Txt>{LEGAL_UPDATED}</Txt></p>
      <p className="mt-4 rounded-xl border border-[#efc877] bg-[#fdecc8] p-3 text-sm text-[#5c3200]">{LEGAL_PENDING}</p>
      <div className="mt-6 grid gap-8 md:grid-cols-[14rem_1fr]">
        <nav aria-label="En esta página" className="hidden md:block"><ol className="sticky top-24 space-y-2 text-sm">{d.sections.map((s, i) => <li key={i}><a className="underline-offset-4 hover:underline" href={"#s" + i}>{s.h}</a></li>)}</ol></nav>
        <div className="space-y-8">
          {d.sections.map((s, i) => (
            <section key={i} id={"s" + i} className="scroll-mt-24">
              <h2 className="text-xl font-bold">{s.h}</h2>
              {s.p && s.p.map((t, j) => <p key={j} className="mt-2 leading-relaxed"><Txt>{t}</Txt></p>)}
              {s.ul && <ul className="mt-2 list-disc space-y-1.5 pl-6 leading-relaxed">{s.ul.map((t, j) => <li key={j}><Txt>{t}</Txt></li>)}</ul>}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
