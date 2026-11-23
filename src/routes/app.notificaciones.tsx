import { createFileRoute } from "@tanstack/react-router";
import Notifications from "@/pages/app/Notifications";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/notificaciones")({
  head: () => ({ meta: pageMeta('Notificaciones', 'Avisos sobre tus solicitudes, sesiones, mensajes y verificaciones.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Notifications />;
}
