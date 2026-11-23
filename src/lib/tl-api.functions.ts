import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Un solo punto de entrada para la API de la plataforma (/api/tl/*).
// La identidad se verifica en el servidor a partir del token de sesión.
const apiInput = z.object({
  path: z.string().min(1).max(300),
  method: z.enum(["GET", "POST"]),
  body: z.record(z.string(), z.unknown()).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
});

export const tlApi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => apiInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; status: number; message: string; json: string }> => {
    const { handleTl } = await import("@/server/tl/router.server.js");
    return handleTl({ path: data.path, method: data.method, body: data.body, query: data.query });
  });

const emailInput = z.object({ email: z.string().max(200), ok: z.boolean().optional() });

export const tlLoginCheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }): Promise<{ locked: boolean; message?: string }> => {
    const { loginCheck } = await import("@/server/tl/router.server.js");
    return loginCheck(data.email);
  });

export const tlLoginResult = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { loginResult } = await import("@/server/tl/router.server.js");
    return loginResult(data.email, !!data.ok);
  });
