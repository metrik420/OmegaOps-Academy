/**
 * FILE: frontend/src/components/auth/ResetPasswordForm.tsx
 * PURPOSE: Password reset form with token (step 2 of password reset flow).
 * INPUTS: token (from URL), onSuccess callback
 * OUTPUTS: New password form, validates and resets password
 * SECURITY: Token validated by backend, single-use, expires after 1 hour
 */

import React, { useState } from 'react';
import { useResetPassword } from '../../contexts/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { z } from 'zod';
import styles from './ResetPasswordForm.module.css';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8).regex(PASSWORD_REGEX, 'Password does not meet requirements'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token, onSuccess }) => {
  const { execute: resetPassword, isLoading, error } = useResetPassword();

  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    try {
      resetPasswordSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as keyof ResetPasswordFormData] = error.message;
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
      await resetPassword({ token, newPassword: formData.newPassword });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="newPassword" className={styles.label}>
          New Password
        </label>
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className={`${styles.input} ${validationErrors.newPassword ? styles.inputError : ''}`}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.togglePassword}
            disabled={isLoading}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {validationErrors.newPassword && <p className={styles.error}>{validationErrors.newPassword}</p>}
        <PasswordStrengthMeter password={formData.newPassword} />
      </div>

      <div className={styles.field}>
        <label htmlFor="confirmPassword" className={styles.label}>
          Confirm Password
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={`${styles.input} ${validationErrors.confirmPassword ? styles.inputError : ''}`}
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={isLoading}
        />
        {validationErrors.confirmPassword && <p className={styles.error}>{validationErrors.confirmPassword}</p>}
      </div>

      {error && <div className={styles.apiError}>{error}</div>}

      <button type="submit" className={styles.submit} disabled={isLoading}>
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Resetting...
          </>
        ) : (
          'Reset password'
        )}
      </button>
    </form>
  );
};
