import { createFileRoute } from "@tanstack/react-router";
import AdminExchanges from "@/pages/admin/AdminExchanges";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/intercambios")({
  head: () => ({ meta: pageMeta('Intercambios', 'Listado de intercambios de la comunidad.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminExchanges />;
}
