/**
 * FILE: frontend/src/pages/auth/LoginPage.tsx
 * PURPOSE: Login page (/login) with form and post-login redirect.
 * FLOW: User logs in → redirect to /dashboard or intended route
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../../components/auth/LoginForm';
import styles from './AuthPage.module.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/dashboard';

  const handleSuccess = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Log in to your OmegaOps account</p>
        </div>
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
};

export default LoginPage;
