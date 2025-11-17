/**
 * FILE: src/services/AuthService.ts
 * PURPOSE: Core authentication service with user registration, login, JWT management,
 *          password hashing, token generation, and security features.
 * INPUTS: User credentials, tokens, database instance
 * OUTPUTS: Auth tokens, user data, validation results
 * SIDE EFFECTS:
 *   - Creates/updates users in database
 *   - Generates/revokes refresh tokens
 *   - Logs auth events to auth_logs table
 *   - Sends emails via EmailService (verification, reset)
 * NOTES:
 *   - bcrypt cost factor 12 (~250ms per hash)
 *   - JWT expires in 15 minutes
 *   - Refresh tokens expire in 7 days (30 days with "remember me")
 *   - Account lockout after 5 failed attempts (15 min cooldown)
 *   - All operations are database-transactional where appropriate
 *   - Timing attack prevention: Always run bcrypt.compare even if email not found
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/db';
import { logger } from '../utils/logger';
import {
  type User,
  type AdminUser,
  type SafeUser,
  type SafeAdmin,
  type RefreshToken,
  type PasswordResetToken,
  type JWTPayload,
  type RegisterInput,
  type LoginInput,
  type AdminLoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
} from '../types/auth.types';

/**
 * ==========================================================================
 * CONSTANTS
 * ==========================================================================
 */

/*
 * bcrypt cost factor 12 provides good security/performance balance.
 * Cost 12 = 2^12 iterations = 4096 rounds (~250ms on modern hardware).
 *
 * WHY 12?
 * - Cost 10: ~65ms (too fast, vulnerable to GPU attacks)
 * - Cost 12: ~250ms (recommended by OWASP)
 * - Cost 14: ~1000ms (too slow for user experience)
 */
const BCRYPT_ROUNDS = 12;

/*
 * JWT expiration times.
 * Access tokens are short-lived to minimize damage if stolen.
 * Refresh tokens are longer-lived for user convenience.
 */
const JWT_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7; // 7 days
const REFRESH_TOKEN_REMEMBER_ME_DAYS = 30; // 30 days with "remember me"
const ADMIN_JWT_EXPIRES_IN = '15m'; // 15 minutes (no refresh for admins)

/*
 * Account lockout settings.
 * After 5 failed login attempts, account is locked for 15 minutes.
 *
 * WHY these values?
 * - 5 attempts: Allows legitimate users to recover from typos
 * - 15 minutes: Long enough to deter brute force, short enough to not frustrate users
 */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/*
 * Token expiration for email verification and password reset.
 * Short-lived to minimize attack window.
 */
const VERIFICATION_TOKEN_EXPIRES_HOURS = 1;
const RESET_TOKEN_EXPIRES_HOURS = 1;

/**
 * AuthService class.
 * Handles all authentication and authorization logic.
 *
 * @class AuthService
 */
export class AuthService {
  /**
   * Generates a cryptographically secure random token.
   * Used for refresh tokens, password reset tokens, email verification.
   *
   * @returns 64-character hex string (32 bytes)
   * @complexity O(1)
   * @security Uses crypto.randomBytes for cryptographic randomness
   */
  private static generateToken(): string {
    /*
     * crypto.randomBytes(32) generates 32 random bytes.
     * .toString('hex') converts to hexadecimal string (64 chars).
     *
     * WHY 32 bytes?
     * - 32 bytes = 256 bits of entropy
     * - Sufficient for token security (>= 128 bits recommended)
     */
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hashes a password using bcrypt.
   * Cost factor 12 provides ~250ms hashing time (resistant to brute force).
   *
   * @param password - Plain text password
   * @returns Promise<string> - bcrypt hash (60 chars, base64)
   * @throws Error if hashing fails
   * @complexity O(2^12) = O(4096) iterations
   * @security bcrypt is designed to be slow (prevents GPU cracking)
   */
  private static async hashPassword(password: string): Promise<string> {
    try {
      /*
       * bcrypt.hash() automatically:
       * - Generates a random salt (embedded in output)
       * - Applies cost factor (2^12 iterations)
       * - Returns hash in format: $2b$12$[salt][hash]
       */
      return await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (error) {
      logger.error('Failed to hash password', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verifies a password against a bcrypt hash.
   * Constant-time comparison prevents timing attacks.
   *
   * @param password - Plain text password to verify
   * @param hash - bcrypt hash from database
   * @returns Promise<boolean> - true if match, false otherwise
   * @complexity O(2^12) = O(4096) iterations (same as hashing)
   * @security bcrypt.compare is constant-time for same hash length
   */
  private static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Failed to verify password', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Generates a JWT access token for authenticated user.
   * Token expires in 15 minutes.
   *
   * @param payload - User data to embed in token
   * @returns string - Signed JWT
   * @throws Error if JWT_SECRET is not configured
   * @complexity O(1)
   * @security JWT is signed with HS256 (HMAC-SHA256)
   */
  private static generateAccessToken(payload: JWTPayload): string {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    /*
     * jwt.sign() creates a JWT with:
     * - Header: { alg: 'HS256', typ: 'JWT' }
     * - Payload: { userId, email, username, isAdmin, iat, exp }
     * - Signature: HMAC-SHA256(header + payload, secret)
     */
    return jwt.sign(payload, secret, {
      expiresIn: payload.isAdmin ? ADMIN_JWT_EXPIRES_IN : JWT_EXPIRES_IN,
      issuer: 'omegaops-academy',
      audience: 'omegaops-academy-users',
    });
  }

  /**
   * Verifies a JWT access token.
   * Checks signature, expiration, issuer, and audience.
   *
   * @param token - JWT string
   * @returns JWTPayload | null - Decoded payload if valid, null if invalid
   * @complexity O(1)
   * @security Rejects expired, malformed, or tampered tokens
   */
  public static verifyAccessToken(token: string): JWTPayload | null {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    try {
      /*
       * jwt.verify() checks:
       * - Signature matches (prevents tampering)
       * - Token not expired (exp claim)
       * - Issuer and audience match (prevents token reuse)
       */
      const payload = jwt.verify(token, secret, {
        issuer: 'omegaops-academy',
        audience: 'omegaops-academy-users',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      /*
       * Common errors:
       * - TokenExpiredError: Token expired (normal, refresh needed)
       * - JsonWebTokenError: Invalid signature or format (attack?)
       * - NotBeforeError: Token used before valid (clock skew?)
       */
      if (error instanceof jwt.TokenExpiredError) {
        logger.debug('JWT expired (normal, refresh needed)');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT signature or format', {
          error: error.message,
        });
      } else {
        logger.error('JWT verification failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /**
   * Converts database user to safe user object (excludes sensitive fields).
   *
   * @param user - User entity from database
   * @returns SafeUser - User object safe for API responses
   * @complexity O(1)
   * @security Never expose passwordHash, tokens, or other sensitive data
   */
  private static toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified === 1,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Converts database admin to safe admin object.
   *
   * @param admin - AdminUser entity from database
   * @returns SafeAdmin - Admin object safe for API responses
   * @complexity O(1)
   */
  private static toSafeAdmin(admin: AdminUser): SafeAdmin {
    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      isActive: admin.isActive === 1,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  /**
   * Logs an authentication event to auth_logs table.
   *
   * @param action - Event type (login, logout, register, etc.)
   * @param success - Whether action succeeded
   * @param userId - User ID (null for failed login attempts)
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @param errorMessage - Error details (only for failures)
   * @complexity O(1) - Single INSERT query
   * @security Never log passwords, tokens, or sensitive data
   */
  private static logAuthEvent(
    action: string,
    success: boolean,
    userId: string | null = null,
    ipAddress: string | null = null,
    userAgent: string | null = null,
    errorMessage: string | null = null
  ): void {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO auth_logs (id, userId, action, success, ipAddress, userAgent, errorMessage, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        userId,
        action,
        success ? 1 : 0,
        ipAddress,
        userAgent,
        errorMessage,
        now
      );
    } catch (error) {
      /*
       * Log failures but don't throw.
       * Audit logging is important but shouldn't break auth flow.
       */
      logger.error('Failed to log auth event', {
        action,
        success,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * ==========================================================================
   * PUBLIC METHODS: USER AUTHENTICATION
   * ==========================================================================
   */

  /**
   * Registers a new user account.
   *
   * FLOW:
   * 1. Check if email/username already exists
   * 2. Hash password with bcrypt (cost 12)
   * 3. Generate email verification token
   * 4. Create user in database (unverified)
   * 5. Send verification email
   * 6. Log registration event
   * 7. Return user data (no auto-login, must verify email first)
   *
   * @param input - Registration data (email, username, password)
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @returns Promise<SafeUser> - Created user object
   * @throws Error if email/username already exists or database fails
   * @complexity O(n) where n = bcrypt rounds (2^12 = ~250ms)
   * @security Email verification required before login
   */
  public static async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SafeUser> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Check if email already exists.
       * Return generic error to prevent email enumeration.
       */
      const existingEmail = db
        .prepare('SELECT id FROM users WHERE email = ?')
        .get(input.email);

      if (existingEmail) {
        this.logAuthEvent('register', false, null, ipAddress, userAgent, 'Email already exists');
        throw new Error('Registration failed. Please check your details.');
      }

      /*
       * Check if username already exists.
       */
      const existingUsername = db
        .prepare('SELECT id FROM users WHERE username = ?')
        .get(input.username);

      if (existingUsername) {
        this.logAuthEvent('register', false, null, ipAddress, userAgent, 'Username already exists');
        throw new Error('Registration failed. Please check your details.');
      }

      /*
       * Hash password with bcrypt.
       * This takes ~250ms on modern hardware.
       */
      const passwordHash = await this.hashPassword(input.password);

      /*
       * Generate verification token.
       * Token expires in 1 hour.
       */
      const verificationToken = this.generateToken();
      const verificationTokenExpiresAt = new Date(
        Date.now() + VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
      ).toISOString();

      /*
       * Create user in database.
       * User is unverified (isVerified = 0) until email confirmed.
       */
      const userId = uuidv4();
      db.prepare(`
        INSERT INTO users (
          id, email, username, passwordHash, isVerified,
          verificationToken, verificationTokenExpiresAt,
          failedLoginAttempts, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, 0, ?, ?, 0, ?, ?)
      `).run(
        userId,
        input.email,
        input.username,
        passwordHash,
        verificationToken,
        verificationTokenExpiresAt,
        now,
        now
      );

      /*
       * Fetch created user.
       */
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(userId) as User;

      /*
       * Send verification email.
       * This is async and non-blocking (fire-and-forget).
       */
      const { EmailService } = require('./EmailService');
      EmailService.sendVerificationEmail(user.email, user.username, verificationToken).catch(
        (error: Error) => {
          logger.error('Failed to send verification email', {
            userId: user.id,
            email: user.email,
            error: error.message,
          });
        }
      );

      /*
       * Log successful registration.
       */
      this.logAuthEvent('register', true, userId, ipAddress, userAgent);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return this.toSafeUser(user);
    } catch (error) {
      logger.error('Registration failed', {
        email: input.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Verifies user email with verification token.
   *
   * FLOW:
   * 1. Find user by verification token
   * 2. Check token not expired
   * 3. Mark user as verified
   * 4. Clear verification token
   * 5. Log event
   *
   * @param token - Verification token from email link
   * @returns Promise<SafeUser> - Verified user object
   * @throws Error if token invalid, expired, or already used
   * @complexity O(1) - Indexed query + UPDATE
   */
  public static async verifyEmail(token: string): Promise<SafeUser> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find user by verification token.
       */
      const user = db
        .prepare('SELECT * FROM users WHERE verificationToken = ?')
        .get(token) as User | undefined;

      if (!user) {
        throw new Error('Invalid verification token');
      }

      /*
       * Check token not expired.
       */
      if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < now) {
        throw new Error('Verification token has expired. Please request a new one.');
      }

      /*
       * Check not already verified.
       */
      if (user.isVerified === 1) {
        throw new Error('Email is already verified');
      }

      /*
       * Mark user as verified and clear token.
       */
      db.prepare(`
        UPDATE users
        SET isVerified = 1,
            verificationToken = NULL,
            verificationTokenExpiresAt = NULL,
            updatedAt = ?
        WHERE id = ?
      `).run(now, user.id);

      /*
       * Fetch updated user.
       */
      const verifiedUser = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(user.id) as User;

      /*
       * Log verification event.
       */
      this.logAuthEvent('verify_email', true, user.id);

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return this.toSafeUser(verifiedUser);
    } catch (error) {
      logger.error('Email verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Authenticates user and generates JWT + refresh token.
   *
   * FLOW:
   * 1. Find user by email
   * 2. Check account not locked
   * 3. Verify password with bcrypt
   * 4. Reset failed attempts on success
   * 5. Generate JWT access token (15 min)
   * 6. Generate refresh token (7 days, 30 if remember me)
   * 7. Update last login timestamp and IP
   * 8. Log login event
   * 9. Return tokens and user data
   *
   * @param input - Login credentials (email, password)
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @returns Promise<{ user, accessToken, refreshToken }> - Auth tokens and user
   * @throws Error if credentials invalid, account locked, or not verified
   * @complexity O(n) where n = bcrypt rounds (~250ms)
   * @security Timing attack prevention: Always run bcrypt even if email not found
   */
  public static async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find user by email.
       */
      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(input.email) as User | undefined;

      /*
       * TIMING ATTACK PREVENTION:
       * Always run bcrypt.compare even if user not found.
       * This ensures constant time for both success and failure cases.
       */
      const dummyHash = '$2b$12$DummyHashToPreventTimingAttack1234567890123456789012';
      const passwordHash = user?.passwordHash || dummyHash;
      const isPasswordValid = await this.verifyPassword(input.password, passwordHash);

      /*
       * Check user exists.
       */
      if (!user) {
        this.logAuthEvent('login', false, null, ipAddress, userAgent, 'User not found');
        throw new Error('Invalid email or password');
      }

      /*
       * Check account not locked.
       */
      if (user.lockedUntil && user.lockedUntil > now) {
        const lockedMinutes = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
        );
        this.logAuthEvent('login', false, user.id, ipAddress, userAgent, 'Account locked');
        throw new Error(
          `Account is locked due to too many failed login attempts. Try again in ${lockedMinutes} minutes.`
        );
      }

      /*
       * Check password valid.
       */
      if (!isPasswordValid) {
        /*
         * Increment failed attempts.
         */
        const newFailedAttempts = user.failedLoginAttempts + 1;
        const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

        db.prepare(`
          UPDATE users
          SET failedLoginAttempts = ?,
              lockedUntil = ?,
              updatedAt = ?
          WHERE id = ?
        `).run(
          newFailedAttempts,
          shouldLock
            ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
            : null,
          now,
          user.id
        );

        this.logAuthEvent('login', false, user.id, ipAddress, userAgent, 'Invalid password');

        if (shouldLock) {
          throw new Error(
            `Account locked due to too many failed login attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
          );
        }

        throw new Error('Invalid email or password');
      }

      /*
       * Check email verified.
       */
      if (user.isVerified === 0) {
        this.logAuthEvent('login', false, user.id, ipAddress, userAgent, 'Email not verified');
        throw new Error('Please verify your email before logging in');
      }

      /*
       * Reset failed attempts and lockout on successful login.
       */
      db.prepare(`
        UPDATE users
        SET failedLoginAttempts = 0,
            lockedUntil = NULL,
            lastLoginAt = ?,
            lastLoginIp = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(now, ipAddress || null, now, user.id);

      /*
       * Generate JWT access token.
       */
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: false,
      });

      /*
       * Generate refresh token.
       */
      const refreshToken = this.generateToken();
      const expiresInDays = input.rememberMe
        ? REFRESH_TOKEN_REMEMBER_ME_DAYS
        : REFRESH_TOKEN_EXPIRES_IN_DAYS;
      const expiresAt = new Date(
        Date.now() + expiresInDays * 24 * 60 * 60 * 1000
      ).toISOString();

      db.prepare(`
        INSERT INTO refresh_tokens (id, userId, token, expiresAt, ipAddress, userAgent, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), user.id, refreshToken, expiresAt, ipAddress, userAgent, now);

      /*
       * Log successful login.
       */
      this.logAuthEvent('login', true, user.id, ipAddress, userAgent);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        ipAddress,
      });

      /*
       * Fetch updated user.
       */
      const updatedUser = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(user.id) as User;

      return {
        user: this.toSafeUser(updatedUser),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('Login failed', {
        email: input.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refreshes JWT access token using refresh token.
   *
   * FLOW:
   * 1. Find refresh token in database
   * 2. Check token not expired
   * 3. Check token not revoked
   * 4. Generate new access token
   * 5. Rotate refresh token (revoke old, create new)
   * 6. Return new tokens
   *
   * @param refreshToken - Refresh token from cookie
   * @returns Promise<{ user, accessToken, refreshToken }> - New tokens
   * @throws Error if token invalid, expired, or revoked
   * @complexity O(1) - Indexed queries
   * @security Token rotation prevents token reuse attacks
   */
  public static async refreshToken(
    refreshToken: string
  ): Promise<{ user: SafeUser; accessToken: string; refreshToken: string }> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find refresh token in database.
       */
      const tokenRecord = db
        .prepare('SELECT * FROM refresh_tokens WHERE token = ?')
        .get(refreshToken) as RefreshToken | undefined;

      if (!tokenRecord) {
        throw new Error('Invalid refresh token');
      }

      /*
       * Check token not expired.
       */
      if (tokenRecord.expiresAt < now) {
        throw new Error('Refresh token has expired. Please log in again.');
      }

      /*
       * Check token not revoked.
       */
      if (tokenRecord.revokedAt) {
        /*
         * SECURITY ALERT: Token reuse detected!
         * This could indicate token theft. Revoke all tokens for this user.
         */
        logger.warn('Revoked refresh token reused (possible token theft)', {
          userId: tokenRecord.userId,
          tokenId: tokenRecord.id,
        });

        db.prepare(`
          UPDATE refresh_tokens
          SET revokedAt = ?
          WHERE userId = ? AND revokedAt IS NULL
        `).run(now, tokenRecord.userId);

        throw new Error('Token reuse detected. All sessions have been revoked for security.');
      }

      /*
       * Find user.
       */
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(tokenRecord.userId) as User | undefined;

      if (!user) {
        throw new Error('User not found');
      }

      /*
       * Generate new access token.
       */
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: false,
      });

      /*
       * Generate new refresh token (token rotation).
       */
      const newRefreshToken = this.generateToken();
      const expiresAt = new Date(
        Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      /*
       * Revoke old token and create new one.
       */
      db.prepare(`
        UPDATE refresh_tokens
        SET revokedAt = ?,
            replacedByToken = ?
        WHERE id = ?
      `).run(now, newRefreshToken, tokenRecord.id);

      db.prepare(`
        INSERT INTO refresh_tokens (id, userId, token, expiresAt, ipAddress, userAgent, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        user.id,
        newRefreshToken,
        expiresAt,
        tokenRecord.ipAddress,
        tokenRecord.userAgent,
        now
      );

      logger.info('Refresh token rotated successfully', {
        userId: user.id,
      });

      return {
        user: this.toSafeUser(user),
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Logs out user by revoking refresh token.
   *
   * @param refreshToken - Refresh token to revoke
   * @complexity O(1) - Single UPDATE query
   */
  public static logout(refreshToken: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      db.prepare(`
        UPDATE refresh_tokens
        SET revokedAt = ?
        WHERE token = ?
      `).run(now, refreshToken);

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Logs out user from all devices by revoking all refresh tokens.
   *
   * @param userId - User ID
   * @complexity O(n) where n = number of active tokens for user
   */
  public static logoutAll(userId: string): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      db.prepare(`
        UPDATE refresh_tokens
        SET revokedAt = ?
        WHERE userId = ? AND revokedAt IS NULL
      `).run(now, userId);

      logger.info('User logged out from all devices', { userId });
    } catch (error) {
      logger.error('Logout all failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initiates password reset flow by sending reset email.
   *
   * FLOW:
   * 1. Find user by email
   * 2. Generate reset token
   * 3. Invalidate old reset tokens
   * 4. Save reset token to database
   * 5. Send reset email
   * 6. Return success (same response whether user exists or not)
   *
   * @param input - Email address
   * @param ipAddress - Request IP address
   * @returns Promise<void>
   * @complexity O(1)
   * @security Always returns same response to prevent email enumeration
   */
  public static async forgotPassword(
    input: ForgotPasswordInput,
    ipAddress?: string
  ): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find user by email.
       */
      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(input.email) as User | undefined;

      /*
       * SECURITY: Same response whether user exists or not.
       * Prevents email enumeration attacks.
       */
      if (!user) {
        logger.debug('Password reset requested for non-existent email', {
          email: input.email,
        });
        return; // Silent failure
      }

      /*
       * Generate reset token.
       */
      const resetToken = this.generateToken();
      const expiresAt = new Date(
        Date.now() + RESET_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
      ).toISOString();

      /*
       * Invalidate old reset tokens for this user.
       */
      db.prepare(`
        UPDATE password_reset_tokens
        SET usedAt = ?
        WHERE userId = ? AND usedAt IS NULL
      `).run(now, user.id);

      /*
       * Save new reset token.
       */
      db.prepare(`
        INSERT INTO password_reset_tokens (id, userId, token, expiresAt, ipAddress, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), user.id, resetToken, expiresAt, ipAddress, now);

      /*
       * Send reset email.
       */
      const { EmailService } = require('./EmailService');
      await EmailService.sendPasswordResetEmail(user.email, user.username, resetToken);

      this.logAuthEvent('forgot_password', true, user.id, ipAddress);

      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      logger.error('Forgot password failed', {
        email: input.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resets user password with reset token.
   *
   * FLOW:
   * 1. Find reset token in database
   * 2. Check token not expired
   * 3. Check token not used
   * 4. Hash new password
   * 5. Update user password
   * 6. Mark token as used
   * 7. Revoke all refresh tokens (force re-login)
   * 8. Log event
   *
   * @param input - Reset token and new password
   * @returns Promise<void>
   * @throws Error if token invalid, expired, or already used
   * @complexity O(n) where n = bcrypt rounds (~250ms)
   * @security All sessions invalidated after password change
   */
  public static async resetPassword(input: ResetPasswordInput): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find reset token.
       */
      const tokenRecord = db
        .prepare('SELECT * FROM password_reset_tokens WHERE token = ?')
        .get(input.token) as PasswordResetToken | undefined;

      if (!tokenRecord) {
        throw new Error('Invalid reset token');
      }

      /*
       * Check token not expired.
       */
      if (tokenRecord.expiresAt < now) {
        throw new Error('Reset token has expired. Please request a new one.');
      }

      /*
       * Check token not used.
       */
      if (tokenRecord.usedAt) {
        throw new Error('Reset token has already been used');
      }

      /*
       * Hash new password.
       */
      const passwordHash = await this.hashPassword(input.password);

      /*
       * Update user password.
       */
      db.prepare(`
        UPDATE users
        SET passwordHash = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(passwordHash, now, tokenRecord.userId);

      /*
       * Mark token as used.
       */
      db.prepare(`
        UPDATE password_reset_tokens
        SET usedAt = ?
        WHERE id = ?
      `).run(now, tokenRecord.id);

      /*
       * Revoke all refresh tokens (force re-login).
       */
      db.prepare(`
        UPDATE refresh_tokens
        SET revokedAt = ?
        WHERE userId = ? AND revokedAt IS NULL
      `).run(now, tokenRecord.userId);

      this.logAuthEvent('reset_password', true, tokenRecord.userId);

      logger.info('Password reset successfully', {
        userId: tokenRecord.userId,
      });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Changes password for authenticated user.
   *
   * @param userId - Authenticated user ID
   * @param input - Current and new password
   * @returns Promise<void>
   * @throws Error if current password invalid
   * @complexity O(n) where n = bcrypt rounds (~250ms for verify + ~250ms for hash)
   * @security All sessions invalidated after password change
   */
  public static async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find user.
       */
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(userId) as User | undefined;

      if (!user) {
        throw new Error('User not found');
      }

      /*
       * Verify current password.
       */
      const isCurrentPasswordValid = await this.verifyPassword(
        input.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        this.logAuthEvent('change_password', false, userId, undefined, undefined, 'Invalid current password');
        throw new Error('Current password is incorrect');
      }

      /*
       * Hash new password.
       */
      const passwordHash = await this.hashPassword(input.newPassword);

      /*
       * Update password.
       */
      db.prepare(`
        UPDATE users
        SET passwordHash = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(passwordHash, now, userId);

      /*
       * Revoke all refresh tokens.
       */
      db.prepare(`
        UPDATE refresh_tokens
        SET revokedAt = ?
        WHERE userId = ? AND revokedAt IS NULL
      `).run(now, userId);

      this.logAuthEvent('change_password', true, userId);

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * ==========================================================================
   * PUBLIC METHODS: ADMIN AUTHENTICATION
   * ==========================================================================
   */

  /**
   * Authenticates admin user.
   *
   * FLOW:
   * 1. Find admin by username
   * 2. Check account active
   * 3. Verify password
   * 4. Generate JWT (no refresh token for admins)
   * 5. Update last login
   * 6. Log event
   *
   * @param input - Admin credentials (username, password)
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @returns Promise<{ admin, accessToken }> - Admin data and JWT
   * @throws Error if credentials invalid or account inactive
   * @complexity O(n) where n = bcrypt rounds (~250ms)
   * @security Admins don't get refresh tokens (more secure, shorter sessions)
   */
  public static async adminLogin(
    input: AdminLoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ admin: SafeAdmin; accessToken: string }> {
    const db = getDatabase();
    const now = new Date().toISOString();

    try {
      /*
       * Find admin by username.
       */
      const admin = db
        .prepare('SELECT * FROM admin_users WHERE username = ?')
        .get(input.username) as AdminUser | undefined;

      /*
       * TIMING ATTACK PREVENTION.
       */
      const dummyHash = '$2b$12$DummyHashToPreventTimingAttack1234567890123456789012';
      const passwordHash = admin?.passwordHash || dummyHash;
      const isPasswordValid = await this.verifyPassword(input.password, passwordHash);

      if (!admin || !isPasswordValid) {
        this.logAuthEvent('admin_login', false, null, ipAddress, userAgent, 'Invalid credentials');
        throw new Error('Invalid username or password');
      }

      /*
       * Check account active.
       */
      if (admin.isActive === 0) {
        this.logAuthEvent('admin_login', false, admin.id, ipAddress, userAgent, 'Account inactive');
        throw new Error('Admin account is inactive');
      }

      /*
       * Update last login.
       */
      db.prepare(`
        UPDATE admin_users
        SET lastLoginAt = ?,
            lastLoginIp = ?,
            updatedAt = ?
        WHERE id = ?
      `).run(now, ipAddress || null, now, admin.id);

      /*
       * Generate JWT (no refresh token for admins).
       */
      const accessToken = this.generateAccessToken({
        userId: admin.id,
        email: admin.email,
        username: admin.username,
        isAdmin: true,
      });

      this.logAuthEvent('admin_login', true, admin.id, ipAddress, userAgent);

      logger.info('Admin logged in successfully', {
        adminId: admin.id,
        username: admin.username,
        ipAddress,
      });

      return {
        admin: this.toSafeAdmin(admin),
        accessToken,
      };
    } catch (error) {
      logger.error('Admin login failed', {
        username: input.username,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Deletes user account and all associated data (GDPR compliance).
   *
   * @param userId - User ID to delete
   * @complexity O(n) where n = number of related records
   * @security Cascading deletes via foreign keys (ON DELETE CASCADE)
   */
  public static deleteAccount(userId: string): void {
    const db = getDatabase();

    try {
      /*
       * SQLite cascading deletes will automatically remove:
       * - refresh_tokens (FOREIGN KEY ... ON DELETE CASCADE)
       * - password_reset_tokens (FOREIGN KEY ... ON DELETE CASCADE)
       * - auth_logs (FOREIGN KEY ... ON DELETE SET NULL)
       */
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);

      logger.info('User account deleted (GDPR)', { userId });
    } catch (error) {
      logger.error('Account deletion failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Exports all user data (GDPR compliance).
   *
   * @param userId - User ID
   * @returns User data object
   * @complexity O(n) where n = number of auth logs
   */
  public static exportUserData(userId: string): Record<string, unknown> {
    const db = getDatabase();

    try {
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(userId) as User | undefined;

      if (!user) {
        throw new Error('User not found');
      }

      const authLogs = db
        .prepare('SELECT * FROM auth_logs WHERE userId = ? ORDER BY createdAt DESC')
        .all(userId);

      const refreshTokens = db
        .prepare('SELECT * FROM refresh_tokens WHERE userId = ? ORDER BY createdAt DESC')
        .all(userId);

      return {
        user: this.toSafeUser(user),
        authLogs,
        refreshTokens: refreshTokens.map((token: RefreshToken) => ({
          id: token.id,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          revokedAt: token.revokedAt,
          ipAddress: token.ipAddress,
          userAgent: token.userAgent,
        })),
      };
    } catch (error) {
      logger.error('Data export failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
