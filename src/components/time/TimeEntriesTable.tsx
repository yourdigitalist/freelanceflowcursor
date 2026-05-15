import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2 } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { getEntryClientName } from '@/lib/timeEntryFilters';
import { formatDuration } from '@/lib/time';

export interface TimeEntriesTableEntry {
  id: string;
  description: string | null;
  start_time: string;
  started_at: string | null;
  project_id: string | null;
  task_id: string | null;
  total_duration_seconds: number | null;
  duration_minutes: number | null;
  end_time: string | null;
  billable: boolean;
  billing_status: string | null;
  projects: { name: string; client_id: string | null } | null;
  tasks: { title: string } | null;
}

interface TimeEntriesTableProps {
  entries: TimeEntriesTableEntry[];
  clientById: Map<string, { name: string }>;
  formatUserDate: (value: Date | string) => string;
  getEntrySeconds: (entry: TimeEntriesTableEntry) => number;
  getStatusBadge: (entry: TimeEntriesTableEntry) => React.ReactNode;
  onEdit: (entry: TimeEntriesTableEntry) => void;
  onDelete: (id: string) => void;
  onResume?: (id: string) => void;
  showOpenDayLink?: boolean;
  selectionMode?: boolean;
  selectedEntryIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onRowClick?: (entry: TimeEntriesTableEntry) => void;
  emptyMessage?: string;
}

export function TimeEntriesTable({
  entries,
  clientById,
  formatUserDate,
  getEntrySeconds,
  getStatusBadge,
  onEdit,
  onDelete,
  onResume,
  showOpenDayLink = false,
  selectionMode = false,
  selectedEntryIds,
  onToggleSelection,
  onRowClick,
  emptyMessage = 'No time entries found',
}: TimeEntriesTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectionMode && <TableHead className="w-10" />}
          <TableHead>Date</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[140px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow
            key={entry.id}
            className={onRowClick ? 'cursor-pointer' : undefined}
            onClick={() => onRowClick?.(entry)}
          >
            {selectionMode && selectedEntryIds && onToggleSelection && (
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedEntryIds.has(entry.id)}
                  onCheckedChange={() => onToggleSelection(entry.id)}
                />
              </TableCell>
            )}
            <TableCell>{formatUserDate(entry.started_at || entry.start_time)}</TableCell>
            <TableCell>
              {getEntryClientName(entry, clientById) || (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="font-medium">
              {entry.project_id && entry.projects?.name ? (
                <Link
                  to={`/projects/${entry.project_id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {entry.projects.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              {entry.tasks?.title || <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {entry.description || <span className="text-muted-foreground italic">No notes</span>}
            </TableCell>
            <TableCell>
              {getEntrySeconds(entry) > 0 ? formatDuration(getEntrySeconds(entry), true) : '—'}
            </TableCell>
            <TableCell>{getStatusBadge(entry)}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                {showOpenDayLink && (
                  <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                    <Link to={`/time?view=day&edit=${entry.id}`}>Open day</Link>
                  </Button>
                )}
                {onResume && (
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onResume(entry.id)}>
                    Resume
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary-foreground"
                  onClick={() => onEdit(entry)}
                >
                  <SlotIcon slot="action_edit" className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
