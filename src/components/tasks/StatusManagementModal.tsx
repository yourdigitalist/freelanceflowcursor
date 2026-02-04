import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectStatus, STATUS_COLORS, DEFAULT_STATUSES } from './types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StatusManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: ProjectStatus[];
  onSave: (statuses: Omit<ProjectStatus, 'id' | 'project_id' | 'user_id'>[]) => void;
}

interface EditableStatus {
  tempId: string;
  id?: string;
  name: string;
  color: string;
  is_done_status: boolean;
  position: number;
}

const TEMPLATES = [
  { name: 'Basic', statuses: DEFAULT_STATUSES },
  {
    name: 'Detailed',
    statuses: [
      { name: 'Backlog', color: '#6B7280', is_done_status: false, position: 0 },
      { name: 'To Do', color: '#3B82F6', is_done_status: false, position: 1 },
      { name: 'In Progress', color: '#F59E0B', is_done_status: false, position: 2 },
      { name: 'In Review', color: '#8B5CF6', is_done_status: false, position: 3 },
      { name: 'Done', color: '#10B981', is_done_status: true, position: 4 },
    ],
  },
  {
    name: 'Kanban',
    statuses: [
      { name: 'To Do', color: '#6B7280', is_done_status: false, position: 0 },
      { name: 'Doing', color: '#3B82F6', is_done_status: false, position: 1 },
      { name: 'Done', color: '#10B981', is_done_status: true, position: 2 },
    ],
  },
];

interface SortableStatusRowProps {
  status: EditableStatus;
  onUpdate: (updates: Partial<EditableStatus>) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function SortableStatusRow({ status, onUpdate, onDelete, canDelete }: SortableStatusRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-lg bg-muted/50 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={status.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="flex-1"
        placeholder="Status name"
      />

      <div className="flex gap-1">
        {STATUS_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              status.color === color ? 'border-foreground scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onUpdate({ color })}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 min-w-[100px]">
        <Checkbox
          id={`done-${status.tempId}`}
          checked={status.is_done_status}
          onCheckedChange={(checked) => onUpdate({ is_done_status: !!checked })}
        />
        <Label htmlFor={`done-${status.tempId}`} className="text-xs whitespace-nowrap">
          Mark as Done
        </Label>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={!canDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function StatusManagementModal({
  isOpen,
  onClose,
  statuses,
  onSave,
  projectId,
  userId,
}: StatusManagementModalProps) {
  const [editableStatuses, setEditableStatuses] = useState<EditableStatus[]>([]);
  const [otherProjects, setOtherProjects] = useState<{ id: string; name: string }[]>([]);
  const [copyingFromProject, setCopyingFromProject] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isOpen) {
      if (statuses.length > 0) {
        setEditableStatuses(
          statuses.map((s) => ({
            tempId: s.id || crypto.randomUUID(),
            id: s.id,
            name: s.name,
            color: s.color,
            is_done_status: s.is_done_status,
            position: s.position,
          }))
        );
      } else {
        setEditableStatuses(
          DEFAULT_STATUSES.map((s, i) => ({
            tempId: crypto.randomUUID(),
            ...s,
            position: i,
          }))
        );
      }
    }
  }, [isOpen, statuses]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .neq('id', projectId)
        .order('name');
      setOtherProjects(data || []);
    };
    fetchProjects();
  }, [isOpen, userId, projectId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = editableStatuses.findIndex((s) => s.tempId === active.id);
      const newIndex = editableStatuses.findIndex((s) => s.tempId === over.id);
      const newStatuses = arrayMove(editableStatuses, oldIndex, newIndex).map((s, i) => ({
        ...s,
        position: i,
      }));
      setEditableStatuses(newStatuses);
    }
  };

  const handleUpdate = (tempId: string, updates: Partial<EditableStatus>) => {
    setEditableStatuses((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s))
    );
  };

  const handleDelete = (tempId: string) => {
    setEditableStatuses((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const handleAddStatus = () => {
    setEditableStatuses((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        name: 'New Status',
        color: STATUS_COLORS[prev.length % STATUS_COLORS.length],
        is_done_status: false,
        position: prev.length,
      },
    ]);
  };

  const handleApplyTemplate = (templateName: string) => {
    const template = TEMPLATES.find((t) => t.name === templateName);
    if (template) {
      setEditableStatuses(
        template.statuses.map((s, i) => ({
          tempId: crypto.randomUUID(),
          ...s,
          position: i,
        }))
      );
    }
  };

  const handleCopyFromProject = async (sourceProjectId: string) => {
    if (!sourceProjectId) return;
    setCopyingFromProject(true);
    try {
      const { data, error } = await supabase
        .from('project_statuses')
        .select('name, color, is_done_status, position')
        .eq('project_id', sourceProjectId)
        .order('position');
      if (error) throw error;
      if (data && data.length > 0) {
        setEditableStatuses(
          data.map((s, i) => ({
            tempId: crypto.randomUUID(),
            name: s.name,
            color: s.color,
            is_done_status: s.is_done_status ?? false,
            position: s.position ?? i,
          }))
        );
      }
    } catch (err) {
      console.error('Copy from project:', err);
    } finally {
      setCopyingFromProject(false);
    }
  };

  const handleSave = () => {
    onSave(
      editableStatuses.map((s) => ({
        name: s.name,
        color: s.color,
        is_done_status: s.is_done_status,
        position: s.position,
      }))
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Statuses</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Select onValueChange={handleApplyTemplate}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Apply Template" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((template) => (
                    <SelectItem key={template.name} value={template.name}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value=""
                onValueChange={(v) => {
                  if (v) handleCopyFromProject(v);
                }}
                disabled={copyingFromProject || otherProjects.length === 0}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Copy from project" />
                </SelectTrigger>
                <SelectContent>
                  {otherProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={handleAddStatus}>
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={editableStatuses.map((s) => s.tempId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {editableStatuses.map((status) => (
                  <SortableStatusRow
                    key={status.tempId}
                    status={status}
                    onUpdate={(updates) => handleUpdate(status.tempId, updates)}
                    onDelete={() => handleDelete(status.tempId)}
                    canDelete={editableStatuses.length > 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
