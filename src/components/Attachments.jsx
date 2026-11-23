import { Paperclip, FileText, X, Video, BadgeCheck } from "lucide-react";
import { useId, useRef, useState } from "react";

import { useToast } from "./ui";

export const MAX_FILES = 3;
export const MAX_BYTES = 5 * 1024 * 1024;
const OK_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
const ext = (n) => String(n || "").split(".").pop().toLowerCase();
const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");

// Mismas reglas que el servidor. Devuelve un mensaje de error o "".
export function checkFiles(files, existing = 0) {
  if (files.length + existing > MAX_FILES) return "Puedes adjuntar hasta 3 archivos.";
  for (const f of files) {
    if (!OK_EXT.includes(ext(f.name))) return `«${f.name}» no se puede adjuntar: solo se aceptan archivos PDF, JPG, PNG o WEBP.`;
    if (f.size > MAX_BYTES) return `«${f.name}» pesa más de 5 MB.`;
  }
  return "";
}

// Selector de archivos con lista y botón para quitar cada uno.
export function FilePicker({ files, onChange, existing = 0, error, label = "Archivos (opcional)" }) {
  const id = useId();
  const ref = useRef(null);
  const [localErr, setLocalErr] = useState("");
  function pick(e) {
    const next = [...files, ...Array.from(e.target.files || [])];
    e.target.value = "";
    const msg = checkFiles(next, existing);
    if (msg) { setLocalErr(msg); return; }
    setLocalErr(""); onChange(next);
  }
  const shown = localErr || error;
  const left = MAX_FILES - existing - files.length;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input ref={ref} id={id} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={pick} disabled={left <= 0}
        aria-describedby={id + "-hint" + (shown ? " " + id + "-err" : "")} aria-invalid={shown ? "true" : undefined}
        className="block w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#8b8472] bg-white p-2 text-sm file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-white disabled:cursor-not-allowed disabled:opacity-60" />
      <p id={id + "-hint"} className="hint mt-1">PDF, JPG, PNG o WEBP · máximo 3 archivos de 5 MB cada uno{existing ? ` (ya tienes ${existing} adjunto${existing === 1 ? "" : "s"})` : ""}.</p>
      {shown && <p id={id + "-err"} className="mt-1 text-sm font-semibold text-danger">{shown}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li key={f.name + i} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-sm">
              <span className="flex min-w-0 items-center gap-2"><Paperclip size={15} className="shrink-0" aria-hidden="true" /><span className="truncate">{f.name}</span><span className="num shrink-0 text-xs text-[#4b4638]">{fmtSize(f.size)}</span></span>
              <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-sand" onClick={() => onChange(files.filter((_, j) => j !== i))}><X size={16} aria-hidden="true" /><span className="sr-only">Quitar {f.name}</span></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Los archivos son privados: el servidor entrega un enlace temporal solo a su dueño o al personal.
export function FileLinks({ files }) {
  const toast = useToast();
  if (!files?.length) return null;
  function open(f) {
    if (!f.url) { toast("No se pudo abrir el archivo. Vuelve a cargar la página.", "error"); return; }
    const w = window.open(f.url, "_blank", "noopener,noreferrer");
    if (!w) window.location.assign(f.url);
  }
  const Icon = (f) => (f.kind === "video" ? Video : f.kind === "certificate" ? BadgeCheck : FileText);
  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((f, i) => { const I = Icon(f); return (
        <li key={(f.url || f.name) + i}><button type="button" className="btn btn-ghost btn-sm max-w-full" onClick={() => open(f)}><I size={15} className="shrink-0" aria-hidden="true" /><span className="truncate">{f.kind === "video" ? "Video: " : f.kind === "certificate" ? "Certificado: " : ""}{f.name}</span><span className="sr-only"> (se abre en una pestaña nueva)</span></button></li>
      ); })}
    </ul>
  );
}

// ----- Evidencia obligatoria para verificar una habilidad: un video y un certificado -----
export const VIDEO_EXT = ["mp4", "webm", "mov"];
export const CERT_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
export const VIDEO_MAX = 100 * 1024 * 1024;
export const CERT_MAX = 10 * 1024 * 1024;
export function checkSingle(file, kind) {
  if (!file) return "";
  const e = ext(file.name);
  if (kind === "video") {
    if (!VIDEO_EXT.includes(e)) return `«${file.name}» no es un video válido: usa MP4, WEBM o MOV.`;
    if (file.size > VIDEO_MAX) return `«${file.name}» pesa más de 100 MB. Graba un video más corto o con menor calidad.`;
  } else {
    if (!CERT_EXT.includes(e)) return `«${file.name}» no se puede adjuntar: el certificado debe ser PDF, JPG, PNG o WEBP.`;
    if (file.size > CERT_MAX) return `«${file.name}» pesa más de 10 MB.`;
  }
  return "";
}
export function SinglePicker({ kind, file, onChange, error, label, hint, current }) {
  const id = useId();
  const [localErr, setLocalErr] = useState("");
  const isVideo = kind === "video";
  function pick(e) {
    const f = e.target.files?.[0] || null; e.target.value = "";
    if (!f) return;
    const msg = checkSingle(f, kind);
    if (msg) { setLocalErr(msg); return; }
    setLocalErr(""); onChange(f);
  }
  const shown = localErr || error;
  const accept = isVideo ? ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" : ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <label htmlFor={id} className="label flex items-center gap-2">{isVideo ? <Video size={16} aria-hidden="true" /> : <BadgeCheck size={16} aria-hidden="true" />}{label}</label>
      <input id={id} type="file" accept={accept} onChange={pick} aria-describedby={id + "-hint" + (shown ? " " + id + "-err" : "")} aria-invalid={shown ? "true" : undefined}
        className="block w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#8b8472] bg-white p-2 text-sm file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-white" />
      <p id={id + "-hint"} className="hint mt-1">{hint}</p>
      {current && !file && <p className="mt-1 text-sm">Ya enviado: <strong>{current}</strong>. Elige otro archivo solo si quieres reemplazarlo.</p>}
      {file && (
        <p className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 text-sm">
          <span className="flex min-w-0 items-center gap-2"><Paperclip size={15} className="shrink-0" aria-hidden="true" /><span className="truncate">{file.name}</span><span className="num shrink-0 text-xs text-[#4b4638]">{fmtSize(file.size)}</span></span>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-sand" onClick={() => onChange(null)}><X size={16} aria-hidden="true" /><span className="sr-only">Quitar {file.name}</span></button>
        </p>
      )}
      {shown && <p id={id + "-err"} className="mt-1 text-sm font-semibold text-danger">{shown}</p>}
    </div>
  );
}
