export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  status_id: string | null;
  priority: string;
  due_date: string | null;
  estimated_hours: number | null;
  position: number;
  project_id: string;
  user_id: string;
}

export interface ProjectStatus {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  color: string;
  is_done_status: boolean;
  position: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: number | null;
  due_date: string | null;
  start_date: string | null;
  hourly_rate: number | null;
  icon_emoji: string | null;
  icon_color: string | null;
  clients: { name: string } | null;
}

export const DEFAULT_STATUSES: Omit<ProjectStatus, 'id' | 'project_id' | 'user_id'>[] = [
  { name: "Haven't Started", color: '#6B7280', is_done_status: false, position: 0 },
  { name: 'In Progress', color: '#3B82F6', is_done_status: false, position: 1 },
  { name: 'Review', color: '#F59E0B', is_done_status: false, position: 2 },
  { name: 'Done', color: '#10B981', is_done_status: true, position: 3 },
];

export const STATUS_COLORS = [
  '#6B7280', // Gray
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#F97316', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'bg-primary/10 text-primary' },
  { value: 'high', label: 'High', color: 'bg-warning/10 text-warning' },
  { value: 'urgent', label: 'Urgent', color: 'bg-destructive/10 text-destructive' },
];
