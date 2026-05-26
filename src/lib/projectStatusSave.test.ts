import { describe, expect, it } from 'vitest';
import {
  buildTaskStatusMigrationMap,
  findDeletedStatusTaskTarget,
  pickFallbackStatusId,
} from './projectStatusSave';

describe('buildTaskStatusMigrationMap', () => {
  it('does not map by column position when a new status is inserted before Done', () => {
    const oldStatuses = [
      { id: 'a', name: 'To Do', is_done_status: false, position: 0 },
      { id: 'b', name: 'In Progress', is_done_status: false, position: 1 },
      { id: 'c', name: 'Done', is_done_status: true, position: 2 },
    ];
    const newStatuses = [
      { id: 'a', name: 'To Do', is_done_status: false, position: 0 },
      { id: 'b', name: 'In Progress', is_done_status: false, position: 1 },
      { id: 'new', name: 'Archived', is_done_status: false, position: 2 },
      { id: 'c', name: 'Done', is_done_status: true, position: 3 },
    ];

    const map = buildTaskStatusMigrationMap(oldStatuses, newStatuses);

    expect(map.get('c')).toBe('c');
    expect(map.has('new')).toBe(false);
    expect(map.get('a')).toBe('a');
    expect(map.get('b')).toBe('b');
  });

  it('maps by name when ids are replaced (template apply)', () => {
    const oldStatuses = [
      { id: 'old-1', name: 'Done', is_done_status: true, position: 3 },
    ];
    const newStatuses = [
      { id: 'new-1', name: 'Done', is_done_status: true, position: 4 },
    ];

    const map = buildTaskStatusMigrationMap(oldStatuses, newStatuses);

    expect(map.get('old-1')).toBe('new-1');
  });

  it('maps done column by is_done_status when name changed', () => {
    const oldStatuses = [
      { id: 'old-done', name: 'Done', is_done_status: true, position: 3 },
    ];
    const newStatuses = [
      { id: 'new-complete', name: 'Complete', is_done_status: true, position: 3 },
    ];

    const map = buildTaskStatusMigrationMap(oldStatuses, newStatuses);

    expect(map.get('old-done')).toBe('new-complete');
  });
});

describe('findDeletedStatusTaskTarget', () => {
  it('sends tasks from removed Done to the remaining done column', () => {
    const remaining = [
      { id: '1', name: 'To Do', is_done_status: false, position: 0 },
      { id: '2', name: 'Shipped', is_done_status: true, position: 1 },
    ];
    expect(
      findDeletedStatusTaskTarget({ name: 'Done', is_done_status: true }, remaining),
    ).toBe('2');
  });
});

describe('pickFallbackStatusId', () => {
  it('prefers first non-done column by position', () => {
    const statuses = [
      { id: 'done', name: 'Done', is_done_status: true, position: 2 },
      { id: 'todo', name: 'To Do', is_done_status: false, position: 0 },
    ];
    expect(pickFallbackStatusId(statuses)).toBe('todo');
  });
});
