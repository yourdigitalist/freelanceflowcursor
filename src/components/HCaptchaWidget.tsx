import { forwardRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const SITE_KEY = (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined)?.trim();

export function isHCaptchaEnabled(): boolean {
  return !!SITE_KEY;
}

type HCaptchaWidgetProps = {
  onToken: (token: string) => void;
  onExpire?: () => void;
};

export const HCaptchaWidget = forwardRef<HCaptcha, HCaptchaWidgetProps>(function HCaptchaWidget(
  { onToken, onExpire },
  ref,
) {
  if (!SITE_KEY) return null;

  return (
    <div className="flex justify-center [&_.h-captcha]:mx-auto">
      <HCaptcha ref={ref} sitekey={SITE_KEY} onVerify={onToken} onExpire={onExpire} />
    </div>
  );
});
