/**
 * FILE: src/api/routes/roadmap.ts
 * PURPOSE: API routes for curriculum roadmap overview.
 *          Returns 12-week structure with mission summaries.
 * INPUTS: None (returns full roadmap)
 * OUTPUTS: JSON structure of all weeks and days
 * NOTES:
 *   - This is a read-only endpoint
 *   - Aggregates mission data into week/day structure
 *   - Used by frontend to render curriculum overview
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getDatabase } from '../../database/db';
import { logger } from '../../utils/logger';
import { RoadmapWeek, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/roadmap
 *
 * Returns the complete 12-week curriculum roadmap.
 * Each week contains its days with mission summaries.
 *
 * Response shape:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "weeks": [
 *       {
 *         "week": 1,
 *         "title": "Foundation Week",
 *         "description": "...",
 *         "days": [
 *           { "day": 1, "missionId": "...", "missionTitle": "...", "isCompleted": false }
 *         ]
 *       }
 *     ],
 *     "totalMissions": 60,
 *     "totalXp": 12000
 *   }
 * }
 *
 * PERFORMANCE NOTE:
 * This query aggregates all missions into weeks.
 * Consider caching this response as it changes infrequently.
 * TTL: 1 hour (or invalidate on mission update).
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = getDatabase();

    /*
     * Fetch all missions ordered by week and day.
     * This gives us the complete curriculum structure.
     */
    const missionsQuery = db.prepare(`
      SELECT
        id,
        week,
        day,
        title,
        xpReward
      FROM missions
      ORDER BY week ASC, day ASC
    `);

    const missions = missionsQuery.all() as Array<{
      id: string;
      week: number;
      day: number;
      title: string;
      xpReward: number;
    }>;

    /*
     * Group missions by week.
     * Map structure: week number -> array of day info
     */
    const weekMap = new Map<number, RoadmapWeek>();

    /*
     * Define week metadata.
     * This provides context for each week of the curriculum.
     * In production, this might come from a separate table.
     */
    const weekMetadata: Record<number, { title: string; description: string }> = {
      1: {
        title: 'Foundation Week',
        description: 'Master the basics of Linux and command line operations',
      },
      2: {
        title: 'System Administration Essentials',
        description: 'User management, permissions, and system monitoring',
      },
      3: {
        title: 'Networking Fundamentals',
        description: 'TCP/IP, DNS, firewalls, and network troubleshooting',
      },
      4: {
        title: 'Web Server Mastery',
        description: 'Apache, Nginx, and web server configuration',
      },
      5: {
        title: 'Database Administration',
        description: 'MySQL, PostgreSQL, backups, and optimization',
      },
      6: {
        title: 'Security Hardening',
        description: 'Server security, SSH, fail2ban, and security auditing',
      },
      7: {
        title: 'Containerization',
        description: 'Docker, container orchestration, and microservices',
      },
      8: {
        title: 'Automation & Scripting',
        description: 'Bash scripting, cron jobs, and task automation',
      },
      9: {
        title: 'Monitoring & Logging',
        description: 'System monitoring, log management, and alerting',
      },
      10: {
        title: 'Backup & Recovery',
        description: 'Backup strategies, disaster recovery, and data protection',
      },
      11: {
        title: 'Performance Optimization',
        description: 'Server tuning, caching, and performance analysis',
      },
      12: {
        title: 'DevOps Practices',
        description: 'CI/CD, infrastructure as code, and deployment strategies',
      },
    };

    /*
     * Build week structure from missions.
     * Initialize all 12 weeks (even if no missions yet).
     */
    for (let weekNum = 1; weekNum <= 12; weekNum++) {
      const metadata = weekMetadata[weekNum] ?? {
        title: `Week ${weekNum}`,
        description: 'Coming soon',
      };

      weekMap.set(weekNum, {
        week: weekNum,
        title: metadata.title,
        description: metadata.description,
        days: [],
      });
    }

    /*
     * Populate days with mission data.
     * isCompleted is always false here (frontend tracks progress).
     */
    for (const mission of missions) {
      const week = weekMap.get(mission.week);
      if (week) {
        week.days.push({
          day: mission.day,
          missionId: mission.id,
          missionTitle: mission.title,
          isCompleted: false, // Frontend manages this via localStorage
        });
      }
    }

    /*
     * Calculate total XP available in curriculum.
     * Useful for progress percentage calculations.
     */
    const totalXp = missions.reduce((sum, m) => sum + m.xpReward, 0);

    const response: ApiResponse<{
      weeks: RoadmapWeek[];
      totalMissions: number;
      totalXp: number;
    }> = {
      success: true,
      data: {
        weeks: Array.from(weekMap.values()),
        totalMissions: missions.length,
        totalXp,
      },
    };

    logger.debug('Roadmap retrieved', {
      totalWeeks: 12,
      totalMissions: missions.length,
      totalXp,
    });

    res.json(response);
  })
);

export default router;
