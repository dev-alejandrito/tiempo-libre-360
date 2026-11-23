import { createFileRoute } from "@tanstack/react-router";
import Faq from "@/pages/public/Faq";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/faq")({
  head: () => ({ meta: pageMeta('Preguntas frecuentes', 'Respuestas sobre créditos, sesiones, seguridad y privacidad en TIEMPO LIBRE 360.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Faq />;
}
