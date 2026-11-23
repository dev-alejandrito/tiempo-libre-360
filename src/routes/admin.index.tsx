import { createFileRoute } from "@tanstack/react-router";
import { AdminIndex } from "@/components/RouteGuards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: pageMeta('Administración', 'Estadísticas generales de la plataforma.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminIndex />;
}
