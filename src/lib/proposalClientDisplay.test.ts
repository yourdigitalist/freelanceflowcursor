import { describe, expect, it } from "vitest";
import { displayProposalClientCompany, displayProposalClientName } from "./proposalClientDisplay";

describe("displayProposalClientName", () => {
  it("prefers snapshot over live client name", () => {
    expect(
      displayProposalClientName({
        client_name_snapshot: " Archived Co ",
        clients: { name: "Live Name" },
      }),
    ).toBe("Archived Co");
  });

  it("falls back to live client when snapshot is empty", () => {
    expect(
      displayProposalClientName({
        client_name_snapshot: "  ",
        clients: { name: "Live Name" },
      }),
    ).toBe("Live Name");
  });

  it('returns em dash when no name is available', () => {
    expect(displayProposalClientName(null)).toBe("—");
    expect(displayProposalClientName({})).toBe("—");
  });
});

describe("displayProposalClientCompany", () => {
  it("prefers company snapshot over live client", () => {
    expect(
      displayProposalClientCompany({
        client_company_snapshot: "Snapshot LLC",
        clients: { company: "Live LLC" },
      }),
    ).toBe("Snapshot LLC");
  });

  it("returns null when no company is available", () => {
    expect(displayProposalClientCompany({})).toBeNull();
    expect(displayProposalClientCompany(null)).toBeNull();
  });
});
