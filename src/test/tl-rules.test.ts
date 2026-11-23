import { describe, expect, it, vi } from "vitest";

// Las reglas son funciones puras; el cliente de base de datos no se usa en estas pruebas.
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

const { evidenceMissing, cleanProposal } = await import("@/server/tl/ext.server.js");

const NOW = Date.parse("2026-11-23T18:00:00Z");
const base = { role: "learn", topic: "Guitarra", price_mxn: 250, minutes: 90, mode: "virtual", date: "2026-12-05", time: "17:30" };

describe("verificación de habilidades", () => {
  it("exige video demostrativo y certificado", () => {
    expect(evidenceMissing([])).toEqual(["un video demostrativo", "un certificado"]);
    expect(evidenceMissing([{ kind: "video" }])).toEqual(["un certificado"]);
    expect(evidenceMissing([{ kind: "certificate" }])).toEqual(["un video demostrativo"]);
    expect(evidenceMissing([{ kind: "video" }, { kind: "certificate" }])).toEqual([]);
  });
});

describe("propuestas de clase en el chat privado", () => {
  it("acepta el precio que los usuarios fijen, incluido 0", () => {
    expect(cleanProposal(base, NOW).price_mxn).toBe(250);
    expect(cleanProposal({ ...base, price_mxn: 0 }, NOW).price_mxn).toBe(0);
  });
  it("rechaza precios negativos", () => {
    expect(() => cleanProposal({ ...base, price_mxn: -10 }, NOW)).toThrow();
  });
  it("interpreta fecha y horario en hora de Ciudad de México (UTC-6)", () => {
    expect(cleanProposal(base, NOW).starts_at).toBe("2026-12-05T23:30:00.000Z");
  });
  it("limita la duración entre 10 y 600 minutos", () => {
    expect(() => cleanProposal({ ...base, minutes: 5 }, NOW)).toThrow();
    expect(() => cleanProposal({ ...base, minutes: 601 }, NOW)).toThrow();
    expect(cleanProposal({ ...base, minutes: 600 }, NOW).minutes).toBe(600);
  });
  it("solo permite modalidad presencial o virtual", () => {
    expect(() => cleanProposal({ ...base, mode: "otra" }, NOW)).toThrow();
    expect(cleanProposal({ ...base, mode: "in_person" }, NOW).mode).toBe("in_person");
  });
});
