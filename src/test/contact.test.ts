import { describe, expect, it } from "vitest";
import { CONTACT_EMAIL, gmailComposeUrl } from "../lib/contact";

describe("public contact", () => {
  it("uses the public contact address without changing the administrator address", () => {
    expect(CONTACT_EMAIL).toBe("alejandroortizcalles@gmail.com");
  });

  it("opens Gmail with the new recipient and preserves the subject and editable message", () => {
    const url = new URL(gmailComposeUrl());
    expect(url.origin).toBe("https://mail.google.com");
    expect(url.searchParams.get("to")).toBe("alejandroortizcalles@gmail.com");
    expect(url.searchParams.get("su")).toBe("Contacto desde TIEMPO LIBRE 360");
    expect(url.searchParams.get("body")).toBe("Hola, me comunico desde TIEMPO LIBRE 360.\n\n");
  });
});