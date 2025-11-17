/**
 * FILE: frontend/src/components/modals/ConfirmDeleteAccountModal.tsx
 * PURPOSE: Confirmation modal for account deletion (GDPR compliance).
 * SECURITY: Requires email confirmation + password verification
 */

import React, { useState } from 'react';
import { useAuth, useDeleteAccount } from '../../contexts/AuthContext';
import styles from './Modal.module.css';

interface ConfirmDeleteAccountModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteAccountModal: React.FC<ConfirmDeleteAccountModalProps> = ({
  onClose,
  onConfirm,
}) => {
  const { user } = useAuth();
  const { execute: deleteAccount, isLoading, error } = useDeleteAccount();

  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');

  if (!user) {
    return null;
  }

  const isConfirmed = emailConfirm === user.email && password.length > 0;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    try {
      await deleteAccount(password);
      onConfirm();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Delete Account</h2>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.warning}>
            ⚠️ This action cannot be undone
          </div>

          <p className={styles.message}>
            Your data will be exported (available for download) and then permanently deleted.
            This includes your profile, progress, and all associated data.
          </p>

          <div className={styles.field}>
            <label htmlFor="emailConfirm" className={styles.label}>
              Type your email to confirm: <strong>{user.email}</strong>
            </label>
            <input
              type="email"
              id="emailConfirm"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              className={styles.input}
              placeholder={user.email}
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Enter your password to confirm
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelButton} disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className={styles.dangerButton}
            disabled={!isConfirmed || isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
