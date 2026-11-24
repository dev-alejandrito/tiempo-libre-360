import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
const { DURATIONS, skillDurations, isStaff, isAdmin, isUuid } = await import("@/server/tl/core.server.js");

describe("créditos de tiempo (1 minuto = 1 crédito)", () => {
  it("solo ofrece duraciones de 15, 30, 45, 60, 90 y 120 minutos", () => {
    expect(DURATIONS).toEqual([15, 30, 45, 60, 90, 120]);
  });
  it("descarta duraciones no permitidas de una habilidad", () => {
    expect(skillDurations({ durations: "30,25,60,999" })).toEqual([30, 60]);
  });
  it("usa todas las duraciones permitidas si la habilidad no define válidas", () => {
    expect(skillDurations({ durations: "7" })).toEqual([15, 30, 45, 60, 90, 120]);
  });
});

describe("permisos", () => {
  it("un usuario normal no es parte del equipo ni administrador", () => {
    expect(isStaff({ role: "user" })).toBe(false);
    expect(isAdmin({ role: "user" })).toBe(false);
  });
  it("un moderador es equipo pero no administrador", () => {
    expect(isStaff({ role: "moderator" })).toBe(true);
    expect(isAdmin({ role: "moderator" })).toBe(false);
  });
  it("rechaza identificadores que no son UUID", () => {
    expect(isUuid("1 or 1=1")).toBe(false);
    expect(isUuid("3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f")).toBe(true);
  });
});
