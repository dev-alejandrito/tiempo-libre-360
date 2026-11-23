import { createFileRoute } from "@tanstack/react-router";
import AdminActivity from "@/pages/admin/AdminActivity";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/actividad")({
  head: () => ({ meta: pageMeta('Actividad sospechosa', 'Señales para revisar posibles abusos.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminActivity />;
}
