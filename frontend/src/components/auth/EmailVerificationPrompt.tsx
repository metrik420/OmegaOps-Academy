/**
 * FILE: frontend/src/components/auth/EmailVerificationPrompt.tsx
 * PURPOSE: Prompt unverified users to verify their email.
 * INPUTS: user (from auth context)
 * OUTPUTS: Banner with resend verification link
 * NOTES:
 *   - Shows countdown timer after resend (prevents spam)
 *   - Can be dismissed (stored in sessionStorage)
 * SECURITY: Backend rate-limits resend requests
 */

import React, { useState, useEffect } from 'react';
import { useAuth, useResendVerification } from '../../contexts/AuthContext';
import styles from './EmailVerificationPrompt.module.css';

const RESEND_COOLDOWN = 60; // 60 seconds

export const EmailVerificationPrompt: React.FC = () => {
  const { user } = useAuth();
  const { execute: resendVerification, isLoading, isSuccess } = useResendVerification();

  const [dismissed, setDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Check if user dismissed banner in this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('verification-prompt-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-dismiss after successful resend
  useEffect(() => {
    if (isSuccess) {
      setCooldown(RESEND_COOLDOWN);
    }
  }, [isSuccess]);

  // Don't show if verified, no user, or dismissed
  if (!user || user.isVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;

    try {
      await resendVerification(user.email);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('verification-prompt-dismissed', 'true');
  };

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.icon}>✉️</span>
        <div className={styles.text}>
          <strong>Verify your email</strong> to unlock all features.
          {isSuccess ? (
            <span className={styles.successMessage}>
              Verification email sent! Check your inbox.
            </span>
          ) : (
            <>
              Didn't receive it?{' '}
              <button
                onClick={handleResend}
                className={styles.resendButton}
                disabled={cooldown > 0 || isLoading}
              >
                {isLoading
                  ? 'Sending...'
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : 'Resend'}
              </button>
            </>
          )}
        </div>
      </div>
      <button onClick={handleDismiss} className={styles.dismissButton} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
};
