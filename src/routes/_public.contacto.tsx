import { createFileRoute } from "@tanstack/react-router";
import Contact from "@/pages/public/Contact";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/contacto")({
  head: () => ({ meta: pageMeta('Contacto', 'Escríbenos por el formulario, WhatsApp o teléfono. Te responderemos lo antes posible.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Contact />;
}
