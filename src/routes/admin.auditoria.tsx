import { createFileRoute } from "@tanstack/react-router";
import AdminAudit from "@/pages/admin/AdminAudit";
import { AdminOnly } from "@/components/RouteGuards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/auditoria")({
  head: () => ({ meta: pageMeta('Auditoría', 'Registro inmutable de acciones del equipo.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminOnly><AdminAudit /></AdminOnly>;
}
