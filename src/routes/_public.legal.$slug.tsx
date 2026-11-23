import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/pages/public/LegalPages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/legal/$slug")({
  head: () => ({ meta: pageMeta('Documento legal', 'Consulta el documento legal completo de TIEMPO LIBRE 360.') }),
  component: RoutePage,
});

function RoutePage() {
  return <LegalDoc />;
}
