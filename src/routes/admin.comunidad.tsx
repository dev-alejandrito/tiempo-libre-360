import { createFileRoute } from "@tanstack/react-router";
import AdminCommunity from "@/pages/admin/AdminCommunity";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/comunidad")({
  head: () => ({ meta: pageMeta('Moderar comunidad', 'Publicaciones de la comunidad.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminCommunity />;
}
