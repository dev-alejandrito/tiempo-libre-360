import { createFileRoute } from "@tanstack/react-router";
import MySkills from "@/pages/app/MySkills";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/quiero-aprender")({
  head: () => ({ meta: pageMeta('Quiero aprender', 'Indica lo que quieres aprender para encontrar coincidencias.') }),
  component: RoutePage,
});

function RoutePage() {
  return <MySkills kind="want" />;
}
