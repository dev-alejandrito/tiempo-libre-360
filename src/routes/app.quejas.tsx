import { createFileRoute } from "@tanstack/react-router";
import Feedback from "@/pages/app/Feedback";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/quejas")({
  head: () => ({ meta: pageMeta('Sugerencias, quejas y reportes', 'Envía sugerencias, quejas o reportes al equipo y sigue su respuesta.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Feedback />;
}
