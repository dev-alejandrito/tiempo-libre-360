// Metadatos por página (título, descripción y vista previa al compartir).
export function pageMeta(title: string, description: string) {
  const full = title.includes("TIEMPO LIBRE 360") ? title : `${title} · TIEMPO LIBRE 360`;
  return [
    { title: full },
    { name: "description", content: description },
    { property: "og:title", content: full },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
