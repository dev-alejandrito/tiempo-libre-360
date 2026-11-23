import { createFileRoute } from "@tanstack/react-router";
import PrivateClasses from "@/pages/app/PrivateClasses";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/clases-particulares")({
  head: () => ({ meta: pageMeta('Clases particulares', 'Conversa en privado y acuerda clases personalizadas; el pago es directo entre ustedes.') }),
  component: RoutePage,
});

function RoutePage() {
  return <PrivateClasses />;
}
