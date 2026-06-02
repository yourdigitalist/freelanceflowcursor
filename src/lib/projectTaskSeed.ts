import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_STATUSES, type ProjectStatus } from "@/components/tasks/types";
import { getDefaultStatusId } from "@/lib/taskStatus";
import { mapDefaultTasks } from "@/lib/serviceUtils";

export type SeedProjectTasksResult = {
  created: number;
  skipped: number;
  titles: string[];
};

/** Deduplicated non-empty service IDs, preserving first-seen order. */
export function uniqueServiceIds(serviceIds: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of serviceIds) {
    const trimmed = id?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function serviceIdsFromLineItems(
  items: ReadonlyArray<{ service_id?: string | null }>,
): string[] {
  return uniqueServiceIds(items.map((item) => item.service_id));
}

type ServiceTaskRow = { id: string; default_tasks: unknown };

/** Merge default task titles from catalog services in `serviceIds` order. */
export function mergeDefaultTaskTitles(
  serviceIds: string[],
  rows: ServiceTaskRow[],
): string[] {
  const byId = new Map(rows.map((row) => [row.id, mapDefaultTasks(row.default_tasks)]));
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const serviceId of serviceIds) {
    const tasks = byId.get(serviceId);
    if (!tasks) continue;
    for (const title of tasks) {
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
    }
  }

  return titles;
}

export function partitionTitlesForSeed(
  titles: string[],
  existingTitles: string[],
): { toCreate: string[]; skipped: number } {
  const existing = new Set(existingTitles.map((t) => t.trim().toLowerCase()).filter(Boolean));
  const toCreate: string[] = [];
  let skipped = 0;

  for (const title of titles) {
    const key = title.toLowerCase();
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    existing.add(key);
    toCreate.push(title);
  }

  return { toCreate, skipped };
}

async function ensureDefaultProjectStatuses(
  projectId: string,
  userId: string,
): Promise<string | null> {
  const { data: existing, error: fetchError } = await supabase
    .from("project_statuses")
    .select("id, name, is_done_status, position, project_id, user_id")
    .eq("project_id", projectId)
    .order("position");

  if (fetchError) throw fetchError;

  let statuses = existing ?? [];

  if (statuses.length === 0) {
    const defaultStatuses = DEFAULT_STATUSES.map((status, index) => ({
      ...status,
      project_id: projectId,
      user_id: userId,
      position: index,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("project_statuses")
      .insert(defaultStatuses)
      .select("id, name, is_done_status, position, project_id, user_id");

    if (insertError) throw insertError;
    statuses = inserted ?? [];
  }

  return getDefaultStatusId(statuses as ProjectStatus[]);
}

/**
 * Creates project tasks from catalog `default_tasks` for the given services.
 * Idempotent: skips titles that already exist on the project (case-insensitive).
 */
export async function seedProjectTasksFromServices(options: {
  projectId: string;
  userId: string;
  serviceIds: string[];
}): Promise<SeedProjectTasksResult> {
  const serviceIds = uniqueServiceIds(options.serviceIds);
  if (serviceIds.length === 0) {
    return { created: 0, skipped: 0, titles: [] };
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, default_tasks")
    .in("id", serviceIds);

  if (servicesError) throw servicesError;

  const titles = mergeDefaultTaskTitles(serviceIds, (services ?? []) as ServiceTaskRow[]);
  if (titles.length === 0) {
    return { created: 0, skipped: 0, titles: [] };
  }

  const { data: existingTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("title")
    .eq("project_id", options.projectId);

  if (tasksError) throw tasksError;

  const { toCreate, skipped } = partitionTitlesForSeed(
    titles,
    (existingTasks ?? []).map((task) => task.title),
  );

  if (toCreate.length === 0) {
    return { created: 0, skipped, titles };
  }

  const statusId = await ensureDefaultProjectStatuses(options.projectId, options.userId);

  const { data: positionRow } = await supabase
    .from("tasks")
    .select("position")
    .eq("project_id", options.projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextPosition = (positionRow?.position ?? -1) + 1;
  const rows = toCreate.map((title) => {
    const row = {
      title,
      description: null,
      status: "todo",
      status_id: statusId,
      priority: "medium" as const,
      due_date: null,
      estimated_hours: null,
      project_id: options.projectId,
      user_id: options.userId,
      position: nextPosition,
    };
    nextPosition += 1;
    return row;
  });

  const { error: insertError } = await supabase.from("tasks").insert(rows);
  if (insertError) throw insertError;

  return { created: toCreate.length, skipped, titles: toCreate };
}

export function seedTasksToastDescription(result: SeedProjectTasksResult): string {
  const count = result.created;
  const noun = count === 1 ? "task" : "tasks";
  return `Added ${count} ${noun} from your service templates.`;
}
