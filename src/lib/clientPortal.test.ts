import { describe, expect, it } from "vitest";
import { formatPortalMoney, resolveMoneyCurrency } from "./clientPortal";

describe("resolveMoneyCurrency", () => {
  it("prefers client currency over profile", () => {
    expect(resolveMoneyCurrency("USD", "AUD")).toBe("USD");
    expect(resolveMoneyCurrency(null, "AUD")).toBe("AUD");
    expect(resolveMoneyCurrency("", "AUD")).toBe("AUD");
  });
});

describe("formatPortalMoney", () => {
  it("formats with currency symbol", () => {
    expect(formatPortalMoney(5950, "USD")).toMatch(/\$|US/);
    const aud = formatPortalMoney(5950, "AUD");
    expect(aud).toContain("5");
    expect(aud).toMatch(/A\$|AUD/i);
  });

  it("returns em dash for null", () => {
    expect(formatPortalMoney(null, "USD")).toBe("—");
  });
});
