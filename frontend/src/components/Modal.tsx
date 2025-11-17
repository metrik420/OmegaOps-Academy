/**
 * FILE: src/components/Modal.tsx
 * PURPOSE: Accessible modal dialog for confirmations and content display.
 *
 * ACCESSIBILITY:
 * - Focus trap: Tab cycles within modal
 * - Focus restoration: Returns focus to trigger on close
 * - Escape key closes modal
 * - aria-modal and role="dialog"
 * - Backdrop click to close (optional)
 *
 * USAGE:
 * - Confirmations (delete, reset progress)
 * - Detailed views (achievements, hints)
 * - Forms (login, settings)
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Handler to close modal */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content (buttons) */
  footer?: ReactNode;
  /** Allow closing by clicking backdrop (default true) */
  closeOnBackdrop?: boolean;
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  closeOnBackdrop = true,
  size = 'md',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  /**
   * Store previously focused element when modal opens.
   * Will restore focus when modal closes.
   */
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      // Focus the modal container for screen readers
      modalRef.current?.focus();
    }
  }, [isOpen]);

  /**
   * Restore focus to previous element when modal closes.
   * Critical for keyboard navigation continuity.
   */
  useEffect(() => {
    return () => {
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  /**
   * Handle keyboard events.
   * - Escape: Close modal
   * - Tab: Trap focus within modal
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Focus trap: keep Tab cycling within modal
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          // Shift+Tab: go backwards
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: go forwards
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [onClose]
  );

  /**
   * Handle backdrop click.
   * Only close if clicking directly on backdrop, not modal content.
   */
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnBackdrop && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose]
  );

  /**
   * Prevent body scroll when modal is open.
   * Restores scroll on close.
   */
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [isOpen]);

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={styles.backdrop}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal dialog */}
      <div
        ref={modalRef}
        className={`${styles.modal} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Header with title and close button */}
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Main content */}
        <div className={styles.content}>{children}</div>

        {/* Optional footer */}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </>
  );
}

export default Modal;
