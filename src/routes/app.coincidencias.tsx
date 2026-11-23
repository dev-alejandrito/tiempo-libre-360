import { createFileRoute } from "@tanstack/react-router";
import Matches from "@/pages/app/Matches";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/coincidencias")({
  head: () => ({ meta: pageMeta('Coincidencias', 'Personas compatibles contigo según habilidades, nivel, horario y cercanía.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Matches />;
}
