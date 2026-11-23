import { createFileRoute } from "@tanstack/react-router";
import Accreditations from "@/pages/app/Accreditations";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/acreditaciones")({
  head: () => ({ meta: pageMeta('Verificación de habilidades', 'Solicita la verificación de tus habilidades con un video demostrativo y un certificado.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Accreditations />;
}
