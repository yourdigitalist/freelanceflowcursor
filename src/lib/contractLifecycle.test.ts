import { describe, expect, it } from "vitest";
import { isContractArchived } from "./contractLifecycle";

describe("isContractArchived", () => {
  it("returns false when archived_at is null or missing", () => {
    expect(isContractArchived(null)).toBe(false);
    expect(isContractArchived(undefined)).toBe(false);
    expect(isContractArchived({ archived_at: null })).toBe(false);
  });

  it("returns true when archived_at is set", () => {
    expect(isContractArchived({ archived_at: "2026-05-29T12:00:00Z" })).toBe(true);
  });
});
