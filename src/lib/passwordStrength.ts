export type PasswordStrength = 'weak' | 'fair' | 'strong';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  /** 0–100 for the strength bar fill */
  percent: number;
  label: string;
  requirements: PasswordRequirement[];
  isStrongEnough: boolean;
}

const MIN_LENGTH = 8;

const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'One number',
      met: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'One special character (!@#$…)',
      met: SPECIAL_CHAR_PATTERN.test(password),
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;

  let strength: PasswordStrength = 'weak';
  let percent = 0;

  if (!password) {
    return {
      strength,
      percent,
      label: 'Enter a password',
      requirements,
      isStrongEnough: false,
    };
  }

  if (metCount <= 2 || password.length < MIN_LENGTH) {
    strength = 'weak';
    percent = Math.max(15, Math.round((metCount / requirements.length) * 33));
  } else if (metCount < requirements.length) {
    strength = 'fair';
    percent = 66;
  } else {
    strength = 'strong';
    percent = 100;
  }

  const label =
    strength === 'weak' ? 'Weak password' : strength === 'fair' ? 'Fair password' : 'Strong password';

  return {
    strength,
    percent,
    label,
    requirements,
    isStrongEnough: strength === 'strong',
  };
}

export function passwordStrengthMessage(result: PasswordStrengthResult): string {
  if (result.isStrongEnough) return '';
  if (!result.requirements[0].met) {
    return `Use at least ${MIN_LENGTH} characters with uppercase, lowercase, a number, and a special character.`;
  }
  return 'Meet all requirements below for a strong password.';
}
