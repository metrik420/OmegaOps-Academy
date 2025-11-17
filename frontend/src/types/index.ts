/**
 * FILE: src/types/index.ts
 * PURPOSE: Central type definitions for OmegaOps Academy frontend.
 *
 * ORGANIZATION:
 * - Domain entities (Mission, Lab, Software, Knowledge)
 * - UI state types (User progress, gamification)
 * - API response types
 * - Component prop types
 *
 * NOTES:
 * - All dates are ISO 8601 strings from API
 * - IDs are strings (UUIDs or slugs)
 * - Matches backend API contract
 */

// ============================================================================
// CORE DOMAIN ENTITIES
// ============================================================================

/**
 * Mission represents a daily learning task in the 12-week curriculum.
 * Each mission has a narrative context, objectives, and quiz for assessment.
 */
export interface Mission {
  id: string;
  week: number; // 1-12
  day: number; // 1-7 (1=Monday, 6=Saturday for labs)
  title: string;
  narrative: string; // Story-driven intro to engage learners
  objectives: string[]; // Learning outcomes
  warmupQuestions: WarmupQuestion[];
  tasks: MissionTask[];
  quiz: QuizQuestion[];
  reflectionPrompt: string; // Open-ended self-reflection
  xpReward: number; // Experience points earned on completion
  estimatedMinutes: number;
  prerequisites: string[]; // Mission IDs that must be completed first
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Warmup question to activate prior knowledge before main content.
 */
export interface WarmupQuestion {
  question: string;
  hint?: string;
}

/**
 * Task within a mission - step-by-step instructions.
 */
export interface MissionTask {
  id: string;
  title: string;
  description: string;
  codeSnippets?: CodeSnippet[];
  verificationSteps?: string[];
  tips?: string[];
}

/**
 * Code snippet with language for syntax highlighting.
 */
export interface CodeSnippet {
  language: string; // bash, javascript, yaml, dockerfile, etc.
  code: string;
  filename?: string;
  description?: string;
}

/**
 * Multiple choice quiz question for knowledge check.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number; // 0-based index of correct answer
  explanation: string; // Shown after answering
}

/**
 * Lab represents a hands-on challenge (typically Saturday).
 * More open-ended than missions, with hints instead of steps.
 */
export interface Lab {
  id: string;
  week: number;
  title: string;
  scenario: string; // Problem context
  objectives: string[];
  difficulty: DifficultyLevel;
  hints: LabHint[];
  successCriteria: string[];
  xpReward: number;
  estimatedMinutes: number;
  relatedMissions: string[]; // Mission IDs
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Lab hint - progressive assistance for stuck learners.
 * Each hint costs XP penalty when revealed.
 */
export interface LabHint {
  level: number; // 1 = gentle nudge, 3 = detailed guidance
  content: string;
  xpPenalty: number; // XP deducted if hint is used
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Knowledge topic - reference material for concepts.
 * Links to missions, labs, and software tools for context.
 */
export interface KnowledgeTopic {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string; // Markdown content
  summary: string; // Brief overview
  relatedMissions: string[];
  relatedLabs: string[];
  relatedSoftware: string[];
  sources: Source[];
  confidenceLevel: ConfidenceLevel;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeCategory =
  | 'containerization'
  | 'orchestration'
  | 'ci-cd'
  | 'monitoring'
  | 'security'
  | 'networking'
  | 'infrastructure'
  | 'version-control'
  | 'scripting'
  | 'best-practices';

/**
 * Source for knowledge verification - crucial for accuracy.
 */
export interface Source {
  title: string;
  url: string;
  type: 'documentation' | 'article' | 'video' | 'book' | 'official';
  accessedAt: string;
}

/**
 * Confidence level indicates how reliable the information is.
 * High = verified from official sources, Low = needs review.
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Software tool in the Software Galaxy.
 * Comprehensive guides for DevOps tools.
 */
export interface SoftwareTool {
  id: string;
  name: string;
  description: string;
  category: SoftwareCategory;
  useCases: string[];
  environments: Environment[];
  installGuides: InstallGuide[];
  configGuide: ConfigGuide;
  securityConsiderations: string[];
  sources: Source[];
  lastVerifiedAt: string;
  confidenceLevel: ConfidenceLevel;
  deprecated: boolean;
  deprecationReason?: string;
  alternatives?: string[]; // IDs of alternative tools
  relatedTools: string[]; // IDs of related tools
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type SoftwareCategory =
  | 'container-runtime'
  | 'orchestration'
  | 'ci-cd'
  | 'monitoring'
  | 'logging'
  | 'security'
  | 'networking'
  | 'database'
  | 'web-server'
  | 'version-control'
  | 'infrastructure-as-code'
  | 'configuration-management';

export type Environment =
  | 'ubuntu'
  | 'debian'
  | 'centos'
  | 'rhel'
  | 'alma'
  | 'rocky'
  | 'fedora'
  | 'macos'
  | 'windows'
  | 'docker';

/**
 * Installation guide for a specific environment.
 */
export interface InstallGuide {
  environment: Environment;
  steps: InstallStep[];
  verified: boolean;
  verifiedVersion: string;
  lastVerifiedAt: string;
}

export interface InstallStep {
  order: number;
  command?: string;
  description: string;
  notes?: string;
}

/**
 * Configuration guide with common settings.
 */
export interface ConfigGuide {
  overview: string;
  commonSettings: ConfigSetting[];
  bestPractices: string[];
  exampleConfigs: CodeSnippet[];
}

export interface ConfigSetting {
  name: string;
  description: string;
  defaultValue: string;
  recommendedValue?: string;
  securityImplication?: string;
}

/**
 * Update represents a change discovered by the system.
 * Admins review and approve/reject updates.
 */
export interface Update {
  id: string;
  type: UpdateType;
  entityType: 'mission' | 'lab' | 'knowledge' | 'software';
  entityId: string;
  title: string;
  description: string;
  changes: UpdateChange[];
  source: Source;
  status: UpdateStatus;
  priority: UpdatePriority;
  discoveredAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  appliedAt?: string;
}

export type UpdateType = 'version' | 'deprecation' | 'security' | 'feature' | 'bugfix';
export type UpdateStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'ignored';
export type UpdatePriority = 'critical' | 'high' | 'medium' | 'low';

export interface UpdateChange {
  field: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

// ============================================================================
// USER & GAMIFICATION TYPES
// ============================================================================

/**
 * User progress state - persisted locally and synced with backend.
 * Gamification elements to motivate learning.
 */
export interface UserProgress {
  xp: number;
  level: number;
  streak: number; // Consecutive days of activity
  lastActivityDate: string; // ISO date string
  completedMissions: string[]; // Mission IDs
  completedLabs: string[]; // Lab IDs
  hintsUsed: Record<string, number[]>; // labId -> hint levels used
  quizScores: Record<string, number>; // missionId -> score percentage
  reflections: Record<string, string>; // missionId -> reflection text
  totalTimeSpent: number; // Minutes
  achievements: Achievement[];
  weeklyProgress: WeekProgress[];
}

/**
 * Week progress tracking for roadmap visualization.
 */
export interface WeekProgress {
  week: number;
  missionsCompleted: number;
  totalMissions: number;
  labCompleted: boolean;
  xpEarned: number;
}

/**
 * Achievement badge for milestones.
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Icon name from lucide-react
  unlockedAt: string;
}

/**
 * Level thresholds for gamification.
 * XP required to reach each level.
 */
export interface LevelThreshold {
  level: number;
  xpRequired: number;
  title: string; // e.g., "DevOps Apprentice", "Container Master"
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Application theme setting.
 */
export type Theme = 'dark' | 'light' | 'system';

/**
 * Sidebar navigation state.
 */
export interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean; // Desktop: collapsed to icons only
}

/**
 * Toast notification for user feedback.
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // ms, default 5000
}

/**
 * Modal state for confirmations and dialogs.
 */
export interface ModalState {
  isOpen: boolean;
  title: string;
  content: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response wrapper.
 * Consistent structure for all endpoints.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Paginated response for list endpoints.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * API error response structure.
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  timestamp: string;
}

/**
 * Roadmap data structure for week overview.
 */
export interface RoadmapWeek {
  week: number;
  theme: string;
  description: string;
  missions: MissionSummary[];
  lab: LabSummary | null;
}

export interface MissionSummary {
  id: string;
  day: number;
  title: string;
  xpReward: number;
  estimatedMinutes: number;
}

export interface LabSummary {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  xpReward: number;
}

/**
 * Statistics for admin dashboard.
 */
export interface AdminStats {
  totalMissions: number;
  totalLabs: number;
  totalKnowledgeTopics: number;
  totalSoftwareTools: number;
  pendingUpdates: number;
  totalXpAwarded: number;
  averageCompletionRate: number;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

/**
 * Common props for badge components.
 */
export interface BadgeProps {
  variant: 'difficulty' | 'status' | 'environment' | 'category';
  value: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Code block component props.
 */
export interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
}

/**
 * Card component base props.
 */
export interface CardProps {
  title: string;
  description: string;
  onClick?: () => void;
  isCompleted?: boolean;
  xpReward?: number;
}

/**
 * Filter state for list pages.
 */
export interface FilterState {
  search: string;
  category?: string;
  difficulty?: DifficultyLevel;
  environment?: Environment;
  status?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Makes all properties of T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extracts the type of array elements.
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Route params for dynamic routes.
 */
export interface MissionRouteParams {
  week: string;
  day: string;
}

export interface LabRouteParams {
  id: string;
}

export interface KnowledgeRouteParams {
  topicId: string;
}

export interface SoftwareRouteParams {
  id: string;
}
