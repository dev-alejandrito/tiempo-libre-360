import { createFileRoute } from "@tanstack/react-router";
import AdminCredits from "@/pages/admin/AdminCredits";
import { AdminOnly } from "@/components/RouteGuards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/creditos")({
  head: () => ({ meta: pageMeta('Movimientos de créditos', 'Libro de movimientos de créditos y conciliación.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminOnly><AdminCredits /></AdminOnly>;
}
