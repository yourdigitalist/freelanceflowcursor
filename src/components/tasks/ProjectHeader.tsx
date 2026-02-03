import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Calendar, CheckSquare } from 'lucide-react';
import { Project, Task, ProjectStatus } from './types';
import { format } from 'date-fns';

interface ProjectHeaderProps {
  project: Project;
  tasks: Task[];
  statuses: ProjectStatus[];
  totalHours: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectHeader({
  project,
  tasks,
  statuses,
  totalHours,
  onEdit,
  onDelete,
}: ProjectHeaderProps) {
  const navigate = useNavigate();

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
        <Button variant="ghost" size="sm" asChild>
          <Link to="/projects">Back to Projects</Link>
        </Button>

        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: project.icon_color || '#9B63E9' }}
          >
            {project.icon_emoji || '📁'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge className={getStatusColor(project.status || 'active')} variant="secondary">
                {getStatusLabel(project.status || 'active')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {project.clients?.name || 'No client'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to={`/invoices/new?project=${project.id}`}>Create Invoice</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={`/time?project=${project.id}`}>Log Time</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-semibold">{totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-xl font-semibold">
                  {project.hourly_rate != null ? `$${project.hourly_rate}` : '-'}
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
                <Calendar className="h-5 w-5 text-warning" />
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
                <CheckSquare className="h-5 w-5 text-accent" />
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
