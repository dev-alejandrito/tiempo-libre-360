import { createFileRoute } from "@tanstack/react-router";
import { LegalIndex } from "@/pages/public/LegalPages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/legal/")({
  head: () => ({ meta: pageMeta('Información legal', 'Aviso de privacidad, términos, normas de convivencia y reglas de créditos de TIEMPO LIBRE 360.') }),
  component: RoutePage,
});

function RoutePage() {
  return <LegalIndex />;
}
