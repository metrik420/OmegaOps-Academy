/**
 * FILE: frontend/src/pages/auth/VerifyEmailPage.tsx
 * PURPOSE: Email verification page (/verify-email/:token).
 * FLOW: Auto-verify on load → redirect to login on success
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useVerifyEmail } from '../../contexts/AuthContext';
import styles from './AuthPage.module.css';

export const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { execute: verifyEmail, isLoading, error, isSuccess } = useVerifyEmail();

  const [autoVerified, setAutoVerified] = useState(false);

  useEffect(() => {
    if (token && !autoVerified) {
      setAutoVerified(true);
      verifyEmail(token);
    }
  }, [token, autoVerified, verifyEmail]);

  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Email verified! You can now log in.' },
        });
      }, 2000);
    }
  }, [isSuccess, navigate]);

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorMessage}>Invalid verification link</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Verifying your email...</p>
          </div>
        )}

        {isSuccess && (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <h2>Email verified!</h2>
            <p>Redirecting to login...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorMessage}>
            <div className={styles.errorIcon}>✕</div>
            <h2>Verification failed</h2>
            <p>{error}</p>
            <Link to="/login" className={styles.link}>
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
