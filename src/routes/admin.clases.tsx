import { createFileRoute } from "@tanstack/react-router";
import AdminClasses from "@/pages/admin/AdminClasses";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/clases")({
  head: () => ({ meta: pageMeta('Clases comunitarias', 'Agenda, choques de horario y enlaces de clases virtuales.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminClasses />;
}
