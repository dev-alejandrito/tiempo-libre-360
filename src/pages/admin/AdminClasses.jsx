import { api } from "../../lib/pb";
import { useApi } from "../../lib/hooks";
import { PageHeader } from "../../components/ui";
import { STATUS, fmtDateTime } from "../../lib/util";

export default function AdminClasses() {
  const { data, error } = useApi(() => api("/admin/classes"), []);
  if (error) return <p role="alert">No se pudo cargar la supervisión de clases.</p>;
  if (!data) return <p>Cargando…</p>;
  const k = [["Conflictos de horario", data.conflicts.length], ["Enlaces virtuales activos", data.virtual_active], ["Enlaces cancelados", data.virtual_cancelled], ["Recordatorios en las próximas 24 h", data.reminders_due_24h], ["Errores de notificación", data.notification_errors]];
  return (
    <>
      <PageHeader title="Supervisión de clases" subtitle="Reservas, enlaces virtuales y recordatorios. Todas las horas en Ciudad de México." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{k.map(([t, n]) => <li key={t} className="card"><p className="text-sm">{t}</p><p className="text-2xl font-bold">{n}</p></li>)}</ul>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Clases recientes</caption>
          <thead><tr><th className="p-2">Fecha</th><th className="p-2">Instructor</th><th className="p-2">Alumno</th><th className="p-2">Min.</th><th className="p-2">Modalidad</th><th className="p-2">Estado</th><th className="p-2">Enlace</th></tr></thead>
          <tbody>{data.rows.map((r) => <tr key={r.id} className="border-t border-ink/10"><td className="p-2">{fmtDateTime(r.start)}</td><td className="p-2">{r.provider}</td><td className="p-2">{r.requester}</td><td className="p-2">{r.minutes}</td><td className="p-2">{r.mode === "virtual" ? "Virtual" : "Presencial"}</td><td className="p-2">{(STATUS[r.status] && STATUS[r.status].label) || r.status}</td><td className="p-2">{r.mode === "virtual" ? (r.meeting_status || "sin enlace") : "—"}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
