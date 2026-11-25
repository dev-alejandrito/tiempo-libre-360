import { describe, expect, it } from "vitest";
import { userVerified } from "../server/tl/main.server.js";

describe("insignia de usuario verificado", () => {
  it("aparece solo con verificación del administrador y cuenta activa", () => {
    expect(userVerified({ verified_at: "2026-11-24T00:00:00Z", status: "active" })).toBe(true);
  });
  it("no aparece si la cuenta está suspendida", () => {
    expect(userVerified({ verified_at: "2026-11-24T00:00:00Z", status: "suspended" })).toBe(false);
  });
  it("no aparece sin verificación", () => {
    expect(userVerified({ verified_at: null, status: "active" })).toBe(false);
  });
});
