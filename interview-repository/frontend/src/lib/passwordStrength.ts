import type { PasswordStrength } from '../types/auth';

export function calculatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (password.length > 0) {
    if (hasMinLength) score += 1;
    if (hasUppercase && hasLowercase) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;
  }

  let label: PasswordStrength['label'];
  let color: string;

  switch (score) {
    case 1:
      label = 'Weak';
      color = '#f87171'; // red-400
      break;
    case 2:
      label = 'Fair';
      color = '#fbbf24'; // amber-400
      break;
    case 3:
      label = 'Good';
      color = '#38bdf8'; // sky-400
      break;
    case 4:
      label = 'Very Strong';
      color = '#34d399'; // emerald-400
      break;
    default:
      label = 'Weak';
      color = '#64748b'; // slate-500
      break;
  }

  return {
    score,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    label,
    color,
  };
}
