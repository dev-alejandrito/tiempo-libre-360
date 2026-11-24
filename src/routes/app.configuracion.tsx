import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/pages/app/SettingsPage";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/configuracion")({
  head: () => ({ meta: pageMeta('Configuración', 'Tu cuenta y tu contraseña.') }),
  component: RoutePage,
});

function RoutePage() {
  return <SettingsPage />;
}
