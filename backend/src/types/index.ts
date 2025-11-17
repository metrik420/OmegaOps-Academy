/**
 * FILE: src/types/index.ts
 * PURPOSE: Central type definitions for OmegaOps Academy backend.
 *          These interfaces define the shape of all data entities in the system.
 * INPUTS: None (pure type definitions)
 * OUTPUTS: TypeScript interfaces exported for use throughout the application
 * NOTES:
 *   - All IDs use UUIDs for uniqueness and security (no sequential IDs)
 *   - JSON fields in SQLite are stored as TEXT but typed here for clarity
 *   - Timestamps use ISO 8601 strings for SQLite compatibility
 *   - Confidence levels indicate data reliability (affects UI presentation)
 */

// =============================================================================
// MISSION & LEARNING CONTENT TYPES
// =============================================================================

/**
 * Represents a single step within a mission task.
 * Tasks guide learners through hands-on activities.
 */
export interface MissionTask {
  /** Unique identifier within the mission */
  id: string;
  /** Short, action-oriented title (e.g., "Configure UFW Firewall") */
  title: string;
  /** Detailed instructions in markdown format */
  instructions: string;
  /** Expected outcome or verification steps */
  expectedOutcome: string;
  /** Optional hints for stuck learners (progressive disclosure) */
  hints?: string[];
  /** XP awarded for completing this specific task */
  xpValue: number;
}

/**
 * Represents a warmup question asked before starting a mission.
 * These activate prior knowledge and prepare learners mentally.
 */
export interface WarmupQuestion {
  /** The question to pose to the learner */
  question: string;
  /** Optional suggested answer (for self-reflection, not grading) */
  answer?: string;
}

/**
 * Quiz question for knowledge verification at mission end.
 * Multiple choice format with explanation for learning reinforcement.
 */
export interface QuizQuestion {
  /** The question text */
  question: string;
  /** Array of possible answers (typically 4 options) */
  options: string[];
  /** Zero-based index of the correct answer in options array */
  correct: number;
  /** Why this answer is correct (shown after answering) */
  explanation?: string;
}

/**
 * A Mission represents a single day's learning unit in the 12-week curriculum.
 * Missions are the primary content delivery mechanism.
 *
 * Structure: Week 1-12, Day 1-5 (Mon-Fri), plus optional weekend challenges.
 */
export interface Mission {
  /** UUID for the mission */
  id: string;
  /** Week number (1-12) in the curriculum */
  week: number;
  /** Day number within the week (1-5 for weekdays, 6-7 for weekend) */
  day: number;
  /** Mission title (action-oriented, e.g., "Securing Your First Server") */
  title: string;
  /** Story narrative that provides context and motivation */
  narrative: string;
  /** Learning objectives (what the learner will accomplish) */
  objectives: string[];
  /** Pre-mission warmup questions */
  warmup: WarmupQuestion[];
  /** Ordered list of tasks to complete */
  tasks: MissionTask[];
  /** Post-mission quiz for knowledge verification */
  quiz: QuizQuestion[];
  /** Total XP reward for completing the entire mission */
  xpReward: number;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * A Lab is a hands-on practice environment with real-world scenarios.
 * Labs are more open-ended than missions and encourage experimentation.
 */
export interface Lab {
  /** UUID for the lab */
  id: string;
  /** Lab title (scenario-based, e.g., "Troubleshoot a Failing Web Server") */
  title: string;
  /** Brief overview of what the lab covers */
  description: string;
  /** Skill level required */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** XP awarded for successful completion */
  xpReward: number;
  /** Detailed scenario setup (the "situation" the learner faces) */
  scenarioDescription: string;
  /** What the learner should achieve (success criteria) */
  objectives: string[];
  /** Progressive hints if learner gets stuck (ordered by helpfulness) */
  hints: string[];
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

// =============================================================================
// KNOWLEDGE BASE TYPES
// =============================================================================

/**
 * Reference to an external source for information verification.
 * Used to track where information came from and when it was last checked.
 */
export interface SourceRef {
  /** UUID for the source reference */
  id: string;
  /** Human-readable name (e.g., "Official Docker Docs") */
  name: string;
  /** Full URL to the source */
  url: string;
  /** When this source was last verified as accessible and accurate */
  lastCheckedAt: string;
}

/**
 * A KnowledgeTopic is a single concept or skill in the knowledge base.
 * Topics are interconnected and link to missions/labs where they're used.
 */
export interface KnowledgeTopic {
  /** UUID for the topic */
  id: string;
  /** Topic title (concise, searchable) */
  title: string;
  /** Brief summary of what this topic covers */
  description: string;
  /** Category for grouping (e.g., "Networking", "Security", "Containers") */
  category: string;
  /** Full content in Markdown format (supports code blocks, lists, etc.) */
  content: string;
  /** Mission IDs where this topic is taught or applied */
  relatedMissions: string[];
  /** Lab IDs where this topic is practiced */
  relatedLabs: string[];
  /** External sources that back up this information */
  sources: SourceRef[];
  /**
   * Confidence in accuracy:
   * - high: Verified from official sources, stable information
   * - medium: From reputable sources but may change
   * - experimental: New or changing rapidly, use with caution
   */
  confidenceLevel: 'high' | 'medium' | 'experimental';
  /** When the information was last verified against sources */
  lastVerifiedAt: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

// =============================================================================
// SOFTWARE TOOLS DATABASE TYPES
// =============================================================================

/**
 * A single installation step with commands and explanations.
 * Designed to be copy-pasteable while teaching what each command does.
 */
export interface InstallCommand {
  /** The actual command to run */
  command: string;
  /** What this command does and why */
  explanation: string;
  /** Example of what output to expect (helps learners verify success) */
  expectedOutputExample?: string;
}

/**
 * A single step in an installation process.
 * Groups related commands under a logical step.
 */
export interface InstallStep {
  /** Step title (e.g., "Add Repository", "Install Package") */
  title: string;
  /** Explanation of what this step accomplishes */
  description: string;
  /** Commands to execute in order */
  commands: InstallCommand[];
}

/**
 * Complete installation guide for a specific environment.
 * Different environments (Ubuntu vs AlmaLinux) need different commands.
 */
export interface InstallGuide {
  /** Target environment for this guide */
  environment: 'Ubuntu' | 'AlmaLinux' | 'Debian' | 'Docker' | 'cPanel/WHM' | 'Other';
  /** Minimum version of the environment (e.g., "22.04" for Ubuntu) */
  minVersion?: string;
  /** Ordered steps to complete installation */
  steps: InstallStep[];
}

/**
 * Configuration snippet with annotations explaining each part.
 * Helps learners understand config files, not just copy them.
 */
export interface ConfigSnippet {
  /** File path where this config goes (e.g., "/etc/nginx/nginx.conf") */
  path: string;
  /** Language for syntax highlighting (e.g., "nginx", "yaml", "ini") */
  language: string;
  /** The actual configuration content */
  content: string;
  /** Line-by-line or section annotations explaining what each part does */
  annotations: string[];
}

/**
 * Configuration guide for a specific use case scenario.
 * Shows how to configure a tool for real-world situations.
 */
export interface ConfigGuide {
  /** Scenario name (e.g., "High-Traffic WordPress Site") */
  scenario: string;
  /** Detailed description of the use case */
  description: string;
  /** Configuration snippets with explanations */
  configSnippets: ConfigSnippet[];
  /** Performance and security tuning recommendations */
  tuningTips: string[];
}

/**
 * Represents a server software tool in the database.
 * This is a living database that gets updated by workers.
 *
 * Lifecycle:
 * 1. Worker discovers tool -> status = 'discovered'
 * 2. Admin reviews and approves -> status = 'approved'
 * 3. Worker generates install/config guides
 * 4. Knowledge worker keeps it updated
 * 5. If tool becomes obsolete -> status = 'deprecated'
 */
export interface SoftwareTool {
  /** UUID for the tool */
  id: string;
  /** Tool name (e.g., "Nginx", "Docker", "Fail2ban") */
  name: string;
  /** Category for filtering (e.g., "Web Server", "Container Runtime", "Security") */
  category: string;
  /** Brief description of what the tool does */
  description: string;
  /** Common use cases for this tool */
  useCases: string[];
  /** Skill level needed to use this tool effectively */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Which environments this tool runs on */
  supportedEnvironments: string[];
  /** Installation guides for different environments */
  installGuides: InstallGuide[];
  /** Configuration guides for different scenarios */
  configGuides: ConfigGuide[];
  /**
   * Tool status in our system:
   * - seeded: Pre-populated by developers
   * - discovered: Found by worker, awaiting review
   * - approved: Reviewed and approved for learning
   * - deprecated: No longer recommended (outdated/insecure)
   */
  status: 'seeded' | 'discovered' | 'approved' | 'deprecated';
  /**
   * Relevance score (0-100) for ranking in search results.
   * Based on: popularity, curriculum importance, industry adoption.
   */
  relevanceScore: number;
  /** When the tool was first added to our database */
  firstSeenAt: string;
  /** When the tool information was last updated */
  lastUpdatedAt: string;
  /** When we last verified this information is still accurate */
  lastVerifiedAt: string;
  /** Sources backing up this information */
  sources: SourceRef[];
  /** Confidence in the accuracy of this information */
  confidenceLevel: 'high' | 'medium' | 'experimental';
}

// =============================================================================
// CONTENT MANAGEMENT & WORKFLOW TYPES
// =============================================================================

/**
 * Represents a proposed change to content that needs admin approval.
 * This is the core of the review workflow.
 *
 * Workflow:
 * 1. Worker detects change or discovers new content
 * 2. Worker creates PendingUpdate with status = 'pending'
 * 3. Admin reviews via /admin/pending-updates
 * 4. Admin approves (applies change) or rejects (discards)
 * 5. If approved, changelog entry is created
 */
export interface PendingUpdate {
  /** UUID for the pending update */
  id: string;
  /** Type of entity being updated */
  type: 'mission' | 'lab' | 'knowledge' | 'software' | 'config';
  /** ID of the entity being updated (or "new" for new entities) */
  entityId: string;
  /** Human-readable summary of what changed */
  changesSummary: string;
  /**
   * The actual proposed content as JSON.
   * For updates: contains only changed fields.
   * For new entities: contains complete entity.
   * Type is 'any' because it varies by entity type.
   */
  proposedContent: unknown;
  /** Current status in the approval workflow */
  status: 'pending' | 'approved' | 'rejected';
  /** Which worker or process proposed this change */
  proposedBy: string;
  /** Admin username who reviewed (if reviewed) */
  reviewedBy?: string | undefined;
  /** When the review decision was made */
  reviewedAt?: string | undefined;
  /** When the change was actually applied to the entity */
  appliedAt?: string | undefined;
  /** When this update was proposed */
  createdAt: string;
  /** Last modification to this update record */
  updatedAt: string;
}

/**
 * Changelog entry documenting applied changes.
 * Provides audit trail and helps users see what's new.
 */
export interface Changelog {
  /** UUID for the changelog entry */
  id: string;
  /** Type of change */
  entryType: 'update' | 'deprecation' | 'new_tool';
  /** IDs of entities affected by this change */
  affectedEntities: string[];
  /** Human-readable summary of the change */
  summary: string;
  /** When the change was applied */
  appliedAt: string;
  /** When this changelog entry was created */
  createdAt: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response envelope.
 * All endpoints return this structure for consistency.
 *
 * @template T - The type of data being returned
 */
export interface ApiResponse<T> {
  /** Whether the request succeeded */
  success: boolean;
  /** The actual response data (when success = true) */
  data?: T;
  /** Error message (when success = false) */
  error?: string;
  /** Optional metadata (pagination, counts, etc.) */
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

/**
 * Progress tracking for a user (stored in localStorage on frontend).
 * Backend returns structure, frontend manages persistence.
 */
export interface UserProgress {
  /** Total XP earned */
  totalXp: number;
  /** Current level (calculated from XP) */
  level: number;
  /** IDs of completed missions */
  completedMissions: string[];
  /** IDs of completed labs */
  completedLabs: string[];
  /** Per-mission task completion tracking */
  missionProgress: {
    [missionId: string]: {
      completedTaskIds: string[];
      quizScore?: number;
      completedAt?: string;
    };
  };
  /** Achievements/badges earned */
  achievements: string[];
  /** Last activity timestamp */
  lastActiveAt: string;
}

/**
 * Roadmap week structure for curriculum overview.
 */
export interface RoadmapWeek {
  /** Week number (1-12) */
  week: number;
  /** Week theme or title */
  title: string;
  /** Brief description of what's covered */
  description: string;
  /** Days in this week */
  days: {
    day: number;
    missionId: string;
    missionTitle: string;
    isCompleted: boolean;
  }[];
}

// =============================================================================
// VALIDATION SCHEMAS (Zod schemas defined separately in utils/validation.ts)
// =============================================================================

/**
 * Type guard to check if a value is a valid difficulty level.
 * Used for runtime type checking of user input.
 */
export function isValidDifficulty(value: unknown): value is 'beginner' | 'intermediate' | 'advanced' {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}

/**
 * Type guard for confidence levels.
 */
export function isValidConfidenceLevel(value: unknown): value is 'high' | 'medium' | 'experimental' {
  return value === 'high' || value === 'medium' || value === 'experimental';
}

/**
 * Type guard for software tool status.
 */
export function isValidToolStatus(value: unknown): value is 'seeded' | 'discovered' | 'approved' | 'deprecated' {
  return value === 'seeded' || value === 'discovered' || value === 'approved' || value === 'deprecated';
}

/**
 * Type guard for pending update status.
 */
export function isValidUpdateStatus(value: unknown): value is 'pending' | 'approved' | 'rejected' {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}
