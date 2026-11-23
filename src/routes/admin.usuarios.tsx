import { createFileRoute } from "@tanstack/react-router";
import AdminUsers from "@/pages/admin/AdminUsers";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({ meta: pageMeta('Usuarios y roles', 'Gestiona cuentas, roles, suspensiones y créditos.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminUsers />;
}
