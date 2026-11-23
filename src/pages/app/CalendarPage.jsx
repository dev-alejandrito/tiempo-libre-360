import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, PageHeader, Spinner } from "../../components/ui";
import { AvailabilityView } from "../../components/AvailabilityEditor";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../lib/auth";
import { DAYS, STATUS, fmtMin, fmtTime, icsFor, toDate } from "../../lib/util";

const TZ = "America/Mexico_City";
// Clave de día (AAAA-MM-DD) en hora de Ciudad de México.
const mxKey = (d) => d.toLocaleDateString("sv-SE", { timeZone: TZ });
// Los días del calendario se manejan como fechas a mediodía UTC para no desfasarse.
const fromKey = (k) => new Date(k + "T12:00:00Z");
const addDays = (k, n) => { const d = fromKey(k); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (k) => addDays(k, -((fromKey(k).getUTCDay() + 6) % 7));
const label = (k, o) => fromKey(k).toLocaleDateString("es", { timeZone: "UTC", ...o });
const VIEWS = [["month", "Mes"], ["week", "Semana"], ["day", "Día"]];
// Grupos de estado: confirmada, pendiente, cancelada, finalizada.
const GROUP = { scheduled: ["Confirmada", "chip-ok", "border-l-teal"], pending: ["Pendiente", "chip-warn", "border-l-amber-deep"], negotiating: ["Pendiente", "chip-warn", "border-l-amber-deep"], cancelled: ["Cancelada", "chip-bad", "border-l-red-700"], rejected: ["Cancelada", "chip-bad", "border-l-red-700"], completed: ["Finalizada", "chip-info", "border-l-ink"], disputed: ["En conflicto", "chip-bad", "border-l-red-700"] };

function Event({ x }) {
  const g = GROUP[x.status] || ["", "chip", "border-l-ink"];
  return (
    <li className={`rounded-xl border-l-4 bg-sand p-3 ${g[2]}`}>
      <p className="num font-bold">{fmtTime(x.when.toISOString())} · {fmtMin(x.minutes)}</p>
      <p className="font-semibold">{x.skill_name}</p>
      <p className="text-sm">{x.role === "requester" ? "Aprendes de" : "Enseñas a"} {x.other.name} · {x.mode === "virtual" ? "Virtual" : "Presencial"}</p>
      <span className={`chip mt-1 ${g[1]}`}>{g[0] || STATUS[x.status]?.label}</span>
    </li>
  );
}

export default function CalendarPage() {
  const { me } = useAuth();
  const { data, loading, error } = useApi("/exchanges");
  const today = mxKey(new Date());
  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(today);
  const events = useMemo(() => {
    const m = {};
    (data?.items || []).forEach((x) => {
      const d = toDate(x.scheduled_start || x.proposed_start); if (!d || isNaN(d)) return;
      (m[mxKey(d)] = m[mxKey(d)] || []).push({ ...x, when: d });
    });
    Object.values(m).forEach((a) => a.sort((p, q) => p.when - q.when));
    return m;
  }, [data]);
  if (loading) return <Spinner />;
  if (error) return <Alert kind="error">{error}</Alert>;

  const step = (n) => setAnchor(view === "month" ? (() => { const d = fromKey(anchor); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); })() : addDays(anchor, view === "week" ? 7 * n : n));
  const title = view === "month" ? label(anchor, { month: "long", year: "numeric" }) : view === "week" ? `${label(mondayOf(anchor), { day: "numeric", month: "short" })} – ${label(addDays(mondayOf(anchor), 6), { day: "numeric", month: "short", year: "numeric" })}` : label(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const download = () => {
    const blob = new Blob([icsFor((data?.items || []).filter((x) => x.status === "scheduled"))], { type: "text/calendar" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tiempo-libre-360.ics"; a.click(); URL.revokeObjectURL(a.href);
  };
  const first = mondayOf(anchor.slice(0, 8) + "01");
  const monthCells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const week = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i));
  const sel = events[anchor] || [];
  const navBtn = "grid h-11 w-11 place-items-center rounded-full hover:bg-sand";

  return (
    <>
      <PageHeader title="Calendario" subtitle="Tus clases confirmadas, pendientes, canceladas y finalizadas, en hora de Ciudad de México.">
        <button type="button" className="btn btn-ghost btn-sm" onClick={download}><Download size={16} aria-hidden="true" />Exportar sesiones (.ics)</button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card" aria-label="Calendario">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div role="group" aria-label="Vista del calendario" className="flex gap-1">
              {VIEWS.map(([k, l]) => <button type="button" key={k} onClick={() => setView(k)} aria-pressed={view === k} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${view === k ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-sand"}`}>{l}</button>)}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAnchor(today)}>Hoy</button>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className={navBtn} onClick={() => step(-1)} aria-label="Anterior"><ChevronLeft aria-hidden="true" /></button>
            <h2 className="text-center text-lg font-extrabold capitalize sm:text-xl" aria-live="polite">{title}</h2>
            <button type="button" className={navBtn} onClick={() => step(1)} aria-label="Siguiente"><ChevronRight aria-hidden="true" /></button>
          </div>
          {view === "month" && <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">{DAYS.map((d) => <div key={d} className="py-1" aria-label={d}>{d.slice(0, 3)}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((k) => {
                const n = events[k]?.length || 0, inMonth = k.slice(0, 7) === anchor.slice(0, 7);
                return (
                  <button type="button" key={k} onClick={() => { setAnchor(k); }} aria-pressed={anchor === k} aria-label={`${label(k, { day: "numeric", month: "long" })}, ${n} clases`}
                    className={`relative aspect-square rounded-xl border text-sm font-semibold ${anchor === k ? "border-ink bg-ink text-white" : today === k ? "border-amber-deep bg-[#fdecc8]" : inMonth ? "border-line bg-white hover:bg-sand" : "border-line bg-sand text-[#3c3829]"}`}>
                    {Number(k.slice(8))}
                    {n > 0 && <span className={`num absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[10px] font-bold ${anchor === k ? "bg-amber text-ink" : "bg-teal text-white"}`}>{n}</span>}
                  </button>
                );
              })}
            </div>
          </>}
          {view === "week" && (
            <ul className="space-y-3">
              {week.map((k) => (
                <li key={k} className={`rounded-xl border p-3 ${k === today ? "border-amber-deep bg-[#fff7e6]" : "border-line"}`}>
                  <button type="button" className="font-extrabold capitalize underline-offset-4 hover:underline" onClick={() => { setAnchor(k); setView("day"); }}>{label(k, { weekday: "long", day: "numeric", month: "short" })}</button>
                  {events[k] ? <ul className="mt-2 space-y-2">{events[k].map((x) => <Event key={x.id} x={x} />)}</ul> : <p className="mt-1 text-sm text-[#3c3829]">Sin clases.</p>}
                </li>
              ))}
            </ul>
          )}
          {view === "day" && (sel.length ? <ul className="space-y-3">{sel.map((x) => <Event key={x.id} x={x} />)}</ul> : <p className="py-6 text-center text-[#3c3829]">No hay clases este día.</p>)}
          <ul className="mt-4 flex flex-wrap gap-2 text-xs font-bold" aria-label="Leyenda de estados">
            {[["Confirmada", "chip-ok"], ["Pendiente", "chip-warn"], ["Cancelada", "chip-bad"], ["Finalizada", "chip-info"]].map(([l, c]) => <li key={l} className={`chip ${c}`}>{l}</li>)}
          </ul>
        </section>
        <aside className="space-y-4">
          {view !== "day" && <section className="card"><h2 className="text-xl font-bold capitalize">{label(anchor, { weekday: "long", day: "numeric", month: "long" })}</h2>
            {sel.length === 0 ? <p className="mt-2 text-[#3c3829]">No hay clases.</p> : <ul className="mt-3 space-y-3">{sel.map((x) => <Event key={x.id} x={x} />)}</ul>}
          </section>}
          <section className="card"><h2 className="text-xl font-bold">Mi disponibilidad</h2><div className="mt-2"><AvailabilityView slots={Array.isArray(me.availability) ? me.availability : []} /></div></section>
        </aside>
      </div>
    </>
  );
}
