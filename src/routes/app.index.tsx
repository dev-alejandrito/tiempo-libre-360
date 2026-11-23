import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/app/Dashboard";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: pageMeta('Mi panel', 'Tu resumen: créditos, próximas sesiones, solicitudes y coincidencias.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Dashboard />;
}
