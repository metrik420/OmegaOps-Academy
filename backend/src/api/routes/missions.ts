/**
 * FILE: src/api/routes/missions.ts
 * PURPOSE: API routes for mission CRUD operations.
 *          Missions are the primary learning content delivery mechanism.
 * INPUTS: Query parameters for filtering, path parameters for IDs
 * OUTPUTS: JSON responses with mission data
 * NOTES:
 *   - Missions are organized by week (1-12) and day (1-7)
 *   - Each mission has tasks, warmup questions, and quiz
 *   - XP is awarded on completion
 *   - Frontend tracks completion in localStorage
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, Errors } from '../middleware/errorHandler';
import { getDatabase, parseJsonField, getCurrentTimestamp } from '../../database/db';
import { logger } from '../../utils/logger';
import {
  validate,
  missionQuerySchema,
  missionIdParamSchema,
  missionCompleteSchema,
} from '../../utils/validation';
import { Mission, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/missions
 *
 * Lists all missions with optional filtering by week and day.
 * Supports pagination for large result sets.
 *
 * Query parameters:
 * - week (optional): Filter by week number (1-12)
 * - day (optional): Filter by day number (1-7)
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (default 20, max 100)
 *
 * PERFORMANCE NOTE:
 * Uses indexed columns (week, day) for efficient filtering.
 * Pagination prevents loading entire curriculum at once.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validation = validate(missionQuerySchema, req.query);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid query parameters: ${validation.errors.join(', ')}`);
    }

    const { week, day } = validation.data;
    // page and limit have defaults in the schema, so they're always defined
    const page = validation.data.page;
    const limit = validation.data.limit;
    const db = getDatabase();

    /*
     * Build dynamic SQL query based on filters.
     * Using parameterized queries to prevent SQL injection.
     */
    let sql = 'SELECT * FROM missions WHERE 1=1';
    const params: unknown[] = [];

    if (week !== undefined) {
      sql += ' AND week = ?';
      params.push(week);
    }

    if (day !== undefined) {
      sql += ' AND day = ?';
      params.push(day);
    }

    sql += ' ORDER BY week ASC, day ASC';

    /*
     * Get total count for pagination metadata.
     * Needed to calculate total pages.
     */
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countStmt = db.prepare(countSql);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    /*
     * Apply pagination with LIMIT and OFFSET.
     * OFFSET = (page - 1) * limit
     */
    const offset = (page! - 1) * limit!;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Array<Record<string, unknown>>;

    /*
     * Transform database rows to Mission objects.
     * JSON fields need parsing from TEXT storage.
     */
    const missions: Mission[] = rows.map((row) => ({
      id: row['id'] as string,
      week: row['week'] as number,
      day: row['day'] as number,
      title: row['title'] as string,
      narrative: row['narrative'] as string,
      objectives: parseJsonField<string[]>(row['objectives'], []),
      warmup: parseJsonField(row['warmup'], []),
      tasks: parseJsonField(row['tasks'], []),
      quiz: parseJsonField(row['quiz'], []),
      xpReward: row['xpReward'] as number,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    }));

    const response: ApiResponse<Mission[]> = {
      success: true,
      data: missions,
      meta: {
        total,
        page: page!,
        limit: limit!,
        totalPages: Math.ceil(total / limit!),
      },
    };

    logger.debug('Missions retrieved', {
      count: missions.length,
      total,
      filters: { week, day },
      page,
    });

    res.json(response);
  })
);

/**
 * GET /api/missions/:id
 *
 * Retrieves a single mission by its ID.
 * Returns full mission details including tasks and quiz.
 *
 * Path parameters:
 * - id: Mission UUID
 *
 * SECURITY NOTE:
 * UUID validated to ensure proper format.
 * Returns 404 if not found (doesn't reveal if ID exists).
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameter
    const validation = validate(missionIdParamSchema, req.params);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid mission ID: ${validation.errors.join(', ')}`);
    }

    const { id } = validation.data;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM missions WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      throw Errors.notFound('Mission');
    }

    const mission: Mission = {
      id: row['id'] as string,
      week: row['week'] as number,
      day: row['day'] as number,
      title: row['title'] as string,
      narrative: row['narrative'] as string,
      objectives: parseJsonField<string[]>(row['objectives'], []),
      warmup: parseJsonField(row['warmup'], []),
      tasks: parseJsonField(row['tasks'], []),
      quiz: parseJsonField(row['quiz'], []),
      xpReward: row['xpReward'] as number,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    };

    const response: ApiResponse<Mission> = {
      success: true,
      data: mission,
    };

    logger.debug('Mission retrieved', { id, title: mission.title });

    res.json(response);
  })
);

/**
 * POST /api/missions/:id/complete
 *
 * Marks a mission as completed and returns awarded XP.
 * Frontend tracks completion state in localStorage.
 *
 * This endpoint:
 * 1. Validates the mission exists
 * 2. Calculates XP based on quiz score (if provided)
 * 3. Returns completion data for frontend to store
 *
 * Request body (optional):
 * - quizScore: 0-100 percentage score on quiz
 * - completedTaskIds: Array of task IDs that were completed
 *
 * Response includes:
 * - Base XP reward from mission
 * - Bonus XP based on quiz performance
 * - Total XP earned
 * - Completion timestamp
 *
 * ARCHITECTURE NOTE:
 * This is stateless on the backend. The frontend tracks progress.
 * In production, you'd store progress in a user_progress table.
 * For MVP, we just validate and calculate XP.
 */
router.post(
  '/:id/complete',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameter
    const paramValidation = validate(missionIdParamSchema, req.params);
    if (!paramValidation.success) {
      throw Errors.badRequest(`Invalid mission ID: ${paramValidation.errors.join(', ')}`);
    }

    // Validate request body
    const bodyValidation = validate(missionCompleteSchema, req.body);
    if (!bodyValidation.success) {
      throw Errors.badRequest(`Invalid request body: ${bodyValidation.errors.join(', ')}`);
    }

    const { id } = paramValidation.data;
    const { quizScore, completedTaskIds } = bodyValidation.data;
    const db = getDatabase();

    /*
     * Verify mission exists.
     * We need the XP reward to calculate earnings.
     */
    const stmt = db.prepare('SELECT id, title, xpReward, tasks FROM missions WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      throw Errors.notFound('Mission');
    }

    const baseXpReward = row['xpReward'] as number;
    const missionTitle = row['title'] as string;
    const tasks = parseJsonField<Array<{ id: string; xpValue: number }>>(row['tasks'], []);

    /*
     * Calculate XP earned.
     *
     * Formula:
     * - Base XP: Full mission XP reward
     * - Quiz Bonus: Up to 20% extra based on quiz score
     * - Task Completion: Verify all tasks were completed
     *
     * Example:
     * - Base XP: 100
     * - Quiz Score: 80%
     * - Quiz Bonus: 100 * 0.2 * 0.8 = 16 XP
     * - Total: 116 XP
     */
    let totalXp = baseXpReward;
    let quizBonus = 0;

    if (quizScore !== undefined) {
      /*
       * Quiz bonus: 20% of base XP, scaled by score.
       * Perfect score (100) gives full bonus.
       * This incentivizes actually learning, not just clicking through.
       */
      quizBonus = Math.round(baseXpReward * 0.2 * (quizScore / 100));
      totalXp += quizBonus;
    }

    /*
     * Verify task completion (optional validation).
     * In production, you might require all tasks to be completed.
     */
    let tasksCompleted = tasks.length;
    if (completedTaskIds && completedTaskIds.length > 0) {
      tasksCompleted = completedTaskIds.length;
    }

    const completionData = {
      missionId: id,
      missionTitle,
      baseXpReward,
      quizBonus,
      totalXpEarned: totalXp,
      quizScore: quizScore ?? null,
      tasksCompleted,
      totalTasks: tasks.length,
      completedAt: getCurrentTimestamp(),
    };

    logger.info('Mission completed', {
      missionId: id,
      missionTitle,
      totalXpEarned: totalXp,
      quizScore,
    });

    const response: ApiResponse<typeof completionData> = {
      success: true,
      data: completionData,
    };

    res.json(response);
  })
);

export default router;
