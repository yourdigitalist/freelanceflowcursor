import type { Service } from "@/types/services";

function mapTasks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** Normalizes service default_tasks payload into string titles. */
export function mapDefaultTasks(value: unknown): string[] {
  return mapTasks(value);
}

/** Normalize a services row from Supabase for app state. */
export function mapServiceRow(row: Record<string, unknown>): Service {
  return {
    ...(row as Service),
    price: row.price == null ? null : Number(row.price),
    recurrence_period: row.recurrence_period === "annually" ? "annually" : "monthly",
    default_tasks: mapTasks(row.default_tasks),
  };
}
