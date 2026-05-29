import { forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MenuDotsTrigger } from '@/components/ui/menu-dots-trigger';
import { TableStatusBadge } from '@/components/ui/table-status-badge';
import { ClientAvatar, type ClientAvatarClient } from '@/components/clients/ClientAvatar';
import { formatClientCardFooter, getClientStageLabel } from '@/lib/clientDisplay';
import { isClientArchived } from '@/lib/clientLifecycle';

import { cn } from '@/lib/utils';

export type ClientListCardData = ClientAvatarClient & {
  id: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  estimated_value?: number | null;
  last_contacted_at?: string | null;
  archived_at?: string | null;
  project_count?: number;
  projects_value?: number;
};

type ClientListCardProps = {
  client: ClientListCardData;
  formatMoney: (amount: number) => string;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  dragHandle?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const ClientListCard = forwardRef<HTMLDivElement, ClientListCardProps>(function ClientListCard(
  {
    client,
    formatMoney,
    onOpen,
    onEdit,
    onArchive,
    onRestore,
    onDelete,
    dragHandle,
    className,
    style,
  },
  ref,
) {
  const archived = isClientArchived(client);
  const status = client.status || 'active';
  const footer = formatClientCardFooter(
    client.project_count ?? 0,
    client.projects_value,
    client.estimated_value,
    formatMoney,
  );
  const hasCompany = Boolean(client.company?.trim());
  const hasContact = Boolean(client.email || client.phone);

  return (
    <Card
      ref={ref}
      style={style}
      className={cn(
        'flex h-full cursor-pointer flex-col border shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
      onClick={onOpen}
    >
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="shrink-0 space-y-3">
          <div
            className={cn(
              'flex gap-2',
              hasCompany ? 'items-start' : 'items-center',
            )}
          >
            <div
              className={cn(
                'flex min-w-0 flex-1 gap-2',
                hasCompany ? 'items-start' : 'items-center',
              )}
            >
              {dragHandle}
              <ClientAvatar client={client} size="sm" className="shrink-0" />
              <div className={cn('min-w-0 flex-1', !hasCompany && 'flex items-center')}>
                <p className="truncate text-sm font-medium leading-tight text-foreground" title={client.name}>
                  {client.name}
                </p>
                {hasCompany ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" title={client.company!}>
                    {client.company}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              className={cn('shrink-0', hasCompany ? 'self-start' : 'self-center')}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <MenuDotsTrigger />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                  {archived ? (
                    <DropdownMenuItem onClick={onRestore}>Restore client</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={onArchive}>Archive client</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {hasContact ? (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              {client.email ? (
                <p className="truncate" title={client.email}>
                  {client.email}
                </p>
              ) : null}
              {client.phone ? (
                <p className="truncate" title={client.phone}>
                  {client.phone}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1" aria-hidden />

        <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-border/60 pt-4">
          <TableStatusBadge status={status} label={getClientStageLabel(status)} />
          <p className="truncate text-right text-xs font-normal text-muted-foreground">{footer}</p>
        </div>
      </CardContent>
    </Card>
  );
});
