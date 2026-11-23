import { createFileRoute } from "@tanstack/react-router";
import { StaffShell } from "@/components/RouteGuards";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: StaffShell,
});
