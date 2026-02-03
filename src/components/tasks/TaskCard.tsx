import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, Calendar, GripVertical } from 'lucide-react';
import { Task, ProjectStatus, PRIORITY_OPTIONS } from './types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  status: ProjectStatus;
  commentCount?: number;
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, status, commentCount = 0, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === task.priority);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-card border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2 flex flex-row gap-2">
        {/* Drag handle - prevents click from being captured by dnd-kit so card click opens sheet */}
        <div
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab active:cursor-grabbing shrink-0 self-start mt-0.5 rounded p-0.5 hover:bg-muted/80"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm leading-tight">
          {task.title}
        </h4>

        <div className="flex items-center gap-2 flex-wrap">
          {priorityConfig && (
            <Badge className={priorityConfig.color} variant="secondary">
              {priorityConfig.label}
            </Badge>
          )}
          
          {task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}

          {task.estimated_hours && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimated_hours}h
            </span>
          )}

          {commentCount > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
