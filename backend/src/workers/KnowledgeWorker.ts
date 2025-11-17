#!/usr/bin/env node
/**
 * FILE: src/workers/KnowledgeWorker.ts
 * PURPOSE: Background worker that monitors upstream documentation for changes.
 *          Proposes updates to knowledge topics when source documentation changes.
 * INPUTS: External documentation URLs from knowledge topics
 * OUTPUTS: PendingUpdate entries for detected changes
 * SIDE EFFECTS:
 *   - Fetches external URLs (respects rate limits)
 *   - Creates pending_updates rows in database
 *   - Updates lastVerifiedAt timestamps
 * NOTES:
 *   - Run manually: node dist/workers/KnowledgeWorker.js
 *   - Or schedule via cron (see .env.example)
 *   - MVP stub: simulates detection without actual HTTP requests
 *   - Production would use axios to fetch real documentation
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getDatabase, parseJsonField, getCurrentTimestamp, stringifyForDb } from '../database/db';
import { logger } from '../utils/logger';
import { KnowledgeTopic, PendingUpdate, SourceRef } from '../types';
import { v4 as uuidv4 } from 'uuid';

/*
 * =============================================================================
 * WORKER CONFIGURATION
 * =============================================================================
 */

/**
 * Worker identification for audit trail.
 * All pending_updates created by this worker are tagged with this name.
 */
const WORKER_NAME = 'KnowledgeWorker';

/**
 * How many topics to check per run.
 * Prevents overwhelming external APIs.
 * In production, process all topics in batches.
 */
const TOPICS_PER_RUN = 10;

/**
 * Delay between external requests (milliseconds).
 * Respects rate limits of external documentation sites.
 */
const REQUEST_DELAY_MS = 2000;

/*
 * =============================================================================
 * MAIN WORKER LOGIC
 * =============================================================================
 */

/**
 * Main worker function.
 * Checks knowledge topics for outdated information.
 *
 * WORKFLOW:
 * 1. Fetch knowledge topics ordered by lastVerifiedAt (oldest first)
 * 2. For each topic, check if sources have changed
 * 3. If changes detected, create pending_update for admin review
 * 4. Update lastVerifiedAt to prevent re-checking immediately
 *
 * @returns Promise<void>
 */
async function runKnowledgeWorker(): Promise<void> {
  logger.info(`${WORKER_NAME} starting...`);
  const startTime = Date.now();

  const db = getDatabase();

  /*
   * Fetch oldest-verified topics first.
   * This ensures we're constantly refreshing stale content.
   * LIMIT prevents processing too many in one run.
   */
  const topicsStmt = db.prepare(`
    SELECT * FROM knowledge_topics
    ORDER BY lastVerifiedAt ASC
    LIMIT ?
  `);

  const topicRows = topicsStmt.all(TOPICS_PER_RUN) as Array<Record<string, unknown>>;

  logger.info(`Found ${topicRows.length} topics to check`);

  let updatesProposed = 0;
  let topicsVerified = 0;

  for (const row of topicRows) {
    const topic: KnowledgeTopic = {
      id: row['id'] as string,
      title: row['title'] as string,
      description: row['description'] as string,
      category: row['category'] as string,
      content: row['content'] as string,
      relatedMissions: parseJsonField<string[]>(row['relatedMissions'], []),
      relatedLabs: parseJsonField<string[]>(row['relatedLabs'], []),
      sources: parseJsonField<SourceRef[]>(row['sources'], []),
      confidenceLevel: row['confidenceLevel'] as KnowledgeTopic['confidenceLevel'],
      lastVerifiedAt: row['lastVerifiedAt'] as string,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    };

    logger.debug(`Checking topic: ${topic.title}`, { topicId: topic.id });

    try {
      /*
       * Check for changes in source documentation.
       * MVP: Simulate detection (random chance of finding changes)
       * Production: Actually fetch URLs and compare content
       */
      const changes = await checkTopicSources(topic);

      if (changes.hasChanges) {
        /*
         * Changes detected! Create a pending update for admin review.
         * The proposed content includes suggested updates to the topic.
         */
        const pendingUpdate: Partial<PendingUpdate> = {
          id: uuidv4(),
          type: 'knowledge',
          entityId: topic.id,
          changesSummary: `${WORKER_NAME}: Detected changes in upstream documentation for "${topic.title}". ${changes.summary}`,
          proposedContent: {
            title: topic.title,
            sources: changes.updatedSources,
            lastVerifiedAt: getCurrentTimestamp(),
            /*
             * In production, would include:
             * - Updated content based on source changes
             * - Diff of what changed
             * - Confidence level adjustment if needed
             */
            suggestedContentUpdate: changes.suggestedUpdate,
          },
          status: 'pending',
          proposedBy: WORKER_NAME,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp(),
        };

        const insertStmt = db.prepare(`
          INSERT INTO pending_updates (
            id, type, entityId, changesSummary, proposedContent, status,
            proposedBy, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
          pendingUpdate.id,
          pendingUpdate.type,
          pendingUpdate.entityId,
          pendingUpdate.changesSummary,
          stringifyForDb(pendingUpdate.proposedContent),
          pendingUpdate.status,
          pendingUpdate.proposedBy,
          pendingUpdate.createdAt,
          pendingUpdate.updatedAt
        );

        logger.info(`Proposed update for topic: ${topic.title}`, {
          topicId: topic.id,
          updateId: pendingUpdate.id,
        });

        updatesProposed++;
      }

      /*
       * Update lastVerifiedAt to mark this topic as recently checked.
       * Even if no changes found, we've verified it's current.
       */
      const updateVerifiedStmt = db.prepare(`
        UPDATE knowledge_topics
        SET lastVerifiedAt = ?
        WHERE id = ?
      `);
      updateVerifiedStmt.run(getCurrentTimestamp(), topic.id);

      topicsVerified++;

      /*
       * Rate limiting: Wait between external requests.
       * Be a good citizen and don't hammer external servers.
       */
      await sleep(REQUEST_DELAY_MS);
    } catch (error) {
      logger.error(`Error checking topic: ${topic.title}`, {
        topicId: topic.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with next topic, don't fail entire run
    }
  }

  const duration = Date.now() - startTime;

  logger.info(`${WORKER_NAME} completed`, {
    topicsChecked: topicsVerified,
    updatesProposed,
    durationMs: duration,
  });
}

/**
 * Checks if source documentation has changed for a topic.
 *
 * MVP IMPLEMENTATION:
 * This is a stub that simulates change detection.
 * In production, this would:
 * 1. Fetch each source URL
 * 2. Compare content hash with stored hash
 * 3. Detect structural changes in documentation
 * 4. Generate suggested content updates
 *
 * @param topic - Knowledge topic to check
 * @returns Object indicating if changes were detected
 */
async function checkTopicSources(
  topic: KnowledgeTopic
): Promise<{
  hasChanges: boolean;
  summary: string;
  updatedSources: SourceRef[];
  suggestedUpdate?: string;
}> {
  /*
   * MVP: Simulate change detection with low probability.
   * 10% chance of detecting "changes" for demo purposes.
   * This lets admins see the approval workflow in action.
   */
  const simulatedChangeChance = 0.1; // 10%

  // Update source lastCheckedAt timestamps
  const updatedSources: SourceRef[] = topic.sources.map((source) => ({
    ...source,
    lastCheckedAt: getCurrentTimestamp(),
  }));

  // Simulate occasional change detection
  if (Math.random() < simulatedChangeChance) {
    /*
     * Simulated change detected!
     * In production, this would contain actual differences found.
     */
    logger.debug(`Simulated change detected for: ${topic.title}`);

    return {
      hasChanges: true,
      summary: `Upstream documentation may have been updated. Review recommended.`,
      updatedSources,
      suggestedUpdate: `Consider reviewing the latest documentation at source URLs to ensure content accuracy.`,
    };
  }

  /*
   * No changes detected.
   * Source documentation appears unchanged.
   */
  logger.debug(`No changes detected for: ${topic.title}`);

  return {
    hasChanges: false,
    summary: 'All sources verified, no changes detected.',
    updatedSources,
  };
}

/**
 * Sleep utility for rate limiting.
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * =============================================================================
 * WORKER EXECUTION
 * =============================================================================
 * Can be run directly: node dist/workers/KnowledgeWorker.js
 * Or scheduled via cron: 0 2 * * * node /path/to/KnowledgeWorker.js
 */

// Run the worker
runKnowledgeWorker()
  .then(() => {
    logger.info(`${WORKER_NAME} exiting successfully`);
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`${WORKER_NAME} failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  });
