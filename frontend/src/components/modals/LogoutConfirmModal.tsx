/**
 * FILE: frontend/src/components/modals/LogoutConfirmModal.tsx
 * PURPOSE: Simple logout confirmation modal.
 */

import React from 'react';
import styles from './Modal.module.css';

interface LogoutConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ onClose, onConfirm }) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Log out</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>Are you sure you want to log out?</p>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.confirmButton}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};
