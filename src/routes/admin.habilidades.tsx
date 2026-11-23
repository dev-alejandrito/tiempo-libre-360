import { createFileRoute } from "@tanstack/react-router";
import AdminSkills from "@/pages/admin/AdminSkills";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin/habilidades")({
  head: () => ({ meta: pageMeta('Moderar habilidades', 'Revisa y oculta habilidades que incumplan las normas.') }),
  component: RoutePage,
});

function RoutePage() {
  return <AdminSkills />;
}
