/**
 * FILE: frontend/src/pages/auth/ResetPasswordPage.tsx
 * PURPOSE: Reset password page (/reset-password/:token).
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResetPasswordForm } from '../../components/auth/ResetPasswordForm';
import styles from './AuthPage.module.css';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.error}>Invalid reset link</div>
        </div>
      </div>
    );
  }

  const handleSuccess = () => {
    navigate('/login', {
      state: { message: 'Password reset successful! Please log in.' },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Set new password</h1>
          <p className={styles.subtitle}>Enter your new password below</p>
        </div>
        <ResetPasswordForm token={token} onSuccess={handleSuccess} />
      </div>
    </div>
  );
};

export default ResetPasswordPage;
