/**
 * FILE: src/api/routes/updates.ts
 * PURPOSE: API routes for viewing pending content updates and changelog.
 *          Public-facing routes for transparency in content changes.
 * INPUTS: Query parameters for filtering
 * OUTPUTS: JSON responses with pending updates and changelog
 * NOTES:
 *   - These routes are read-only (no authentication required)
 *   - Admin routes for approve/reject are in admin.ts
 *   - Provides transparency into automated content updates
 *   - Changelog shows history of applied changes
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, Errors } from '../middleware/errorHandler';
import { getDatabase, parseJsonField } from '../../database/db';
import { logger } from '../../utils/logger';
import { validate, updatesQuerySchema } from '../../utils/validation';
import { PendingUpdate, Changelog, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/updates
 *
 * Lists pending content updates proposed by automated workers.
 * By default, shows only pending updates.
 *
 * Query parameters:
 * - status (optional): pending | approved | rejected (default: pending)
 * - type (optional): mission | lab | knowledge | software | config
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (default 20, max 100)
 *
 * PURPOSE:
 * This endpoint provides transparency into the automated update process.
 * Users can see what changes are proposed and their status.
 * Admins use this to identify updates needing review.
 *
 * SECURITY NOTE:
 * proposedContent is included but should be treated as untrusted.
 * Frontend should display it carefully (not execute any code).
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validation = validate(updatesQuerySchema, req.query);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid query parameters: ${validation.errors.join(', ')}`);
    }

    const { status, type } = validation.data;
    const page = validation.data.page!;
    const limit = validation.data.limit!;
    const db = getDatabase();

    /*
     * Build dynamic SQL query.
     * Default to showing pending updates (most useful view).
     */
    let sql = 'SELECT * FROM pending_updates WHERE 1=1';
    const params: unknown[] = [];

    // Filter by status (default to 'pending' for admin workflow)
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // Filter by entity type
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    /*
     * Order by status (pending first) then by creation date.
     * This puts actionable items at the top.
     */
    sql += ` ORDER BY
      CASE status
        WHEN 'pending' THEN 1
        WHEN 'approved' THEN 2
        WHEN 'rejected' THEN 3
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
     * Transform database rows to PendingUpdate objects.
     * proposedContent is parsed from JSON TEXT.
     */
    const updates: PendingUpdate[] = rows.map((row) => ({
      id: row['id'] as string,
      type: row['type'] as PendingUpdate['type'],
      entityId: row['entityId'] as string,
      changesSummary: row['changesSummary'] as string,
      proposedContent: parseJsonField(row['proposedContent'], {}),
      status: row['status'] as PendingUpdate['status'],
      proposedBy: row['proposedBy'] as string,
      reviewedBy: (row['reviewedBy'] as string | null) ?? undefined,
      reviewedAt: (row['reviewedAt'] as string | null) ?? undefined,
      appliedAt: (row['appliedAt'] as string | null) ?? undefined,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    }));

    /*
     * Get counts by status for dashboard display.
     * Helps admins see how many updates need attention.
     */
    const statusCountsStmt = db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM pending_updates
      GROUP BY status
    `);
    const statusCountsResult = statusCountsStmt.all() as Array<{
      status: string;
      count: number;
    }>;

    const statusCounts: Record<string, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of statusCountsResult) {
      statusCounts[row.status] = row.count;
    }

    const response: ApiResponse<PendingUpdate[]> = {
      success: true,
      data: updates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        statusCounts,
      },
    };

    logger.debug('Pending updates retrieved', {
      count: updates.length,
      total,
      filters: { status, type },
      page,
    });

    res.json(response);
  })
);

/**
 * GET /api/updates/changelog
 *
 * Returns the changelog of applied content changes.
 * Provides audit trail and "what's new" functionality.
 *
 * Query parameters:
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (default 20, max 100)
 *
 * PURPOSE:
 * - Audit trail for content changes
 * - "What's New" feature for learners
 * - Transparency in automated updates
 * - Debugging content issues
 *
 * RESPONSE:
 * Changelog entries are ordered by appliedAt (newest first).
 * Each entry shows what changed and when.
 */
router.get(
  '/changelog',
  asyncHandler(async (req: Request, res: Response) => {
    // Simple pagination validation (reuse parts of updatesQuerySchema)
    const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string, 10) || 20));

    const db = getDatabase();

    // Get total count
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM changelog');
    const countResult = countStmt.get() as { count: number };
    const total = countResult.count;

    // Get paginated changelog entries
    const offset = (page - 1) * limit;
    const stmt = db.prepare(`
      SELECT * FROM changelog
      ORDER BY appliedAt DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(limit, offset) as Array<Record<string, unknown>>;

    const entries: Changelog[] = rows.map((row) => ({
      id: row['id'] as string,
      entryType: row['entryType'] as Changelog['entryType'],
      affectedEntities: parseJsonField<string[]>(row['affectedEntities'], []),
      summary: row['summary'] as string,
      appliedAt: row['appliedAt'] as string,
      createdAt: row['createdAt'] as string,
    }));

    const response: ApiResponse<Changelog[]> = {
      success: true,
      data: entries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    logger.debug('Changelog retrieved', {
      count: entries.length,
      total,
      page,
    });

    res.json(response);
  })
);

/**
 * GET /api/updates/stats
 *
 * Returns statistics about the update workflow.
 * Useful for monitoring automated content updates.
 *
 * METRICS:
 * - Total pending updates (needs attention)
 * - Updates by type (mission, lab, software, etc.)
 * - Updates by proposer (which workers are active)
 * - Average time to review (efficiency metric)
 * - Recent activity (last 7 days)
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = getDatabase();

    // Pending count (items needing review)
    const pendingCountStmt = db.prepare(
      "SELECT COUNT(*) as count FROM pending_updates WHERE status = 'pending'"
    );
    const pendingCount = (pendingCountStmt.get() as { count: number }).count;

    // Updates by type
    const byTypeStmt = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM pending_updates
      GROUP BY type
      ORDER BY count DESC
    `);
    const byType = byTypeStmt.all() as Array<{ type: string; count: number }>;

    // Updates by proposer
    const byProposerStmt = db.prepare(`
      SELECT proposedBy, COUNT(*) as count
      FROM pending_updates
      GROUP BY proposedBy
      ORDER BY count DESC
    `);
    const byProposer = byProposerStmt.all() as Array<{ proposedBy: string; count: number }>;

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentActivityStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM pending_updates
      WHERE createdAt > ?
    `);
    const recentActivity = recentActivityStmt.get(sevenDaysAgo) as {
      total: number;
      approved: number;
      rejected: number;
      pending: number;
    };

    // Changelog stats
    const changelogCountStmt = db.prepare('SELECT COUNT(*) as count FROM changelog');
    const totalChangesApplied = (changelogCountStmt.get() as { count: number }).count;

    const stats = {
      pendingReviewCount: pendingCount,
      updatesByType: byType,
      updatesByProposer: byProposer,
      recentActivity: {
        last7Days: recentActivity,
      },
      totalChangesApplied,
      lastCheckedAt: new Date().toISOString(),
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    };

    logger.debug('Update stats retrieved', { pendingCount, totalChangesApplied });

    res.json(response);
  })
);

export default router;
