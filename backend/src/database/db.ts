/**
 * FILE: src/database/db.ts
 * PURPOSE: SQLite database initialization and management for OmegaOps Academy.
 *          Provides a singleton database instance with schema initialization.
 * INPUTS: DATABASE_PATH from environment variables
 * OUTPUTS: Configured better-sqlite3 Database instance
 * SIDE EFFECTS:
 *   - Creates database file on disk if it doesn't exist
 *   - Creates tables if they don't exist
 *   - Enables WAL mode for better concurrent read performance
 * NOTES:
 *   - Uses better-sqlite3 for synchronous API (simpler than async sqlite3)
 *   - JSON fields are stored as TEXT and parsed at application level
 *   - All timestamps are ISO 8601 strings for portability
 *   - Schema uses TEXT for enums (SQLite doesn't have enum type)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Singleton database instance.
 * Initialized lazily on first access to ensure config is loaded.
 */
let db: Database.Database | null = null;

/**
 * SQL schema for all tables.
 *
 * IMPORTANT SECURITY NOTE:
 * - JSON fields (objectives, tasks, etc.) are stored as TEXT
 * - ALWAYS validate and sanitize JSON before insertion
 * - NEVER trust JSON content from external sources without validation
 *
 * PERFORMANCE NOTE:
 * - Indexes added on frequently queried columns (week, day, status, category)
 * - Consider adding full-text search (FTS5) for content search in production
 */
const SCHEMA = `
  /*
   * MISSIONS TABLE
   * Stores all learning missions organized by week and day.
   * Primary content delivery mechanism for the 12-week curriculum.
   */
  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,              -- UUID, unique identifier
    week INTEGER NOT NULL,            -- Week number (1-12)
    day INTEGER NOT NULL,             -- Day of week (1-7)
    title TEXT NOT NULL,              -- Mission title
    narrative TEXT NOT NULL,          -- Story/context for engagement
    objectives JSON NOT NULL,         -- Learning objectives array
    warmup JSON NOT NULL,             -- Pre-mission questions
    tasks JSON NOT NULL,              -- Ordered task list
    quiz JSON NOT NULL,               -- Post-mission assessment
    xpReward INTEGER NOT NULL,        -- Total XP for completion
    createdAt TEXT NOT NULL,          -- ISO 8601 timestamp
    updatedAt TEXT NOT NULL,          -- ISO 8601 timestamp
    UNIQUE(week, day)                 -- One mission per week/day combo
  );

  /* Index for efficient week-based queries (e.g., "show me week 3") */
  CREATE INDEX IF NOT EXISTS idx_missions_week ON missions(week);

  /* Index for efficient day lookups within a week */
  CREATE INDEX IF NOT EXISTS idx_missions_week_day ON missions(week, day);

  /*
   * LABS TABLE
   * Hands-on practice environments with real-world scenarios.
   * More open-ended than missions, encourages experimentation.
   */
  CREATE TABLE IF NOT EXISTS labs (
    id TEXT PRIMARY KEY,              -- UUID
    title TEXT NOT NULL,              -- Lab title
    description TEXT NOT NULL,        -- Brief overview
    difficulty TEXT NOT NULL,         -- beginner/intermediate/advanced
    xpReward INTEGER NOT NULL,        -- XP for completion
    scenarioDescription TEXT NOT NULL, -- Detailed scenario setup
    objectives JSON NOT NULL,         -- Success criteria
    hints JSON NOT NULL,              -- Progressive hints
    createdAt TEXT NOT NULL,          -- ISO 8601 timestamp
    updatedAt TEXT NOT NULL           -- ISO 8601 timestamp
  );

  /* Index for filtering labs by difficulty */
  CREATE INDEX IF NOT EXISTS idx_labs_difficulty ON labs(difficulty);

  /*
   * KNOWLEDGE TOPICS TABLE
   * Interconnected knowledge base entries.
   * Links to missions/labs where concepts are applied.
   */
  CREATE TABLE IF NOT EXISTS knowledge_topics (
    id TEXT PRIMARY KEY,              -- UUID
    title TEXT NOT NULL,              -- Topic title (searchable)
    description TEXT NOT NULL,        -- Brief summary
    category TEXT NOT NULL,           -- Grouping category
    content TEXT NOT NULL,            -- Full content in Markdown
    relatedMissions JSON NOT NULL,    -- Array of mission IDs
    relatedLabs JSON NOT NULL,        -- Array of lab IDs
    sources JSON NOT NULL,            -- External source references
    confidenceLevel TEXT NOT NULL,    -- high/medium/experimental
    lastVerifiedAt TEXT NOT NULL,     -- When last checked for accuracy
    createdAt TEXT NOT NULL,          -- ISO 8601 timestamp
    updatedAt TEXT NOT NULL           -- ISO 8601 timestamp
  );

  /* Index for category-based filtering */
  CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_topics(category);

  /* Index for confidence level filtering (show only high-confidence content) */
  CREATE INDEX IF NOT EXISTS idx_knowledge_confidence ON knowledge_topics(confidenceLevel);

  /*
   * SOFTWARE TOOLS TABLE
   * Living database of server administration software.
   * Automatically updated by workers, requires admin approval.
   *
   * WORKFLOW:
   * 1. Worker discovers tool -> status = 'discovered'
   * 2. Admin approves -> status = 'approved'
   * 3. Worker updates docs -> creates pending_update
   * 4. Tool becomes obsolete -> status = 'deprecated'
   */
  CREATE TABLE IF NOT EXISTS software_tools (
    id TEXT PRIMARY KEY,              -- UUID
    name TEXT NOT NULL,               -- Tool name (e.g., "Nginx")
    category TEXT NOT NULL,           -- Category (e.g., "Web Server")
    description TEXT NOT NULL,        -- What the tool does
    useCases JSON NOT NULL,           -- Common use cases
    difficulty TEXT NOT NULL,         -- beginner/intermediate/advanced
    supportedEnvironments JSON NOT NULL, -- Where it runs
    installGuides JSON NOT NULL,      -- Installation instructions
    configGuides JSON NOT NULL,       -- Configuration examples
    status TEXT NOT NULL,             -- seeded/discovered/approved/deprecated
    relevanceScore INTEGER NOT NULL,  -- 0-100 ranking score
    firstSeenAt TEXT NOT NULL,        -- When first discovered
    lastUpdatedAt TEXT NOT NULL,      -- When info was updated
    lastVerifiedAt TEXT NOT NULL,     -- When verified accurate
    sources JSON NOT NULL,            -- Source references
    confidenceLevel TEXT NOT NULL     -- high/medium/experimental
  );

  /* Index for filtering by category */
  CREATE INDEX IF NOT EXISTS idx_software_category ON software_tools(category);

  /* Index for filtering by status (show only approved tools) */
  CREATE INDEX IF NOT EXISTS idx_software_status ON software_tools(status);

  /* Index for filtering by difficulty */
  CREATE INDEX IF NOT EXISTS idx_software_difficulty ON software_tools(difficulty);

  /* Index for sorting by relevance */
  CREATE INDEX IF NOT EXISTS idx_software_relevance ON software_tools(relevanceScore DESC);

  /*
   * PENDING UPDATES TABLE
   * Content moderation queue for automated updates.
   * Workers propose changes, admins review and approve/reject.
   *
   * SECURITY NOTE:
   * This table holds proposed content that hasn't been reviewed.
   * NEVER expose proposedContent directly to users without admin review.
   */
  CREATE TABLE IF NOT EXISTS pending_updates (
    id TEXT PRIMARY KEY,              -- UUID
    type TEXT NOT NULL,               -- mission/lab/knowledge/software/config
    entityId TEXT NOT NULL,           -- ID of entity being updated
    changesSummary TEXT NOT NULL,     -- Human-readable summary
    proposedContent JSON NOT NULL,    -- The actual changes (JSON)
    status TEXT NOT NULL,             -- pending/approved/rejected
    proposedBy TEXT NOT NULL,         -- Worker name that proposed
    reviewedBy TEXT,                  -- Admin who reviewed (nullable)
    reviewedAt TEXT,                  -- When reviewed (nullable)
    appliedAt TEXT,                   -- When applied (nullable)
    createdAt TEXT NOT NULL,          -- ISO 8601 timestamp
    updatedAt TEXT NOT NULL           -- ISO 8601 timestamp
  );

  /* Index for filtering by status (show pending updates for admin) */
  CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_updates(status);

  /* Index for filtering by type */
  CREATE INDEX IF NOT EXISTS idx_pending_type ON pending_updates(type);

  /* Composite index for efficient "pending by type" queries */
  CREATE INDEX IF NOT EXISTS idx_pending_status_type ON pending_updates(status, type);

  /*
   * CHANGELOG TABLE
   * Audit trail of all applied changes.
   * Provides transparency and helps users see what's new.
   */
  CREATE TABLE IF NOT EXISTS changelog (
    id TEXT PRIMARY KEY,              -- UUID
    entryType TEXT NOT NULL,          -- update/deprecation/new_tool
    affectedEntities JSON NOT NULL,   -- IDs of affected entities
    summary TEXT NOT NULL,            -- Human-readable summary
    appliedAt TEXT NOT NULL,          -- When change was applied
    createdAt TEXT NOT NULL           -- ISO 8601 timestamp
  );

  /* Index for filtering by entry type */
  CREATE INDEX IF NOT EXISTS idx_changelog_type ON changelog(entryType);

  /* Index for sorting by application date */
  CREATE INDEX IF NOT EXISTS idx_changelog_applied ON changelog(appliedAt DESC);
`;

/**
 * Initializes the SQLite database connection.
 * Creates database file and tables if they don't exist.
 *
 * @returns Database instance ready for queries
 * @throws Error if database initialization fails
 *
 * PERFORMANCE NOTE:
 * - Enables WAL mode for better read concurrency
 * - Sets busy timeout to handle concurrent access
 * - Uses synchronous = NORMAL (balance of safety and speed)
 */
export function initializeDatabase(): Database.Database {
  // Return existing instance if already initialized (singleton pattern)
  if (db) {
    return db;
  }

  // Get database path from environment, default to ./data/omegaops.db
  const dbPath = process.env['DATABASE_PATH'] || './data/omegaops.db';
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  // Ensure directory exists
  const dbDir = path.dirname(absolutePath);
  if (!fs.existsSync(dbDir)) {
    logger.info(`Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info(`Initializing database at: ${absolutePath}`);

  try {
    /*
     * Create database instance with these options:
     * - verbose: Log SQL queries in development (disabled for performance)
     * - fileMustExist: false to auto-create database file
     * - timeout: 5000ms for busy waiting
     */
    db = new Database(absolutePath, {
      // Only enable verbose logging in debug mode
      verbose: process.env['LOG_LEVEL'] === 'debug'
        ? (msg) => logger.debug(`SQL: ${msg}`)
        : undefined,
    });

    /*
     * PRAGMA settings for optimal performance and safety:
     *
     * journal_mode = WAL:
     *   Write-Ahead Logging for better concurrent read performance.
     *   Readers don't block writers and vice versa.
     *
     * synchronous = NORMAL:
     *   Balance between safety and speed.
     *   FULL is safer but slower, OFF is fastest but risks corruption.
     *
     * foreign_keys = ON:
     *   Enforce referential integrity (though we're not using FKs in MVP).
     *
     * busy_timeout = 5000:
     *   Wait up to 5 seconds if database is locked (concurrent access).
     */
    if (process.env['DATABASE_WAL_MODE'] !== 'false') {
      db.pragma('journal_mode = WAL');
      logger.info('SQLite WAL mode enabled');
    }

    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    // Execute schema creation (all CREATE TABLE IF NOT EXISTS statements)
    logger.info('Initializing database schema...');
    db.exec(SCHEMA);
    logger.info('Database schema initialized successfully');

    return db;
  } catch (error) {
    logger.error('Failed to initialize database', {
      error: error instanceof Error ? error.message : String(error),
      path: absolutePath
    });
    throw error;
  }
}

/**
 * Gets the database instance, initializing if necessary.
 *
 * @returns Database instance
 * @throws Error if database cannot be initialized
 *
 * USAGE:
 * ```typescript
 * import { getDatabase } from './database/db';
 * const db = getDatabase();
 * const missions = db.prepare('SELECT * FROM missions').all();
 * ```
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Closes the database connection gracefully.
 * Should be called on application shutdown.
 *
 * IMPORTANT: Call this in process exit handlers to ensure data integrity.
 */
export function closeDatabase(): void {
  if (db) {
    logger.info('Closing database connection');
    db.close();
    db = null;
  }
}

/**
 * Clears all data from all tables (for testing only).
 *
 * WARNING: This permanently deletes all data!
 * Only use in test environment.
 *
 * @throws Error if not in test environment
 */
export function clearDatabase(): void {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('clearDatabase can only be called in test environment');
  }

  const database = getDatabase();

  // Delete in order that respects potential foreign keys
  database.exec(`
    DELETE FROM changelog;
    DELETE FROM pending_updates;
    DELETE FROM software_tools;
    DELETE FROM knowledge_topics;
    DELETE FROM labs;
    DELETE FROM missions;
  `);

  logger.info('Database cleared (test environment)');
}

/**
 * Helper to get current ISO 8601 timestamp.
 * Used consistently across all database operations.
 *
 * @returns ISO 8601 formatted timestamp string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Type-safe wrapper for parsing JSON fields from SQLite.
 * SQLite stores JSON as TEXT, this safely parses it back.
 *
 * @param jsonString - JSON string from database
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed JSON or default value
 *
 * SECURITY NOTE:
 * JSON.parse can throw on malformed input.
 * Always provide a sensible default and log parsing errors.
 */
export function parseJsonField<T>(jsonString: unknown, defaultValue: T): T {
  if (typeof jsonString !== 'string') {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.warn('Failed to parse JSON field', {
      error: error instanceof Error ? error.message : String(error),
      value: jsonString.substring(0, 100) // Log first 100 chars for debugging
    });
    return defaultValue;
  }
}

/**
 * Safely stringify value for JSON storage in SQLite.
 *
 * @param value - Value to stringify
 * @returns JSON string
 */
export function stringifyForDb(value: unknown): string {
  return JSON.stringify(value);
}

// Export database instance for direct use (convenience)
export { db };
