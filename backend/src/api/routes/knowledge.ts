/**
 * FILE: src/api/routes/knowledge.ts
 * PURPOSE: API routes for knowledge base topics.
 *          Provides interconnected learning resources and references.
 * INPUTS: Query parameters for filtering, path parameters for IDs
 * OUTPUTS: JSON responses with knowledge topic data
 * NOTES:
 *   - Topics link to missions and labs where they're applied
 *   - Confidence levels indicate information reliability
 *   - Markdown content supports rich formatting
 *   - Categories help organize topics for browsing
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, Errors } from '../middleware/errorHandler';
import { getDatabase, parseJsonField } from '../../database/db';
import { logger } from '../../utils/logger';
import { validate, knowledgeQuerySchema, knowledgeIdParamSchema } from '../../utils/validation';
import { KnowledgeTopic, ApiResponse } from '../../types';

const router = Router();

/**
 * GET /api/knowledge
 *
 * Lists all knowledge topics with filtering options.
 * Supports category filtering, confidence level, and basic text search.
 *
 * Query parameters:
 * - category (optional): Filter by category (e.g., "Networking", "Security")
 * - confidenceLevel (optional): high | medium | experimental
 * - search (optional): Text search in title and description
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (default 20, max 100)
 *
 * PERFORMANCE NOTE:
 * Basic LIKE search is used for MVP. In production, consider:
 * - SQLite FTS5 for full-text search
 * - Elasticsearch for advanced search features
 * - Pre-computed search indices
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate query parameters
    const validation = validate(knowledgeQuerySchema, req.query);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid query parameters: ${validation.errors.join(', ')}`);
    }

    const { category, confidenceLevel, search } = validation.data;
    const page = validation.data.page!;
    const limit = validation.data.limit!;
    const db = getDatabase();

    /*
     * Build dynamic SQL query with multiple optional filters.
     * Each filter is added only if provided.
     */
    let sql = 'SELECT * FROM knowledge_topics WHERE 1=1';
    const params: unknown[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (confidenceLevel) {
      sql += ' AND confidenceLevel = ?';
      params.push(confidenceLevel);
    }

    /*
     * Basic text search in title and description.
     * Uses LIKE with wildcards for substring matching.
     *
     * SECURITY NOTE:
     * The search term is parameterized, so SQL injection is prevented.
     * However, wildcards are added in the SQL, not in the parameter.
     */
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    /*
     * Order by confidence level (high first) then title.
     * This prioritizes reliable information.
     */
    sql += ` ORDER BY
      CASE confidenceLevel
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'experimental' THEN 3
      END ASC,
      title ASC`;

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
     * Transform database rows to KnowledgeTopic objects.
     * Excludes full content in list view for performance.
     * Content is returned only when fetching single topic.
     */
    const topics: KnowledgeTopic[] = rows.map((row) => ({
      id: row['id'] as string,
      title: row['title'] as string,
      description: row['description'] as string,
      category: row['category'] as string,
      content: row['content'] as string, // Full content included
      relatedMissions: parseJsonField<string[]>(row['relatedMissions'], []),
      relatedLabs: parseJsonField<string[]>(row['relatedLabs'], []),
      sources: parseJsonField(row['sources'], []),
      confidenceLevel: row['confidenceLevel'] as KnowledgeTopic['confidenceLevel'],
      lastVerifiedAt: row['lastVerifiedAt'] as string,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    }));

    /*
     * Get unique categories for frontend filtering UI.
     * This helps build category filter dropdowns.
     */
    const categoriesStmt = db.prepare(
      'SELECT DISTINCT category FROM knowledge_topics ORDER BY category ASC'
    );
    const categoriesResult = categoriesStmt.all() as Array<{ category: string }>;
    const availableCategories = categoriesResult.map((r) => r.category);

    const response: ApiResponse<KnowledgeTopic[]> = {
      success: true,
      data: topics,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        availableCategories,
      },
    };

    logger.debug('Knowledge topics retrieved', {
      count: topics.length,
      total,
      filters: { category, confidenceLevel, search },
      page,
    });

    res.json(response);
  })
);

/**
 * GET /api/knowledge/:topicId
 *
 * Retrieves a single knowledge topic by its ID.
 * Returns full content including Markdown and source references.
 *
 * Path parameters:
 * - topicId: Topic UUID
 *
 * CONTENT NOTE:
 * The content field contains Markdown that the frontend should render.
 * Includes:
 * - Code blocks with syntax highlighting
 * - Headers for structure
 * - Links to external resources
 * - Lists for step-by-step instructions
 */
router.get(
  '/:topicId',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate path parameter
    const validation = validate(knowledgeIdParamSchema, req.params);
    if (!validation.success) {
      throw Errors.badRequest(`Invalid topic ID: ${validation.errors.join(', ')}`);
    }

    const { topicId } = validation.data;
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM knowledge_topics WHERE id = ?');
    const row = stmt.get(topicId) as Record<string, unknown> | undefined;

    if (!row) {
      throw Errors.notFound('Knowledge topic');
    }

    const topic: KnowledgeTopic = {
      id: row['id'] as string,
      title: row['title'] as string,
      description: row['description'] as string,
      category: row['category'] as string,
      content: row['content'] as string,
      relatedMissions: parseJsonField<string[]>(row['relatedMissions'], []),
      relatedLabs: parseJsonField<string[]>(row['relatedLabs'], []),
      sources: parseJsonField(row['sources'], []),
      confidenceLevel: row['confidenceLevel'] as KnowledgeTopic['confidenceLevel'],
      lastVerifiedAt: row['lastVerifiedAt'] as string,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    };

    /*
     * Optionally fetch related mission and lab titles for context.
     * This provides clickable links in the UI.
     */
    const relatedMissionTitles: Array<{ id: string; title: string }> = [];
    if (topic.relatedMissions.length > 0) {
      const placeholders = topic.relatedMissions.map(() => '?').join(',');
      const missionsStmt = db.prepare(
        `SELECT id, title FROM missions WHERE id IN (${placeholders})`
      );
      const missionsResult = missionsStmt.all(...topic.relatedMissions) as Array<{
        id: string;
        title: string;
      }>;
      relatedMissionTitles.push(...missionsResult);
    }

    const relatedLabTitles: Array<{ id: string; title: string }> = [];
    if (topic.relatedLabs.length > 0) {
      const placeholders = topic.relatedLabs.map(() => '?').join(',');
      const labsStmt = db.prepare(`SELECT id, title FROM labs WHERE id IN (${placeholders})`);
      const labsResult = labsStmt.all(...topic.relatedLabs) as Array<{
        id: string;
        title: string;
      }>;
      relatedLabTitles.push(...labsResult);
    }

    const response: ApiResponse<{
      topic: KnowledgeTopic;
      relatedMissionTitles: Array<{ id: string; title: string }>;
      relatedLabTitles: Array<{ id: string; title: string }>;
    }> = {
      success: true,
      data: {
        topic,
        relatedMissionTitles,
        relatedLabTitles,
      },
    };

    logger.debug('Knowledge topic retrieved', { id: topicId, title: topic.title });

    res.json(response);
  })
);

export default router;
