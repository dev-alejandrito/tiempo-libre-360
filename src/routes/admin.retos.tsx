import { createFileRoute } from "@tanstack/react-router";
import AdminChallenges from "@/pages/admin/AdminChallenges";
import { AdminOnly } from "@/components/RouteGuards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/retos")({
  head: () => ({ meta: pageMeta('Retos', 'Crea y edita retos de la comunidad.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminOnly><AdminChallenges /></AdminOnly>;
}
