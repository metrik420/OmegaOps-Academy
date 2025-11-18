/**
 * FILE: frontend/src/components/auth/RegisterForm.tsx
 * PURPOSE: Reusable registration form with password strength validation.
 * INPUTS: onSuccess callback, auth hooks (useRegister)
 * OUTPUTS: Registration form UI, handles submission, shows errors/loading
 * NOTES:
 *   - Password strength meter (real-time)
 *   - Password confirmation matching
 *   - Terms and privacy policy checkboxes (required)
 *   - Client-side validation with Zod
 * SECURITY:
 *   - Password never logged
 *   - acceptPrivacyPolicy must be true
 *   - Backend enforces all validations
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../../contexts/AuthContext';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { z } from 'zod';
import styles from './RegisterForm.module.css';

/**
 * Password validation regex (matches backend requirements).
 * WHY: Consistent validation between frontend and backend prevents confusion.
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/**
 * Registration form validation schema.
 * WHY: Client-side validation provides immediate feedback before API call.
 */
const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(PASSWORD_REGEX, 'Password does not meet requirements'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.boolean().refine((val: boolean) => val === true, {
      message: 'You must accept the Terms of Service',
    }),
    acceptPrivacyPolicy: z.boolean().refine((val: boolean) => val === true, {
      message: 'You must accept the Privacy Policy',
    }),
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Props for RegisterForm component.
 * @field onSuccess - Callback after successful registration
 * @field showLinks - Show login link (default: true)
 */
interface RegisterFormProps {
  onSuccess?: () => void;
  showLinks?: boolean;
}

/**
 * RegisterForm component.
 * Reusable registration form with validation, password strength, and error handling.
 *
 * USAGE:
 *   <RegisterForm onSuccess={() => navigate('/login', { state: { message: 'Check your email' } })} />
 *
 * ACCESSIBILITY:
 *   - Labels associated with inputs
 *   - Error messages announced to screen readers
 *   - Focus management
 *   - Keyboard navigation
 *
 * @param onSuccess - Callback after successful registration
 * @param showLinks - Show login link
 * @returns Registration form UI
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, showLinks = true }) => {
  const { execute: register, isLoading, error } = useRegister();

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacyPolicy: false,
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * Handles input changes and clears validation errors.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev: RegisterFormData) => ({ ...prev, [name]: newValue }));

    // Clear validation error for this field
    setValidationErrors((prev: Partial<Record<keyof RegisterFormData, string>>) => ({ ...prev, [name]: undefined }));
  };

  /**
   * Validates form data with Zod schema.
   */
  const validateForm = (): boolean => {
    try {
      registerSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof RegisterFormData, string>> = {};
        err.issues.forEach((issue: z.ZodIssue) => {
          if (issue.path[0]) {
            errors[issue.path[0] as keyof RegisterFormData] = issue.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  /**
   * Handles form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        acceptPrivacyPolicy: formData.acceptPrivacyPolicy,
      });

      // Registration successful; call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handled by useRegister hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* Email field */}
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

      {/* Username field */}
      <div className={styles.field}>
        <label htmlFor="username" className={styles.label}>
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={`${styles.input} ${validationErrors.username ? styles.inputError : ''}`}
          placeholder="username123"
          autoComplete="username"
          disabled={isLoading}
          aria-invalid={!!validationErrors.username}
          aria-describedby={validationErrors.username ? 'username-error' : undefined}
        />
        {validationErrors.username && (
          <p id="username-error" className={styles.error} role="alert">
            {validationErrors.username}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>
          Password
        </label>
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`${styles.input} ${validationErrors.password ? styles.inputError : ''}`}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? 'password-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={styles.togglePassword}
            disabled={isLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {validationErrors.password && (
          <p id="password-error" className={styles.error} role="alert">
            {validationErrors.password}
          </p>
        )}
        <PasswordStrengthMeter password={formData.password} />
      </div>

      {/* Confirm password field */}
      <div className={styles.field}>
        <label htmlFor="confirmPassword" className={styles.label}>
          Confirm Password
        </label>
        <div className={styles.passwordWrapper}>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`${styles.input} ${validationErrors.confirmPassword ? styles.inputError : ''}`}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
            aria-invalid={!!validationErrors.confirmPassword}
            aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : undefined}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className={styles.togglePassword}
            disabled={isLoading}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        {validationErrors.confirmPassword && (
          <p id="confirm-password-error" className={styles.error} role="alert">
            {validationErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Terms checkbox */}
      <div className={styles.checkboxField}>
        <input
          type="checkbox"
          id="acceptTerms"
          name="acceptTerms"
          checked={formData.acceptTerms}
          onChange={handleChange}
          className={styles.checkbox}
          disabled={isLoading}
          aria-invalid={!!validationErrors.acceptTerms}
        />
        <label htmlFor="acceptTerms" className={styles.checkboxLabel}>
          I accept the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.checkboxLink}>
            Terms of Service
          </a>
        </label>
      </div>
      {validationErrors.acceptTerms && (
        <p className={styles.error} role="alert">
          {validationErrors.acceptTerms}
        </p>
      )}

      {/* Privacy policy checkbox */}
      <div className={styles.checkboxField}>
        <input
          type="checkbox"
          id="acceptPrivacyPolicy"
          name="acceptPrivacyPolicy"
          checked={formData.acceptPrivacyPolicy}
          onChange={handleChange}
          className={styles.checkbox}
          disabled={isLoading}
          aria-invalid={!!validationErrors.acceptPrivacyPolicy}
        />
        <label htmlFor="acceptPrivacyPolicy" className={styles.checkboxLabel}>
          I accept the{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.checkboxLink}>
            Privacy Policy
          </a>
        </label>
      </div>
      {validationErrors.acceptPrivacyPolicy && (
        <p className={styles.error} role="alert">
          {validationErrors.acceptPrivacyPolicy}
        </p>
      )}

      {/* API error message */}
      {error && (
        <div className={styles.apiError} role="alert">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button type="submit" className={styles.submit} disabled={isLoading}>
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Creating account...
          </>
        ) : (
          'Create account'
        )}
      </button>

      {/* Link to login */}
      {showLinks && (
        <div className={styles.links}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Log in
          </Link>
        </div>
      )}
    </form>
  );
};
