import { createFileRoute } from "@tanstack/react-router";
import Community from "@/pages/public/Community";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/comunidad")({
  head: () => ({ meta: pageMeta('Comunidad', 'Ideas, agradecimientos y retos de la comunidad de TIEMPO LIBRE 360.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Community />;
}
