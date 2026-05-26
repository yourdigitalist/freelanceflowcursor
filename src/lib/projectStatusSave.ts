export type StatusRowRef = {
  id: string;
  name: string;
  is_done_status: boolean;
  position: number;
};

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Maps old status ids to new status ids by stable identity (id, then name, then sole done column).
 * Never uses column position — reordering or inserting a column must not steal another column's tasks.
 */
export function buildTaskStatusMigrationMap(
  oldStatuses: StatusRowRef[],
  newStatuses: StatusRowRef[],
): Map<string, string> {
  const map = new Map<string, string>();
  const usedNew = new Set<string>();

  for (const old of oldStatuses) {
    const idMatch = newStatuses.find((n) => n.id === old.id);
    if (idMatch && !usedNew.has(idMatch.id)) {
      map.set(old.id, idMatch.id);
      usedNew.add(idMatch.id);
      continue;
    }

    const nameMatches = newStatuses.filter(
      (n) => !usedNew.has(n.id) && normalizeName(n.name) === normalizeName(old.name),
    );
    if (nameMatches.length === 1) {
      map.set(old.id, nameMatches[0].id);
      usedNew.add(nameMatches[0].id);
      continue;
    }

    if (old.is_done_status) {
      const doneMatches = newStatuses.filter((n) => n.is_done_status && !usedNew.has(n.id));
      if (doneMatches.length === 1) {
        map.set(old.id, doneMatches[0].id);
        usedNew.add(doneMatches[0].id);
      }
    }
  }

  return map;
}

export function pickFallbackStatusId(statuses: StatusRowRef[]): string | null {
  if (statuses.length === 0) return null;
  const sorted = [...statuses].sort((a, b) => a.position - b.position);
  const nonDone = sorted.find((s) => !s.is_done_status);
  return (nonDone ?? sorted[0]).id;
}

/** Where tasks should go when a status column is removed. */
export function findDeletedStatusTaskTarget(
  deleted: Pick<StatusRowRef, 'name' | 'is_done_status'>,
  remaining: StatusRowRef[],
): string | null {
  if (remaining.length === 0) return null;

  const byName = remaining.filter(
    (n) => normalizeName(n.name) === normalizeName(deleted.name),
  );
  if (byName.length === 1) return byName[0].id;

  if (deleted.is_done_status) {
    const doneCols = remaining.filter((n) => n.is_done_status);
    if (doneCols.length === 1) return doneCols[0].id;
  }

  return pickFallbackStatusId(remaining);
}
