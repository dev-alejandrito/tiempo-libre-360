import { createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "@/pages/public/AuthPages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/restablecer")({
  head: () => ({ meta: pageMeta('Nueva contraseña', 'Elige una contraseña nueva para tu cuenta.') }),
  component: RoutePage,
});

function RoutePage() {
  return <ResetPassword />;
}
