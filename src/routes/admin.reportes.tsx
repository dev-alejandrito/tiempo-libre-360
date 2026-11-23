import { createFileRoute } from "@tanstack/react-router";
import AdminReports from "@/pages/admin/AdminReports";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/reportes")({
  head: () => ({ meta: pageMeta('Reportes y conflictos', 'Revisa reportes de personas y conflictos de sesiones.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminReports />;
}
