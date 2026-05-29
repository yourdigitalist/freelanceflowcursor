import type { ComponentType, SVGAttributes } from 'react';
import { CheckCircle, Clock, DollarSign, FileText } from '@/components/icons';

export type NotificationVisual = {
  Icon: ComponentType<SVGAttributes<SVGSVGElement>>;
  iconWrap: string;
  iconClass: string;
};

export function getNotificationVisual(
  type: string,
  title: string,
  body: string | null,
  isRead: boolean,
): NotificationVisual {
  const haystack = `${type} ${title} ${body ?? ''}`.toLowerCase();

  if (isRead) {
    if (haystack.includes('approv') || type === 'review' || type === 'approval') {
      return {
        Icon: CheckCircle,
        iconWrap: 'bg-muted',
        iconClass: 'text-muted-foreground',
      };
    }
    return {
      Icon: FileText,
      iconWrap: 'bg-muted',
      iconClass: 'text-muted-foreground',
    };
  }

  if (
    type === 'invoice' ||
    haystack.includes('paid') ||
    haystack.includes('payment') ||
    haystack.includes('received')
  ) {
    return {
      Icon: DollarSign,
      iconWrap: 'bg-success/10',
      iconClass: 'text-success',
    };
  }

  if (
    haystack.includes('due') ||
    haystack.includes('overdue') ||
    haystack.includes('pending') ||
    haystack.includes('reminder')
  ) {
    return {
      Icon: Clock,
      iconWrap: 'bg-warning/10',
      iconClass: 'text-warning',
    };
  }

  if (haystack.includes('approv') || type === 'review' || type === 'approval') {
    return {
      Icon: CheckCircle,
      iconWrap: 'bg-muted',
      iconClass: 'text-muted-foreground',
    };
  }

  return {
    Icon: FileText,
    iconWrap: 'bg-muted',
    iconClass: 'text-muted-foreground',
  };
}

const EMPHASIS_SPLIT =
  /(Invoice [A-Z0-9][\w-]*|INV-[A-Z0-9][\w-]*|#[A-Z0-9][\w-]*|approved|overdue|due soon)/gi;

const EMPHASIS_MATCH =
  /^(Invoice [A-Z0-9][\w-]*|INV-[A-Z0-9][\w-]*|#[A-Z0-9][\w-]*|approved|overdue|due soon)$/i;

export function renderNotificationMessage(text: string) {
  const parts = text.split(EMPHASIS_SPLIT).filter((part) => part.length > 0);
  if (parts.length <= 1) {
    return text;
  }
  return parts.map((part, index) =>
    EMPHASIS_MATCH.test(part) ? (
      <span key={`${part}-${index}`} className="font-semibold">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}
