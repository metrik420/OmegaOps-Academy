/**
 * FILE: src/api/routes/software.ts
 * PURPOSE: API routes for server software tools database.
 *          Provides installation guides and configurations for sysadmin tools.
 * INPUTS: Query parameters for filtering, path parameters for IDs
 * OUTPUTS: JSON responses with software tool data
 * NOTES:
 *   - Tools have status: seeded | discovered | approved | deprecated
 *   - Install guides are environment-specific (Ubuntu, AlmaLinux, etc.)
 *   - Config guides show real-world scenarios
 *   - Relevance score helps prioritize search results
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, Errors } from '../middleware/errorHandler';
import { getDatabase, parseJsonField } from '../../database/db';
import { logger } from '../../utils/logger';
import { validate, softwareQuerySchema, softwareIdParamSchema } from '../../utils/validation';
import { SoftwareTool, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/software
 *
 * Lists server software tools with extensive filtering options.
 * This is the primary discovery mechanism for learners.
 *
 * Query parameters:
 * - category (optional): Filter by category (e.g., "Web Server", "Database")
 * - environment (optional): Filter by supported environment (e.g., "Ubuntu")
 * - difficulty (optional): beginner | intermediate | advanced
 * - status (optional): seeded | discovered | approved | deprecated
 * - search (optional): Text search in name and description
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (default 20, max 100)
 *
 * IMPORTANT:
 * By default, only 'approved' and 'seeded' tools are shown.
 * Discovered tools need admin approval before appearing to learners.
 * This prevents unverified content from reaching users.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validation = validate(softwareQuerySchema, req.query);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid query parameters: ${validation.errors.join(', ')}`);
    }

    const { category, environment, difficulty, status, search } = validation.data;
    const page = validation.data.page!;
    const limit = validation.data.limit!;
    const db = getDatabase();

    /*
     * Build dynamic SQL query with multiple optional filters.
     * Default to showing only approved/seeded tools unless status is specified.
     */
    let sql = 'SELECT * FROM software_tools WHERE 1=1';
    const params: unknown[] = [];

    /*
     * Status filtering with safe default.
     * If no status specified, show only approved and seeded tools.
     * This prevents unapproved content from being displayed.
     */
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else {
      // Default: Only show approved or seeded tools
      sql += ' AND status IN (?, ?)';
      params.push('approved', 'seeded');
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (difficulty) {
      sql += ' AND difficulty = ?';
      params.push(difficulty);
    }

    /*
     * Environment filtering.
     * Checks if the environment is in the supportedEnvironments JSON array.
     *
     * TECHNICAL NOTE:
     * SQLite stores JSON as TEXT, so we use LIKE for containment check.
     * This is not perfect (could match substrings) but works for MVP.
     * Better approach: Use json_each() for proper JSON array search.
     */
    if (environment) {
      sql += ' AND supportedEnvironments LIKE ?';
      params.push(`%"${environment}"%`);
    }

    /*
     * Text search in name and description.
     * Uses LIKE for substring matching.
     */
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    /*
     * Order by relevance score (descending) for best tools first.
     * This puts the most important/popular tools at the top.
     */
    sql += ' ORDER BY relevanceScore DESC, name ASC';

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
     * Transform database rows to SoftwareTool objects.
     * Parse all JSON fields from TEXT storage.
     */
    const tools: SoftwareTool[] = rows.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
      category: row['category'] as string,
      description: row['description'] as string,
      useCases: parseJsonField<string[]>(row['useCases'], []),
      difficulty: row['difficulty'] as SoftwareTool['difficulty'],
      supportedEnvironments: parseJsonField<string[]>(row['supportedEnvironments'], []),
      installGuides: parseJsonField(row['installGuides'], []),
      configGuides: parseJsonField(row['configGuides'], []),
      status: row['status'] as SoftwareTool['status'],
      relevanceScore: row['relevanceScore'] as number,
      firstSeenAt: row['firstSeenAt'] as string,
      lastUpdatedAt: row['lastUpdatedAt'] as string,
      lastVerifiedAt: row['lastVerifiedAt'] as string,
      sources: parseJsonField(row['sources'], []),
      confidenceLevel: row['confidenceLevel'] as SoftwareTool['confidenceLevel'],
    }));

    /*
     * Get available filter options for frontend UI.
     * These help build filter dropdowns dynamically.
     */
    const categoriesStmt = db.prepare(
      "SELECT DISTINCT category FROM software_tools WHERE status IN ('approved', 'seeded') ORDER BY category ASC"
    );
    const categoriesResult = categoriesStmt.all() as Array<{ category: string }>;
    const availableCategories = categoriesResult.map((r) => r.category);

    /*
     * Get unique environments.
     * This is more complex because supportedEnvironments is a JSON array.
     * For MVP, we'll return a static list.
     */
    const availableEnvironments = [
      'Ubuntu',
      'AlmaLinux',
      'Debian',
      'Docker',
      'cPanel/WHM',
      'Other',
    ];

    const response: ApiResponse<SoftwareTool[]> = {
      success: true,
      data: tools,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        availableCategories,
        availableEnvironments,
      },
    };

    logger.debug('Software tools retrieved', {
      count: tools.length,
      total,
      filters: { category, environment, difficulty, status, search },
      page,
    });

    res.json(response);
  })
);

/**
 * GET /api/software/:id
 *
 * Retrieves a single software tool by its ID.
 * Returns full details including install and config guides.
 *
 * Path parameters:
 * - id: Tool UUID
 *
 * CONTENT STRUCTURE:
 * Install guides are organized by environment (Ubuntu, AlmaLinux, etc.).
 * Each guide has ordered steps with commands and explanations.
 * Config guides show real-world scenarios with annotated snippets.
 *
 * SECURITY NOTE:
 * Tool details are returned regardless of status.
 * However, discovered/deprecated tools should show warnings in UI.
 * Frontend should indicate confidence level and verification date.
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameter
    const validation = validate(softwareIdParamSchema, req.params);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid tool ID: ${validation.errors.join(', ')}`);
    }

    const { id } = validation.data;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM software_tools WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) {
      throw Errors.notFound('Software tool');
    }

    const tool: SoftwareTool = {
      id: row['id'] as string,
      name: row['name'] as string,
      category: row['category'] as string,
      description: row['description'] as string,
      useCases: parseJsonField<string[]>(row['useCases'], []),
      difficulty: row['difficulty'] as SoftwareTool['difficulty'],
      supportedEnvironments: parseJsonField<string[]>(row['supportedEnvironments'], []),
      installGuides: parseJsonField(row['installGuides'], []),
      configGuides: parseJsonField(row['configGuides'], []),
      status: row['status'] as SoftwareTool['status'],
      relevanceScore: row['relevanceScore'] as number,
      firstSeenAt: row['firstSeenAt'] as string,
      lastUpdatedAt: row['lastUpdatedAt'] as string,
      lastVerifiedAt: row['lastVerifiedAt'] as string,
      sources: parseJsonField(row['sources'], []),
      confidenceLevel: row['confidenceLevel'] as SoftwareTool['confidenceLevel'],
    };

    /*
     * Add warning metadata if tool is not fully approved.
     * Frontend should display these warnings prominently.
     */
    const warnings: string[] = [];

    if (tool.status === 'discovered') {
      warnings.push('This tool has been discovered but not yet reviewed. Information may be incomplete.');
    }

    if (tool.status === 'deprecated') {
      warnings.push('This tool is deprecated. Consider using modern alternatives.');
    }

    if (tool.confidenceLevel === 'experimental') {
      warnings.push('Information is experimental and may change rapidly. Verify with official sources.');
    }

    // Check if last verified date is old (> 90 days)
    const lastVerified = new Date(tool.lastVerifiedAt);
    const daysSinceVerification = Math.floor(
      (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceVerification > 90) {
      warnings.push(
        `Information was last verified ${daysSinceVerification} days ago. Check for updates.`
      );
    }

    const response: ApiResponse<{
      tool: SoftwareTool;
      warnings: string[];
      daysSinceVerification: number;
    }> = {
      success: true,
      data: {
        tool,
        warnings,
        daysSinceVerification,
      },
    };

    logger.debug('Software tool retrieved', { id, name: tool.name, status: tool.status });

    res.json(response);
  })
);

export default router;
