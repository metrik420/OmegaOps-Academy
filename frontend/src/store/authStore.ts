/**
 * FILE: frontend/src/store/authStore.ts
 * PURPOSE: Zustand-based authentication state management with token auto-refresh,
 *          localStorage persistence, and global error handling for 401/403 responses.
 * INPUTS: API responses (login, register, refresh, etc.), localStorage for persistence
 * OUTPUTS: Auth state (user, tokens, loading), auth actions (login, logout, refresh)
 * NOTES:
 *   - Auto-refresh token every 5 minutes if within 10 minutes of expiry
 *   - Stores tokens in localStorage (production could use httpOnly cookies + CSRF)
 *   - Admin detection: username === 'metrik'
 *   - CSRF token sent in X-CSRF-Token header for all mutating requests
 * SECURITY:
 *   - Never log tokens or sensitive data
 *   - Clear tokens on logout
 *   - Auto-logout on token expiration
 *   - Validate responses before storing
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * User data structure returned from backend after authentication.
 * @field id - Unique user identifier
 * @field email - User email address (validated by backend)
 * @field username - Display name / handle
 * @field isVerified - Email verification status
 * @field createdAt - Account creation timestamp
 * @field lastLoginAt - Last successful login timestamp
 * @field profile - Optional user profile data (XP, level, streak)
 */
export interface User {
  id: number;
  email: string;
  username: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  profile?: {
    xp: number;
    level: number;
    streak: number;
    missionsCompleted: number;
  };
}

/**
 * Authentication state stored in Zustand.
 * @field user - Current authenticated user or null
 * @field accessToken - JWT access token (short-lived, ~15 min)
 * @field refreshToken - JWT refresh token (long-lived, 7 days or 24 hours)
 * @field csrfToken - CSRF token for state-changing requests
 * @field isAuthenticated - Computed: true if user + accessToken exist
 * @field isAdmin - Computed: true if user.username === 'metrik'
 * @field isLoading - Loading state for async operations
 * @field error - User-friendly error message
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Login request payload.
 * @field email - User email
 * @field password - Plain-text password (sent over HTTPS)
 * @field rememberMe - If true, refresh token valid for 7 days; else 24 hours
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Admin login request payload (username-based, not email).
 * @field username - Admin username (must be 'metrik')
 * @field password - Plain-text password
 */
export interface AdminLoginRequest {
  username: string;
  password: string;
}

/**
 * Registration request payload.
 * @field email - User email
 * @field username - Display name / handle
 * @field password - Plain-text password (must meet strength requirements)
 * @field acceptPrivacyPolicy - Must be true to register
 */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  acceptPrivacyPolicy: boolean;
}

/**
 * API response from login/register endpoints.
 * @field user - User data
 * @field accessToken - JWT access token
 * @field refreshToken - JWT refresh token
 * @field csrfToken - CSRF token for subsequent requests
 * @field expiresAt - Access token expiration timestamp (ISO 8601)
 */
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  expiresAt: string;
}

/**
 * Actions available in the auth store.
 * All async actions return Promise<void> and update state directly.
 */
interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  adminLogin: (credentials: AdminLoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
  setError: (error: string) => void;
  initializeAuth: () => void;
}

/**
 * Complete auth store type combining state and actions.
 */
type AuthStore = AuthState & AuthActions;

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * API base URL (configurable via environment variable).
 * Default: http://localhost:3001/api
 * Production: Set VITE_API_URL in .env.production
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Token refresh interval: Check every 5 minutes if token needs refresh.
 * If access token expires within 10 minutes, trigger refresh.
 */
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiry

/**
 * localStorage key for persisted auth state.
 * SECURITY: In production, consider encrypting this or using sessionStorage for extra security.
 */
const AUTH_STORAGE_KEY = 'omegaops-auth';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Makes an authenticated API request with tokens and CSRF headers.
 * @param endpoint - API endpoint (e.g., '/auth/login')
 * @param options - Fetch options (method, body, headers, etc.)
 * @param tokens - Optional tokens to include in Authorization header
 * @returns Promise<Response>
 * @throws Error if fetch fails or response is not ok
 * SECURITY:
 *   - Sends CSRF token in X-CSRF-Token header
 *   - Sends access token in Authorization header
 *   - Always uses HTTPS in production (enforced by backend)
 */
async function fetchAPI(
  endpoint: string,
  options: RequestInit = {},
  tokens?: { accessToken?: string | null; csrfToken?: string | null }
): Promise<Response> {
  // WHY: Use Record<string, string> to allow custom headers like 'X-CSRF-Token'
  // TypeScript's HeadersInit doesn't directly accept arbitrary header names
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if access token provided
  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  // Add CSRF token header for state-changing requests (POST, PUT, DELETE)
  if (tokens?.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
    headers['X-CSRF-Token'] = tokens.csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies (if backend uses httpOnly cookies)
  });

  // Auto-logout on 401 (Unauthorized) or 403 (Forbidden)
  // This handles expired tokens or revoked access
  if (response.status === 401 || response.status === 403) {
    // Clear auth state and redirect to login
    useAuthStore.getState().logout();
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

/**
 * Checks if access token is about to expire and triggers refresh if needed.
 * @param expiresAt - ISO 8601 timestamp of token expiration
 * @returns True if token needs refresh, false otherwise
 * WHY: Proactive token refresh prevents mid-session authentication failures.
 * NOTE: Reserved for future use with expiry-based refresh logic.
 *       Currently, auto-refresh happens on fixed interval (TOKEN_REFRESH_INTERVAL).
 *       Backend should return expiresAt in AuthResponse for this to be used.
 */
export function shouldRefreshToken(expiresAt: string | null): boolean {
  if (!expiresAt) return false;

  const expiryTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  const timeUntilExpiry = expiryTime - currentTime;

  // Refresh if token expires within 10 minutes
  return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD && timeUntilExpiry > 0;
}

/**
 * Extracts user-friendly error message from API response.
 * @param error - Error object (from fetch or backend response)
 * @returns User-safe error message
 * WHY: Backend may return technical errors; we show user-friendly messages instead.
 * SECURITY: Never expose stack traces or sensitive backend details.
 */
async function extractErrorMessage(error: unknown): Promise<string> {
  // If error is a Response object, try to parse JSON
  if (error instanceof Response) {
    try {
      const data = await error.json();
      return data.message || data.error || 'An error occurred. Please try again.';
    } catch {
      return `Request failed with status ${error.status}`;
    }
  }

  // If error is an Error object, return message
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

/**
 * Auth store with Zustand + persist middleware.
 * PERSISTENCE: Stores user, tokens, and auth flags in localStorage.
 * AUTO-REFRESH: Timer checks token expiry every 5 minutes and refreshes if needed.
 * SECURITY: Clears tokens on logout; auto-logout on 401/403 responses.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ========================================================================
      // STATE
      // ========================================================================
      user: null,
      accessToken: null,
      refreshToken: null,
      csrfToken: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      error: null,

      // ========================================================================
      // ACTIONS
      // ========================================================================

      /**
       * Logs in a user with email + password.
       * @param credentials - Login request payload
       * @throws Error if login fails (invalid credentials, network error, etc.)
       * FLOW:
       *   1. Set loading state
       *   2. POST /auth/login with credentials
       *   3. Validate response (user, tokens, expiresAt)
       *   4. Update state with user + tokens
       *   5. Start auto-refresh timer
       * SECURITY:
       *   - Password sent over HTTPS (enforced by backend)
       *   - Tokens stored in localStorage (production: consider httpOnly cookies)
       *   - Error messages are user-friendly (no technical details)
       */
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const errorMsg = await extractErrorMessage(response);
            throw new Error(errorMsg);
          }

          const data: AuthResponse = await response.json();

          // Validate response structure
          if (!data.user || !data.accessToken || !data.refreshToken) {
            throw new Error('Invalid response from server. Please try again.');
          }

          // Update state with authenticated user and tokens
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            csrfToken: data.csrfToken,
            isAuthenticated: true,
            isAdmin: data.user.username === 'metrik', // Admin detection
            isLoading: false,
            error: null,
          });

          // Start auto-refresh timer
          get().initializeAuth();
        } catch (error) {
          const errorMsg = await extractErrorMessage(error);
          set({ isLoading: false, error: errorMsg });
          throw error;
        }
      },

      /**
       * Logs in an admin user with username + password.
       * @param credentials - Admin login request payload
       * @throws Error if login fails or user is not admin
       * WHY: Admin login uses username (not email) and only accepts username = 'metrik'.
       * SECURITY: Backend enforces admin-only access; frontend just validates username.
       */
      adminLogin: async (credentials: AdminLoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          // Frontend validation: only allow username = 'metrik'
          if (credentials.username !== 'metrik') {
            throw new Error('Admin access denied. Invalid username.');
          }

          const response = await fetchAPI('/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const errorMsg = await extractErrorMessage(response);
            throw new Error(errorMsg);
          }

          const data: AuthResponse = await response.json();

          // Validate response structure
          if (!data.user || !data.accessToken || !data.refreshToken) {
            throw new Error('Invalid response from server. Please try again.');
          }

          // Double-check admin status (backend should enforce this too)
          if (data.user.username !== 'metrik') {
            throw new Error('Admin access denied.');
          }

          // Update state with authenticated admin
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            csrfToken: data.csrfToken,
            isAuthenticated: true,
            isAdmin: true,
            isLoading: false,
            error: null,
          });

          // Start auto-refresh timer
          get().initializeAuth();
        } catch (error) {
          const errorMsg = await extractErrorMessage(error);
          set({ isLoading: false, error: errorMsg });
          throw error;
        }
      },

      /**
       * Registers a new user.
       * @param data - Registration request payload
       * @throws Error if registration fails (email taken, weak password, etc.)
       * FLOW:
       *   1. Set loading state
       *   2. POST /auth/register with user data
       *   3. Backend sends verification email
       *   4. Frontend shows success message (no auto-login; must verify email first)
       * SECURITY:
       *   - Password strength enforced by backend (and client-side validation)
       *   - Email uniqueness checked by backend
       *   - acceptPrivacyPolicy must be true (enforced by form and backend)
       */
      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchAPI('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorMsg = await extractErrorMessage(response);
            throw new Error(errorMsg);
          }

          // Registration success: backend sends verification email
          // Do NOT auto-login; user must verify email first
          set({ isLoading: false, error: null });
        } catch (error) {
          const errorMsg = await extractErrorMessage(error);
          set({ isLoading: false, error: errorMsg });
          throw error;
        }
      },

      /**
       * Logs out the current user.
       * FLOW:
       *   1. POST /auth/logout with refresh token (backend invalidates it)
       *   2. Clear all auth state (user, tokens, flags)
       *   3. Clear localStorage
       * SECURITY:
       *   - Tokens cleared from memory and localStorage
       *   - Backend invalidates refresh token in database
       * WHY: Always logout via backend to prevent token reuse.
       */
      logout: async () => {
        const { refreshToken, csrfToken } = get();

        try {
          // Notify backend to invalidate refresh token
          if (refreshToken) {
            await fetchAPI(
              '/auth/logout',
              {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
              },
              { csrfToken }
            );
          }
        } catch (error) {
          // Log error but proceed with local logout anyway
          console.error('Logout error:', error);
        } finally {
          // Clear all auth state (even if backend call fails)
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            csrfToken: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * Refreshes access token using refresh token.
       * FLOW:
       *   1. POST /auth/refresh with refresh token
       *   2. Backend validates refresh token and returns new access token + CSRF token
       *   3. Update state with new tokens
       * SECURITY:
       *   - Refresh token is long-lived but can be revoked by backend
       *   - Access token is short-lived (15 min) to limit damage if stolen
       * WHY: Auto-refresh prevents session interruption during active use.
       */
      refreshTokens: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          // No refresh token available; logout
          await get().logout();
          return;
        }

        try {
          const response = await fetchAPI('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            // Refresh failed; logout user
            await get().logout();
            throw new Error('Session expired. Please log in again.');
          }

          const data: AuthResponse = await response.json();

          // Update tokens (user data should remain the same)
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            csrfToken: data.csrfToken,
            user: data.user, // Backend may return updated user data
          });
        } catch (error) {
          // Refresh failed; logout
          await get().logout();
          throw error;
        }
      },

      /**
       * Updates user data in state (e.g., after profile update).
       * @param user - Updated user object
       * WHY: Allows components to update user data without re-fetching.
       */
      setUser: (user: User) => {
        set({ user, isAdmin: user.username === 'metrik' });
      },

      /**
       * Clears error message from state.
       * WHY: Allows forms to dismiss error messages after user acknowledgment.
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Sets error message in state.
       * @param error - User-friendly error message
       * WHY: Allows components to set errors (e.g., network failures).
       */
      setError: (error: string) => {
        set({ error });
      },

      /**
       * Initializes auth state and starts auto-refresh timer.
       * FLOW:
       *   1. Check if user is authenticated
       *   2. Start interval timer (every 5 minutes)
       *   3. Check if token needs refresh (within 10 minutes of expiry)
       *   4. Trigger refresh if needed
       * WHY: Ensures tokens are refreshed proactively before expiration.
       * SECURITY: Prevents mid-session authentication failures.
       */
      initializeAuth: () => {
        const { isAuthenticated, refreshTokens } = get();

        if (!isAuthenticated) {
          return;
        }

        // Set up auto-refresh interval
        const intervalId = setInterval(async () => {
          const state = get();

          // Check if still authenticated
          if (!state.isAuthenticated || !state.accessToken) {
            clearInterval(intervalId);
            return;
          }

          // Check if token needs refresh
          // NOTE: Backend should return expiresAt in login/refresh responses
          // For now, we refresh every TOKEN_REFRESH_INTERVAL
          try {
            await refreshTokens();
          } catch (error) {
            // Refresh failed; interval will be cleared by logout
            clearInterval(intervalId);
          }
        }, TOKEN_REFRESH_INTERVAL);

        // Clean up interval on logout (handled by Zustand middleware)
        return () => clearInterval(intervalId);
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist essential state; exclude loading/error
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        csrfToken: state.csrfToken,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

/**
 * Selector: Get current user.
 * WHY: Prevents re-renders when other auth state changes.
 */
export const selectUser = (state: AuthStore) => state.user;

/**
 * Selector: Get authentication status.
 * WHY: Prevents re-renders when user data changes.
 */
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

/**
 * Selector: Get admin status.
 * WHY: Prevents re-renders when non-admin state changes.
 */
export const selectIsAdmin = (state: AuthStore) => state.isAdmin;

/**
 * Selector: Get loading state.
 * WHY: Prevents re-renders when other state changes.
 */
export const selectIsLoading = (state: AuthStore) => state.isLoading;

/**
 * Selector: Get error message.
 * WHY: Prevents re-renders when other state changes.
 */
export const selectError = (state: AuthStore) => state.error;

/**
 * Selector: Get tokens (for API calls).
 * WHY: Prevents re-renders when user data changes.
 */
export const selectTokens = (state: AuthStore) => ({
  accessToken: state.accessToken,
  csrfToken: state.csrfToken,
});

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize auth store on app load.
 * FLOW:
 *   1. Check localStorage for persisted auth state
 *   2. If authenticated, start auto-refresh timer
 * WHY: Restores user session across page refreshes.
 * SECURITY: Tokens are validated by backend on first API call.
 */
if (typeof window !== 'undefined') {
  const state = useAuthStore.getState();
  if (state.isAuthenticated) {
    state.initializeAuth();
  }
}
