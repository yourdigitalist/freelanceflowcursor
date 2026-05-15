import { describe, expect, it } from "vitest";
import {
  buildArchiveConfirmMessage,
  buildBlockedDeleteMessage,
  buildDeleteConfirmMessage,
  buildRestoreConfirmMessage,
  canHardDeleteClient,
  formatClientDeleteError,
  hasClientRelatedRecords,
  isClientArchived,
  type ClientRelatedCounts,
} from "./clientLifecycle";

const emptyCounts = (): ClientRelatedCounts => ({
  proposals: 0,
  contracts: 0,
  invoices: 0,
  projects: 0,
  approvals: 0,
  notes: 0,
  timeEntries: 0,
  activities: 0,
  followUps: 0,
});

describe("isClientArchived", () => {
  it("returns false when archived_at is null or missing", () => {
    expect(isClientArchived(null)).toBe(false);
    expect(isClientArchived({})).toBe(false);
    expect(isClientArchived({ archived_at: null })).toBe(false);
  });

  it("returns true when archived_at is set", () => {
    expect(isClientArchived({ archived_at: "2026-05-15T12:00:00Z" })).toBe(true);
  });
});

describe("canHardDeleteClient", () => {
  it("allows delete only when all counts are zero", () => {
    expect(canHardDeleteClient(emptyCounts())).toBe(true);
    expect(hasClientRelatedRecords(emptyCounts())).toBe(false);

    const withProposal = { ...emptyCounts(), proposals: 1 };
    expect(canHardDeleteClient(withProposal)).toBe(false);
    expect(hasClientRelatedRecords(withProposal)).toBe(true);
  });
});

describe("buildBlockedDeleteMessage", () => {
  it("lists related record types with correct pluralization", () => {
    const message = buildBlockedDeleteMessage({
      ...emptyCounts(),
      proposals: 2,
      contracts: 1,
      timeEntries: 1,
    });
    expect(message).toContain("2 proposals");
    expect(message).toContain("1 contract");
    expect(message).toContain("1 time entry");
    expect(message).toContain("Archive them instead");
  });

  it("handles singular labels", () => {
    const message = buildBlockedDeleteMessage({ ...emptyCounts(), invoices: 1 });
    expect(message).toContain("1 invoice");
    expect(message).not.toContain("invoices");
  });
});

describe("confirm messages", () => {
  it("includes client name in archive and restore prompts", () => {
    expect(buildArchiveConfirmMessage("Acme Corp")).toContain("Acme Corp");
    expect(buildRestoreConfirmMessage("Acme Corp")).toContain("Acme Corp");
    expect(buildDeleteConfirmMessage()).toContain("permanently");
  });
});

describe("formatClientDeleteError", () => {
  it("maps proposal FK violations to archive guidance", () => {
    expect(formatClientDeleteError('violates foreign key constraint "proposals_client_id_fkey"')).toContain(
      "Archive the client instead",
    );
  });

  it("returns unknown messages unchanged", () => {
    expect(formatClientDeleteError("network error")).toBe("network error");
  });
});
