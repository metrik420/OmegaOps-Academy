/**
 * FILE: src/components/Badge.tsx
 * PURPOSE: Status, difficulty, and category badges for visual categorization.
 *
 * VARIANTS:
 * - difficulty: beginner (green), intermediate (yellow), advanced (red)
 * - status: pending (gray), approved (green), rejected (red), etc.
 * - environment: ubuntu, docker, windows, etc.
 * - category: ci-cd, monitoring, security, etc.
 *
 * ACCESSIBILITY:
 * - Semantic coloring (not color-only information)
 * - Text labels always present
 * - Sufficient contrast ratios
 */

import styles from './Badge.module.css';

interface BadgeProps {
  /** Badge variant determines styling */
  variant: 'difficulty' | 'status' | 'environment' | 'category' | 'custom';
  /** The value to display (e.g., "beginner", "approved", "ubuntu") */
  value: string;
  /** Size of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Optional custom color override */
  color?: string;
}

/**
 * Map difficulty values to semantic colors.
 * Green = easy, Yellow = medium, Red = hard.
 */
const difficultyColors: Record<string, string> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
};

/**
 * Map status values to semantic colors.
 */
const statusColors: Record<string, string> = {
  pending: 'muted',
  approved: 'success',
  rejected: 'error',
  applied: 'info',
  ignored: 'muted',
  completed: 'success',
  'in-progress': 'warning',
};

/**
 * Map environment values to colors.
 * OS-specific coloring for quick recognition.
 */
const environmentColors: Record<string, string> = {
  ubuntu: 'ubuntu',
  debian: 'debian',
  centos: 'centos',
  rhel: 'rhel',
  alma: 'alma',
  rocky: 'rocky',
  fedora: 'fedora',
  macos: 'macos',
  windows: 'windows',
  docker: 'docker',
};

/**
 * Get CSS class name based on variant and value.
 * Falls back to default styling if value not mapped.
 */
const getColorClass = (variant: string, value: string): string => {
  const lowerValue = value.toLowerCase();

  switch (variant) {
    case 'difficulty':
      return difficultyColors[lowerValue] || 'default';
    case 'status':
      return statusColors[lowerValue] || 'default';
    case 'environment':
      return environmentColors[lowerValue] || 'default';
    case 'category':
      // Categories use a consistent accent color
      return 'category';
    default:
      return 'default';
  }
};

/**
 * Format value for display.
 * Capitalizes first letter, replaces hyphens with spaces.
 */
const formatValue = (value: string): string => {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function Badge({ variant, value, size = 'md', color }: BadgeProps) {
  const colorClass = color || getColorClass(variant, value);
  const displayValue = formatValue(value);

  return (
    <span
      className={`${styles.badge} ${styles[size]} ${styles[colorClass]}`}
      data-variant={variant}
      /**
       * aria-label provides full context for screen readers.
       * Example: "Difficulty: Beginner" instead of just "Beginner".
       */
      aria-label={`${variant}: ${displayValue}`}
    >
      {displayValue}
    </span>
  );
}

export default Badge;
