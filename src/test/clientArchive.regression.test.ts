import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

/** Client pickers for new work should exclude archived clients. */
const PICKER_FILES = [
  "src/pages/Contracts.tsx",
  "src/pages/Proposals.tsx",
  "src/pages/Projects.tsx",
  "src/pages/Invoices.tsx",
  "src/pages/ReviewRequests.tsx",
  "src/pages/Notes.tsx",
  "src/components/notes/EntityLinkPopover.tsx",
] as const;

describe("client archive regression guards", () => {
  it("migration adds archived_at and proposal snapshots", () => {
    const sql = readFileSync(
      resolve(root, "supabase/migrations/20260515120000_clients_archived_and_proposal_snapshots.sql"),
      "utf8",
    );
    expect(sql).toContain("archived_at");
    expect(sql).toContain("client_name_snapshot");
    expect(sql).toContain("client_company_snapshot");
  });

  it.each(PICKER_FILES)("%s excludes archived clients from pickers", (file) => {
    const source = readSrc(file);
    expect(source).toMatch(/\.is\(\s*['"]archived_at['"]\s*,\s*null\s*\)/);
  });

  it("dashboard excludes archived clients and follow-ups", () => {
    const source = readSrc("src/pages/Dashboard.tsx");
    expect(source).toContain(".is('archived_at', null)");
    expect(source).toContain(".is('clients.archived_at', null)");
  });

  it("deadline notifications skip archived client follow-ups", () => {
    const source = readFileSync(
      resolve(root, "supabase/functions/send-deadline-notifications/index.ts"),
      "utf8",
    );
    expect(source).toContain(".is(\"clients.archived_at\", null)");
  });

  it("proposal document uses snapshot display helpers", () => {
    const source = readSrc("src/components/proposals/ProposalDocument.tsx");
    expect(source).toContain("displayProposalClientName");
    expect(source).toContain("displayProposalClientCompany");
  });

  it("clients page wires archive lifecycle helpers", () => {
    const source = readSrc("src/pages/Clients.tsx");
    expect(source).toContain("clientLifecycle");
    expect(source).toContain("handleArchive");
    expect(source).toContain("isClientArchived");
    expect(source).toContain("sortedClients");
    expect(source).not.toContain("filteredClients");
  });

  it("legacy cascade delete module is not used", () => {
    const source = readSrc("src/pages/ClientDetail.tsx");
    expect(source).not.toContain("clientDelete");
    expect(source).toContain("clientLifecycle");
  });
});
