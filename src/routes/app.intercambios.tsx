import { createFileRoute } from "@tanstack/react-router";
import Exchanges from "@/pages/app/Exchanges";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/intercambios")({
  head: () => ({ meta: pageMeta('Mis clases', 'Tus sesiones agendadas, completadas y su historial.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Exchanges mode="exchanges" />;
}
