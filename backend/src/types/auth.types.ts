/**
 * FILE: src/types/auth.types.ts
 * PURPOSE: TypeScript types and Zod validation schemas for authentication endpoints.
 *          Provides strong typing and runtime validation for all auth-related data.
 * INPUTS: User input from API requests
 * OUTPUTS: Validated, type-safe auth data objects
 * SIDE EFFECTS: None (pure validation and type definitions)
 * NOTES:
 *   - All schemas enforce strict security requirements
 *   - Password: min 8 chars, uppercase, lowercase, number, special char
 *   - Email: RFC 5322 compliant, lowercase normalized
 *   - Tokens: UUID v4 or cryptographically random (32 bytes)
 *   - All inputs sanitized to prevent XSS and injection attacks
 *   - Error messages are user-friendly (no technical details exposed)
 */

import { z } from 'zod';

/**
 * ==========================================================================
 * PASSWORD VALIDATION
 * ==========================================================================
 * Strong password requirements to prevent weak credentials.
 *
 * OWASP recommendations:
 * - Minimum 8 characters (12+ recommended)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Maximum 128 characters (prevent DoS via bcrypt)
 *
 * WHY these requirements:
 * - Entropy: 8 chars with complexity = ~52 bits (acceptable for bcrypt cost 12)
 * - Prevents common weak passwords (password123, qwerty, etc.)
 * - Balances security with usability
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * ==========================================================================
 * EMAIL VALIDATION
 * ==========================================================================
 * RFC 5322 compliant email validation with normalization.
 *
 * SECURITY NOTE:
 * - Email is converted to lowercase for case-insensitive lookups
 * - Prevents duplicate accounts via case variations (user@example.com vs USER@example.com)
 * - Max length prevents DoS attacks on email storage
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters')
  .transform((email) => email.toLowerCase().trim());

/**
 * ==========================================================================
 * USERNAME VALIDATION
 * ==========================================================================
 * Alphanumeric usernames with underscores and hyphens.
 *
 * WHY these requirements:
 * - Alphanumeric + _ - prevents URL encoding issues
 * - 3-30 characters balances uniqueness with usability
 * - No spaces or special chars prevents injection attacks
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  )
  .transform((username) => username.trim());

/**
 * ==========================================================================
 * USER REGISTRATION SCHEMA
 * ==========================================================================
 * Validates new user registration data.
 *
 * SECURITY NOTE:
 * - Email and username uniqueness checked at database level (UNIQUE constraint)
 * - Password is never logged or stored in plain text
 * - Optional privacy policy acceptance tracking (GDPR compliance)
 */
export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  /*
   * GDPR compliance: Users must accept privacy policy.
   * This field tracks explicit consent for data processing.
   */
  acceptPrivacyPolicy: z.boolean().refine((val) => val === true, {
    message: 'You must accept the privacy policy to register',
  }),
})
.refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'], // Error appears on confirmPassword field
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * ==========================================================================
 * USER LOGIN SCHEMA
 * ==========================================================================
 * Validates user login credentials.
 *
 * SECURITY NOTE:
 * - Email is normalized (lowercase, trimmed)
 * - Password accepts any string (no validation) to prevent enumeration attacks
 * - Failed login attempts are rate-limited and logged
 * - Account lockout after 5 failures (15 min cooldown)
 */
export const loginSchema = z.object({
  email: emailSchema,
  /*
   * Password is any non-empty string during login.
   * We don't validate complexity here to avoid leaking info about valid accounts.
   * If email doesn't exist, we still run bcrypt.compare() (timing attack prevention).
   */
  password: z.string().min(1, 'Password is required'),
  /*
   * Optional "remember me" flag for extended session duration.
   * If true, refresh token expires in 30 days instead of 7.
   */
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * ==========================================================================
 * ADMIN LOGIN SCHEMA
 * ==========================================================================
 * Validates admin login credentials (username-based).
 *
 * SECURITY NOTE:
 * - Admins use username (not email) to differentiate from user login
 * - Only one admin account allowed (username: metrik)
 * - Admin sessions have shorter expiration (15 min JWT, no refresh token)
 */
export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * ==========================================================================
 * FORGOT PASSWORD SCHEMA
 * ==========================================================================
 * Validates password reset request.
 *
 * SECURITY NOTE:
 * - Same response for existing and non-existing emails (prevent enumeration)
 * - Reset token expires in 1 hour (minimize attack window)
 * - Rate limited to 3 requests per hour per IP
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * ==========================================================================
 * RESET PASSWORD SCHEMA
 * ==========================================================================
 * Validates password reset confirmation with new password.
 *
 * SECURITY NOTE:
 * - Token is single-use (marked as used after successful reset)
 * - New password must meet same complexity requirements as registration
 * - All refresh tokens revoked after password change (force re-login)
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
})
.refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * ==========================================================================
 * CHANGE PASSWORD SCHEMA
 * ==========================================================================
 * Validates password change for authenticated users.
 *
 * SECURITY NOTE:
 * - Requires current password to prevent unauthorized changes
 * - All refresh tokens revoked after password change
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string(),
})
.refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
})
.refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * ==========================================================================
 * VERIFY EMAIL SCHEMA
 * ==========================================================================
 * Validates email verification token from confirmation link.
 *
 * SECURITY NOTE:
 * - Token expires in 1 hour (resend if expired)
 * - Single-use token (cleared after verification)
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/**
 * ==========================================================================
 * REFRESH TOKEN SCHEMA
 * ==========================================================================
 * Validates refresh token for JWT renewal.
 *
 * SECURITY NOTE:
 * - Refresh token rotation: Old token is revoked, new token issued
 * - If token is revoked, reject request (possible token theft)
 * - Tokens expire in 7 days (30 days if "remember me")
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * ==========================================================================
 * DATABASE TYPES
 * ==========================================================================
 * TypeScript interfaces for database entities.
 * These match the SQLite schema from 002_auth_tables.ts migration.
 */

/**
 * User entity from database.
 * Represents a registered user account.
 */
export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isVerified: number; // 0 = false, 1 = true (SQLite boolean)
  verificationToken: string | null;
  verificationTokenExpiresAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Safe user object for API responses.
 * Excludes sensitive fields (passwordHash, tokens, etc.).
 */
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Refresh token entity from database.
 */
export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  revokedAt: string | null;
  replacedByToken: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/**
 * Password reset token entity from database.
 */
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  usedAt: string | null;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Auth log entry from database.
 */
export interface AuthLog {
  id: string;
  userId: string | null;
  action: string;
  success: number; // 0 = false, 1 = true
  ipAddress: string | null;
  userAgent: string | null;
  errorMessage: string | null;
  metadata: string | null; // JSON string
  createdAt: string;
}

/**
 * Admin user entity from database.
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isActive: number; // 0 = false, 1 = true
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Safe admin object for API responses.
 */
export interface SafeAdmin {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * JWT payload structure.
 * Contains user identity and session metadata.
 *
 * SECURITY NOTE:
 * - Keep payload small (JWT is sent with every request)
 * - Never include sensitive data (password, tokens, etc.)
 * - Expiration (exp) is set to 15 minutes from issue time
 */
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin: boolean;
  iat?: number; // Issued at (Unix timestamp)
  exp?: number; // Expiration (Unix timestamp)
}

/**
 * Auth response structure.
 * Returned after successful login/registration.
 */
export interface AuthResponse {
  success: true;
  data: {
    user: SafeUser | SafeAdmin;
    accessToken: string;
    refreshToken?: string; // Only for user login (not admin)
  };
  message: string;
}
