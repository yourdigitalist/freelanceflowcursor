import { Link } from 'react-router-dom';
import { Bell, X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { InAppNotificationAlert } from '@/hooks/useInAppNotificationAlerts';
import { renderNotificationMessage } from '@/lib/notificationDisplay';

type Props = {
  alerts: InAppNotificationAlert[];
  onDismiss: (id: string) => void;
};

function alertHref(link: string | null) {
  if (!link) return null;
  return link.startsWith('/') ? link : `/${link}`;
}

export function InAppNotificationAlerts({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alerts.map((alert) => {
        const href = alertHref(alert.link);
        const message = alert.body?.trim() && alert.body.trim() !== alert.title.trim()
          ? `${alert.title} ${alert.body}`
          : alert.title;

        return (
          <div
            key={alert.id}
            role="status"
            className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm shadow-sm"
          >
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">New notification</p>
              <p className="mt-0.5 text-muted-foreground leading-snug">
                {renderNotificationMessage(message)}
              </p>
              {href ? (
                <Button
                  variant="link"
                  className="mt-1 h-auto p-0 text-primary"
                  asChild
                  onClick={() => onDismiss(alert.id)}
                >
                  <Link to={href}>View details</Link>
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
