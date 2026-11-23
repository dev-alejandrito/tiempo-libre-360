import { createFileRoute } from "@tanstack/react-router";
import AdminConfig from "@/pages/admin/AdminConfig";
import { AdminOnly } from "@/components/RouteGuards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/configuracion")({
  head: () => ({ meta: pageMeta('Configuración', 'Ajustes de la plataforma, redes sociales, mensajería y exportación.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminOnly><AdminConfig /></AdminOnly>;
}
