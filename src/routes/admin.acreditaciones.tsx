import { createFileRoute } from "@tanstack/react-router";
import AdminAccreditations from "@/pages/admin/AdminAccreditations";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/acreditaciones")({
  head: () => ({ meta: pageMeta('Verificación de habilidades', 'Revisa videos y certificados; aprueba, rechaza o solicita correcciones.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminAccreditations />;
}
