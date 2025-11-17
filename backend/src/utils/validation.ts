/**
 * FILE: src/utils/validation.ts
 * PURPOSE: Input validation schemas using Zod for type-safe validation.
 *          Provides reusable validators for API request data.
 * INPUTS: Raw request data from Express routes
 * OUTPUTS: Validated, typed data or validation errors
 * NOTES:
 *   - All user input MUST pass through validation before processing
 *   - Zod provides both runtime validation and TypeScript type inference
 *   - Validation errors are user-friendly (not exposing internals)
 *   - Schemas strip unknown fields to prevent injection
 */

import { z } from 'zod';

// =============================================================================
// COMMON VALIDATORS
// =============================================================================

/**
 * UUID validator.
 * All entity IDs are UUIDs for security (no sequential IDs).
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Pagination parameters validator.
 * Limits are enforced to prevent DoS via large requests.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20), // Max 100 to prevent overload
});

/**
 * Difficulty level validator.
 */
export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);

/**
 * Confidence level validator.
 */
export const confidenceLevelSchema = z.enum(['high', 'medium', 'experimental']);

/**
 * Software tool status validator.
 */
export const toolStatusSchema = z.enum(['seeded', 'discovered', 'approved', 'deprecated']);

/**
 * Pending update status validator.
 */
export const updateStatusSchema = z.enum(['pending', 'approved', 'rejected']);

// =============================================================================
// MISSION VALIDATORS
// =============================================================================

/**
 * Query parameters for GET /api/missions.
 * Allows filtering by week and day.
 */
export const missionQuerySchema = z.object({
  week: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(7).optional(),
}).merge(paginationSchema);

/**
 * Parameters for GET /api/missions/:id.
 */
export const missionIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Body for POST /api/missions/:id/complete.
 * Includes quiz score for XP calculation.
 */
export const missionCompleteSchema = z.object({
  quizScore: z.number().int().min(0).max(100).optional(),
  completedTaskIds: z.array(uuidSchema).optional(),
});

// =============================================================================
// LAB VALIDATORS
// =============================================================================

/**
 * Query parameters for GET /api/labs.
 * Allows filtering by difficulty.
 */
export const labQuerySchema = z.object({
  difficulty: difficultySchema.optional(),
}).merge(paginationSchema);

/**
 * Parameters for GET /api/labs/:id.
 */
export const labIdParamSchema = z.object({
  id: uuidSchema,
});

// =============================================================================
// KNOWLEDGE VALIDATORS
// =============================================================================

/**
 * Query parameters for GET /api/knowledge.
 * Allows filtering by category and confidence level.
 */
export const knowledgeQuerySchema = z.object({
  category: z.string().min(1).max(100).optional(),
  confidenceLevel: confidenceLevelSchema.optional(),
  search: z.string().min(1).max(200).optional(), // Simple text search
}).merge(paginationSchema);

/**
 * Parameters for GET /api/knowledge/:topicId.
 */
export const knowledgeIdParamSchema = z.object({
  topicId: uuidSchema,
});

// =============================================================================
// SOFTWARE VALIDATORS
// =============================================================================

/**
 * Query parameters for GET /api/software.
 * Supports multiple filters for finding relevant tools.
 */
export const softwareQuerySchema = z.object({
  category: z.string().min(1).max(100).optional(),
  environment: z.string().min(1).max(50).optional(),
  difficulty: difficultySchema.optional(),
  status: toolStatusSchema.optional(),
  search: z.string().min(1).max(200).optional(),
}).merge(paginationSchema);

/**
 * Parameters for GET /api/software/:id.
 */
export const softwareIdParamSchema = z.object({
  id: uuidSchema,
});

// =============================================================================
// UPDATES VALIDATORS
// =============================================================================

/**
 * Query parameters for GET /api/updates.
 * Allows filtering by status and type.
 */
export const updatesQuerySchema = z.object({
  status: updateStatusSchema.optional(),
  type: z.enum(['mission', 'lab', 'knowledge', 'software', 'config']).optional(),
}).merge(paginationSchema);

/**
 * Parameters for admin approval/rejection routes.
 */
export const updateIdParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Body for rejection (optional reason).
 */
export const rejectUpdateSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

// =============================================================================
// PROGRESS VALIDATORS
// =============================================================================

/**
 * Progress update request body.
 * Validates structure of client-side progress data.
 */
export const progressUpdateSchema = z.object({
  totalXp: z.number().int().min(0),
  level: z.number().int().min(1),
  completedMissions: z.array(uuidSchema),
  completedLabs: z.array(uuidSchema),
  missionProgress: z.record(
    uuidSchema,
    z.object({
      completedTaskIds: z.array(uuidSchema),
      quizScore: z.number().int().min(0).max(100).optional(),
      completedAt: z.string().datetime().optional(),
    })
  ),
  achievements: z.array(z.string().min(1).max(100)),
  lastActiveAt: z.string().datetime(),
});

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Result type for validation operations.
 * Either success with typed data, or failure with user-friendly errors.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Validates data against a Zod schema.
 * Returns user-friendly error messages, not internal details.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns ValidationResult with typed data or error messages
 *
 * SECURITY NOTE:
 * Error messages are sanitized to not expose schema internals.
 * They're descriptive enough for users but don't leak implementation.
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors into user-friendly messages
  const errors = result.error.errors.map((err) => {
    const path = err.path.join('.');
    return path ? `${path}: ${err.message}` : err.message;
  });

  return { success: false, errors };
}

/**
 * Sanitizes string input to prevent XSS.
 * Basic HTML entity encoding for text fields.
 *
 * @param input - User-provided string
 * @returns Sanitized string
 *
 * NOTE: This is a basic sanitizer. For rich text (Markdown),
 * use a dedicated library like DOMPurify on the frontend.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates that a string doesn't contain SQL-like patterns.
 * Extra paranoia layer on top of parameterized queries.
 *
 * @param input - User-provided string
 * @returns true if safe, false if suspicious
 *
 * NOTE: This is NOT a replacement for parameterized queries.
 * It's an additional detection mechanism for logging/alerting.
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL meta characters
    /(\%3D)|(=)/i, // Equals sign (common in injection)
    /(union.*select)/i, // UNION SELECT
    /(select.*from)/i, // SELECT FROM
    /(insert.*into)/i, // INSERT INTO
    /(delete.*from)/i, // DELETE FROM
    /(drop.*table)/i, // DROP TABLE
    /(update.*set)/i, // UPDATE SET
    /(\bor\b.*\b=\b)/i, // OR-based injection
    /(\band\b.*\b=\b)/i, // AND-based injection
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}
