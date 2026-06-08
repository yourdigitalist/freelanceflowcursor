const ORANGE = '#FE8E01';
const RED_GRADIENT = 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)';
const NEUTRAL_GRADIENT = 'linear-gradient(135deg, #F8EDFF 0%, #CFDEF7 100%)';

export type TrialBannerAppearance = {
  background: string;
  textClass: string;
  iconClass: string;
};

export function getTrialBannerAppearance(
  daysLeft: number,
  status: string | null,
  isExpired: boolean,
): TrialBannerAppearance {
  const isCritical =
    status === 'past_due' ||
    status === 'paused' ||
    isExpired ||
    daysLeft <= 2;

  if (isCritical) {
    return {
      background: RED_GRADIENT,
      textClass: 'text-white',
      iconClass: 'text-white',
    };
  }

  if (daysLeft <= 7) {
    return {
      background: ORANGE,
      textClass: 'text-white',
      iconClass: 'text-white',
    };
  }

  return {
    background: NEUTRAL_GRADIENT,
    textClass: 'text-foreground',
    iconClass: 'text-primary',
  };
}
