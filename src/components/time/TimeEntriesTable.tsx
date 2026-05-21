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
import { cn } from '@/lib/utils';
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

type TimeEntriesTableVariant = 'default' | 'timesheetDay';

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
  /** Minimal purple link shown below empty message (timesheet day view). */
  emptyTrackTimeHref?: string;
  variant?: TimeEntriesTableVariant;
  headerActions?: React.ReactNode;
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
  emptyTrackTimeHref,
  variant = 'default',
  headerActions,
}: TimeEntriesTableProps) {
  const isTimesheetDay = variant === 'timesheetDay';

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{emptyMessage}</p>
        {emptyTrackTimeHref && (
          <Link
            to={emptyTrackTimeHref}
            className="mt-2 inline-block text-sm font-bold text-primary hover:underline"
          >
            + Track time
          </Link>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className={isTimesheetDay ? 'hover:bg-transparent' : undefined}>
          {selectionMode && <TableHead className="w-10" />}
          <TableHead>Date</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>{isTimesheetDay ? 'Task / Notes' : 'Task'}</TableHead>
          {!isTimesheetDay && <TableHead>Notes</TableHead>}
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className={cn('w-[140px]', headerActions && 'text-right')}>
            {headerActions ?? 'Actions'}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const seconds = getEntrySeconds(entry);
          const clientName = getEntryClientName(entry, clientById);
          const taskTitle = entry.tasks?.title;
          const notes = entry.description?.trim();

          return (
            <TableRow
              key={entry.id}
              className={cn(onRowClick && 'cursor-pointer', isTimesheetDay && 'hover:bg-muted/50')}
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
              <TableCell className={isTimesheetDay ? 'px-4 py-3 text-[13px] font-medium' : undefined}>
                {formatUserDate(entry.started_at || entry.start_time)}
              </TableCell>
              <TableCell className={isTimesheetDay ? 'px-4 py-3 text-[13px] font-medium' : undefined}>
                {clientName || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell
                className={cn(
                  isTimesheetDay ? 'px-4 py-3 text-[13px] font-medium' : 'font-medium',
                )}
              >
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
              <TableCell className={isTimesheetDay ? 'px-4 py-3 max-w-[280px]' : undefined}>
                {isTimesheetDay ? (
                  <div className="space-y-0.5">
                    {taskTitle ? (
                      <p className="text-[13px] font-normal leading-snug text-foreground">{taskTitle}</p>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">—</p>
                    )}
                    {notes ? (
                      <p className="text-[13px] font-normal leading-snug text-muted-foreground">{notes}</p>
                    ) : (
                      <p className="text-[13px] italic text-muted-foreground">No notes</p>
                    )}
                  </div>
                ) : (
                  entry.tasks?.title || <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {!isTimesheetDay && (
                <TableCell className="max-w-[200px] truncate">
                  {entry.description || (
                    <span className="text-muted-foreground italic">No notes</span>
                  )}
                </TableCell>
              )}
              <TableCell className={isTimesheetDay ? 'px-4 py-3 text-[13px] font-medium' : undefined}>
                {seconds > 0 ? formatDuration(seconds, true) : '—'}
              </TableCell>
              <TableCell className={isTimesheetDay ? 'px-4 py-3' : undefined}>{getStatusBadge(entry)}</TableCell>
              <TableCell
                className={isTimesheetDay ? 'px-4 py-3' : undefined}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  {showOpenDayLink && (
                    <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                      <Link to={`/time?view=day&edit=${entry.id}`}>Open day</Link>
                    </Button>
                  )}
                  {onResume && (
                    <Button
                      variant={isTimesheetDay ? 'outline' : 'ghost'}
                      size="sm"
                      className={isTimesheetDay ? 'h-8 px-2.5 text-xs' : 'h-8 px-2'}
                      onClick={() => onResume(entry.id)}
                    >
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
          );
        })}
      </TableBody>
    </Table>
  );
}
