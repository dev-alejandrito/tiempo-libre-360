import { createFileRoute } from "@tanstack/react-router";
import HowItWorks from "@/pages/public/HowItWorks";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/como-funciona")({
  head: () => ({ meta: pageMeta('Cómo funciona', 'Así funciona el banco de tiempo: ofreces lo que sabes, aprendes lo que quieres y cada minuto vale un crédito.') }),
  component: RoutePage,
});

function RoutePage() {
  return <HowItWorks />;
}
