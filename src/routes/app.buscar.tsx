import { createFileRoute } from "@tanstack/react-router";
import People from "@/pages/app/People";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/buscar")({
  head: () => ({ meta: pageMeta('Buscar personas', 'Encuentra personas que enseñan lo que quieres aprender, en lista o mapa.') }),
  component: RoutePage,
});

function RoutePage() {
  return <People />;
}
