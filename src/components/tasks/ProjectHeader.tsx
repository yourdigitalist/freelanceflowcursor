import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, MoreVertical, Trash2, Download, Upload } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { Project, Task, ProjectStatus } from './types';
import { format } from 'date-fns';
import { formatDuration } from '@/lib/time';

interface ProjectHeaderProps {
  project: Project;
  tasks: Task[];
  statuses: ProjectStatus[];
  totalHours: number;
  formatCurrency?: (amount: number) => string;
  onEdit?: () => void;
  onDelete?: () => void;
  onDownloadTaskTemplate?: () => void;
  onExportTasksCsv?: () => void;
  onOpenImportTasks?: () => void;
  exportTaskCount?: number;
}

export function ProjectHeader({
  project,
  tasks,
  statuses,
  totalHours,
  formatCurrency: fmt,
  onEdit,
  onDelete,
  onDownloadTaskTemplate,
  onExportTasksCsv,
  onOpenImportTasks,
  exportTaskCount = 0,
}: ProjectHeaderProps) {
  const doneStatuses = statuses.filter(s => s.is_done_status).map(s => s.id);
  const completedTasks = tasks.filter(t => t.status_id && doneStatuses.includes(t.status_id)).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      case 'on_hold':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'on_hold': return 'On Hold';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: project.icon_color || '#9B63E9' }}
          >
            {project.icon_emoji || '📁'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
              <Badge className={getStatusColor(project.status || 'active')} variant="secondary">
                {getStatusLabel(project.status || 'active')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {project.clients?.name || 'No client'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(onDownloadTaskTemplate || onExportTasksCsv || onOpenImportTasks) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Template, export, or import CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDownloadTaskTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportTasksCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenImportTasks}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/invoices?project_id=${project.id}&from_review=1`}>Create Invoice</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={`/time?view=day&project=${project.id}`}>Log Time</Link>
          </Button>
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <SlotIcon slot="action_edit" className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <SlotIcon slot="project_clock" className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-semibold">{formatDuration(Math.round(totalHours * 3600))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <SlotIcon slot="project_dollar" className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-xl font-semibold">
                  {project.hourly_rate != null ? (fmt ? fmt(project.hourly_rate) : `$${project.hourly_rate}`) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">hourly</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <SlotIcon slot="project_calendar" className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-xl font-semibold">
                  {project.due_date ? format(new Date(project.due_date), 'MMM d, yyyy') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <SlotIcon slot="project_check" className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="text-xl font-semibold">
                  {completedTasks}/{tasks.length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">completed</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
