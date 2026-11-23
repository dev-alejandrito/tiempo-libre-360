import { createFileRoute } from "@tanstack/react-router";
import Explore from "@/pages/public/Explore";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/explorar")({
  head: () => ({ meta: pageMeta('Explorar habilidades', 'Busca habilidades que ofrece la comunidad: idiomas, música, tecnología, cocina y mucho más.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Explore />;
}
