import { describe, expect, it } from "vitest";
import { formatStatusLabel, getStatusBadgeClass } from "./statusDisplay";

describe("formatStatusLabel", () => {
  it("capitalizes simple statuses", () => {
    expect(formatStatusLabel("accepted")).toBe("Accepted");
    expect(formatStatusLabel("signed")).toBe("Signed");
    expect(formatStatusLabel("cancelled")).toBe("Cancelled");
  });

  it("formats underscored statuses", () => {
    expect(formatStatusLabel("pending_signatures")).toBe("Pending signatures");
  });

  it("returns friendly copy for empty status", () => {
    expect(formatStatusLabel(null)).toBe("No status");
    expect(formatStatusLabel("")).toBe("No status");
  });
});

describe("getStatusBadgeClass", () => {
  it("maps signed to success and pending to warning", () => {
    expect(getStatusBadgeClass("signed")).toContain("success");
    expect(getStatusBadgeClass("pending_signatures")).toContain("warning");
    expect(getStatusBadgeClass("accepted")).toContain("success");
  });
});
