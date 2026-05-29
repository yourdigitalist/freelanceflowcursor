import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import type { TableSortState } from '@/hooks/useTableSort';
import { TableClientCell } from '@/components/ui/table-client-cell';
import { TablePagination } from '@/components/ui/table-pagination';
import type { ProjectListCardData } from '@/components/projects/ProjectListCard';
import {
  formatProjectDueLabel,
  formatProjectHours,
  formatProjectValue,
  getProjectActivity,
  getProjectTaskProgressPercent,
  projectDueToneClass,
} from '@/lib/projectDisplay';
import { EmptyValue } from '@/components/ui/empty-value';
import { isEmptyDash } from '@/lib/emptyDisplay';
import { cn } from '@/lib/utils';

type ProjectsTableProps = {
  dateFormat?: string;
  formatMoney: (amount: number) => string;
  onRowClick: (id: string) => void;
  sort: TableSortState;
  pagination: {
    paginatedItems: ProjectListCardData[];
    total: number;
    page: number;
    pageSize: number;
    from: number;
    to: number;
    pageSizeOptions: readonly number[];
    showPageSizeSelect: boolean;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
};

export function ProjectsTable({
  dateFormat,
  formatMoney,
  onRowClick,
  sort,
  pagination,
}: ProjectsTableProps) {
  return (
    <DataTableFrame>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableTableHead label="Project" sortKey="name" sort={sort} />
            <SortableTableHead label="Client" sortKey="client" sort={sort} />
            <SortableTableHead label="Progress" sortKey="progress" sort={sort} />
            <SortableTableHead label="Tasks" sortKey="tasks" sort={sort} />
            <SortableTableHead label="Hours" sortKey="hours" sort={sort} />
            <SortableTableHead label="Due" sortKey="due" sort={sort} />
            <SortableTableHead label="Value" sortKey="value" sort={sort} align="right" className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.paginatedItems.map((project) => {
            const activity = getProjectActivity(project);
            const progressPct = getProjectTaskProgressPercent(
              project.completed_tasks,
              project.task_count,
            );
            const due = formatProjectDueLabel(project.due_date, dateFormat);
            const hasTasks = project.task_count > 0;

            return (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => onRowClick(project.id)}
              >
                <TableCell>
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', activity.dotClass)}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground" title={project.name}>
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.label}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <TableClientCell client={project.clients} />
                </TableCell>
                <TableCell className="min-w-[160px]">
                  {hasTasks ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{progressPct}%</span>
                        <span>
                          {project.completed_tasks}/{project.task_count} tasks
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No tasks yet</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  <span className="font-semibold text-foreground">{project.completed_tasks}</span>
                  <span className="text-muted-foreground">/{project.task_count}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium text-foreground">
                  {formatProjectHours(project.hours)}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {isEmptyDash(due.label) ? (
                    <EmptyValue variant="table" />
                  ) : (
                    <span className={projectDueToneClass(due.tone)}>{due.label}</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {isEmptyDash(formatProjectValue(project.budget, formatMoney)) ? (
                    <EmptyValue variant="table" field="value" />
                  ) : (
                    formatProjectValue(project.budget, formatMoney)
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <TablePagination
        total={pagination.total}
        page={pagination.page}
        pageSize={pagination.pageSize}
        from={pagination.from}
        to={pagination.to}
        pageSizeOptions={pagination.pageSizeOptions}
        showPageSizeSelect={pagination.showPageSizeSelect}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </DataTableFrame>
  );
}
