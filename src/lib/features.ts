export type FeatureAccessMode = "off" | "admin" | "on";

export type AppFeatureFlags = {
  notes: FeatureAccessMode;
  contracts: FeatureAccessMode;
  proposals2: FeatureAccessMode;
};

export type AppFeaturesRowInput = {
  notes_access_mode?: string | null;
  contracts_access_mode?: string | null;
  proposals2_access_mode?: string | null;
} | null;

function parseAccessMode(value: string | null | undefined): FeatureAccessMode | null {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "on" || raw === "admin" || raw === "off") return raw;
  return null;
}

export function canAccessByMode(mode: FeatureAccessMode, isAdmin: boolean): boolean {
  if (mode === "on") return true;
  if (mode === "admin") return isAdmin;
  return false;
}

/** @deprecated Use env fallback only when DB row is unavailable */
export function getContractsAccessMode(): FeatureAccessMode {
  const raw = String(import.meta.env.VITE_CONTRACTS_ACCESS_MODE || "").trim().toLowerCase();
  if (raw === "on" || raw === "admin" || raw === "off") return raw;
  return "admin";
}

/** @deprecated Use env fallback only when DB row is unavailable */
export function getNotesAccessMode(): FeatureAccessMode {
  const raw = String(import.meta.env.VITE_NOTES_ACCESS_MODE || "").trim().toLowerCase();
  if (raw === "on" || raw === "admin" || raw === "off") return raw;
  return "admin";
}

export function resolveAppFeatures(row: AppFeaturesRowInput): AppFeatureFlags {
  return {
    notes: parseAccessMode(row?.notes_access_mode) ?? getNotesAccessMode(),
    contracts: parseAccessMode(row?.contracts_access_mode) ?? getContractsAccessMode(),
    proposals2: parseAccessMode(row?.proposals2_access_mode) ?? "off",
  };
}

export function canAccessContracts(input: { isAdmin: boolean; mode?: FeatureAccessMode }): boolean {
  return canAccessByMode(input.mode ?? getContractsAccessMode(), input.isAdmin);
}

export function canAccessNotes(input: { isAdmin: boolean; mode?: FeatureAccessMode }): boolean {
  return canAccessByMode(input.mode ?? getNotesAccessMode(), input.isAdmin);
}

export function canAccessProposals2(input: { isAdmin: boolean; mode?: FeatureAccessMode }): boolean {
  return canAccessByMode(input.mode ?? "off", input.isAdmin);
}

export const FEATURE_DEFINITIONS = [
  {
    key: "notes" as const,
    label: "Notes",
    description: "Internal notes workspace in the sidebar.",
    column: "notes_access_mode" as const,
  },
  {
    key: "contracts" as const,
    label: "Contracts",
    description: "Contracts list, templates, and client signing flow.",
    column: "contracts_access_mode" as const,
  },
  {
    key: "proposals2" as const,
    label: "Proposals 2",
    description: "Visual drag-and-drop proposal builder (admin beta).",
    column: "proposals2_access_mode" as const,
  },
] as const;

export const FEATURE_ACCESS_OPTIONS: Array<{ value: FeatureAccessMode; label: string; hint: string }> = [
  { value: "off", label: "Off", hint: "Hidden for everyone" },
  { value: "admin", label: "Admins only", hint: "Visible to admin accounts" },
  { value: "on", label: "All users", hint: "Visible to everyone" },
];
