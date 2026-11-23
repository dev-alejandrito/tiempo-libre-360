import { createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/RouteGuards";

// El panel depende de la sesión del navegador: se muestra solo en el cliente.
export const Route = createFileRoute("/app")({
  ssr: false,
  component: MemberShell,
});
