import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PasswordInput from "@/components/PasswordInput";

afterEach(cleanup);

describe("Password visibility", () => {
  it("starts hidden, toggles both ways, and retains the entered value without submitting", () => {
    const submit = vi.fn();
    function Form() {
      const [value, setValue] = useState("");
      return <form onSubmit={submit}><PasswordInput aria-label="Password" value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)} required autoComplete="current-password" /></form>;
    }
    render(<Form />);
    const input = screen.getByLabelText("Password");
    fireEvent.change(input, { target: { value: "entered-value" } });
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { pressed: false }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("entered-value");
    fireEvent.click(screen.getByRole("button", { pressed: true }));
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("entered-value");
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(submit).not.toHaveBeenCalled();
  });

  it("toggles each password independently", () => {
    render(<><PasswordInput aria-label="New password" /><PasswordInput aria-label="Confirmation" /></>);
    const toggle = screen.getAllByRole("button")[0];
    if (!toggle) throw new Error("Missing password toggle");
    fireEvent.click(toggle);
    expect(screen.getByLabelText("New password")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirmation")).toHaveAttribute("type", "password");
  });
});