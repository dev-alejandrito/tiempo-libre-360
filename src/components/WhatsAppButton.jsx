import { MessageCircle } from "lucide-react";
import { useState } from "react";

import { CONTACT_WHATSAPP_URL } from "../lib/contact";

// Abre WhatsApp en una pestaña nueva (fuera del marco de la vista previa).
// Si el navegador bloquea la apertura, muestra el enlace para copiarlo y abrirlo a mano.
export default function WhatsAppButton({ variant = "card", children }) {
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const dark = variant === "footer";

  function open(e) {
    e.preventDefault();
    const w = window.open(CONTACT_WHATSAPP_URL, "_blank");
    if (!w) { setBlocked(true); return; }
    try { w.opener = null; } catch (_) { /* nada */ }
    setBlocked(false);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(CONTACT_WHATSAPP_URL); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch (_) { window.prompt("Copia este enlace y ábrelo en tu navegador:", CONTACT_WHATSAPP_URL); }
  }

  const linkCls = dark
    ? "inline-flex min-h-11 items-center gap-2 font-semibold text-white underline underline-offset-4"
    : "flex min-h-11 items-center gap-3 font-semibold text-ink hover:underline";

  return (
    <div>
      <a className={linkCls} href={CONTACT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" onClick={open}>
        <MessageCircle size={20} aria-hidden="true" /> {children || "Escríbenos por WhatsApp"}
      </a>
      {blocked && (
        <div role="alert" className={"mt-2 rounded-xl border p-3 text-sm " + (dark ? "border-white/30 text-white" : "border-ink/20 bg-white text-ink")}>
          <p>Tu navegador bloqueó la apertura de WhatsApp. Copia el enlace y ábrelo en otra pestaña:</p>
          <p className="mt-1 break-all font-mono text-xs">{CONTACT_WHATSAPP_URL}</p>
          <button type="button" onClick={copy} className={"btn btn-sm mt-2 " + (dark ? "btn-light" : "btn-ghost")}>{copied ? "Enlace copiado" : "Copiar enlace de WhatsApp"}</button>
        </div>
      )}
    </div>
  );
}
