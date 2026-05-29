import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyValue } from '@/components/ui/empty-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { GripVertical, Trash2, MessageSquare, Plus, Pencil, Copy } from '@/components/icons';
import { Task, ProjectStatus } from './types';
import { PrioritySelect } from './PrioritySelect';
import { format } from 'date-fns';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { QuickAddTask } from './QuickAddTask';
import { usePagination } from '@/hooks/usePagination';
import { useTableSort } from '@/hooks/useTableSort';
import { TablePagination } from '@/components/ui/table-pagination';
import { DataTableFrame } from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { compareDates, compareNullableNumbers, compareStrings } from '@/lib/tableSort';
import { formatDuration } from '@/lib/time';

export type TaskListSortKey = 'title' | 'status' | 'priority' | 'estimated_hours' | 'due_date';

interface TaskListViewProps {
  tasks: Task[];
  statuses: ProjectStatus[];
  commentCounts: Record<string, number>;
  trackedSecondsByTask: Record<string, number>;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
  onPriorityChange: (taskId: string, priority: string | null) => void;
  onTitleChange: (taskId: string, title: string) => void;
  onEstHoursChange: (taskId: string, hours: number | null) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
  onDelete: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  onQuickAdd: (title: string, statusId: string) => void;
  defaultStatusId: string;
}

interface SortableRowProps {
  task: Task;
  statuses: ProjectStatus[];
  commentCount: number;
  trackedSeconds: number;
  onTaskClick: () => void;
  onStatusChange: (statusId: string) => void;
  onPriorityChange: (priority: string | null) => void;
  onTitleChange: (title: string) => void;
  onEstHoursChange: (hours: number | null) => void;
  onDueDateChange: (date: string | null) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

function SortableRow({
  task,
  statuses,
  commentCount,
  trackedSeconds,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onTitleChange,
  onEstHoursChange,
  onDueDateChange,
  onDelete,
  onDuplicate,
}: SortableRowProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingHours, setIsEditingHours] = useState(false);
  const [titleValue, setTitleValue] = useState(task.title);
  const [hoursValue, setHoursValue] = useState(task.estimated_hours?.toString() || '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const currentStatus = statuses.find(s => s.id === task.status_id);
  const isDone = currentStatus?.is_done_status;

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleValue.trim() && titleValue !== task.title) {
      onTitleChange(titleValue.trim());
    } else {
      setTitleValue(task.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitleValue(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleHoursBlur = () => {
    setIsEditingHours(false);
    const hours = hoursValue ? parseFloat(hoursValue) : null;
    if (hours !== task.estimated_hours) {
      onEstHoursChange(hours);
    }
  };

  const handleHoursKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHoursBlur();
    } else if (e.key === 'Escape') {
      setHoursValue(task.estimated_hours?.toString() || '');
      setIsEditingHours(false);
    }
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging ? 'opacity-50' : '',
        isDone && 'bg-green-50 dark:bg-green-950/20'
      )}
      onDoubleClick={onTaskClick}
    >
      <TableCell className="w-8">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell>
        {isEditingTitle ? (
          <Input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="h-8"
          />
        ) : (
          <div
            className="flex items-center gap-2 cursor-text"
            onClick={() => setIsEditingTitle(true)}
          >
            <span className={cn("font-medium", isDone && "line-through text-muted-foreground")}>
              {task.title}
            </span>
            {commentCount > 0 && (
              <span className="text-sm text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Select value={task.status_id || ''} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px] h-8 border-0 bg-transparent text-sm hover:bg-muted">
            <div className="flex items-center gap-2">
              {currentStatus && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: currentStatus.color }}
                />
              )}
              <span className="truncate">{currentStatus?.name || 'Select'}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <PrioritySelect
          value={task.priority}
          onValueChange={onPriorityChange}
          triggerClassName="w-[110px] h-8 border-0 bg-transparent p-0 text-sm font-normal shadow-none"
        />
      </TableCell>
      <TableCell>
        {isEditingHours ? (
          <Input
            type="number"
            autoFocus
            value={hoursValue}
            onChange={(e) => setHoursValue(e.target.value)}
            onBlur={handleHoursBlur}
            onKeyDown={handleHoursKeyDown}
            className="h-8 w-20"
            placeholder="—"
          />
        ) : (
          <span
            className="text-muted-foreground cursor-text hover:text-foreground"
            onClick={() => setIsEditingHours(true)}
          >
            {task.estimated_hours ? `${task.estimated_hours}h` : <EmptyValue variant="table" />}
          </span>
        )}
      </TableCell>
      <TableCell>
        {trackedSeconds > 0 ? (
          <span className="text-primary">{formatDuration(trackedSeconds, true)}</span>
        ) : (
          <EmptyValue variant="table" />
        )}
      </TableCell>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 justify-start px-2 text-sm font-normal",
                !task.due_date && "text-muted-foreground"
              )}
            >
              {task.due_date ? format(new Date(task.due_date), 'dd-MM-yyyy') : <EmptyValue variant="table" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={task.due_date ? new Date(task.due_date) : undefined}
              onSelect={(date) => onDueDateChange(date ? format(date, 'yyyy-MM-dd') : null)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTaskClick} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          {onDuplicate && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicate">
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TaskListView({
  tasks,
  statuses,
  commentCounts,
  trackedSecondsByTask,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onTitleChange,
  onEstHoursChange,
  onDueDateChange,
  onDelete,
  onDuplicate,
  onQuickAdd,
  defaultStatusId,
}: TaskListViewProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const taskSortComparators = useMemo(() => {
    const statusPos = (s: ProjectStatus) => s.position;
    const statusName = (t: Task) => statuses.find((s) => s.id === t.status_id)?.name ?? '';
    const priorityOrder = (p: string | null) =>
      p ? ['low', 'medium', 'high', 'urgent'].indexOf(p) : -1;

    return {
      title: (a: Task, b: Task) => compareStrings(a.title, b.title),
      status: (a: Task, b: Task) => {
        const sa = statuses.find((s) => s.id === a.status_id);
        const sb = statuses.find((s) => s.id === b.status_id);
        const va = sa ? statusPos(sa) : 999;
        const vb = sb ? statusPos(sb) : 999;
        if (va !== vb) return va - vb;
        return compareStrings(statusName(a), statusName(b));
      },
      priority: (a: Task, b: Task) =>
        priorityOrder(a.priority) - priorityOrder(b.priority),
      estimated_hours: (a: Task, b: Task) =>
        compareNullableNumbers(a.estimated_hours, b.estimated_hours, -1),
      due_date: (a: Task, b: Task) => compareDates(a.due_date, b.due_date),
    };
  }, [statuses]);

  const taskSort = useTableSort(tasks, taskSortComparators);
  const tasksPagination = usePagination(taskSort.sortedItems);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <DataTableFrame>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8"></TableHead>
            <SortableTableHead label="Title" sortKey="title" sort={taskSort} />
            <SortableTableHead label="Status" sortKey="status" sort={taskSort} className="w-[180px]" />
            <SortableTableHead label="Priority" sortKey="priority" sort={taskSort} className="w-[120px]" />
            <SortableTableHead
              label="Est. Hours"
              sortKey="estimated_hours"
              sort={taskSort}
              className="w-[100px] whitespace-nowrap min-w-[100px]"
            />
            <TableHead className="w-[120px]">Tracked</TableHead>
            <SortableTableHead label="Due Date" sortKey="due_date" sort={taskSort} className="w-[140px]" />
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext items={tasksPagination.paginatedItems.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tasksPagination.paginatedItems.map((task) => (
              <SortableRow
                key={task.id}
                task={task}
                statuses={statuses}
                commentCount={commentCounts[task.id] || 0}
                trackedSeconds={trackedSecondsByTask[task.id] || 0}
                onTaskClick={() => onTaskClick(task)}
                onStatusChange={(statusId) => onStatusChange(task.id, statusId)}
                onPriorityChange={(priority) => onPriorityChange(task.id, priority)}
                onTitleChange={(title) => onTitleChange(task.id, title)}
                onEstHoursChange={(hours) => onEstHoursChange(task.id, hours)}
                onDueDateChange={(date) => onDueDateChange(task.id, date)}
                onDelete={() => onDelete(task.id)}
                onDuplicate={onDuplicate ? () => onDuplicate(task) : undefined}
              />
            ))}
          </SortableContext>
          {tasksPagination.total === 0 && !showQuickAdd && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No tasks yet. Add your first task to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {tasksPagination.total > 0 && (
        <TablePagination
          total={tasksPagination.total}
          page={tasksPagination.page}
          pageSize={tasksPagination.pageSize}
          from={tasksPagination.from}
          to={tasksPagination.to}
          pageSizeOptions={tasksPagination.pageSizeOptions}
          showPageSizeSelect={tasksPagination.showPageSizeSelect}
          onPageChange={tasksPagination.setPage}
          onPageSizeChange={tasksPagination.setPageSize}
        />
      )}
      </DataTableFrame>

      {/* Add task button */}
      <div className="p-3 border-t">
        {showQuickAdd ? (
          <QuickAddTask
            onAdd={(title) => {
              onQuickAdd(title, defaultStatusId);
              setShowQuickAdd(false);
            }}
            onCancel={() => setShowQuickAdd(false)}
          />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}
      </div>
    </div>
  );
}
