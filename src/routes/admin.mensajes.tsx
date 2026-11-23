import { createFileRoute } from "@tanstack/react-router";
import AdminMessages from "@/pages/admin/AdminMessages";
import { AdminOnly } from "@/components/RouteGuards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/mensajes")({
  head: () => ({ meta: pageMeta('Mensajes de contacto', 'Mensajes recibidos desde el formulario de contacto.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminOnly><AdminMessages /></AdminOnly>;
}
