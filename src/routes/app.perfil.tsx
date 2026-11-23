import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/app/Profile";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({ meta: pageMeta('Perfil inteligente', 'Completa tu perfil, disponibilidad y zona aproximada.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Profile />;
}
