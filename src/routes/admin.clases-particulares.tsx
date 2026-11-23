import { createFileRoute } from "@tanstack/react-router";
import AdminPrivate from "@/pages/admin/AdminPrivate";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/clases-particulares")({
  head: () => ({ meta: pageMeta('Clases particulares', 'Clases acordadas entre personas y disputas por resolver.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminPrivate />;
}
