import { createFileRoute } from "@tanstack/react-router";
import { Register } from "@/pages/public/AuthPages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/registro")({
  head: () => ({ meta: pageMeta('Crear cuenta', 'Crea tu cuenta gratis y recibe créditos de bienvenida para empezar a aprender.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Register />;
}
