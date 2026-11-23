import { createFileRoute } from "@tanstack/react-router";
import { ForgotPassword } from "@/pages/public/AuthPages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/recuperar")({
  head: () => ({ meta: pageMeta('Recuperar contraseña', 'Solicita un enlace para elegir una contraseña nueva.') }),
  component: RoutePage,
});

function RoutePage() {
  return <ForgotPassword />;
}
