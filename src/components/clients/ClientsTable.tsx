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
import { TableStatusBadge } from '@/components/ui/table-status-badge';
import { ClientAvatar } from '@/components/clients/ClientAvatar';
import { TablePagination } from '@/components/ui/table-pagination';
import type { ClientListCardData } from '@/components/clients/ClientListCard';
import {
  formatClientLastActivity,
  formatClientTableValue,
  getClientStageLabel,
} from '@/lib/clientDisplay';
import { EmptyValue } from '@/components/ui/empty-value';
import { isEmptyDash } from '@/lib/emptyDisplay';
import { cn } from '@/lib/utils';

type ClientsTableProps = {
  clients: ClientListCardData[];
  dateFormat?: string;
  formatMoney: (amount: number) => string;
  onRowClick: (id: string) => void;
  sort: TableSortState;
  pagination: {
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

export function ClientsTable({
  clients,
  dateFormat,
  formatMoney,
  onRowClick,
  sort,
  pagination,
}: ClientsTableProps) {
  return (
    <DataTableFrame>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortableTableHead label="Client" sortKey="name" sort={sort} />
            <SortableTableHead label="Stage" sortKey="stage" sort={sort} />
            <SortableTableHead label="Projects" sortKey="projects" sort={sort} />
            <SortableTableHead label="Last activity" sortKey="activity" sort={sort} />
            <SortableTableHead label="Value" sortKey="value" sort={sort} align="right" className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const status = client.status || 'active';
            const value = formatClientTableValue(
              client.projects_value,
              client.estimated_value,
              formatMoney,
            );

            return (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => onRowClick(client.id)}
              >
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ClientAvatar client={client} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground" title={client.name}>
                        {client.name}
                      </p>
                      {client.company ? (
                        <p className="truncate text-xs text-muted-foreground" title={client.company}>
                          {client.company}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <TableStatusBadge status={status} label={getClientStageLabel(status)} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-foreground">
                  {client.project_count ?? 0}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {isEmptyDash(formatClientLastActivity(client.last_contacted_at, dateFormat)) ? (
                    <EmptyValue variant="table" />
                  ) : (
                    <span className="text-muted-foreground">
                      {formatClientLastActivity(client.last_contacted_at, dateFormat)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-sm">
                  {value.muted && isEmptyDash(value.text) ? (
                    <EmptyValue variant="table" />
                  ) : (
                    <span
                      className={cn(
                        value.muted ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground',
                      )}
                    >
                      {value.text}
                    </span>
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
