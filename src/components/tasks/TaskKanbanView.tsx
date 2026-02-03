import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Task, ProjectStatus } from './types';
import { TaskCard } from './TaskCard';
import { QuickAddTask } from './QuickAddTask';
import { useState } from 'react';

interface TaskKanbanViewProps {
  tasks: Task[];
  statuses: ProjectStatus[];
  commentCounts: Record<string, number>;
  onTaskClick: (task: Task) => void;
  onQuickAdd: (title: string, statusId: string) => void;
}

interface KanbanColumnProps {
  status: ProjectStatus;
  tasks: Task[];
  commentCounts: Record<string, number>;
  onTaskClick: (task: Task) => void;
  onQuickAdd: (title: string) => void;
}

function KanbanColumn({ status, tasks, commentCounts, onTaskClick, onQuickAdd }: KanbanColumnProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]">
      {/* Column header */}
      <div 
        className="rounded-t-lg px-4 py-3"
        style={{ backgroundColor: status.color }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-white">{status.name}</h3>
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 p-3 bg-card border border-t-0 rounded-b-lg min-h-[400px] transition-colors ${
          isOver ? 'bg-primary/5' : ''
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              status={status}
              commentCount={commentCounts[task.id] || 0}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !showQuickAdd && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks
          </div>
        )}

        {showQuickAdd ? (
          <QuickAddTask
            onAdd={(title) => {
              onQuickAdd(title);
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

export function TaskKanbanView({
  tasks,
  statuses,
  commentCounts,
  onTaskClick,
  onQuickAdd,
}: TaskKanbanViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status) => {
        const statusTasks = tasks.filter((t) => t.status_id === status.id);
        return (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={statusTasks}
            commentCounts={commentCounts}
            onTaskClick={onTaskClick}
            onQuickAdd={(title) => onQuickAdd(title, status.id)}
          />
        );
      })}
    </div>
  );
}
