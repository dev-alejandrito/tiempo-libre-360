import { createFileRoute } from "@tanstack/react-router";
import WalletPage from "@/pages/app/WalletPage";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/app/creditos")({
  head: () => ({ meta: pageMeta('Mis créditos', 'Saldo disponible, reservado y movimientos de tus créditos de tiempo.') }),
  component: RoutePage,
});

function RoutePage() {
  return <WalletPage />;
}
