import { createFileRoute } from "@tanstack/react-router";
import Passport from "@/pages/app/Passport";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/pasaporte")({
  head: () => ({ meta: pageMeta('Pasaporte de confianza', 'Tus estadísticas, insignias y valoraciones.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Passport />;
}
