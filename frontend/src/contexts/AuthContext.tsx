/**
 * FILE: frontend/src/contexts/AuthContext.tsx
 * PURPOSE: React context + custom hooks for authentication operations.
 *          Provides high-level hooks for auth actions (login, register, password reset, etc.).
 * INPUTS: Auth store (Zustand), API responses
 * OUTPUTS: Auth context, custom hooks (useAuth, useLogin, useRegister, etc.)
 * NOTES:
 *   - Hooks wrap auth store actions with React-friendly API
 *   - Error handling and loading states managed per operation
 *   - All hooks return loading state, error, and success flags
 * SECURITY:
 *   - Passwords never logged or stored in state
 *   - Tokens managed by auth store (not exposed in context)
 *   - User-friendly error messages (no technical details)
 */

import React, { createContext, useContext, useCallback, useState } from 'react';
import { useAuthStore, User, LoginRequest, AdminLoginRequest, RegisterRequest } from '../store/authStore';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Auth context value (provides user + auth status).
 * WHY: Minimal context value to prevent unnecessary re-renders.
 * Components use specific hooks for operations (useLogin, useRegister, etc.).
 */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook return type for async operations (login, register, etc.).
 * @field execute - Function to trigger the operation
 * @field isLoading - Loading state during operation
 * @field error - User-friendly error message
 * @field isSuccess - True if operation completed successfully
 * @field reset - Reset state (clear error, success flag)
 */
interface AsyncHookReturn<T extends (...args: any[]) => Promise<void>> {
  execute: T;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  reset: () => void;
}

/**
 * Forgot password request payload.
 * @field email - User email to send reset link to
 */
interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset password request payload.
 * @field token - Password reset token from email link
 * @field newPassword - New password to set
 */
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Change password request payload.
 * @field currentPassword - Current password (for verification)
 * @field newPassword - New password to set
 */
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// CONTEXT
// ============================================================================

/**
 * Auth context (provides minimal auth state).
 * WHY: Separates state from operations to prevent unnecessary re-renders.
 */
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth provider component.
 * Wraps app to provide auth context to all components.
 * @param children - Child components
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// BASE HOOKS
// ============================================================================

/**
 * Hook: Access auth state.
 * @returns Auth context value (user, isAuthenticated, isAdmin, etc.)
 * @throws Error if used outside AuthProvider
 * WHY: Provides type-safe access to auth context.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

/**
 * Generic hook factory for async operations.
 * WHY: DRY pattern for all async auth operations (login, register, etc.).
 * @param operation - Async function to execute
 * @returns Hook with execute function, loading state, error, success flag
 */
function useAsyncOperation<T extends (...args: any[]) => Promise<void>>(
  operation: T
): AsyncHookReturn<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);

      try {
        await operation(...args);
        setIsSuccess(true);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    },
    [operation]
  ) as T;

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
  }, []);

  return { execute, isLoading, error, isSuccess, reset };
}

// ============================================================================
// AUTH OPERATION HOOKS
// ============================================================================

/**
 * Hook: Login with email + password.
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useLogin();
 *   await execute({ email, password, rememberMe });
 * WHY: Wraps auth store login action with React-friendly API.
 */
export const useLogin = (): AsyncHookReturn<(credentials: LoginRequest) => Promise<void>> => {
  const login = useAuthStore((state) => state.login);
  return useAsyncOperation(login);
};

/**
 * Hook: Admin login with username + password.
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useAdminLogin();
 *   await execute({ username, password });
 * WHY: Separate hook for admin login (username-based, not email).
 */
export const useAdminLogin = (): AsyncHookReturn<(credentials: AdminLoginRequest) => Promise<void>> => {
  const adminLogin = useAuthStore((state) => state.adminLogin);
  return useAsyncOperation(adminLogin);
};

/**
 * Hook: Register new user.
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useRegister();
 *   await execute({ email, username, password, acceptPrivacyPolicy });
 * WHY: Wraps auth store register action with React-friendly API.
 */
export const useRegister = (): AsyncHookReturn<(data: RegisterRequest) => Promise<void>> => {
  const register = useAuthStore((state) => state.register);
  return useAsyncOperation(register);
};

/**
 * Hook: Logout current user.
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading } = useLogout();
 *   await execute();
 * WHY: Wraps auth store logout action with React-friendly API.
 */
export const useLogout = (): AsyncHookReturn<() => Promise<void>> => {
  const logout = useAuthStore((state) => state.logout);
  return useAsyncOperation(logout);
};

// ============================================================================
// PASSWORD MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook: Request password reset (forgot password).
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useForgotPassword();
 *   await execute({ email });
 * FLOW:
 *   1. POST /auth/forgot-password with email
 *   2. Backend sends password reset email with token
 *   3. Frontend shows success message
 * SECURITY: Backend rate-limits password reset requests to prevent abuse.
 */
export const useForgotPassword = (): AsyncHookReturn<(data: ForgotPasswordRequest) => Promise<void>> => {
  const operation = useCallback(async ({ email }: ForgotPasswordRequest) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to send password reset email.');
    }
  }, []);

  return useAsyncOperation(operation);
};

/**
 * Hook: Reset password with token (from email link).
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useResetPassword();
 *   await execute({ token, newPassword });
 * FLOW:
 *   1. POST /auth/reset-password with token + newPassword
 *   2. Backend validates token and updates password
 *   3. Frontend redirects to login page
 * SECURITY:
 *   - Token is single-use and expires after 1 hour
 *   - Backend enforces password strength requirements
 */
export const useResetPassword = (): AsyncHookReturn<(data: ResetPasswordRequest) => Promise<void>> => {
  const operation = useCallback(async ({ token, newPassword }: ResetPasswordRequest) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to reset password.');
    }
  }, []);

  return useAsyncOperation(operation);
};

/**
 * Hook: Change password for authenticated user.
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useChangePassword();
 *   await execute({ currentPassword, newPassword });
 * FLOW:
 *   1. POST /auth/change-password with currentPassword + newPassword + tokens
 *   2. Backend verifies currentPassword and updates password
 *   3. Frontend shows success message
 * SECURITY:
 *   - Requires current password verification (prevents unauthorized changes)
 *   - Enforces password strength requirements
 *   - Sends CSRF token in header
 */
export const useChangePassword = (): AsyncHookReturn<(data: ChangePasswordRequest) => Promise<void>> => {
  const { accessToken, csrfToken } = useAuthStore((state) => ({
    accessToken: state.accessToken,
    csrfToken: state.csrfToken,
  }));

  const operation = useCallback(
    async ({ currentPassword, newPassword }: ChangePasswordRequest) => {
      if (!accessToken || !csrfToken) {
        throw new Error('You must be logged in to change your password.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to change password.');
      }
    },
    [accessToken, csrfToken]
  );

  return useAsyncOperation(operation);
};

// ============================================================================
// EMAIL VERIFICATION HOOKS
// ============================================================================

/**
 * Hook: Verify email with token (from email link).
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useVerifyEmail();
 *   await execute(token);
 * FLOW:
 *   1. POST /auth/verify-email with token
 *   2. Backend validates token and marks user as verified
 *   3. Frontend redirects to login page
 * SECURITY:
 *   - Token is single-use and expires after 24 hours
 *   - Backend prevents duplicate verification
 */
export const useVerifyEmail = (): AsyncHookReturn<(token: string) => Promise<void>> => {
  const operation = useCallback(async (token: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to verify email.');
    }
  }, []);

  return useAsyncOperation(operation);
};

/**
 * Hook: Resend email verification link.
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useResendVerification();
 *   await execute(email);
 * FLOW:
 *   1. POST /auth/resend-verification with email
 *   2. Backend sends new verification email with token
 *   3. Frontend shows success message
 * SECURITY: Backend rate-limits resend requests (1 per 5 minutes).
 */
export const useResendVerification = (): AsyncHookReturn<(email: string) => Promise<void>> => {
  const operation = useCallback(async (email: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to resend verification email.');
    }
  }, []);

  return useAsyncOperation(operation);
};

// ============================================================================
// GDPR COMPLIANCE HOOKS
// ============================================================================

/**
 * Hook: Export user data (GDPR compliance).
 * @returns execute function, loading state, error, success flag, data
 * USAGE:
 *   const { execute, isLoading, error, data } = useExportData();
 *   await execute();
 *   // data contains user data JSON
 * FLOW:
 *   1. GET /auth/export-data with tokens
 *   2. Backend returns all user data (profile, missions, progress, etc.)
 *   3. Frontend downloads as JSON file
 * SECURITY:
 *   - Requires authentication (access token)
 *   - CSRF token in header
 *   - Data includes all personal information (GDPR compliance)
 */
export const useExportData = () => {
  const { accessToken, csrfToken } = useAuthStore((state) => ({
    accessToken: state.accessToken,
    csrfToken: state.csrfToken,
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = useCallback(async () => {
    if (!accessToken || !csrfToken) {
      throw new Error('You must be logged in to export data.');
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/export-data`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export data.');
      }

      const exportedData = await response.json();
      setData(exportedData);

      // Auto-download as JSON file
      const blob = new Blob([JSON.stringify(exportedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `omegaops-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, csrfToken]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, isLoading, error, data, reset };
};

/**
 * Hook: Delete user account (GDPR compliance).
 * @returns execute function, loading state, error, success flag
 * USAGE:
 *   const { execute, isLoading, error, isSuccess } = useDeleteAccount();
 *   await execute(password);
 * FLOW:
 *   1. POST /auth/delete-account with password (for confirmation)
 *   2. Backend exports data, then deletes user account
 *   3. Frontend logs out and redirects to home page
 * SECURITY:
 *   - Requires password confirmation (prevents accidental deletion)
 *   - Requires CSRF token
 *   - Data is exported before deletion (GDPR compliance)
 *   - Deletion is permanent and cannot be undone
 */
export const useDeleteAccount = (): AsyncHookReturn<(password: string) => Promise<void>> => {
  const { accessToken, csrfToken } = useAuthStore((state) => ({
    accessToken: state.accessToken,
    csrfToken: state.csrfToken,
  }));
  const logout = useAuthStore((state) => state.logout);

  const operation = useCallback(
    async (password: string) => {
      if (!accessToken || !csrfToken) {
        throw new Error('You must be logged in to delete your account.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete account.');
      }

      // Account deleted; logout
      await logout();
    },
    [accessToken, csrfToken, logout]
  );

  return useAsyncOperation(operation);
};
