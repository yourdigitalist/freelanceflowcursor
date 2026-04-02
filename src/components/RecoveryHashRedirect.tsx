import { useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Supabase password recovery links must land on /reset-password so the user can set a new password.
 * If the redirect URL is wrong (or email link points at Site URL only), tokens arrive on `/` or `/auth`.
 * Those routes treat a logged-in user as "go to dashboard", which skips the reset form.
 * This component rewrites recovery hashes to /reset-password before that happens.
 */
export function RecoveryHashRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const hash = location.hash;
    if (!hash) return;
    const isRecovery =
      /[?&]type=recovery/i.test(hash) ||
      /type%3[Dd]recovery/i.test(hash) ||
      /type%253[Dd]recovery/i.test(hash);
    if (!isRecovery) return;
    if (location.pathname === '/reset-password') return;
    navigate(`/reset-password${hash}`, { replace: true });
  }, [location.pathname, location.hash, navigate]);

  return null;
}
