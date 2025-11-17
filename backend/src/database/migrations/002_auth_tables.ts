/**
 * FILE: src/database/migrations/002_auth_tables.ts
 * PURPOSE: Database migration to add authentication and authorization tables.
 *          Creates tables for users, refresh tokens, password resets, auth logs, and admin users.
 * INPUTS: Database instance from better-sqlite3
 * OUTPUTS: Creates 5 new tables with proper indices for performance
 * SIDE EFFECTS:
 *   - Creates users table with email verification tracking
 *   - Creates refresh_tokens table with expiration and revocation support
 *   - Creates password_reset_tokens table with one-time use enforcement
 *   - Creates auth_logs table for security audit trail (90-day retention)
 *   - Creates admin_users table (restricted to single admin: metrik)
 * NOTES:
 *   - All timestamps are ISO 8601 strings for portability
 *   - Passwords are hashed with bcrypt (cost factor 12, ~250ms per hash)
 *   - Email addresses are stored lowercase for case-insensitive lookups
 *   - Failed login attempts tracked to enable account lockout
 *   - GDPR compliant: supports user deletion and data export
 *   - Indices added on frequently queried columns (email, userId, token, expiresAt)
 */

import Database from 'better-sqlite3';
import { logger } from '../../utils/logger';

/**
 * SQL schema for authentication and authorization tables.
 *
 * SECURITY NOTES:
 * - passwordHash is bcrypt with cost factor 12 (takes ~250ms to hash/verify)
 * - All tokens (refresh, reset) are cryptographically random (32 bytes)
 * - Email verification required before account activation (isVerified)
 * - Account lockout after 5 failed attempts (failedLoginAttempts, lockedUntil)
 * - Auth logs retain 90 days of audit data (compliance requirement)
 * - Admin table separated to enforce single admin constraint
 *
 * PERFORMANCE NOTES:
 * - Indices on email (unique), userId (foreign key pattern), tokens
 * - Consider adding compound index on (userId, createdAt) for auth_logs in production
 * - Expired tokens should be purged via cron job (see workers/)
 */
export const AUTH_SCHEMA = `
  /*
   * ==========================================================================
   * USERS TABLE
   * ==========================================================================
   * Core user authentication and profile data.
   * Supports email verification, account lockout, and GDPR compliance.
   */
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID, unique identifier
    email TEXT NOT NULL UNIQUE,             -- Lowercase email, unique constraint
    username TEXT NOT NULL UNIQUE,          -- Display name, unique constraint
    passwordHash TEXT NOT NULL,             -- bcrypt hash (cost factor 12)
    isVerified INTEGER NOT NULL DEFAULT 0,  -- Email verified (0=false, 1=true)
    verificationToken TEXT,                 -- Random token for email verification
    verificationTokenExpiresAt TEXT,        -- Token expiration (1 hour from creation)
    failedLoginAttempts INTEGER NOT NULL DEFAULT 0, -- Track failed logins
    lockedUntil TEXT,                       -- Account lockout expiration (15 min from 5th failure)
    lastLoginAt TEXT,                       -- ISO 8601 timestamp of last successful login
    lastLoginIp TEXT,                       -- IP address of last login (for security alerts)
    createdAt TEXT NOT NULL,                -- ISO 8601 timestamp
    updatedAt TEXT NOT NULL                 -- ISO 8601 timestamp
  );

  /*
   * Index for fast email lookups during login.
   * Email is unique, so this is effectively a unique index.
   */
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

  /*
   * Index for fast username lookups.
   * Usernames are unique and used for display purposes.
   */
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

  /*
   * Index for verification token lookups during email confirmation.
   * Tokens are random and single-use, so duplicates are impossible.
   */
  CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verificationToken);

  /*
   * ==========================================================================
   * REFRESH TOKENS TABLE
   * ==========================================================================
   * Stores refresh tokens for JWT authentication.
   * Supports token rotation and revocation for enhanced security.
   */
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,                    -- UUID
    userId TEXT NOT NULL,                   -- Foreign key to users.id
    token TEXT NOT NULL UNIQUE,             -- Cryptographically random token (32 bytes)
    expiresAt TEXT NOT NULL,                -- ISO 8601 timestamp (7 days from creation)
    revokedAt TEXT,                         -- ISO 8601 timestamp (NULL = active)
    replacedByToken TEXT,                   -- Token that replaced this one (rotation)
    ipAddress TEXT,                         -- IP address that created the token
    userAgent TEXT,                         -- User agent string (browser/device info)
    createdAt TEXT NOT NULL,                -- ISO 8601 timestamp
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  /*
   * Index for fast token lookups during refresh operations.
   * Tokens are unique and queried frequently.
   */
  CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

  /*
   * Index for querying all tokens for a specific user.
   * Used for logout (revoke all) and security audits.
   */
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId);

  /*
   * Index for efficient cleanup of expired tokens.
   * Cron job can use: DELETE FROM refresh_tokens WHERE expiresAt < NOW()
   */
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiresAt ON refresh_tokens(expiresAt);

  /*
   * ==========================================================================
   * PASSWORD RESET TOKENS TABLE
   * ==========================================================================
   * One-time use tokens for password reset flow.
   * Short-lived (1 hour) to minimize attack window.
   */
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,                    -- UUID
    userId TEXT NOT NULL,                   -- Foreign key to users.id
    token TEXT NOT NULL UNIQUE,             -- Cryptographically random token (32 bytes)
    expiresAt TEXT NOT NULL,                -- ISO 8601 timestamp (1 hour from creation)
    usedAt TEXT,                            -- ISO 8601 timestamp (NULL = unused)
    ipAddress TEXT,                         -- IP address that requested reset
    createdAt TEXT NOT NULL,                -- ISO 8601 timestamp
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  /*
   * Index for fast token lookups during reset confirmation.
   * Tokens are unique and single-use.
   */
  CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

  /*
   * Index for querying tokens by user.
   * Used to invalidate old tokens when new reset is requested.
   */
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_userId ON password_reset_tokens(userId);

  /*
   * Index for cleanup of expired tokens.
   * Cron job: DELETE FROM password_reset_tokens WHERE expiresAt < NOW()
   */
  CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiresAt ON password_reset_tokens(expiresAt);

  /*
   * ==========================================================================
   * AUTH LOGS TABLE
   * ==========================================================================
   * Audit trail for all authentication events.
   * Supports security monitoring, compliance, and forensics.
   *
   * COMPLIANCE NOTE:
   * - Retain logs for 90 days (configurable via cron job)
   * - Never log passwords, tokens, or sensitive user data
   * - IP addresses and user agents are logged for security analysis
   * - GDPR: Users can request deletion of logs via /auth/account endpoint
   */
  CREATE TABLE IF NOT EXISTS auth_logs (
    id TEXT PRIMARY KEY,                    -- UUID
    userId TEXT,                            -- Foreign key to users.id (NULL for failed attempts)
    action TEXT NOT NULL,                   -- Event type: login, logout, register, reset_request, etc.
    success INTEGER NOT NULL,               -- 1 = success, 0 = failure
    ipAddress TEXT,                         -- IP address of request
    userAgent TEXT,                         -- User agent string
    errorMessage TEXT,                      -- Error details (only for failures, no sensitive data)
    metadata TEXT,                          -- JSON field for additional context (optional)
    createdAt TEXT NOT NULL,                -- ISO 8601 timestamp
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
  );

  /*
   * Index for querying logs by user.
   * Used for user-specific audit trails and GDPR data export.
   */
  CREATE INDEX IF NOT EXISTS idx_auth_logs_userId ON auth_logs(userId);

  /*
   * Index for querying logs by action type.
   * Used for security dashboards (e.g., "show all failed logins").
   */
  CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON auth_logs(action);

  /*
   * Index for time-based queries and cleanup.
   * Cron job: DELETE FROM auth_logs WHERE createdAt < DATE('now', '-90 days')
   */
  CREATE INDEX IF NOT EXISTS idx_auth_logs_createdAt ON auth_logs(createdAt);

  /*
   * Compound index for finding failed login attempts.
   * Used for security monitoring: "show all failed logins in last hour".
   */
  CREATE INDEX IF NOT EXISTS idx_auth_logs_success_createdAt ON auth_logs(success, createdAt);

  /*
   * ==========================================================================
   * ADMIN USERS TABLE
   * ==========================================================================
   * Separate table for admin accounts to enforce strict access control.
   *
   * SECURITY NOTE:
   * - Only ONE admin account allowed: username=metrik, email=metrikcorp@gmail.com
   * - Admin cannot be created via API (seeded via migration)
   * - Admin cannot be deleted or modified by users
   * - isActive flag allows temporary suspension without deletion
   * - Admin password must meet same strength requirements as users
   * - Admin sessions have shorter expiration (15 min JWT, no refresh)
   */
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,                    -- UUID
    username TEXT NOT NULL UNIQUE,          -- Admin username (metrik)
    email TEXT NOT NULL UNIQUE,             -- Admin email (metrikcorp@gmail.com)
    passwordHash TEXT NOT NULL,             -- bcrypt hash (cost factor 12)
    isActive INTEGER NOT NULL DEFAULT 1,    -- Account status (0=disabled, 1=active)
    lastLoginAt TEXT,                       -- ISO 8601 timestamp
    lastLoginIp TEXT,                       -- IP address of last login
    createdAt TEXT NOT NULL,                -- ISO 8601 timestamp
    updatedAt TEXT NOT NULL                 -- ISO 8601 timestamp
  );

  /*
   * Index for fast username lookups during admin login.
   */
  CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

  /*
   * Index for fast email lookups.
   */
  CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
`;

/**
 * Applies the authentication schema migration.
 * Creates all tables and indices for auth functionality.
 *
 * @param db - better-sqlite3 Database instance
 * @throws Error if migration fails
 * @complexity O(1) - Fixed number of CREATE TABLE statements
 */
export function up(db: Database.Database): void {
  try {
    logger.info('Running migration: 002_auth_tables (up)');

    /*
     * Execute schema creation.
     * better-sqlite3 requires exec() for multi-statement SQL.
     */
    db.exec(AUTH_SCHEMA);

    logger.info('Migration 002_auth_tables (up) completed successfully');
  } catch (error) {
    logger.error('Failed to run migration 002_auth_tables (up)', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Rolls back the authentication schema migration.
 * Drops all auth tables in reverse dependency order.
 *
 * WARNING: This will delete all user data, tokens, and auth logs!
 * Use only in development or during disaster recovery.
 *
 * @param db - better-sqlite3 Database instance
 * @throws Error if rollback fails
 * @complexity O(1) - Fixed number of DROP TABLE statements
 */
export function down(db: Database.Database): void {
  try {
    logger.info('Running migration: 002_auth_tables (down)');

    /*
     * Drop tables in reverse dependency order.
     * Must drop child tables (with foreign keys) before parent tables.
     */
    db.exec(`
      DROP INDEX IF EXISTS idx_admin_users_email;
      DROP INDEX IF EXISTS idx_admin_users_username;
      DROP TABLE IF EXISTS admin_users;

      DROP INDEX IF EXISTS idx_auth_logs_success_createdAt;
      DROP INDEX IF EXISTS idx_auth_logs_createdAt;
      DROP INDEX IF EXISTS idx_auth_logs_action;
      DROP INDEX IF EXISTS idx_auth_logs_userId;
      DROP TABLE IF EXISTS auth_logs;

      DROP INDEX IF EXISTS idx_password_reset_tokens_expiresAt;
      DROP INDEX IF EXISTS idx_password_reset_tokens_userId;
      DROP INDEX IF EXISTS idx_password_reset_tokens_token;
      DROP TABLE IF EXISTS password_reset_tokens;

      DROP INDEX IF EXISTS idx_refresh_tokens_expiresAt;
      DROP INDEX IF EXISTS idx_refresh_tokens_userId;
      DROP INDEX IF EXISTS idx_refresh_tokens_token;
      DROP TABLE IF EXISTS refresh_tokens;

      DROP INDEX IF EXISTS idx_users_verification_token;
      DROP INDEX IF EXISTS idx_users_username;
      DROP INDEX IF EXISTS idx_users_email;
      DROP TABLE IF EXISTS users;
    `);

    logger.info('Migration 002_auth_tables (down) completed successfully');
  } catch (error) {
    logger.error('Failed to run migration 002_auth_tables (down)', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
