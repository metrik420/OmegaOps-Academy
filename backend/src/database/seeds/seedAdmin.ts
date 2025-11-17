/**
 * FILE: src/database/seeds/seedAdmin.ts
 * PURPOSE: Seeds the single admin user (metrik) into the database.
 *          This is the ONLY admin account allowed in the system.
 * INPUTS: Database instance
 * OUTPUTS: Admin user created in admin_users table
 * SIDE EFFECTS:
 *   - Creates admin user with username=metrik, email=metrikcorp@gmail.com
 *   - Password hashed with bcrypt cost 12
 *   - Skips creation if admin already exists (idempotent)
 * NOTES:
 *   - Default password: Cooldog420 (must be changed after first login in production)
 *   - This seed runs automatically on first database initialization
 *   - Admin cannot be created via API (security measure)
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db';
import { logger } from '../../utils/logger';

/**
 * Admin credentials.
 * SECURITY: Change password immediately after first login in production!
 */
const ADMIN_USERNAME = 'metrik';
const ADMIN_EMAIL = 'metrikcorp@gmail.com';
const ADMIN_PASSWORD = 'Cooldog420';

/**
 * bcrypt cost factor 12 (~250ms per hash).
 * Same as user passwords for consistency.
 */
const BCRYPT_ROUNDS = 12;

/**
 * Seeds the admin user into the database.
 * Idempotent: Skips if admin already exists.
 *
 * @returns Promise<void>
 * @throws Error if seeding fails
 * @complexity O(1) - Single INSERT or skip
 * @security Password hashed with bcrypt before storage
 */
export async function seedAdmin(): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  try {
    logger.info('Seeding admin user...');

    /*
     * Check if admin already exists.
     * Makes this function idempotent (safe to run multiple times).
     */
    const existingAdmin = db
      .prepare('SELECT id FROM admin_users WHERE username = ?')
      .get(ADMIN_USERNAME);

    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping seed.');
      return;
    }

    /*
     * Hash admin password with bcrypt.
     * Same cost factor as user passwords (12 rounds).
     */
    logger.info('Hashing admin password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    /*
     * Create admin user.
     */
    const adminId = uuidv4();
    db.prepare(`
      INSERT INTO admin_users (id, username, email, passwordHash, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(
      adminId,
      ADMIN_USERNAME,
      ADMIN_EMAIL,
      passwordHash,
      now,
      now
    );

    logger.info('Admin user seeded successfully', {
      adminId,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
    });

    /*
     * SECURITY WARNING: Log reminder to change password.
     */
    logger.warn('SECURITY: Change admin password immediately in production!', {
      username: ADMIN_USERNAME,
      defaultPassword: 'Cooldog420',
    });

    console.log('\n===========================================');
    console.log('  ADMIN USER CREATED');
    console.log('===========================================');
    console.log(`  Username: ${ADMIN_USERNAME}`);
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('===========================================');
    console.log('  SECURITY WARNING:');
    console.log('  Change this password immediately!');
    console.log('===========================================\n');

  } catch (error) {
    logger.error('Failed to seed admin user', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
