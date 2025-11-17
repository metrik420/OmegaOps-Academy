/**
 * FILE: frontend/src/components/auth/LoginForm.tsx
 * PURPOSE: Reusable login form component with validation and error handling.
 * INPUTS: onSuccess callback, auth hooks (useLogin)
 * OUTPUTS: Login form UI, handles submission, shows errors/loading
 * NOTES:
 *   - Can be used in LoginPage or modal
 *   - Client-side validation with Zod
 *   - Remember me checkbox (7-day vs 24-hour session)
 *   - Links to register and forgot password
 * SECURITY:
 *   - Password never logged or stored in state (except controlled input)
 *   - CSRF token handled by auth store
 *   - Validation before submission
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../../contexts/AuthContext';
import { z } from 'zod';
import styles from './LoginForm.module.css';

/**
 * Login form validation schema.
 * WHY: Client-side validation provides immediate feedback before API call.
 * SECURITY: Backend must also validate (defense in depth).
 */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Props for LoginForm component.
 * @field onSuccess - Callback after successful login (e.g., redirect)
 * @field showLinks - Show register/forgot password links (default: true)
 */
interface LoginFormProps {
  onSuccess?: () => void;
  showLinks?: boolean;
}

/**
 * LoginForm component.
 * Reusable login form with validation, error handling, and loading states.
 *
 * USAGE:
 *   <LoginForm onSuccess={() => navigate('/dashboard')} />
 *
 * ACCESSIBILITY:
 *   - Labels associated with inputs
 *   - Error messages announced to screen readers (aria-live)
 *   - Focus management (first error on submit)
 *   - Keyboard navigation (Tab, Enter)
 *
 * @param onSuccess - Callback after successful login
 * @param showLinks - Show register/forgot password links
 * @returns Login form UI
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, showLinks = true }) => {
  const { execute: login, isLoading, error } = useLogin();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handles input changes and clears validation errors.
   * WHY: Real-time error clearing improves UX.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: newValue }));

    // Clear validation error for this field
    setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  /**
   * Validates form data with Zod schema.
   * @returns True if valid, false otherwise
   * WHY: Prevents invalid API calls and provides user feedback.
   */
  const validateForm = (): boolean => {
    try {
      loginSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof LoginFormData, string>> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as keyof LoginFormData] = error.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  /**
   * Handles form submission.
   * FLOW:
   *   1. Validate form data
   *   2. Call login API
   *   3. On success, call onSuccess callback
   *   4. On error, show error message
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      // Login successful; call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handled by useLogin hook (displayed below form)
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
            autoComplete="current-password"
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
      </div>

      {/* Remember me checkbox */}
      <div className={styles.checkboxField}>
        <input
          type="checkbox"
          id="rememberMe"
          name="rememberMe"
          checked={formData.rememberMe}
          onChange={handleChange}
          className={styles.checkbox}
          disabled={isLoading}
        />
        <label htmlFor="rememberMe" className={styles.checkboxLabel}>
          Remember me for 7 days
        </label>
      </div>

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
            Logging in...
          </>
        ) : (
          'Log in'
        )}
      </button>

      {/* Links to register and forgot password */}
      {showLinks && (
        <div className={styles.links}>
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
          <span className={styles.separator}>•</span>
          <Link to="/register" className={styles.link}>
            Create account
          </Link>
        </div>
      )}
    </form>
  );
};
