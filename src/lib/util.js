export const CATEGORIES = ["Idiomas", "Música", "Tecnología", "Cocina", "Arte y diseño", "Bienestar y deporte", "Hogar y bricolaje", "Estudio y educación", "Negocios y finanzas", "Cuidados y familia", "Jardinería", "Otras"];
export const SUGGESTIONS = {
  "Idiomas": ["Inglés conversacional", "Francés", "Español para extranjeros"],
  "Música": ["Guitarra", "Piano", "Canto"],
  "Tecnología": ["Excel", "Programación web", "Ayuda con el móvil"],
  "Cocina": ["Repostería", "Cocina saludable", "Cocina internacional"],
  "Arte y diseño": ["Dibujo", "Fotografía", "Diseño gráfico"],
  "Bienestar y deporte": ["Yoga", "Running", "Meditación"],
  "Hogar y bricolaje": ["Pequeñas reparaciones", "Costura", "Organización del hogar"],
  "Estudio y educación": ["Matemáticas", "Técnicas de estudio", "Redacción"],
  "Negocios y finanzas": ["Finanzas personales", "Marketing", "Emprender"],
  "Cuidados y familia": ["Primeros auxilios", "Crianza", "Acompañamiento"],
  "Jardinería": ["Huerto urbano", "Plantas de interior"],
  "Otras": [],
};
export const LEVELS = { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" };
export const MODES = { in_person: "Presencial", virtual: "Virtual", both: "Presencial o virtual" };
export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const STATUS = {
  pending: { label: "Pendiente", cls: "chip-warn" },
  negotiating: { label: "Negociando horario", cls: "chip-info" },
  scheduled: { label: "Agendada", cls: "chip-ok" },
  completed: { label: "Completada", cls: "chip-ok" },
  rejected: { label: "Rechazada", cls: "chip-bad" },
  cancelled: { label: "Cancelada", cls: "chip-bad" },
  disputed: { label: "En conflicto", cls: "chip-bad" },
};

const parse = (s) => (s ? new Date(String(s).replace(" ", "T")) : null);
export const toDate = parse;
export const fmtDate = (s) => { const d = parse(s); return d ? d.toLocaleDateString("es", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric" }) : "—"; };
export const fmtDateTime = (s) => { const d = parse(s); return d ? d.toLocaleString("es", { timeZone: "America/Mexico_City", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"; };
export const fmtTime = (s) => { const d = parse(s); return d ? d.toLocaleTimeString("es", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" }) : ""; };
export const DURATIONS = [15, 30, 45, 60, 90, 120];
export const fmtMin = (m) => { m = Math.round(Number(m || 0)); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };
export const fmtCredits = (n) => `${Number(n || 0).toLocaleString("es", { maximumFractionDigits: 1 })}`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export function toLocalInput(d) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 16);
}
// Hora de Ciudad de México (UTC-6 fijo): los campos de fecha se interpretan siempre en esa zona.
export function minStart() { return new Date(Date.now() + 2 * 3600000 - 6 * 3600000).toISOString().slice(0, 16); }
export function icsFor(items) {
  const z = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TIEMPO LIBRE 360//ES"];
  items.forEach((x) => {
    const s = parse(x.scheduled_start); if (!s) return;
    const e = new Date(s.getTime() + x.minutes * 60000);
    lines.push("BEGIN:VEVENT", `UID:${x.id}@tiempolibre360`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(s)}`, `DTEND:${z(e)}`,
      `SUMMARY:${x.skill_name} con ${x.other.name}`, `DESCRIPTION:${(x.meeting_note || "").replace(/\n/g, " ")}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
