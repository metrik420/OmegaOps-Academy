/**
 * FILE: src/components/LoadingSpinner.tsx
 * PURPOSE: Reusable loading indicator for async operations.
 *
 * ACCESSIBILITY:
 * - role="status" for screen reader announcement
 * - aria-label describes the loading state
 * - Visually hidden text for screen readers
 *
 * USAGE:
 * - Page loading states
 * - Button loading states
 * - Data fetching indicators
 */

import { Loader2 } from 'lucide-react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  /** Size of the spinner: sm=16px, md=24px, lg=32px, xl=48px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional label text displayed below spinner */
  label?: string;
  /** Center the spinner in its container */
  centered?: boolean;
}

/**
 * Map size prop to pixel values.
 * Consistent sizing across the application.
 */
const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export function LoadingSpinner({
  size = 'md',
  label,
  centered = false,
}: LoadingSpinnerProps) {
  const pixelSize = sizeMap[size];

  return (
    <div
      className={`${styles.container} ${centered ? styles.centered : ''}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      {/*
        Lucide Loader2 icon with CSS animation.
        Using transform: rotate for GPU-accelerated animation.
      */}
      <Loader2 size={pixelSize} className={styles.spinner} aria-hidden="true" />
      {label && <span className={styles.label}>{label}</span>}
      {/* Screen reader only text */}
      <span className={styles.srOnly}>Loading, please wait...</span>
    </div>
  );
}

export default LoadingSpinner;
