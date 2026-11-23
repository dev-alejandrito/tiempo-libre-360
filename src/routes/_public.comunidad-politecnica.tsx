import { createFileRoute } from "@tanstack/react-router";
import Politecnica from "@/pages/public/Politecnica";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/comunidad-politecnica")({
  head: () => ({ meta: pageMeta('Comunidad Politécnica', 'Espacio para estudiantes y egresados politécnicos que quieren intercambiar conocimientos con créditos de tiempo.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Politecnica />;
}
