import { ClientAvatar, type ClientAvatarClient } from '@/components/clients/ClientAvatar';
import { EmptyValue } from '@/components/ui/empty-value';
import { cn } from '@/lib/utils';

type TableClientCellProps = {
  client?: ClientAvatarClient | null;
  /** When only a display name is available (e.g. proposal snapshot). */
  fallbackName?: string | null;
  className?: string;
};

export function TableClientCell({ client, fallbackName, className }: TableClientCellProps) {
  const name = client?.name?.trim() || fallbackName?.trim();
  if (!name) {
    return <EmptyValue variant="table" />;
  }

  const avatarClient: ClientAvatarClient = client?.name
    ? client
    : { name, first_name: null, last_name: null, avatar_color: null, logo_url: null };

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <ClientAvatar client={avatarClient} size="xs" />
      <span className="truncate text-sm text-foreground">{name}</span>
    </div>
  );
}
