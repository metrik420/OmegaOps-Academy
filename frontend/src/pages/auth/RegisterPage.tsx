/**
 * FILE: frontend/src/pages/auth/RegisterPage.tsx
 * PURPOSE: Registration page (/register) with email verification notice.
 * FLOW: User registers → success message → redirect to login
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../../components/auth/RegisterForm';
import styles from './AuthPage.module.css';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/login', {
      state: { message: 'Account created! Check your email to verify your account.' },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Join OmegaOps Academy and start learning</p>
        </div>
        <RegisterForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
};
