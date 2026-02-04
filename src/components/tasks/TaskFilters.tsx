import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LayoutGrid, List, Settings2, Plus, EyeOff } from 'lucide-react';
import { ProjectStatus, PRIORITY_OPTIONS } from './types';

interface TaskFiltersProps {
  viewMode: 'kanban' | 'list';
  onViewModeChange: (mode: 'kanban' | 'list') => void;
  statuses: ProjectStatus[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  hideDone: boolean;
  onHideDoneChange: (hide: boolean) => void;
  onEditStatuses: () => void;
  onAddTask: () => void;
}

export function TaskFilters({
  viewMode,
  onViewModeChange,
  statuses,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  hideDone,
  onHideDoneChange,
  onEditStatuses,
  onAddTask,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as 'kanban' | 'list')}
        >
          <ToggleGroupItem value="kanban" aria-label="Kanban view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Button variant="outline" size="sm" onClick={onEditStatuses}>
          <Settings2 className="h-4 w-4 mr-2" />
          Edit Statuses
        </Button>

        <Button onClick={onAddTask} className="hover:text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Task
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPriority} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITY_OPTIONS.map((priority) => (
              <SelectItem key={priority.value} value={priority.value}>
                {priority.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={hideDone ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onHideDoneChange(!hideDone)}
        >
          <EyeOff className="h-4 w-4 mr-2" />
          Hide Done
        </Button>
      </div>
    </div>
  );
}
