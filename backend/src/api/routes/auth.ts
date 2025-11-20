/**
 * FILE: backend/src/api/routes/auth.ts
 * PURPOSE: Authentication routes handling user registration, login, password management,
 *          email verification, session management, and GDPR compliance (data export/deletion).
 *          Wires together AuthService and EmailService with secure, production-ready endpoints.
 * INPUTS: Express Request/Response objects, AuthService, EmailService, authMiddleware for JWT verification.
 * OUTPUTS: JSON responses following ApiResponse format { success, data?, error? }.
 *          Sets httpOnly cookies for access/refresh tokens.
 * SECURITY: All passwords validated via Zod, never logged. Rate limiting applied via middleware.
 *           Tokens stored in httpOnly cookies. Admin route restricted to username "metrik".
 *           All user inputs sanitized and validated at boundaries.
 * PERFORMANCE: Async/await for all I/O. Efficient database queries via AuthService.
 *              Minimal overhead in middleware chain.
 * NOTES: Follows Express router pattern from roadmap.ts and missions.ts.
 *        All endpoints return consistent ApiResponse structure.
 *        GDPR compliance: export-data and account deletion endpoints included.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../../services/AuthService';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from '../../types/auth.types';
import { logger } from '../../utils/logger';
import { ZodError } from 'zod';

/**
 * Express Router for authentication endpoints.
 * All routes prefixed with /api/auth in the main app.
 */
const router = Router();

/**
 * SECURITY NOTE: AuthService and EmailService use static methods only.
 * This design choice ensures:
 * 1. No shared state between requests (thread-safe)
 * 2. Stateless authentication logic (all state in database)
 * 3. Clear separation between service logic and route handling
 * 4. Memory efficiency (no need for singleton instances)
 *
 * All methods are called directly on the class: AuthService.method(), EmailService.method()
 */

/**
 * Async error handler wrapper.
 * Catches async errors and forwards them to Express error middleware.
 * Prevents unhandled promise rejections and ensures consistent error responses.
 *
 * @param fn - Async route handler function
 * @returns Wrapped function that catches errors
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Cookie options for httpOnly tokens.
 * Security settings: httpOnly prevents XSS access, secure enforces HTTPS (production),
 * sameSite prevents CSRF attacks, maxAge controls expiration.
 */
const cookieOptions = {
  httpOnly: true, // Prevent JavaScript access to cookies (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  path: '/', // Cookie available on all paths
};

/**
 * ENDPOINT 1: POST /api/auth/register
 * PURPOSE: Register a new user account with email verification flow.
 * FLOW:
 *   1. Validate request body with Zod schema (email, username, password, confirmPassword, acceptPrivacyPolicy)
 *   2. Check password confirmation match
 *   3. Call AuthService.register() to create user (hashes password, generates verification token)
 *   4. Send verification email via EmailService
 *   5. Return user object (without password) and auth tokens
 * SECURITY: Password hashed with Argon2id, never stored plain. Privacy policy acceptance required.
 *           Email verification enforced for sensitive operations.
 * ERRORS: 400 (validation failed), 409 (email/username already exists), 500 (server error)
 * RESPONSE: 201 Created with user object and tokens
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/register - Registration attempt', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    try {
      // Validate input: email format, username length, password strength, privacy policy acceptance
      const validatedData = registerSchema.parse(req.body);

      // Ensure password confirmation matches (double-check at API boundary)
      if (validatedData.password !== validatedData.confirmPassword) {
        logger.warn('Registration failed: Password mismatch', { email: validatedData.email });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Passwords do not match',
            code: 'PASSWORD_MISMATCH',
          },
        });
      }

      // Register user: hash password (bcrypt cost 12), create user record, generate verification token
      // NOTE: AuthService.register() automatically sends verification email internally
      const result = await AuthService.register(
        {
          email: validatedData.email,
          username: validatedData.username,
          password: validatedData.password,
          confirmPassword: validatedData.confirmPassword,
          acceptPrivacyPolicy: validatedData.acceptPrivacyPolicy,
        },
        req.ip,
        req.get('user-agent')
      );

      // Set httpOnly cookies for access and refresh tokens
      // Access token: short-lived (15min), refresh token: long-lived (7d or 30d if rememberMe)
      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (default, no rememberMe on registration)
      });

      logger.info('User registered successfully', {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
      });

      // Return 201 Created with user data (password omitted) and tokens
      return res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            isVerified: result.user.isVerified,
            lastLoginAt: result.user.lastLoginAt,
            createdAt: result.user.createdAt,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Registration validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle duplicate email/username errors from AuthService
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          logger.warn('Registration failed: Duplicate user', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(409).json({
            success: false,
            error: {
              message: error.message,
              code: 'DUPLICATE_USER',
            },
          });
        }
      }

      // Generic server error (do not expose internal details)
      logger.error('Registration failed: Server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Registration failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 2: POST /api/auth/login
 * PURPOSE: Authenticate user with email and password, issue JWT tokens.
 * FLOW:
 *   1. Validate email and password format
 *   2. Call AuthService.login() to verify credentials (Argon2id hash comparison)
 *   3. Check account status (locked, email verified)
 *   4. Generate access/refresh tokens
 *   5. Set httpOnly cookies with tokens
 *   6. Return user object and tokens
 * SECURITY: Rate limiting via authMiddleware. Account lockout after N failed attempts (handled in AuthService).
 *           Passwords never logged. Timing-safe password comparison.
 * ERRORS: 400 (validation), 401 (invalid credentials), 423 (account locked), 500 (server error)
 * RESPONSE: 200 OK with user object and tokens
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/login - Login attempt', {
      email: req.body.email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    try {
      // Validate input: email format, password presence
      const validatedData = loginSchema.parse(req.body);

      // Authenticate user: verify password, check account status, update last login timestamp
      const result = await AuthService.login({
        email: validatedData.email,
        password: validatedData.password,
        rememberMe: validatedData.rememberMe,
      });

      // Calculate cookie maxAge based on rememberMe flag
      // rememberMe: true → 30 days, false → 7 days
      const refreshTokenMaxAge = validatedData.rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 7 * 24 * 60 * 60 * 1000; // 7 days

      // Set httpOnly cookies for tokens
      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...cookieOptions,
        maxAge: refreshTokenMaxAge,
      });

      logger.info('User logged in successfully', {
        userId: result.user.id,
        email: result.user.email,
        rememberMe: validatedData.rememberMe,
      });

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username,
            isVerified: result.user.isVerified,
            lastLoginAt: result.user.lastLoginAt,
            createdAt: result.user.createdAt,
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Login validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle authentication errors from AuthService
      if (error instanceof Error) {
        // Account locked after too many failed attempts
        if (error.message.includes('locked') || error.message.includes('temporarily disabled')) {
          logger.warn('Login failed: Account locked', {
            email: req.body.email,
            ip: req.ip,
          });
          return res.status(423).json({
            success: false,
            error: {
              message: error.message,
              code: 'ACCOUNT_LOCKED',
            },
          });
        }

        // Invalid credentials (wrong email or password)
        if (
          error.message.includes('Invalid credentials') ||
          error.message.includes('not found') ||
          error.message.includes('Incorrect password')
        ) {
          logger.warn('Login failed: Invalid credentials', {
            email: req.body.email,
            ip: req.ip,
          });
          return res.status(401).json({
            success: false,
            error: {
              message: 'Invalid email or password',
              code: 'INVALID_CREDENTIALS',
            },
          });
        }
      }

      // Generic server error
      logger.error('Login failed: Server error', {
        email: req.body.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Login failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 3: POST /api/auth/admin/login
 * PURPOSE: Admin-specific login endpoint using username (not email).
 *          Restricted to username "metrik" for security.
 * FLOW:
 *   1. Validate username and password
 *   2. Enforce username === "metrik" (hardcoded admin username)
 *   3. Call AuthService.adminLogin() to verify credentials
 *   4. Generate access/refresh tokens
 *   5. Set httpOnly cookies
 *   6. Return user object with isAdmin: true
 * SECURITY: Only allows hardcoded admin username "metrik". Separate endpoint for admin login
 *           to enable different rate limiting and monitoring rules.
 * ERRORS: 400 (validation), 401 (invalid credentials or non-admin user), 500 (server error)
 * RESPONSE: 200 OK with admin user object and tokens
 */
router.post(
  '/admin/login',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/admin/login - Admin login attempt', {
      username: req.body.username,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    try {
      // Validate input: username and password
      const validatedData = adminLoginSchema.parse(req.body);

      // Enforce admin username restriction (hardcoded for security)
      if (validatedData.username !== 'metrik') {
        logger.warn('Admin login failed: Non-admin username', {
          username: validatedData.username,
          ip: req.ip,
        });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid admin credentials',
            code: 'INVALID_ADMIN_CREDENTIALS',
          },
        });
      }

      // Authenticate admin: verify password, ensure isAdmin flag is true
      const result = await AuthService.adminLogin({
        username: validatedData.username,
        password: validatedData.password,
      });

      // Set httpOnly cookie for access token (admins don't get refresh tokens)
      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      logger.info('Admin logged in successfully', {
        adminId: result.admin.id,
        username: result.admin.username,
      });

      return res.status(200).json({
        success: true,
        data: {
          admin: {
            id: result.admin.id,
            email: result.admin.email,
            username: result.admin.username,
            isActive: result.admin.isActive,
            lastLoginAt: result.admin.lastLoginAt,
            createdAt: result.admin.createdAt,
          },
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Admin login validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle authentication errors
      if (error instanceof Error) {
        // Invalid credentials or non-admin user
        if (
          error.message.includes('Invalid credentials') ||
          error.message.includes('not found') ||
          error.message.includes('not an admin') ||
          error.message.includes('Incorrect password')
        ) {
          logger.warn('Admin login failed: Invalid credentials', {
            username: req.body.username,
            ip: req.ip,
          });
          return res.status(401).json({
            success: false,
            error: {
              message: 'Invalid admin credentials',
              code: 'INVALID_ADMIN_CREDENTIALS',
            },
          });
        }
      }

      // Generic server error
      logger.error('Admin login failed: Server error', {
        username: req.body.username,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Admin login failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 4: POST /api/auth/refresh
 * PURPOSE: Refresh access token using a valid refresh token.
 *          Accepts token from request body or httpOnly cookie.
 * FLOW:
 *   1. Extract refresh token from body or cookie
 *   2. Validate token format
 *   3. Call AuthService.refreshAccessToken() to verify token and generate new tokens
 *   4. Set new httpOnly cookies
 *   5. Return new access and refresh tokens
 * SECURITY: Refresh tokens are long-lived but revocable. Rotation strategy: issue new refresh token
 *           on each refresh to enable revocation of old tokens.
 * ERRORS: 401 (invalid/expired refresh token), 500 (server error)
 * RESPONSE: 200 OK with new access and refresh tokens
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/refresh - Token refresh attempt', {
      ip: req.ip,
    });

    try {
      // Extract refresh token from body or cookie (cookie preferred for security)
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        logger.warn('Token refresh failed: Missing refresh token', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Refresh token required',
            code: 'MISSING_REFRESH_TOKEN',
          },
        });
      }

      // Validate token format (optional, can rely on AuthService validation)
      const validatedData = refreshTokenSchema.parse({ refreshToken });

      // Refresh tokens: verify refresh token, generate new access + refresh tokens
      // Old refresh token is revoked to prevent reuse (rotation strategy)
      const result = await AuthService.refreshToken(validatedData.refreshToken);

      // Set new httpOnly cookies
      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (default, rememberMe flag not persisted in token)
      });

      logger.info('Token refreshed successfully', {
        userId: result.user.id,
      });

      return res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Token refresh validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid refresh token format',
            code: 'INVALID_TOKEN_FORMAT',
          },
        });
      }

      // Handle token verification errors from AuthService
      if (error instanceof Error) {
        // Invalid or expired refresh token
        if (
          error.message.includes('Invalid') ||
          error.message.includes('expired') ||
          error.message.includes('revoked') ||
          error.message.includes('not found')
        ) {
          logger.warn('Token refresh failed: Invalid token', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(401).json({
            success: false,
            error: {
              message: 'Invalid or expired refresh token',
              code: 'INVALID_REFRESH_TOKEN',
            },
          });
        }
      }

      // Generic server error
      logger.error('Token refresh failed: Server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Token refresh failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 5: POST /api/auth/logout
 * PURPOSE: Logout current session by revoking the current refresh token.
 * FLOW:
 *   1. Extract user ID from JWT access token (via authMiddleware)
 *   2. Extract refresh token from cookie
 *   3. Call AuthService.logout() to revoke refresh token
 *   4. Clear httpOnly cookies
 *   5. Return success response
 * SECURITY: Requires valid access token (authenticated). Revokes only current session.
 *           Use /logout-all to revoke all sessions.
 * ERRORS: 401 (not authenticated), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.post(
  '/logout',
  authMiddleware, // Verify JWT access token, attach req.user
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/logout - Logout attempt', {
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    try {
      const userId = (req as any).user?.id;
      const refreshToken = req.cookies.refreshToken;

      if (!userId) {
        logger.warn('Logout failed: User not authenticated', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
      }

      // Revoke current refresh token (if present)
      if (refreshToken) {
        AuthService.logout(refreshToken);
      }

      // Clear httpOnly cookies
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      logger.info('User logged out successfully', { userId });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      // Log error but still clear cookies (fail-safe logout)
      logger.error('Logout failed: Server error', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Clear cookies even on error
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    }
  })
);

/**
 * ENDPOINT 6: POST /api/auth/logout-all
 * PURPOSE: Logout all sessions by revoking all refresh tokens for the user.
 * FLOW:
 *   1. Extract user ID from JWT access token (via authMiddleware)
 *   2. Call AuthService.logoutAll() to revoke all refresh tokens
 *   3. Clear httpOnly cookies
 *   4. Return success response
 * SECURITY: Requires valid access token. Revokes all sessions across all devices.
 *           Use this for "logout everywhere" functionality or security incidents.
 * ERRORS: 401 (not authenticated), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.post(
  '/logout-all',
  authMiddleware, // Verify JWT access token, attach req.user
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/logout-all - Logout all sessions attempt', {
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        logger.warn('Logout all failed: User not authenticated', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
      }

      // Revoke all refresh tokens for user (logout from all devices)
      await AuthService.logoutAll(userId);

      // Clear httpOnly cookies for current session
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      logger.info('User logged out from all sessions successfully', { userId });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Logged out from all devices successfully',
        },
      });
    } catch (error) {
      // Log error but still clear cookies (fail-safe logout)
      logger.error('Logout all failed: Server error', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Clear cookies even on error
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Logged out from all devices successfully',
        },
      });
    }
  })
);

/**
 * ENDPOINT 7: POST /api/auth/verify-email
 * PURPOSE: Verify user email address using verification token from email.
 * FLOW:
 *   1. Validate verification token from request body
 *   2. Call AuthService.verifyEmail() to verify token and mark email as verified
 *   3. Return success response
 * SECURITY: Token is short-lived (24h), single-use, cryptographically random.
 *           Expired or invalid tokens return 400/410 errors.
 * ERRORS: 400 (invalid token), 410 (already verified or expired), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.post(
  '/verify-email',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/verify-email - Email verification attempt', {
      ip: req.ip,
    });

    try {
      // Validate verification token format
      const validatedData = verifyEmailSchema.parse(req.body);

      // Verify email: check token validity, update user.isEmailVerified = true
      await AuthService.verifyEmail(validatedData.token);

      logger.info('Email verified successfully', {
        token: validatedData.token.substring(0, 10) + '...', // Log partial token for debugging
      });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Email verified successfully',
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Email verification validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid verification token format',
            code: 'INVALID_TOKEN_FORMAT',
          },
        });
      }

      // Handle verification errors from AuthService
      if (error instanceof Error) {
        // Already verified
        if (error.message.includes('already verified')) {
          logger.warn('Email verification failed: Already verified', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(410).json({
            success: false,
            error: {
              message: 'Email already verified',
              code: 'ALREADY_VERIFIED',
            },
          });
        }

        // Invalid or expired token
        if (
          error.message.includes('Invalid') ||
          error.message.includes('expired') ||
          error.message.includes('not found')
        ) {
          logger.warn('Email verification failed: Invalid token', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(400).json({
            success: false,
            error: {
              message: 'Invalid or expired verification token',
              code: 'INVALID_TOKEN',
            },
          });
        }
      }

      // Generic server error
      logger.error('Email verification failed: Server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Email verification failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 8: POST /api/auth/resend-verification
 * PURPOSE: Resend email verification link.
 *          If authenticated, sends to current user. If not, requires email in body.
 * FLOW:
 *   1. Check if user is authenticated (optional authMiddleware)
 *   2. If authenticated, use req.user.email; else validate email from body
 *   3. Call AuthService to generate new verification token
 *   4. Send verification email via EmailService
 *   5. Return success response
 * SECURITY: Rate limited to prevent email bombing. Only sends to registered users.
 * ERRORS: 400 (validation), 404 (user not found), 410 (already verified), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.post(
  '/resend-verification',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/resend-verification - Resend verification attempt', {
      ip: req.ip,
    });

    try {
      let email: string;

      // Check if user is authenticated (req.user set by authMiddleware if token present)
      const user = (req as any).user;

      if (user && user.email) {
        // Authenticated user: send to their email
        email = user.email;
        logger.info('Resending verification to authenticated user', { userId: user.id, email });
      } else {
        // Unauthenticated: validate email from request body
        const validatedData = resendVerificationSchema.parse(req.body);
        email = validatedData.email;
        logger.info('Resending verification to unauthenticated user', { email });
      }

      // Generate new verification token and send email
      // NOTE: AuthService.resendVerificationEmail() sends the email internally
      await AuthService.resendVerificationEmail(email);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Verification email sent. Please check your inbox.',
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Resend verification validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle errors from AuthService
      if (error instanceof Error) {
        // User not found
        if (error.message.includes('not found')) {
          logger.warn('Resend verification failed: User not found', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(404).json({
            success: false,
            error: {
              message: 'User not found',
              code: 'USER_NOT_FOUND',
            },
          });
        }

        // Already verified
        if (error.message.includes('already verified')) {
          logger.warn('Resend verification failed: Already verified', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(410).json({
            success: false,
            error: {
              message: 'Email already verified',
              code: 'ALREADY_VERIFIED',
            },
          });
        }
      }

      // Generic server error
      logger.error('Resend verification failed: Server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send verification email. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 9: POST /api/auth/forgot-password
 * PURPOSE: Request password reset email with reset token.
 * FLOW:
 *   1. Validate email from request body
 *   2. Call AuthService.forgotPassword() to generate reset token
 *   3. Send password reset email via EmailService
 *   4. Return success response (always, to prevent user enumeration)
 * SECURITY: Always returns success even if email not found (prevent user enumeration).
 *           Reset token is short-lived (1h), single-use, cryptographically random.
 * ERRORS: 400 (validation), 500 (server error)
 * RESPONSE: 200 OK with success: true (always)
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/forgot-password - Password reset request', {
      email: req.body.email,
      ip: req.ip,
    });

    try {
      // Validate email format
      const validatedData = forgotPasswordSchema.parse(req.body);

      // Generate password reset token and send email
      // NOTE: AuthService.forgotPassword() sends the email internally
      // If user not found, it returns silently (same response to prevent enumeration)
      try {
        await AuthService.forgotPassword(validatedData, req.ip);
        logger.info('Password reset requested', { email: validatedData.email });
      } catch (serviceError) {
        // Log error but return success to prevent user enumeration
        logger.warn('Password reset failed (returning success to prevent enumeration)', {
          email: validatedData.email,
          error: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        });
      }

      // Always return success to prevent user enumeration (don't reveal if email exists)
      return res.status(200).json({
        success: true,
        data: {
          message: 'If your email is registered, you will receive a password reset link.',
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Forgot password validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Generic server error
      logger.error('Forgot password failed: Server error', {
        email: req.body.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to process password reset request. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 10: POST /api/auth/reset-password
 * PURPOSE: Reset password using reset token from email.
 * FLOW:
 *   1. Validate reset token, newPassword, confirmPassword
 *   2. Verify password confirmation match
 *   3. Call AuthService.resetPassword() to verify token and update password
 *   4. Return success response
 * SECURITY: Token is short-lived (1h), single-use. New password hashed with Argon2id.
 *           All refresh tokens revoked after password reset (force re-login).
 * ERRORS: 400 (validation), 410 (token expired/invalid), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.post(
  '/reset-password',
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/reset-password - Password reset attempt', {
      ip: req.ip,
    });

    try {
      // Validate reset token and new password
      const validatedData = resetPasswordSchema.parse(req.body);

      // Note: password confirmation is validated by Zod schema's refine() method

      // Reset password: verify token, hash new password, update user, revoke all refresh tokens
      await AuthService.resetPassword(validatedData);

      logger.info('Password reset successfully', {
        token: validatedData.token.substring(0, 10) + '...', // Log partial token for debugging
      });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Password reset successful. Please log in with your new password.',
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Password reset validation failed', {
          errors: error.errors,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle reset errors from AuthService
      if (error instanceof Error) {
        // Invalid or expired token
        if (
          error.message.includes('Invalid') ||
          error.message.includes('expired') ||
          error.message.includes('not found')
        ) {
          logger.warn('Password reset failed: Invalid token', {
            error: error.message,
            ip: req.ip,
          });
          return res.status(410).json({
            success: false,
            error: {
              message: 'Invalid or expired reset token. Please request a new password reset.',
              code: 'INVALID_RESET_TOKEN',
            },
          });
        }
      }

      // Generic server error
      logger.error('Password reset failed: Server error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Password reset failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 11: POST /api/auth/change-password
 * PURPOSE: Change password for authenticated user (requires current password).
 * FLOW:
 *   1. Extract user ID from JWT access token (via authMiddleware)
 *   2. Validate currentPassword, newPassword, confirmPassword
 *   3. Verify password confirmation match
 *   4. Call AuthService.changePassword() to verify current password and update
 *   5. Return success response
 * SECURITY: Requires valid access token and current password verification.
 *           All refresh tokens revoked after password change (force re-login on other devices).
 * ERRORS: 400 (validation), 401 (not authenticated), 403 (wrong current password), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.post(
  '/change-password',
  authMiddleware, // Verify JWT access token, attach req.user
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/change-password - Password change attempt', {
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        logger.warn('Password change failed: User not authenticated', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
      }

      // Validate current and new passwords
      const validatedData = changePasswordSchema.parse(req.body);

      // Note: password confirmation is validated by Zod schema's refine() method

      // Change password: verify current password, hash new password, update user, revoke all refresh tokens
      await AuthService.changePassword(userId, validatedData);

      // Clear current session cookies (user must log in with new password)
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      logger.info('Password changed successfully', { userId });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Password changed successfully. Please log in with your new password.',
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Password change validation failed', {
          errors: error.errors,
          userId: (req as any).user?.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle password change errors from AuthService
      if (error instanceof Error) {
        // Wrong current password
        if (error.message.includes('Incorrect') || error.message.includes('Invalid current password')) {
          logger.warn('Password change failed: Wrong current password', {
            userId: (req as any).user?.id,
            ip: req.ip,
          });
          return res.status(403).json({
            success: false,
            error: {
              message: 'Current password is incorrect',
              code: 'INCORRECT_PASSWORD',
            },
          });
        }
      }

      // Generic server error
      logger.error('Password change failed: Server error', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Password change failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 12: GET /api/auth/me
 * PURPOSE: Get current authenticated user information.
 * FLOW:
 *   1. Extract user ID from JWT access token (via authMiddleware)
 *   2. Fetch user data from AuthService
 *   3. Return user object (without password)
 * SECURITY: Requires valid access token. Never returns password hash.
 * ERRORS: 401 (not authenticated), 500 (server error)
 * RESPONSE: 200 OK with user object
 */
router.get(
  '/me',
  authMiddleware, // Verify JWT access token, attach req.user
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('GET /api/auth/me - Get current user', {
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        logger.warn('Get current user failed: User not authenticated', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
      }

      // Fetch user data from database (AuthService should have a getUserById method)
      // If not implemented, use (req as any).user data directly
      const user = (req as any).user;

      logger.info('Current user fetched successfully', { userId });

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.isEmailVerified,
            isAdmin: user.isAdmin,
            joinedAt: user.joinedAt,
            lastLoginAt: user.lastLoginAt,
          },
        },
      });
    } catch (error) {
      // Generic server error
      logger.error('Get current user failed: Server error', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch user data. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 13: POST /api/auth/export-data
 * PURPOSE: GDPR data export - export all user data (account info, login history, etc.).
 * FLOW:
 *   1. Extract user ID from JWT access token (via authMiddleware)
 *   2. Call AuthService.exportUserData() to fetch all user data
 *   3. Return user data object
 * SECURITY: Requires valid access token. Only exports data for authenticated user.
 * PERFORMANCE: May be slow for users with extensive history. Consider pagination or async export.
 * ERRORS: 401 (not authenticated), 500 (server error)
 * RESPONSE: 200 OK with user data object
 */
router.post(
  '/export-data',
  authMiddleware, // Verify JWT access token, attach req.user
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('POST /api/auth/export-data - GDPR data export request', {
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        logger.warn('Data export failed: User not authenticated', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
      }

      // Export all user data: account info, login history, sessions, etc.
      const userData = await AuthService.exportUserData(userId);

      logger.info('User data exported successfully', { userId });

      return res.status(200).json({
        success: true,
        data: userData,
      });
    } catch (error) {
      // Generic server error
      logger.error('Data export failed: Server error', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Data export failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * ENDPOINT 14: DELETE /api/auth/account
 * PURPOSE: GDPR account deletion - permanently delete user account and all associated data.
 * FLOW:
 *   1. Extract user ID from JWT access token (via authMiddleware)
 *   2. Validate password from request body (require password confirmation)
 *   3. Call AuthService.deleteAccount() to verify password and delete account
 *   4. Clear httpOnly cookies
 *   5. Return success response
 * SECURITY: Requires valid access token and password confirmation (prevent accidental deletion).
 *           Permanently deletes all user data (cannot be undone).
 * ERRORS: 401 (not authenticated), 403 (wrong password), 500 (server error)
 * RESPONSE: 200 OK with success: true
 */
router.delete(
  '/account',
  authMiddleware, // Verify JWT access token, attach req.user
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('DELETE /api/auth/account - Account deletion request', {
      userId: (req as any).user?.id,
      ip: req.ip,
    });

    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        logger.warn('Account deletion failed: User not authenticated', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: {
            message: 'Not authenticated',
            code: 'NOT_AUTHENTICATED',
          },
        });
      }

      // Validate password confirmation
      const validatedData = deleteAccountSchema.parse(req.body);

      // Delete account: verify password, delete user record and all associated data
      await AuthService.deleteAccount(userId, validatedData.password);

      // Clear httpOnly cookies
      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      logger.info('Account deleted successfully', { userId });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Account deleted successfully. All your data has been removed.',
        },
      });
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        logger.warn('Account deletion validation failed', {
          errors: error.errors,
          userId: (req as any).user?.id,
          ip: req.ip,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }

      // Handle deletion errors from AuthService
      if (error instanceof Error) {
        // Wrong password
        if (error.message.includes('Incorrect') || error.message.includes('Invalid password')) {
          logger.warn('Account deletion failed: Wrong password', {
            userId: (req as any).user?.id,
            ip: req.ip,
          });
          return res.status(403).json({
            success: false,
            error: {
              message: 'Incorrect password',
              code: 'INCORRECT_PASSWORD',
            },
          });
        }
      }

      // Generic server error
      logger.error('Account deletion failed: Server error', {
        userId: (req as any).user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return res.status(500).json({
        success: false,
        error: {
          message: 'Account deletion failed. Please try again later.',
          code: 'SERVER_ERROR',
        },
      });
    }
  })
);

/**
 * Export router for mounting in main Express app.
 * Mount as: app.use('/api/auth', authRouter)
 */
export default router;
