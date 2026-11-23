import { createFileRoute } from "@tanstack/react-router";
import PersonPage from "@/pages/app/PersonPage";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/persona/$id")({
  head: () => ({ meta: pageMeta('Perfil de la comunidad', 'Habilidades, disponibilidad y pasaporte de confianza de un miembro.') }),
  component: RoutePage,
});

function RoutePage() {
  return <PersonPage />;
}
