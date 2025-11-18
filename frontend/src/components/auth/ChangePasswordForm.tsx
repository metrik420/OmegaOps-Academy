/**
 * FILE: frontend/src/components/auth/ChangePasswordForm.tsx
 * PURPOSE: Change password form for authenticated users (in profile page).
 * INPUTS: onSuccess callback
 * OUTPUTS: Current + new password form, updates password
 * SECURITY: Requires current password verification (prevents unauthorized changes)
 */

import React, { useState } from 'react';
import { useChangePassword } from '../../contexts/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { z } from 'zod';
import styles from './ChangePasswordForm.module.css';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8).regex(PASSWORD_REGEX, 'Password does not meet requirements'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data: { newPassword: string; confirmPassword: string }) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSuccess }) => {
  const { execute: changePassword, isLoading, error, isSuccess, reset } = useChangePassword();

  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ChangePasswordFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: ChangePasswordFormData) => ({ ...prev, [name]: value }));
    setValidationErrors((prev: Partial<Record<keyof ChangePasswordFormData, string>>) => ({ ...prev, [name]: undefined }));
    if (isSuccess) reset();
  };

  const validateForm = (): boolean => {
    try {
      changePasswordSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof ChangePasswordFormData, string>> = {};
        err.issues.forEach((issue: z.ZodIssue) => {
          if (issue.path[0]) {
            errors[issue.path[0] as keyof ChangePasswordFormData] = issue.message;
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
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      // Clear form on success
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {isSuccess && (
        <div className={styles.success}>
          Password changed successfully!
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="currentPassword" className={styles.label}>
          Current Password
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          id="currentPassword"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          className={`${styles.input} ${validationErrors.currentPassword ? styles.inputError : ''}`}
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
        />
        {validationErrors.currentPassword && <p className={styles.error}>{validationErrors.currentPassword}</p>}
      </div>

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
          Confirm New Password
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
            Changing...
          </>
        ) : (
          'Change password'
        )}
      </button>
    </form>
  );
};
