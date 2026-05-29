import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ClientAvatar, type ClientAvatarClient } from '@/components/clients/ClientAvatar';
import { ProjectActivityBadge } from '@/components/projects/ProjectActivityBadge';
import {
  formatProjectDueLabel,
  formatProjectValue,
  getProjectActivity,
  getProjectTaskProgressPercent,
  projectDueToneClass,
} from '@/lib/projectDisplay';
import { EmptyValue } from '@/components/ui/empty-value';
import { isEmptyDash } from '@/lib/emptyDisplay';
import { cn } from '@/lib/utils';

export type ProjectListCardData = {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  due_date: string | null;
  start_date: string | null;
  hours: number;
  task_count: number;
  completed_tasks: number;
  open_task_count: number;
  clients: ClientAvatarClient | null;
};

type ProjectListCardProps = {
  project: ProjectListCardData;
  dateFormat?: string;
  formatMoney: (amount: number) => string;
  onNavigate: () => void;
};

export function ProjectListCard({ project, dateFormat, formatMoney, onNavigate }: ProjectListCardProps) {
  const activity = getProjectActivity(project);
  const progressPct = getProjectTaskProgressPercent(project.completed_tasks, project.task_count);
  const due = formatProjectDueLabel(project.due_date, dateFormat);
  const valueLabel = formatProjectValue(project.budget, formatMoney);
  const hasTasks = project.task_count > 0;

  return (
    <Card
      className="flex h-full cursor-pointer flex-col border shadow-sm transition-shadow hover:shadow-md"
      onClick={onNavigate}
    >
      <CardContent className="flex flex-col p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-foreground"
              title={project.name}
            >
              {project.name}
            </h3>
            <ProjectActivityBadge activity={activity} className="shrink-0" />
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {project.clients ? (
              <>
                <ClientAvatar client={project.clients} size="xs" />
                <span className="truncate text-sm text-muted-foreground">{project.clients.name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No client</span>
            )}
          </div>

          {hasTasks ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm leading-none">
                <span>
                  <span className="font-semibold text-foreground">{project.completed_tasks}</span>
                  <span className="text-muted-foreground">/{project.task_count} tasks</span>
                </span>
                <span className="shrink-0 text-muted-foreground">{progressPct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm leading-snug text-muted-foreground">
              No tasks yet ·{' '}
              <Link
                to={`/projects/${project.id}`}
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Add tasks
              </Link>
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-1 border-t border-border/60 pt-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due</p>
            <p className="truncate text-sm font-normal leading-tight">
              {isEmptyDash(due.label) ? (
                <EmptyValue variant="inline" />
              ) : (
                <span className={projectDueToneClass(due.tone)}>{due.label}</span>
              )}
            </p>
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</p>
            <p className="truncate text-sm font-normal leading-tight text-foreground">
              {project.open_task_count} open
            </p>
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Value</p>
            <p className="truncate text-sm font-normal leading-tight text-foreground">
              {isEmptyDash(valueLabel) ? <EmptyValue variant="inline" field="value" /> : valueLabel}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
