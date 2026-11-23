import { createFileRoute } from "@tanstack/react-router";
import CalendarPage from "@/pages/app/CalendarPage";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/calendario")({
  head: () => ({ meta: pageMeta('Calendario', 'Tus sesiones por mes, semana o día (hora de Ciudad de México).') }),
  component: RoutePage,
});

function RoutePage() {
  return <CalendarPage />;
}
