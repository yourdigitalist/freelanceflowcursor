import { clientLogoPublicUrl } from '@/lib/clientLogo';
import { CLIENT_AVATAR_SHELL, getClientAvatarAppearance } from '@/lib/clientAvatarStyles';
import { DEFAULT_CLIENT_AVATAR_COLOR } from '@/lib/clientAvatarColors';
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
  const shellClass = cn('shrink-0', CLIENT_AVATAR_SHELL, sizeClass, className);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(shellClass, 'bg-white object-cover object-center')}
      />
    );
  }

  const appearance = getClientAvatarAppearance(client.avatar_color || DEFAULT_CLIENT_AVATAR_COLOR);

  return (
    <div
      className={cn(
        'flex items-center justify-center font-medium',
        shellClass,
      )}
      style={appearance}
    >
      {getClientInitials(client)}
    </div>
  );
}
