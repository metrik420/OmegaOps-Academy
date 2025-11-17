/**
 * FILE: src/api/routes/progress.ts
 * PURPOSE: API routes for user progress tracking.
 *          Provides endpoints for progress sync (future feature).
 * INPUTS: Progress data from frontend (localStorage)
 * OUTPUTS: JSON responses with progress calculations
 * NOTES:
 *   - For MVP, progress is stored in frontend localStorage
 *   - These endpoints provide validation and calculations
 *   - Future: Add user accounts and server-side persistence
 *   - XP and level calculations are done here for consistency
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, Errors } from '../middleware/errorHandler';
import { getDatabase } from '../../database/db';
import { logger } from '../../utils/logger';
import { validate, progressUpdateSchema } from '../../utils/validation';
import { UserProgress, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/progress
 *
 * Returns a template for progress tracking.
 * Frontend uses this to initialize localStorage structure.
 *
 * PURPOSE:
 * - Provide consistent progress structure
 * - Include XP/level calculation formulas
 * - List all available achievements
 * - Show total available XP in curriculum
 *
 * NOTE:
 * This doesn't return actual user progress (no auth/persistence yet).
 * It returns the structure and available rewards.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = getDatabase();

    /*
     * Calculate total available XP from all missions and labs.
     * This is the maximum XP a learner can earn.
     */
    const missionXpStmt = db.prepare('SELECT SUM(xpReward) as total FROM missions');
    const missionXp = (missionXpStmt.get() as { total: number | null }).total || 0;

    const labXpStmt = db.prepare('SELECT SUM(xpReward) as total FROM labs');
    const labXp = (labXpStmt.get() as { total: number | null }).total || 0;

    const totalAvailableXp = missionXp + labXp;

    /*
     * Count total missions and labs for completion percentage.
     */
    const missionCountStmt = db.prepare('SELECT COUNT(*) as count FROM missions');
    const totalMissions = (missionCountStmt.get() as { count: number }).count;

    const labCountStmt = db.prepare('SELECT COUNT(*) as count FROM labs');
    const totalLabs = (labCountStmt.get() as { count: number }).count;

    /*
     * Define available achievements.
     * These are badges learners can earn.
     * In production, this might come from a database table.
     */
    const availableAchievements = [
      {
        id: 'first_mission',
        name: 'First Steps',
        description: 'Complete your first mission',
        xpBonus: 50,
      },
      {
        id: 'week_complete',
        name: 'Week Warrior',
        description: 'Complete all missions in a week',
        xpBonus: 200,
      },
      {
        id: 'perfect_quiz',
        name: 'Quiz Master',
        description: 'Score 100% on a mission quiz',
        xpBonus: 100,
      },
      {
        id: 'lab_rat',
        name: 'Lab Rat',
        description: 'Complete 5 labs',
        xpBonus: 150,
      },
      {
        id: 'no_hints',
        name: 'Independent Learner',
        description: 'Complete a lab without using hints',
        xpBonus: 75,
      },
      {
        id: 'security_specialist',
        name: 'Security Specialist',
        description: 'Complete all security-related missions',
        xpBonus: 300,
      },
      {
        id: 'docker_guru',
        name: 'Container Guru',
        description: 'Complete all containerization missions',
        xpBonus: 300,
      },
      {
        id: 'curriculum_complete',
        name: 'OmegaOps Graduate',
        description: 'Complete the entire 12-week curriculum',
        xpBonus: 1000,
      },
    ];

    /*
     * XP to Level calculation formula.
     * Uses a curve that requires more XP for higher levels.
     *
     * Formula: XP needed for level N = 100 * N * (N + 1) / 2
     * - Level 1: 100 XP
     * - Level 2: 300 XP (total)
     * - Level 3: 600 XP (total)
     * - Level 10: 5500 XP (total)
     *
     * This creates a satisfying progression curve.
     */
    const levelFormula = {
      description: 'XP needed for level N = 100 * N * (N + 1) / 2',
      examples: [
        { level: 1, totalXpRequired: 100 },
        { level: 2, totalXpRequired: 300 },
        { level: 3, totalXpRequired: 600 },
        { level: 5, totalXpRequired: 1500 },
        { level: 10, totalXpRequired: 5500 },
        { level: 15, totalXpRequired: 12000 },
        { level: 20, totalXpRequired: 21000 },
      ],
    };

    /*
     * Initial progress template.
     * Frontend uses this to initialize localStorage.
     */
    const progressTemplate: UserProgress = {
      totalXp: 0,
      level: 1,
      completedMissions: [],
      completedLabs: [],
      missionProgress: {},
      achievements: [],
      lastActiveAt: new Date().toISOString(),
    };

    const response: ApiResponse<{
      template: UserProgress;
      curriculum: {
        totalMissions: number;
        totalLabs: number;
        totalAvailableXp: number;
      };
      availableAchievements: typeof availableAchievements;
      levelFormula: typeof levelFormula;
    }> = {
      success: true,
      data: {
        template: progressTemplate,
        curriculum: {
          totalMissions,
          totalLabs,
          totalAvailableXp,
        },
        availableAchievements,
        levelFormula,
      },
    };

    logger.debug('Progress template retrieved', {
      totalAvailableXp,
      totalMissions,
      totalLabs,
    });

    res.json(response);
  })
);

/**
 * POST /api/progress/calculate-level
 *
 * Calculates level from XP amount.
 * Helper endpoint for frontend consistency.
 *
 * Request body:
 * - xp: Total XP earned
 *
 * Response:
 * - level: Current level
 * - xpForCurrentLevel: XP needed for current level
 * - xpForNextLevel: XP needed for next level
 * - xpProgress: Progress towards next level (0-100%)
 *
 * FORMULA:
 * Total XP for level N = 100 * N * (N + 1) / 2
 * Solving for N: N = floor((-1 + sqrt(1 + 8 * XP / 100)) / 2)
 */
router.post(
  '/calculate-level',
  asyncHandler(async (req: Request, res: Response) => {
    const xp = parseInt(req.body['xp'] as string, 10);

    if (isNaN(xp) || xp < 0) {
      throw Errors.badRequest('XP must be a non-negative number');
    }

    /*
     * Calculate level from XP using quadratic formula.
     * XP needed for level N = 100 * N * (N + 1) / 2
     * Solving: 100 * N^2 + 100 * N - 2 * XP = 0
     * N = (-100 + sqrt(10000 + 800 * XP)) / 200
     * N = (-1 + sqrt(1 + 8 * XP / 100)) / 2
     */
    const level = Math.max(1, Math.floor((-1 + Math.sqrt(1 + (8 * xp) / 100)) / 2));

    // XP thresholds
    const xpForCurrentLevel = (100 * level * (level + 1)) / 2;
    const xpForNextLevel = (100 * (level + 1) * (level + 2)) / 2;

    // Progress percentage towards next level
    const xpInCurrentLevel = xp - xpForCurrentLevel;
    const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
    const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

    const result = {
      xp,
      level,
      xpForCurrentLevel,
      xpForNextLevel,
      xpInCurrentLevel,
      xpNeededForNext,
      progressPercent,
    };

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    logger.debug('Level calculated', { xp, level });

    res.json(response);
  })
);

/**
 * POST /api/progress/validate
 *
 * Validates progress data structure.
 * Ensures frontend localStorage hasn't been corrupted or tampered.
 *
 * Request body: UserProgress object
 *
 * Response:
 * - isValid: Whether the progress data is valid
 * - errors: List of validation errors (if any)
 * - correctedProgress: Sanitized progress (if recoverable)
 *
 * USE CASES:
 * - Detect localStorage corruption
 * - Prevent cheating (inflated XP)
 * - Migrate old progress formats
 * - Sync validation before server-side storage
 */
router.post(
  '/validate',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = validate(progressUpdateSchema, req.body);

    if (!validation.success) {
      const response: ApiResponse<{
        isValid: boolean;
        errors: string[];
      }> = {
        success: true, // Request succeeded, but validation failed
        data: {
          isValid: false,
          errors: validation.errors,
        },
      };

      logger.debug('Progress validation failed', { errors: validation.errors });

      res.json(response);
      return;
    }

    const progress = validation.data;
    const db = getDatabase();

    /*
     * Additional semantic validation.
     * Check that referenced missions/labs actually exist.
     */
    const errors: string[] = [];

    // Verify completed missions exist
    if (progress.completedMissions.length > 0) {
      const placeholders = progress.completedMissions.map(() => '?').join(',');
      const missionsStmt = db.prepare(`SELECT id FROM missions WHERE id IN (${placeholders})`);
      const existingMissions = missionsStmt.all(...progress.completedMissions) as Array<{
        id: string;
      }>;
      const existingIds = new Set(existingMissions.map((m) => m.id));

      for (const missionId of progress.completedMissions) {
        if (!existingIds.has(missionId)) {
          errors.push(`Mission ${missionId} does not exist`);
        }
      }
    }

    // Verify completed labs exist
    if (progress.completedLabs.length > 0) {
      const placeholders = progress.completedLabs.map(() => '?').join(',');
      const labsStmt = db.prepare(`SELECT id FROM labs WHERE id IN (${placeholders})`);
      const existingLabs = labsStmt.all(...progress.completedLabs) as Array<{ id: string }>;
      const existingIds = new Set(existingLabs.map((l) => l.id));

      for (const labId of progress.completedLabs) {
        if (!existingIds.has(labId)) {
          errors.push(`Lab ${labId} does not exist`);
        }
      }
    }

    /*
     * Verify XP is reasonable.
     * Calculate maximum possible XP and check against reported.
     */
    const missionXpStmt = db.prepare('SELECT SUM(xpReward) as total FROM missions');
    const maxMissionXp = (missionXpStmt.get() as { total: number | null }).total || 0;

    const labXpStmt = db.prepare('SELECT SUM(xpReward) as total FROM labs');
    const maxLabXp = (labXpStmt.get() as { total: number | null }).total || 0;

    // Add 50% buffer for quiz bonuses and achievements
    const maxPossibleXp = (maxMissionXp + maxLabXp) * 1.5;

    if (progress.totalXp > maxPossibleXp) {
      errors.push(`Total XP (${progress.totalXp}) exceeds maximum possible (${maxPossibleXp})`);
    }

    // Verify level matches XP
    const calculatedLevel = Math.max(
      1,
      Math.floor((-1 + Math.sqrt(1 + (8 * progress.totalXp) / 100)) / 2)
    );

    if (progress.level !== calculatedLevel) {
      errors.push(
        `Level (${progress.level}) does not match XP (${progress.totalXp}). Expected level ${calculatedLevel}`
      );
    }

    const isValid = errors.length === 0;

    const response: ApiResponse<{
      isValid: boolean;
      errors: string[];
      calculatedLevel: number;
      maxPossibleXp: number;
    }> = {
      success: true,
      data: {
        isValid,
        errors,
        calculatedLevel,
        maxPossibleXp,
      },
    };

    logger.debug('Progress validated', { isValid, errorCount: errors.length });

    res.json(response);
  })
);

export default router;
