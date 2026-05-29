import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ViewToggle, ViewToggleButton } from '@/components/ui/view-toggle';

import { LayoutGrid, List, Settings2, Plus, EyeOff, Filter } from '@/components/icons';
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
  const activeFilterCount = (selectedStatus !== 'all' ? 1 : 0) + (selectedPriority !== 'all' ? 1 : 0) + (hideDone ? 1 : 0);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <ViewToggle>
          <ViewToggleButton
            active={viewMode === 'kanban'}
            onClick={() => onViewModeChange('kanban')}
            aria-label="Kanban view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </ViewToggleButton>
          <ViewToggleButton
            active={viewMode === 'list'}
            onClick={() => onViewModeChange('list')}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
          </ViewToggleButton>
        </ViewToggle>

        <Button size="sm" onClick={onAddTask}>
          <Plus className="h-4 w-4 mr-2" />
          Task
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onEditStatuses}
          aria-label="Edit statuses"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative h-8 w-8 p-0" aria-label="Filters">
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4" align="end">
            <div className="space-y-3">
              <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={onPriorityChange}>
                <SelectTrigger className="w-full">
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
                className="w-full justify-start"
                onClick={() => onHideDoneChange(!hideDone)}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Done
              </Button>

              {activeFilterCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full"
                  onClick={() => {
                    onStatusChange('all');
                    onPriorityChange('all');
                    onHideDoneChange(false);
                  }}
                >
                  Reset filters
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
