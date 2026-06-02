import type { ProjectStatus } from "@/components/tasks/types";

/** First column for new / unset tasks — prefers "Haven't Started". */
export function getDefaultStatusId(statuses: ProjectStatus[]): string | null {
  if (statuses.length === 0) return null;

  const haventStarted = statuses.find((s) => s.name === "Haven't Started");
  if (haventStarted) return haventStarted.id;

  const sorted = [...statuses].sort((a, b) => a.position - b.position);
  const firstNonDone = sorted.find((s) => !s.is_done_status);
  return firstNonDone?.id ?? sorted[0]?.id ?? null;
}

/** Use explicit status when set; otherwise default kanban column. */
export function resolveStatusId(
  statusId: string | null | undefined,
  statuses: ProjectStatus[],
): string | null {
  const trimmed = typeof statusId === "string" ? statusId.trim() : "";
  if (trimmed) return trimmed;
  return getDefaultStatusId(statuses);
}

export function taskMatchesStatusColumn(
  task: { status_id: string | null },
  statusId: string,
  defaultStatusId: string | null,
): boolean {
  if (task.status_id === statusId) return true;
  if (!task.status_id && defaultStatusId && statusId === defaultStatusId) return true;
  return false;
}

/** Map CSV status text to a project status id; empty → default column. */
export function resolveImportedTaskStatusId(
  rawStatus: string,
  statuses: ProjectStatus[],
): string | null {
  const trimmed = rawStatus?.trim() ?? "";
  if (!trimmed) return getDefaultStatusId(statuses);
  if (statuses.length === 0) return null;

  const slug = trimmed.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const byExact = statuses.find((s) => s.name === trimmed);
  if (byExact) return byExact.id;

  const statusSlug = (s: { name: string }) =>
    s.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  const bySlug = statuses.find((s) => statusSlug(s) === slug);
  if (bySlug) return bySlug.id;

  if (["completed", "done", "closed"].includes(slug)) {
    const done = statuses.find((s) => s.is_done_status);
    if (done) return done.id;
  }
  if (["in_progress", "inprogress", "progress", "active"].includes(slug)) {
    const progress = statuses.find((s) => statusSlug(s).includes("progress"));
    if (progress) return progress.id;
  }
  if (["in_review", "inreview", "review"].includes(slug)) {
    const review = statuses.find((s) => statusSlug(s).includes("review"));
    if (review) return review.id;
  }
  if (
    ["todo", "not_started", "haven't_started", "havent_started", "pending", "open"].includes(
      slug,
    )
  ) {
    return getDefaultStatusId(statuses);
  }
  if (["cancelled", "canceled"].includes(slug)) {
    const cancelled = statuses.find((s) => statusSlug(s).includes("cancel"));
    if (cancelled) return cancelled.id;
  }

  return getDefaultStatusId(statuses);
}
