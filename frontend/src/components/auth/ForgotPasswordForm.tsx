/**
 * FILE: frontend/src/components/auth/ForgotPasswordForm.tsx
 * PURPOSE: Password reset request form (step 1 of password reset flow).
 * INPUTS: onSuccess callback
 * OUTPUTS: Email input form, triggers password reset email
 * NOTES:
 *   - Sends reset email to user
 *   - Shows success message after submission
 *   - Validation with Zod
 * SECURITY:
 *   - Backend rate-limits reset requests (prevents abuse)
 *   - No information leakage (same message for existing/non-existing emails)
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../../contexts/AuthContext';
import { z } from 'zod';
import styles from './ForgotPasswordForm.module.css';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess }) => {
  const { execute: forgotPassword, isLoading, error, isSuccess } = useForgotPassword();

  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ForgotPasswordFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ForgotPasswordFormData) => ({ ...prev, [name]: value }));
    setValidationErrors((prev: Partial<Record<keyof ForgotPasswordFormData, string>>) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    try {
      forgotPasswordSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof ForgotPasswordFormData, string>> = {};
        err.issues.forEach((issue: z.ZodIssue) => {
          if (issue.path[0]) {
            errors[issue.path[0] as keyof ForgotPasswordFormData] = issue.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await forgotPassword({ email: formData.email });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {isSuccess ? (
        <div className={styles.success}>
          <div className={styles.successIcon}>✓</div>
          <h3 className={styles.successTitle}>Check your email</h3>
          <p className={styles.successMessage}>
            If an account exists for <strong>{formData.email}</strong>, you will receive a password reset link shortly.
          </p>
          <Link to="/login" className={styles.successLink}>
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`${styles.input} ${validationErrors.email ? styles.inputError : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isLoading}
              aria-invalid={!!validationErrors.email}
              aria-describedby={validationErrors.email ? 'email-error' : undefined}
            />
            {validationErrors.email && (
              <p id="email-error" className={styles.error} role="alert">
                {validationErrors.email}
              </p>
            )}
          </div>

          {error && (
            <div className={styles.apiError} role="alert">
              {error}
            </div>
          )}

          <button type="submit" className={styles.submit} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </button>

          <div className={styles.links}>
            <Link to="/login" className={styles.link}>
              Back to login
            </Link>
          </div>
        </>
      )}
    </form>
  );
};
