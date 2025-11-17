/**
 * FILE: src/components/Toast.tsx
 * PURPOSE: Toast notification system for user feedback.
 *
 * FEATURES:
 * - Auto-dismiss after duration
 * - Manual dismiss with close button
 * - Type variants: success, error, warning, info
 * - Stacks multiple toasts
 * - Accessible with ARIA live region
 *
 * ACCESSIBILITY:
 * - aria-live="polite" for screen reader announcements
 * - role="alert" for important notifications
 * - Keyboard accessible dismiss
 */

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToasts, useStore } from '@/store';
import type { Toast as ToastType } from '@/types';
import styles from './Toast.module.css';

/**
 * Icon mapping for toast types.
 * Visual indicator of message severity.
 */
const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

/**
 * Individual toast notification.
 */
function ToastItem({ toast, onRemove }: ToastItemProps) {
  const Icon = iconMap[toast.type];

  /**
   * Auto-dismiss handled by store addToast function.
   * This component just renders the toast.
   */
  useEffect(() => {
    // Additional cleanup if needed
    return () => {
      // Toast removal handled by store
    };
  }, [toast.id]);

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon size={20} className={styles.icon} aria-hidden="true" />
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className={styles.closeButton}
        aria-label="Dismiss notification"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Toast container that renders all active toasts.
 * Positioned fixed at top-right of viewport.
 */
export function ToastContainer() {
  const toasts = useToasts();
  const removeToast = useStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

export default ToastContainer;
