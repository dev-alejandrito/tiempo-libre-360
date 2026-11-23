import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/pages/public/AuthPages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/ingresar")({
  head: () => ({ meta: pageMeta('Iniciar sesión', 'Entra a tu panel para gestionar tus intercambios, créditos y clases.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Login />;
}
