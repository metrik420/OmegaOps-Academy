/**
 * FILE: frontend/src/pages/auth/ForgotPasswordPage.tsx
 * PURPOSE: Forgot password page (/forgot-password).
 */

import React from 'react';
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm';
import styles from './AuthPage.module.css';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reset your password</h1>
          <p className={styles.subtitle}>Enter your email to receive a reset link</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
