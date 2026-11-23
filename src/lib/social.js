import { useEffect, useState } from "react";
import { pb } from "./pb";

// Redes que la administración puede configurar (Administración > Configuración).
export const SOCIALS = [
  ["social_instagram", "Instagram"],
  ["social_facebook", "Facebook"],
  ["social_tiktok", "TikTok"],
  ["social_youtube", "YouTube"],
  ["social_x", "X (Twitter)"],
  ["social_linkedin", "LinkedIn"],
  ["social_other", "Otra red o sitio"],
];

// Solo se aceptan enlaces https:// para evitar enlaces peligrosos.
export function safeUrl(v) {
  try { const u = new URL(String(v || "").trim()); return u.protocol === "https:" ? u.href : ""; } catch (_) { return ""; }
}

export function useSocials() {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    let alive = true;
    pb.collection("site_settings").getFullList({ requestKey: null }).then((rows) => {
      if (!alive) return;
      const m = {}; rows.forEach((r) => { m[r.key] = r.value; });
      setLinks(SOCIALS.map(([k, label]) => ({ key: k, label, url: safeUrl(m[k]) })).filter((s) => s.url));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return links;
}
