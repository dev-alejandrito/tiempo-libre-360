import { createFileRoute } from "@tanstack/react-router";
import Challenges from "@/pages/app/Challenges";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/retos")({
  head: () => ({ meta: pageMeta('Retos', 'Completa retos y gana créditos e insignias.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Challenges />;
}
