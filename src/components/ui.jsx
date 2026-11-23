import { X, Star, LoaderCircle as Loader, Info, CircleAlert, CircleCheck, BadgeCheck } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { Link } from "@/lib/router";

export function Logo({ light = false, className = "" }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 no-underline ${light ? "text-white" : "text-ink"} ${className}`}>
      <svg viewBox="0 0 64 64" width="38" height="38" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? "#F4A93B" : "#0C1626"} />
        <circle cx="32" cy="32" r="19" fill="none" stroke={light ? "#0C1626" : "#F4A93B"} strokeWidth="6" strokeDasharray="90 30" strokeLinecap="round" />
        <path d="M32 20v13l8 5" fill="none" stroke={light ? "#0C1626" : "#F6F2E9"} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-lg font-extrabold leading-none tracking-tight">TIEMPO LIBRE <span className={light ? "text-amber" : "text-amber-deep"}>360</span></span>
    </Link>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[#3c3829]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Spinner({ label = "Cargando…" }) {
  return <div role="status" className="flex items-center justify-center gap-2 p-8 text-[#3c3829]"><Loader className="animate-spin" size={20} aria-hidden="true" />{label}</div>;
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      {Icon && <span className="grid h-14 w-14 place-items-center rounded-full bg-sand"><Icon size={26} aria-hidden="true" /></span>}
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <p className="max-w-md text-[#3c3829]">{children}</p>}
      {action}
    </div>
  );
}

export function Alert({ kind = "info", children }) {
  const m = { info: ["bg-[#d8eeee] text-[#0a3f3c] border-[#9fd0cd]", Info], error: ["bg-[#fde1de] text-[#7a1810] border-[#f2b1ab]", CircleAlert], ok: ["bg-[#dcf5e4] text-[#0f4d27] border-[#a6dbb7]", CircleCheck], warn: ["bg-[#fdecc8] text-[#5c3200] border-[#efc877]", CircleAlert] }[kind];
  const Icon = m[1];
  return <div role={kind === "error" ? "alert" : "status"} className={`flex gap-2 rounded-xl border p-3 text-sm ${m[0]}`}><Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div>{children}</div></div>;
}

export function Field({ label, hint, error, children, id }) {
  const auto = useId(); const fid = id || auto;
  return (
    <div>
      <label htmlFor={fid} className="label">{label}</label>
      {typeof children === "function" ? children({ id: fid, "aria-invalid": error ? "true" : undefined, "aria-describedby": error ? fid + "-err" : hint ? fid + "-hint" : undefined }) : children}
      {hint && !error && <p id={fid + "-hint"} className="hint mt-1">{hint}</p>}
      {error && <p id={fid + "-err"} className="mt-1 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-2xl font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="Cerrar"><X size={20} aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = "ok") => {
    const id = Math.random();
    setItems((i) => [...i, { id, message, kind }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${t.kind === "error" ? "bg-danger text-white" : "bg-ink text-white"}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} aria-hidden="true" className={i <= Math.round(value) ? "fill-amber text-amber-deep" : "text-line"} />)}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Valoración" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} ${i === 1 ? "estrella" : "estrellas"}`} onClick={() => onChange(i)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand">
          <Star size={26} aria-hidden="true" className={i <= value ? "fill-amber text-amber-deep" : "text-[#7a7466]"} />
        </button>
      ))}
    </div>
  );
}

export function Stat({ icon: Icon, label, value, sub, dark }) {
  return (
    <div className={dark ? "card-dark" : "card"}>
      <div className="flex items-center gap-2 text-sm font-semibold">{Icon && <Icon size={18} aria-hidden="true" className={dark ? "text-amber" : "text-teal"} />}{label}</div>
      <div className="num mt-2 text-4xl font-bold leading-none">{value}</div>
      {sub && <div className={`mt-2 text-sm ${dark ? "text-[#c9d3e2]" : "text-[#4b4638]"}`}>{sub}</div>}
    </div>
  );
}

export function Progress({ value, max, label }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div>
      <div className="h-3 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label || "Progreso"}>
        <div className="h-full rounded-full bg-teal transition-all" style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

export function BarChart({ data, series, height = 160 }) {
  // data: [{label, a, b}] series: [{key,label,color}]
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0)));
  const w = 100 / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${data.length * 40} ${height + 24}`} className="w-full" role="img" aria-label={series.map((s) => s.label).join(" y ")}>
        <title>{series.map((s) => s.label).join(" y ")}</title>
        {data.map((d, i) => series.map((s, j) => {
          const h = ((d[s.key] || 0) / max) * height;
          const bw = 28 / series.length;
          return <rect key={i + s.key} x={i * 40 + 6 + j * bw} y={height - h} width={bw - 2} height={Math.max(h, 1)} rx="3" fill={s.color} />;
        }))}
        {data.map((d, i) => <text key={"t" + i} x={i * 40 + 20} y={height + 16} textAnchor="middle" fontSize="10" fill="#3c3829">{d.label}</text>)}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-sm">
        {series.map((s) => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
      </figcaption>
    </figure>
  );
}

export function LineChart({ points, height = 140, label = "Evolución" }) {
  if (!points.length) return null;
  const W = 400, max = Math.max(1, ...points.map((p) => p.v)) * 1.15;
  const step = points.length > 1 ? W / (points.length - 1) : 0;
  const xy = points.map((p, i) => [points.length > 1 ? i * step : W / 2, height - (p.v / max) * height + 4]);
  const d = xy.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${height + 8}`} className="w-full" role="img" aria-label={label}>
      <title>{label}</title>
      <path d={`${d} L${xy[xy.length - 1][0]} ${height + 4} L${xy[0][0]} ${height + 4} Z`} fill="#F4A93B" opacity=".25" />
      <path d={d} fill="none" stroke="#8A4B00" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#0C1626" />)}
    </svg>
  );
}

export function Pagination({ page, total, perPage, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav className="mt-3 flex items-center justify-between gap-2" aria-label="Paginación">
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
      <span className="text-sm">Página {page} de {pages}</span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</button>
    </nav>
  );
}

export function Avatar({ name = "?", size = 44 }) {
  const initials = name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full bg-ink font-display font-bold text-amber" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

// Insignia que solo aparece cuando la administración aprobó la verificación de la habilidad.
export function VerifiedBadge({ small = false }) {
  return <span className="chip chip-ok" title="Habilidad verificada por la administración (video y certificado revisados)"><BadgeCheck size={small ? 12 : 14} aria-hidden="true" />Verificada</span>;
}
