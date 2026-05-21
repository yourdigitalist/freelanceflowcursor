import { clientLogoPublicUrl } from '@/lib/clientLogo';
import { cn } from '@/lib/utils';

export type ClientAvatarClient = {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_color?: string | null;
  logo_url?: string | null;
};

function getClientInitials(client: ClientAvatarClient) {
  if (client.first_name && client.last_name) {
    return `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();
  }
  return client.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

type ClientAvatarProps = {
  client: ClientAvatarClient;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function ClientAvatar({ client, size = 'md', className }: ClientAvatarProps) {
  const logoUrl = clientLogoPublicUrl(client.logo_url);
  const sizeClass = sizeClasses[size];

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn('shrink-0 rounded-full border border-border/60 bg-white object-cover', sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizeClass,
        className,
      )}
      style={{ backgroundColor: client.avatar_color || '#8B5CF6' }}
    >
      {getClientInitials(client)}
    </div>
  );
}
