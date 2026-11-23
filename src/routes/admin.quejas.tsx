import { createFileRoute } from "@tanstack/react-router";
import AdminFeedback from "@/pages/admin/AdminFeedback";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/quejas")({
  head: () => ({ meta: pageMeta('Sugerencias, quejas y reportes', 'Consulta, responde y actualiza el estado de los envíos.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminFeedback />;
}
