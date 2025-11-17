#!/usr/bin/env node
/**
 * FILE: src/workers/SoftwareDocWorker.ts
 * PURPOSE: Background worker that generates installation and configuration guides.
 *          Fetches official documentation and creates structured guides.
 * INPUTS: SoftwareTool entries with empty guides
 * OUTPUTS: PendingUpdate entries with proposed install/config guides
 * SIDE EFFECTS:
 *   - Fetches external documentation
 *   - Creates pending_updates for admin review
 *   - Updates tool verification timestamps
 * NOTES:
 *   - Run manually: node dist/workers/SoftwareDocWorker.js
 *   - Or schedule daily via cron
 *   - MVP stub: generates template guides without real fetching
 *   - Production would parse real documentation with AI/NLP
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getDatabase, parseJsonField, getCurrentTimestamp, stringifyForDb } from '../database/db';
import { logger } from '../utils/logger';
import { SoftwareTool, InstallGuide, ConfigGuide, PendingUpdate } from '../types';
import { v4 as uuidv4 } from 'uuid';

/*
 * =============================================================================
 * WORKER CONFIGURATION
 * =============================================================================
 */

/**
 * Worker identification for audit trail.
 */
const WORKER_NAME = 'SoftwareDocWorker';

/**
 * How many tools to process per run.
 * Prevents overwhelming external servers and keeps runs manageable.
 */
const TOOLS_PER_RUN = 5;

/**
 * Delay between processing tools (milliseconds).
 * Rate limiting for external API calls.
 */
const PROCESSING_DELAY_MS = 3000;

/*
 * =============================================================================
 * MAIN WORKER LOGIC
 * =============================================================================
 */

/**
 * Main worker function.
 * Generates documentation for software tools that need it.
 *
 * WORKFLOW:
 * 1. Find tools with empty install/config guides
 * 2. Fetch official documentation for each tool
 * 3. Parse and structure into install steps
 * 4. Generate configuration examples
 * 5. Create pending_updates for admin review
 *
 * @returns Promise<void>
 */
async function runSoftwareDocWorker(): Promise<void> {
  logger.info(`${WORKER_NAME} starting...`);
  const startTime = Date.now();

  const db = getDatabase();

  /*
   * Find tools that need documentation.
   * Prioritize:
   * 1. Approved tools with empty guides (need docs for learners)
   * 2. Discovered tools (might help with approval decision)
   * 3. Tools with outdated guides (not verified recently)
   */
  const toolsNeedingDocsStmt = db.prepare(`
    SELECT * FROM software_tools
    WHERE
      (
        installGuides = '[]' OR
        configGuides = '[]' OR
        lastVerifiedAt < datetime('now', '-30 days')
      )
      AND status IN ('approved', 'seeded', 'discovered')
    ORDER BY
      CASE status
        WHEN 'approved' THEN 1
        WHEN 'seeded' THEN 2
        WHEN 'discovered' THEN 3
      END ASC,
      lastVerifiedAt ASC
    LIMIT ?
  `);

  const toolRows = toolsNeedingDocsStmt.all(TOOLS_PER_RUN) as Array<Record<string, unknown>>;

  logger.info(`Found ${toolRows.length} tools needing documentation`);

  let docsGenerated = 0;
  let updatesProposed = 0;

  for (const row of toolRows) {
    const tool: SoftwareTool = {
      id: row['id'] as string,
      name: row['name'] as string,
      category: row['category'] as string,
      description: row['description'] as string,
      useCases: parseJsonField<string[]>(row['useCases'], []),
      difficulty: row['difficulty'] as SoftwareTool['difficulty'],
      supportedEnvironments: parseJsonField<string[]>(row['supportedEnvironments'], []),
      installGuides: parseJsonField<InstallGuide[]>(row['installGuides'], []),
      configGuides: parseJsonField<ConfigGuide[]>(row['configGuides'], []),
      status: row['status'] as SoftwareTool['status'],
      relevanceScore: row['relevanceScore'] as number,
      firstSeenAt: row['firstSeenAt'] as string,
      lastUpdatedAt: row['lastUpdatedAt'] as string,
      lastVerifiedAt: row['lastVerifiedAt'] as string,
      sources: parseJsonField(row['sources'], []),
      confidenceLevel: row['confidenceLevel'] as SoftwareTool['confidenceLevel'],
    };

    logger.info(`Generating documentation for: ${tool.name}`, { toolId: tool.id });

    try {
      /*
       * Generate install guides for supported environments.
       * MVP: Use templates based on tool category.
       * Production: Fetch and parse actual documentation.
       */
      const newInstallGuides =
        tool.installGuides.length === 0 ? generateInstallGuides(tool) : tool.installGuides;

      /*
       * Generate configuration examples.
       * MVP: Create generic config scenarios.
       * Production: Generate from real use case documentation.
       */
      const newConfigGuides =
        tool.configGuides.length === 0 ? generateConfigGuides(tool) : tool.configGuides;

      /*
       * Check if we generated new content.
       * If so, create a pending update for admin review.
       */
      const hasNewInstallGuides =
        tool.installGuides.length === 0 && newInstallGuides.length > 0;
      const hasNewConfigGuides =
        tool.configGuides.length === 0 && newConfigGuides.length > 0;

      if (hasNewInstallGuides || hasNewConfigGuides) {
        /*
         * Create pending update with proposed documentation.
         * Admin will review before it becomes visible to learners.
         */
        const changesSummary: string[] = [];
        if (hasNewInstallGuides) {
          changesSummary.push(`${newInstallGuides.length} install guides`);
        }
        if (hasNewConfigGuides) {
          changesSummary.push(`${newConfigGuides.length} config guides`);
        }

        const pendingUpdate: Partial<PendingUpdate> = {
          id: uuidv4(),
          type: 'software',
          entityId: tool.id,
          changesSummary: `${WORKER_NAME}: Generated ${changesSummary.join(' and ')} for "${tool.name}".`,
          proposedContent: {
            installGuides: newInstallGuides,
            configGuides: newConfigGuides,
            lastUpdatedAt: getCurrentTimestamp(),
            lastVerifiedAt: getCurrentTimestamp(),
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

        logger.info(`Proposed documentation update for: ${tool.name}`, {
          toolId: tool.id,
          updateId: pendingUpdate.id,
          installGuides: newInstallGuides.length,
          configGuides: newConfigGuides.length,
        });

        updatesProposed++;
      }

      docsGenerated++;

      // Rate limiting
      await sleep(PROCESSING_DELAY_MS);
    } catch (error) {
      logger.error(`Error generating docs for: ${tool.name}`, {
        toolId: tool.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const duration = Date.now() - startTime;

  logger.info(`${WORKER_NAME} completed`, {
    toolsProcessed: docsGenerated,
    updatesProposed,
    durationMs: duration,
  });
}

/**
 * Generates install guides for a software tool.
 *
 * MVP IMPLEMENTATION:
 * Creates template-based guides for common environments.
 * Production would:
 * 1. Fetch official installation docs
 * 2. Parse commands and explanations
 * 3. Test installations in sandboxed environments
 * 4. Generate environment-specific guides
 *
 * @param tool - Software tool to generate guides for
 * @returns Array of InstallGuide objects
 */
function generateInstallGuides(tool: SoftwareTool): InstallGuide[] {
  const guides: InstallGuide[] = [];

  /*
   * Generate guides only for supported environments.
   * Each environment has different package managers and paths.
   */
  for (const env of tool.supportedEnvironments) {
    if (env === 'Ubuntu') {
      guides.push(generateUbuntuInstallGuide(tool));
    } else if (env === 'AlmaLinux') {
      guides.push(generateAlmaLinuxInstallGuide(tool));
    } else if (env === 'Docker') {
      guides.push(generateDockerInstallGuide(tool));
    }
  }

  return guides;
}

/**
 * Generates Ubuntu-specific install guide.
 */
function generateUbuntuInstallGuide(tool: SoftwareTool): InstallGuide {
  return {
    environment: 'Ubuntu',
    minVersion: '20.04',
    steps: [
      {
        title: 'Update Package Lists',
        description: 'Ensure you have the latest package information',
        commands: [
          {
            command: 'sudo apt update',
            explanation: 'Downloads latest package information from Ubuntu repositories',
            expectedOutputExample: 'Hit:1 http://archive.ubuntu.com/ubuntu focal InRelease',
          },
        ],
      },
      {
        title: `Install ${tool.name}`,
        description: `Install ${tool.name} using apt package manager`,
        commands: [
          {
            command: `sudo apt install -y ${tool.name.toLowerCase()}`,
            explanation: `Installs ${tool.name} and its dependencies. -y auto-confirms installation.`,
            expectedOutputExample: `Setting up ${tool.name.toLowerCase()} ...`,
          },
        ],
      },
      {
        title: 'Verify Installation',
        description: `Confirm ${tool.name} is installed correctly`,
        commands: [
          {
            command: `${tool.name.toLowerCase()} --version`,
            explanation: 'Displays the installed version to verify successful installation',
            expectedOutputExample: `${tool.name} version X.Y.Z`,
          },
        ],
      },
    ],
  };
}

/**
 * Generates AlmaLinux-specific install guide.
 */
function generateAlmaLinuxInstallGuide(tool: SoftwareTool): InstallGuide {
  return {
    environment: 'AlmaLinux',
    minVersion: '9.0',
    steps: [
      {
        title: 'Update Package Cache',
        description: 'Update DNF package cache',
        commands: [
          {
            command: 'sudo dnf makecache',
            explanation: 'Refreshes package metadata from repositories',
          },
        ],
      },
      {
        title: `Install ${tool.name}`,
        description: `Install ${tool.name} using dnf package manager`,
        commands: [
          {
            command: `sudo dnf install -y ${tool.name.toLowerCase()}`,
            explanation: `Installs ${tool.name} from configured repositories`,
          },
        ],
      },
      {
        title: 'Enable Service',
        description: `Configure ${tool.name} to start automatically`,
        commands: [
          {
            command: `sudo systemctl enable --now ${tool.name.toLowerCase()}`,
            explanation: 'Enables service to start on boot and starts it immediately',
          },
        ],
      },
    ],
  };
}

/**
 * Generates Docker-specific install guide.
 */
function generateDockerInstallGuide(tool: SoftwareTool): InstallGuide {
  return {
    environment: 'Docker',
    steps: [
      {
        title: 'Pull Docker Image',
        description: `Download the official ${tool.name} Docker image`,
        commands: [
          {
            command: `docker pull ${tool.name.toLowerCase()}:latest`,
            explanation: 'Downloads the latest official image from Docker Hub',
            expectedOutputExample: 'Status: Downloaded newer image',
          },
        ],
      },
      {
        title: `Run ${tool.name} Container`,
        description: `Start ${tool.name} in a Docker container`,
        commands: [
          {
            command: `docker run -d --name ${tool.name.toLowerCase()} -p 8080:80 ${tool.name.toLowerCase()}:latest`,
            explanation: 'Runs container in detached mode with port mapping',
          },
        ],
      },
      {
        title: 'Verify Container',
        description: 'Confirm container is running',
        commands: [
          {
            command: `docker ps | grep ${tool.name.toLowerCase()}`,
            explanation: 'Lists running containers filtered by name',
          },
        ],
      },
    ],
  };
}

/**
 * Generates configuration guides for a software tool.
 *
 * MVP IMPLEMENTATION:
 * Creates generic configuration scenarios based on tool category.
 * Production would:
 * 1. Analyze tool documentation for common use cases
 * 2. Generate configs with proper syntax
 * 3. Include tuning tips from performance guides
 * 4. Add security hardening recommendations
 *
 * @param tool - Software tool to generate config guides for
 * @returns Array of ConfigGuide objects
 */
function generateConfigGuides(tool: SoftwareTool): ConfigGuide[] {
  const guides: ConfigGuide[] = [];

  /*
   * Generate config based on tool category.
   * Different categories have different configuration patterns.
   */
  switch (tool.category) {
    case 'Web Server':
      guides.push({
        scenario: 'Basic Web Server Setup',
        description: `Configure ${tool.name} to serve static content`,
        configSnippets: [
          {
            path: `/etc/${tool.name.toLowerCase()}/conf.d/default.conf`,
            language: 'nginx',
            content: `server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}`,
            annotations: [
              'listen 80 - Accept HTTP traffic on port 80',
              'server_name - Domain this server responds to',
              'root - Document root directory',
              'try_files - Serve file or return 404',
            ],
          },
        ],
        tuningTips: [
          'Enable gzip compression for faster transfers',
          'Set appropriate worker processes based on CPU cores',
          'Configure caching headers for static assets',
        ],
      });
      break;

    case 'Database':
      guides.push({
        scenario: 'Production Database Configuration',
        description: `Configure ${tool.name} for production workloads`,
        configSnippets: [
          {
            path: `/etc/${tool.name.toLowerCase()}/my.cnf`,
            language: 'ini',
            content: `[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 200
query_cache_size = 128M
slow_query_log = 1
slow_query_log_file = /var/log/${tool.name.toLowerCase()}/slow.log`,
            annotations: [
              'innodb_buffer_pool_size - Memory for caching data',
              'max_connections - Limit concurrent connections',
              'slow_query_log - Enable logging of slow queries',
            ],
          },
        ],
        tuningTips: [
          'Set buffer pool to 70-80% of available RAM',
          'Monitor connection usage and adjust max_connections',
          'Regularly analyze slow query log for optimization',
        ],
      });
      break;

    case 'Monitoring':
      guides.push({
        scenario: 'Basic Monitoring Setup',
        description: `Configure ${tool.name} to monitor server metrics`,
        configSnippets: [
          {
            path: `/etc/${tool.name.toLowerCase()}/config.yml`,
            language: 'yaml',
            content: `global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']`,
            annotations: [
              'scrape_interval - How often to collect metrics',
              'job_name - Label for this monitoring target',
              'targets - Endpoints to scrape for metrics',
            ],
          },
        ],
        tuningTips: [
          'Adjust scrape interval based on metric granularity needs',
          'Set up alerting rules for critical metrics',
          'Configure retention period based on storage capacity',
        ],
      });
      break;

    default:
      // Generic configuration guide
      guides.push({
        scenario: 'Basic Configuration',
        description: `Standard configuration for ${tool.name}`,
        configSnippets: [
          {
            path: `/etc/${tool.name.toLowerCase()}/config`,
            language: 'text',
            content: `# ${tool.name} Configuration
# Refer to official documentation for options`,
            annotations: ['Consult official documentation for specific settings'],
          },
        ],
        tuningTips: [
          'Review security settings before production deployment',
          'Monitor resource usage and adjust accordingly',
          'Keep configuration under version control',
        ],
      });
  }

  return guides;
}

/**
 * Sleep utility for rate limiting.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 * =============================================================================
 * WORKER EXECUTION
 * =============================================================================
 */

runSoftwareDocWorker()
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
