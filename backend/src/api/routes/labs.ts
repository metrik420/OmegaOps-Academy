/**
 * FILE: src/api/routes/labs.ts
 * PURPOSE: API routes for hands-on lab scenarios.
 *          Labs provide practical exercises beyond structured missions.
 * INPUTS: Query parameters for filtering, path parameters for IDs
 * OUTPUTS: JSON responses with lab data
 * NOTES:
 *   - Labs are more open-ended than missions
 *   - Categorized by difficulty level
 *   - Include progressive hints for stuck learners
 *   - XP awarded on completion (frontend tracks)
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, Errors } from '../middleware/errorHandler';
import { getDatabase, parseJsonField } from '../../database/db';
import { logger } from '../../utils/logger';
import { validate, labQuerySchema, labIdParamSchema } from '../../utils/validation';
import { Lab, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/labs
 *
 * Lists all labs with optional filtering by difficulty.
 * Supports pagination for large collections.
 *
 * Query parameters:
 * - difficulty (optional): beginner | intermediate | advanced
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (default 20, max 100)
 *
 * PERFORMANCE NOTE:
 * Indexed on difficulty for efficient filtering.
 * Labs are typically fewer than missions, so pagination is less critical.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validation = validate(labQuerySchema, req.query);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid query parameters: ${validation.errors.join(', ')}`);
    }

    const { difficulty } = validation.data;
    const page = validation.data.page!;
    const limit = validation.data.limit!;
    const db = getDatabase();

    /*
     * Build dynamic SQL with optional difficulty filter.
     * Using parameterized queries for security.
     */
    let sql = 'SELECT * FROM labs WHERE 1=1';
    const params: unknown[] = [];

    if (difficulty) {
      sql += ' AND difficulty = ?';
      params.push(difficulty);
    }

    /*
     * Order by difficulty (beginner first) then by creation date.
     * This presents labs in a logical progression.
     */
    sql += ` ORDER BY
      CASE difficulty
        WHEN 'beginner' THEN 1
        WHEN 'intermediate' THEN 2
        WHEN 'advanced' THEN 3
      END ASC,
      createdAt DESC`;

    // Get total count for pagination
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countStmt = db.prepare(countSql);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Apply pagination
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Array<Record<string, unknown>>;

    /*
     * Transform database rows to Lab objects.
     * Parse JSON fields from TEXT storage.
     */
    const labs: Lab[] = rows.map((row) => ({
      id: row['id'] as string,
      title: row['title'] as string,
      description: row['description'] as string,
      difficulty: row['difficulty'] as Lab['difficulty'],
      xpReward: row['xpReward'] as number,
      scenarioDescription: row['scenarioDescription'] as string,
      objectives: parseJsonField<string[]>(row['objectives'], []),
      hints: parseJsonField<string[]>(row['hints'], []),
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    }));

    const response: ApiResponse<Lab[]> = {
      success: true,
      data: labs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    logger.debug('Labs retrieved', {
      count: labs.length,
      total,
      filter: { difficulty },
      page,
    });

    res.json(response);
  })
);

/**
 * GET /api/labs/:id
 *
 * Retrieves a single lab by its ID.
 * Returns full lab details including hints and objectives.
 *
 * Path parameters:
 * - id: Lab UUID
 *
 * PEDAGOGY NOTE:
 * Hints are returned in order of increasing helpfulness.
 * Frontend should reveal them progressively as learner requests help.
 * This encourages problem-solving before giving answers.
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameter
    const validation = validate(labIdParamSchema, req.params);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid lab ID: ${validation.errors.join(', ')}`);
    }

    const { id } = validation.data;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM labs WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      throw Errors.notFound('Lab');
    }

    const lab: Lab = {
      id: row['id'] as string,
      title: row['title'] as string,
      description: row['description'] as string,
      difficulty: row['difficulty'] as Lab['difficulty'],
      xpReward: row['xpReward'] as number,
      scenarioDescription: row['scenarioDescription'] as string,
      objectives: parseJsonField<string[]>(row['objectives'], []),
      hints: parseJsonField<string[]>(row['hints'], []),
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    };

    const response: ApiResponse<Lab> = {
      success: true,
      data: lab,
    };

    logger.debug('Lab retrieved', { id, title: lab.title });

    res.json(response);
  })
);

/**
 * POST /api/labs/:id/complete
 *
 * Marks a lab as completed and returns awarded XP.
 * Similar to mission completion but simpler (no quiz).
 *
 * Request body (optional):
 * - hintsUsed: Number of hints the learner used (0-n)
 *
 * Response includes:
 * - Base XP reward
 * - Penalty for hints used (optional)
 * - Total XP earned
 * - Completion timestamp
 *
 * GAMIFICATION NOTE:
 * Consider reducing XP for hint usage to incentivize independent problem-solving.
 * But don't punish too harshly - hints are there to help, not to penalize.
 */
router.post(
  '/:id/complete',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameter
    const paramValidation = validate(labIdParamSchema, req.params);
    if (!paramValidation.success) {
      throw Errors.badRequest(`Invalid lab ID: ${paramValidation.errors.join(', ')}`);
    }

    const { id } = paramValidation.data;
    const hintsUsed = typeof req.body['hintsUsed'] === 'number' ? req.body['hintsUsed'] : 0;

    const db = getDatabase();

    // Verify lab exists and get XP reward
    const stmt = db.prepare('SELECT id, title, xpReward, hints FROM labs WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      throw Errors.notFound('Lab');
    }

    const baseXpReward = row['xpReward'] as number;
    const labTitle = row['title'] as string;
    const hints = parseJsonField<string[]>(row['hints'], []);

    /*
     * Calculate XP with optional hint penalty.
     *
     * Penalty formula:
     * - Each hint used reduces XP by 5%
     * - Maximum penalty: 25% (using all hints still gives 75% XP)
     *
     * This balances:
     * - Rewarding independent problem-solving
     * - Not punishing learners who need help
     * - Encouraging hint usage when truly stuck
     */
    const hintPenaltyPercent = Math.min(hintsUsed * 5, 25); // Max 25% penalty
    const hintPenalty = Math.round(baseXpReward * (hintPenaltyPercent / 100));
    const totalXp = baseXpReward - hintPenalty;

    const completionData = {
      labId: id,
      labTitle,
      baseXpReward,
      hintsUsed,
      totalHintsAvailable: hints.length,
      hintPenalty,
      totalXpEarned: totalXp,
      completedAt: new Date().toISOString(),
    };

    logger.info('Lab completed', {
      labId: id,
      labTitle,
      totalXpEarned: totalXp,
      hintsUsed,
    });

    const response: ApiResponse<typeof completionData> = {
      success: true,
      data: completionData,
    };

    res.json(response);
  })
);

export default router;
