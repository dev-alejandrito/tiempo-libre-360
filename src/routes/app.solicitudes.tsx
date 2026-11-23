import { createFileRoute } from "@tanstack/react-router";
import Exchanges from "@/pages/app/Exchanges";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/solicitudes")({
  head: () => ({ meta: pageMeta('Solicitudes', 'Solicitudes de sesión enviadas y recibidas.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Exchanges mode="requests" />;
}
