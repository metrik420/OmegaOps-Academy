/**
 * FILE: frontend/src/pages/auth/AdminLoginPage.tsx
 * PURPOSE: Admin login page (/admin/login) - username-based auth.
 * FLOW: Admin logs in → redirect to /admin
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminLogin } from '../../contexts/AuthContext';
import { z } from 'zod';
import styles from './AuthPage.module.css';

const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { execute: adminLogin, isLoading, error } = useAdminLogin();

  const [formData, setFormData] = useState<AdminLoginFormData>({
    username: '',
    password: '',
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof AdminLoginFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setValidationErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    try {
      adminLoginSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Partial<Record<keyof AdminLoginFormData, string>> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as keyof AdminLoginFormData] = error.message;
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
      await adminLogin(formData);
      navigate('/admin', { replace: true });
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Login</h1>
          <p className={styles.warning}>⚠️ Admin access only</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
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
              placeholder="metrik"
              autoComplete="username"
              disabled={isLoading}
            />
            {validationErrors.username && <p className={styles.error}>{validationErrors.username}</p>}
          </div>

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
            {validationErrors.password && <p className={styles.error}>{validationErrors.password}</p>}
          </div>

          {error && <div className={styles.apiError}>{error}</div>}

          <button type="submit" className={styles.submit} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className={styles.spinner}></span>
                Logging in...
              </>
            ) : (
              'Log in as admin'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
