import { createFileRoute } from "@tanstack/react-router";
import MySkills from "@/pages/app/MySkills";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/mis-habilidades")({
  head: () => ({ meta: pageMeta('Mis habilidades', 'Gestiona las habilidades que ofreces a la comunidad.') }),
  component: RoutePage,
});

function RoutePage() {
  return <MySkills kind="offer" />;
}
