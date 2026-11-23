import { createFileRoute } from "@tanstack/react-router";
import Home from "@/pages/public/Home";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_public/")({
  head: () => ({ meta: pageMeta('TIEMPO LIBRE 360 — Banco de tiempo: intercambia conocimientos', 'Intercambia conocimientos y habilidades con tu comunidad usando créditos de tiempo: 1 minuto = 1 crédito. Sin dinero, sin tienda.') }),
  component: RoutePage,
});

function RoutePage() {
  return <Home />;
}
