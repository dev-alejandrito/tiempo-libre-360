import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui.jsx";
import PublicLayout from "@/components/PublicLayout";

function NotFoundComponent() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-5xl font-extrabold">Página no encontrada</h1>
        <p className="mt-3">Esta dirección no existe, pero tu próxima sesión de intercambio sí.</p>
        <Link to="/" className="btn btn-primary mt-6">Volver al inicio</Link>
      </div>
    </PublicLayout>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-extrabold">Esta página no cargó</h1>
        <p className="mt-2">Algo salió mal. Puedes intentarlo de nuevo o volver al inicio.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary"
          >
            Intentar de nuevo
          </button>
          <a href="/" className="btn btn-ghost">Ir al inicio</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Each content route sets its own title/description. Never add og:image or twitter:image here.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TIEMPO LIBRE 360 — Banco de tiempo: intercambia conocimientos" },
      { name: "description", content: "Intercambia conocimientos y habilidades con tu comunidad usando créditos de tiempo: 1 minuto = 1 crédito. Sin dinero, sin tienda." },
      { name: "author", content: "TIEMPO LIBRE 360" },
      { name: "theme-color", content: "#0c1626" },
      { property: "og:title", content: "TIEMPO LIBRE 360" },
      { property: "og:description", content: "Banco de tiempo: intercambia conocimientos con tu comunidad. 1 minuto = 1 crédito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" style={{ background: "#F6F2E9" }}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
