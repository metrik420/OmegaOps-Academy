#!/usr/bin/env node
/**
 * FILE: src/workers/SoftwareDiscoveryWorker.ts
 * PURPOSE: Background worker that discovers new server administration tools.
 *          Scans repositories and package managers for relevant software.
 * INPUTS: External APIs (GitHub, Docker Hub, OS repos)
 * OUTPUTS: New SoftwareTool entries with status='discovered'
 * SIDE EFFECTS:
 *   - Makes external API requests
 *   - Inserts new tools into database
 *   - Creates entries for admin review
 * NOTES:
 *   - Run manually: node dist/workers/SoftwareDiscoveryWorker.js
 *   - Or schedule weekly via cron
 *   - MVP stub: simulates discovery without actual API calls
 *   - Production would query real APIs (GitHub trending, Docker Hub popular)
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getDatabase, getCurrentTimestamp, stringifyForDb } from '../database/db';
import { logger } from '../utils/logger';
import { SoftwareTool } from '../types';
import { v4 as uuidv4 } from 'uuid';

/*
 * =============================================================================
 * WORKER CONFIGURATION
 * =============================================================================
 */

/**
 * Worker identification for audit trail.
 */
const WORKER_NAME = 'SoftwareDiscoveryWorker';

/**
 * Categories of tools to search for.
 * These align with curriculum learning objectives.
 * @internal Used by production implementation for filtering
 */
const _TARGET_CATEGORIES = [
  'Web Server',
  'Database',
  'Container Runtime',
  'Monitoring',
  'Security',
  'Backup',
  'Load Balancer',
  'Cache',
  'Message Queue',
  'CI/CD',
];

/**
 * Keywords that indicate relevant server administration tools.
 * Used to filter search results.
 * @internal Used by production implementation for filtering
 */
const _RELEVANCE_KEYWORDS = [
  'server',
  'admin',
  'sysadmin',
  'devops',
  'infrastructure',
  'deployment',
  'monitoring',
  'security',
  'container',
  'orchestration',
];

// Export for future use to prevent unused variable warnings
export { _TARGET_CATEGORIES, _RELEVANCE_KEYWORDS };

/*
 * =============================================================================
 * MAIN WORKER LOGIC
 * =============================================================================
 */

/**
 * Main worker function.
 * Discovers new server software tools from various sources.
 *
 * WORKFLOW:
 * 1. Query external sources (GitHub trending, Docker Hub, etc.)
 * 2. Filter results by relevance to server administration
 * 3. Check if tool already exists in database
 * 4. Create new entries with status='discovered'
 * 5. Admin will review and approve before visible to learners
 *
 * @returns Promise<void>
 */
async function runSoftwareDiscoveryWorker(): Promise<void> {
  logger.info(`${WORKER_NAME} starting...`);
  const startTime = Date.now();

  const db = getDatabase();

  /*
   * Get existing tool names to avoid duplicates.
   * Using name (not ID) since discovered tools are new.
   */
  const existingToolsStmt = db.prepare('SELECT name FROM software_tools');
  const existingTools = existingToolsStmt.all() as Array<{ name: string }>;
  const existingToolNames = new Set(existingTools.map((t) => t.name.toLowerCase()));

  logger.info(`Found ${existingToolNames.size} existing tools in database`);

  /*
   * Discover tools from multiple sources.
   * MVP: Use simulated discovery data.
   * Production: Query real APIs.
   */
  const discoveredTools: Partial<SoftwareTool>[] = [];

  // Source 1: Simulated GitHub trending repositories
  logger.info('Checking GitHub trending repositories...');
  const githubTools = await discoverFromGitHub();
  discoveredTools.push(...githubTools);

  // Source 2: Simulated Docker Hub popular images
  logger.info('Checking Docker Hub popular images...');
  const dockerTools = await discoverFromDockerHub();
  discoveredTools.push(...dockerTools);

  // Source 3: Simulated CNCF projects
  logger.info('Checking CNCF landscape...');
  const cncfTools = await discoverFromCNCF();
  discoveredTools.push(...cncfTools);

  logger.info(`Discovered ${discoveredTools.length} potential new tools`);

  /*
   * Filter out existing tools and insert new ones.
   */
  let newToolsAdded = 0;
  let duplicatesSkipped = 0;

  for (const tool of discoveredTools) {
    const toolName = tool.name?.toLowerCase() || '';

    if (existingToolNames.has(toolName)) {
      logger.debug(`Skipping duplicate: ${tool.name}`);
      duplicatesSkipped++;
      continue;
    }

    // Mark as discovered (needs admin review)
    const newTool: SoftwareTool = {
      id: uuidv4(),
      name: tool.name || 'Unknown Tool',
      category: tool.category || 'Uncategorized',
      description: tool.description || 'Newly discovered tool, awaiting documentation.',
      useCases: tool.useCases || [],
      difficulty: tool.difficulty || 'intermediate',
      supportedEnvironments: tool.supportedEnvironments || [],
      installGuides: [], // Empty until SoftwareDocWorker fills it
      configGuides: [], // Empty until SoftwareDocWorker fills it
      status: 'discovered', // Awaiting admin approval
      relevanceScore: tool.relevanceScore || 50,
      firstSeenAt: getCurrentTimestamp(),
      lastUpdatedAt: getCurrentTimestamp(),
      lastVerifiedAt: getCurrentTimestamp(),
      sources: tool.sources || [],
      confidenceLevel: 'experimental', // Low confidence until verified
    };

    const insertStmt = db.prepare(`
      INSERT INTO software_tools (
        id, name, category, description, useCases, difficulty,
        supportedEnvironments, installGuides, configGuides, status,
        relevanceScore, firstSeenAt, lastUpdatedAt, lastVerifiedAt,
        sources, confidenceLevel
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      newTool.id,
      newTool.name,
      newTool.category,
      newTool.description,
      stringifyForDb(newTool.useCases),
      newTool.difficulty,
      stringifyForDb(newTool.supportedEnvironments),
      stringifyForDb(newTool.installGuides),
      stringifyForDb(newTool.configGuides),
      newTool.status,
      newTool.relevanceScore,
      newTool.firstSeenAt,
      newTool.lastUpdatedAt,
      newTool.lastVerifiedAt,
      stringifyForDb(newTool.sources),
      newTool.confidenceLevel
    );

    logger.info(`Discovered new tool: ${newTool.name}`, {
      toolId: newTool.id,
      category: newTool.category,
    });

    // Add to set to prevent re-adding within same run
    existingToolNames.add(toolName);
    newToolsAdded++;
  }

  const duration = Date.now() - startTime;

  logger.info(`${WORKER_NAME} completed`, {
    toolsDiscovered: discoveredTools.length,
    newToolsAdded,
    duplicatesSkipped,
    durationMs: duration,
  });
}

/**
 * Simulates discovering tools from GitHub trending repositories.
 *
 * MVP IMPLEMENTATION:
 * Returns mock data representing potential discoveries.
 * Production would:
 * 1. Query GitHub API for trending repos with server/devops topics
 * 2. Filter by stars, activity, and relevance keywords
 * 3. Extract tool metadata from README
 *
 * @returns Array of potential tools
 */
async function discoverFromGitHub(): Promise<Partial<SoftwareTool>[]> {
  /*
   * Simulated GitHub discoveries.
   * These represent tools that might trend on GitHub.
   * In reality, most runs would find 0-2 new relevant tools.
   */
  const mockDiscoveries: Partial<SoftwareTool>[] = [
    {
      name: 'Caddy',
      category: 'Web Server',
      description: 'Fast, multi-platform web server with automatic HTTPS',
      useCases: ['Web server with automatic TLS', 'Reverse proxy', 'API gateway'],
      difficulty: 'beginner',
      supportedEnvironments: ['Ubuntu', 'AlmaLinux', 'Docker'],
      relevanceScore: 85,
      sources: [
        {
          id: uuidv4(),
          name: 'Caddy GitHub Repository',
          url: 'https://github.com/caddyserver/caddy',
          lastCheckedAt: getCurrentTimestamp(),
        },
      ],
    },
    {
      name: 'Traefik',
      category: 'Load Balancer',
      description: 'Cloud-native edge router and reverse proxy',
      useCases: ['Dynamic load balancing', 'Service discovery', 'Let\'s Encrypt integration'],
      difficulty: 'intermediate',
      supportedEnvironments: ['Docker', 'Ubuntu', 'AlmaLinux'],
      relevanceScore: 80,
      sources: [
        {
          id: uuidv4(),
          name: 'Traefik GitHub Repository',
          url: 'https://github.com/traefik/traefik',
          lastCheckedAt: getCurrentTimestamp(),
        },
      ],
    },
  ];

  // Return random subset to simulate realistic discovery
  const numToReturn = Math.floor(Math.random() * 3); // 0-2 tools
  return mockDiscoveries.slice(0, numToReturn);
}

/**
 * Simulates discovering tools from Docker Hub popular images.
 *
 * MVP IMPLEMENTATION:
 * Returns mock data representing Official Images.
 * Production would:
 * 1. Query Docker Hub API for popular/official images
 * 2. Filter by categories relevant to server administration
 * 3. Extract metadata from image descriptions
 *
 * @returns Array of potential tools
 */
async function discoverFromDockerHub(): Promise<Partial<SoftwareTool>[]> {
  const mockDiscoveries: Partial<SoftwareTool>[] = [
    {
      name: 'Redis',
      category: 'Cache',
      description: 'In-memory data structure store, cache, and message broker',
      useCases: ['Caching', 'Session storage', 'Real-time analytics', 'Message queuing'],
      difficulty: 'intermediate',
      supportedEnvironments: ['Ubuntu', 'AlmaLinux', 'Docker'],
      relevanceScore: 88,
      sources: [
        {
          id: uuidv4(),
          name: 'Redis Official Docker Image',
          url: 'https://hub.docker.com/_/redis',
          lastCheckedAt: getCurrentTimestamp(),
        },
      ],
    },
    {
      name: 'RabbitMQ',
      category: 'Message Queue',
      description: 'Open-source message broker supporting multiple messaging protocols',
      useCases: ['Message queuing', 'Asynchronous processing', 'Microservices communication'],
      difficulty: 'intermediate',
      supportedEnvironments: ['Ubuntu', 'Docker'],
      relevanceScore: 75,
      sources: [
        {
          id: uuidv4(),
          name: 'RabbitMQ Official Docker Image',
          url: 'https://hub.docker.com/_/rabbitmq',
          lastCheckedAt: getCurrentTimestamp(),
        },
      ],
    },
  ];

  // Return random subset
  const numToReturn = Math.floor(Math.random() * 2); // 0-1 tools
  return mockDiscoveries.slice(0, numToReturn);
}

/**
 * Simulates discovering tools from CNCF (Cloud Native Computing Foundation) landscape.
 *
 * MVP IMPLEMENTATION:
 * Returns mock CNCF graduated/incubating projects.
 * Production would:
 * 1. Query CNCF landscape API
 * 2. Focus on graduated and incubating projects
 * 3. Filter by relevance to curriculum
 *
 * @returns Array of potential tools
 */
async function discoverFromCNCF(): Promise<Partial<SoftwareTool>[]> {
  const mockDiscoveries: Partial<SoftwareTool>[] = [
    {
      name: 'Prometheus',
      category: 'Monitoring',
      description: 'Systems monitoring and alerting toolkit',
      useCases: ['Metrics collection', 'Alerting', 'Time-series database', 'Service monitoring'],
      difficulty: 'intermediate',
      supportedEnvironments: ['Ubuntu', 'AlmaLinux', 'Docker'],
      relevanceScore: 90,
      sources: [
        {
          id: uuidv4(),
          name: 'Prometheus CNCF Project',
          url: 'https://prometheus.io/',
          lastCheckedAt: getCurrentTimestamp(),
        },
      ],
    },
    {
      name: 'Grafana',
      category: 'Monitoring',
      description: 'Analytics and interactive visualization platform',
      useCases: ['Dashboard visualization', 'Metrics analysis', 'Alerting', 'Log exploration'],
      difficulty: 'beginner',
      supportedEnvironments: ['Ubuntu', 'AlmaLinux', 'Docker'],
      relevanceScore: 87,
      sources: [
        {
          id: uuidv4(),
          name: 'Grafana Official Site',
          url: 'https://grafana.com/',
          lastCheckedAt: getCurrentTimestamp(),
        },
      ],
    },
  ];

  // Return random subset
  const numToReturn = Math.floor(Math.random() * 2); // 0-1 tools
  return mockDiscoveries.slice(0, numToReturn);
}

/*
 * =============================================================================
 * WORKER EXECUTION
 * =============================================================================
 */

runSoftwareDiscoveryWorker()
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
