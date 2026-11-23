// Subida de archivos privados (evidencias y adjuntos). Cada persona solo escribe en su carpeta.
import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "evidencias";
const ext = (n) => String(n || "").split(".").pop().toLowerCase();

export async function uploadPrivate(file, folder, kind = "other") {
  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id;
  if (!uid) throw new Error("Inicia sesión para adjuntar archivos.");
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
  const path = `${uid}/${folder}/${id}.${ext(file.name) || "bin"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`No se pudo subir «${file.name}». ${error.message || ""}`.trim());
  return { path, name: file.name, kind, size: file.size, type: file.type || "" };
}

export async function uploadMany(files, folder, kind = "other") {
  const out = [];
  for (const f of files) out.push(await uploadPrivate(f, folder, f.__kind || kind));
  return out;
}
