export type ContractsAccessMode = "off" | "admin" | "on";

export function getContractsAccessMode(): ContractsAccessMode {
  const raw = String(import.meta.env.VITE_CONTRACTS_ACCESS_MODE || "").trim().toLowerCase();
  if (raw === "on" || raw === "admin" || raw === "off") return raw;
  return "admin";
}

export function canAccessContracts(input: { isAdmin: boolean }): boolean {
  const mode = getContractsAccessMode();
  if (mode === "on") return true;
  if (mode === "admin") return input.isAdmin;
  return false;
}

export type NotesAccessMode = "off" | "admin" | "on";

export function getNotesAccessMode(): NotesAccessMode {
  const raw = String(import.meta.env.VITE_NOTES_ACCESS_MODE || "").trim().toLowerCase();
  if (raw === "on" || raw === "admin" || raw === "off") return raw;
  return "admin";
}

export function canAccessNotes(input: { isAdmin: boolean }): boolean {
  const mode = getNotesAccessMode();
  if (mode === "on") return true;
  if (mode === "admin") return input.isAdmin;
  return false;
}

