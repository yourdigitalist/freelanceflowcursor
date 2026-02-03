import { useState } from 'react';
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
import { GripVertical, Pencil, Trash2, MessageSquare, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Task, ProjectStatus, PRIORITY_OPTIONS } from './types';
import { format } from 'date-fns';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { QuickAddTask } from './QuickAddTask';

interface TaskListViewProps {
  tasks: Task[];
  statuses: ProjectStatus[];
  commentCounts: Record<string, number>;
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, statusId: string) => void;
  onPriorityChange: (taskId: string, priority: string) => void;
  onTitleChange: (taskId: string, title: string) => void;
  onEstHoursChange: (taskId: string, hours: number | null) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
  onDelete: (taskId: string) => void;
  onQuickAdd: (title: string, statusId: string) => void;
  defaultStatusId: string;
}

interface SortableRowProps {
  task: Task;
  statuses: ProjectStatus[];
  commentCount: number;
  onTaskClick: () => void;
  onStatusChange: (statusId: string) => void;
  onPriorityChange: (priority: string) => void;
  onTitleChange: (title: string) => void;
  onEstHoursChange: (hours: number | null) => void;
  onDueDateChange: (date: string | null) => void;
  onDelete: () => void;
}

function SortableRow({
  task,
  statuses,
  commentCount,
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onTitleChange,
  onEstHoursChange,
  onDueDateChange,
  onDelete,
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
  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === task.priority);
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
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                {commentCount}
              </span>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <Select value={task.status_id || ''} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[160px] h-8 border-0 bg-transparent hover:bg-muted">
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
        <Select value={task.priority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[100px] h-8 border-0 bg-transparent p-0">
            {priorityConfig && (
              <Badge className={priorityConfig.color} variant="secondary">
                {priorityConfig.label}
              </Badge>
            )}
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                <Badge className={priority.color} variant="secondary">
                  {priority.label}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {task.estimated_hours ? `${task.estimated_hours}h` : '—'}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 font-normal justify-start",
                !task.due_date && "text-muted-foreground"
              )}
            >
              {task.due_date ? format(new Date(task.due_date), 'dd-MM-yyyy') : '—'}
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onTaskClick}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
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
  onTaskClick,
  onStatusChange,
  onPriorityChange,
  onTitleChange,
  onEstHoursChange,
  onDueDateChange,
  onDelete,
  onQuickAdd,
  defaultStatusId,
}: TaskListViewProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[180px]">Status</TableHead>
            <TableHead className="w-[120px]">Priority</TableHead>
            <TableHead className="w-[100px]">Est. Hours</TableHead>
            <TableHead className="w-[140px]">Due Date</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableRow
                key={task.id}
                task={task}
                statuses={statuses}
                commentCount={commentCounts[task.id] || 0}
                onTaskClick={() => onTaskClick(task)}
                onStatusChange={(statusId) => onStatusChange(task.id, statusId)}
                onPriorityChange={(priority) => onPriorityChange(task.id, priority)}
                onTitleChange={(title) => onTitleChange(task.id, title)}
                onEstHoursChange={(hours) => onEstHoursChange(task.id, hours)}
                onDueDateChange={(date) => onDueDateChange(task.id, date)}
                onDelete={() => onDelete(task.id)}
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && !showQuickAdd && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No tasks yet. Add your first task to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
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
            className="w-full justify-start text-muted-foreground hover:text-foreground"
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
