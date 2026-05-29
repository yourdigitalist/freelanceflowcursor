import { formatDistanceToNow, format } from 'date-fns';
import { getClientStageLabel } from '@/lib/clientCrmStages';
import { EMPTY_DASH, emptyDisplayText } from '@/lib/emptyDisplay';

export function formatClientCardFooter(
  projectCount: number,
  projectsValue: number | null | undefined,
  estimatedValue: number | null | undefined,
  formatMoney: (amount: number) => string,
): string {
  const count = projectCount || 0;
  const total = projectsValue && projectsValue > 0 ? projectsValue : null;
  const estimated = estimatedValue && estimatedValue > 0 ? estimatedValue : null;

  if (count === 0 && !total && !estimated) {
    return 'No projects yet';
  }

  const parts: string[] = [];
  if (count > 0) {
    parts.push(`${count} project${count === 1 ? '' : 's'}`);
  }
  if (total != null) {
    parts.push(formatMoney(total));
  } else if (estimated != null) {
    return count > 0 ? parts.join(' · ') : `${formatMoney(estimated)} est.`;
  }

  return parts.join(' · ') || EMPTY_DASH;
}

export function formatClientTableValue(
  projectsValue: number | null | undefined,
  estimatedValue: number | null | undefined,
  formatMoney: (amount: number) => string,
): { text: string; muted?: boolean } {
  const total = projectsValue && projectsValue > 0 ? projectsValue : null;
  const estimated = estimatedValue && estimatedValue > 0 ? estimatedValue : null;

  if (total != null) {
    return { text: formatMoney(total) };
  }
  if (estimated != null) {
    return { text: `${formatMoney(estimated)} est.`, muted: true };
  }
  return { text: emptyDisplayText({ variant: 'table', dash: true }), muted: true };
}

export function formatClientLastActivity(
  lastContactedAt: string | null | undefined,
  dateFormat?: string,
): string {
  if (!lastContactedAt) return emptyDisplayText({ variant: 'table', dash: true });
  const date = new Date(lastContactedAt);
  if (Number.isNaN(date.getTime())) return emptyDisplayText({ variant: 'table', dash: true });

  const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo < 60) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (dateFormat) {
    return format(date, dateFormat);
  }
  return format(date, 'MMM yyyy');
}

export { getClientStageLabel };
