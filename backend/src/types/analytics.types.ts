/**
 * FILE: backend/src/types/analytics.types.ts
 * PURPOSE: TypeScript types for content analytics and monitoring system
 * EXPORTS: Interfaces for all analytics tables, API request/response types, enums
 * NOTES:
 *   - All database models use snake_case (match SQL schema)
 *   - API DTOs use camelCase (JavaScript convention)
 *   - Zod schemas for runtime validation at API boundaries
 */

import { z } from 'zod';

// =====================================================================
// ENUMS & CONSTANTS
// =====================================================================

export enum ContentType {
  MISSION = 'mission',
  LAB = 'lab',
  KNOWLEDGE = 'knowledge',
  SOFTWARE_TOOL = 'software_tool'
}

export enum InteractionType {
  VIEW = 'view',
  START = 'start',
  COMPLETE = 'complete',
  ABANDON = 'abandon',
  QUIZ_ATTEMPT = 'quiz_attempt',
  FEEDBACK = 'feedback',
  RATE = 'rate'
}

export enum HealthStatus {
  GREEN = 'green',      // 80-100: Excellent
  YELLOW = 'yellow',    // 60-79: Good
  ORANGE = 'orange',    // 40-59: Needs attention
  RED = 'red',          // 0-39: Critical
  UNKNOWN = 'unknown'   // Not enough data
}

export enum EngagementTrend {
  TRENDING_UP = 'trending_up',
  STABLE = 'stable',
  TRENDING_DOWN = 'trending_down'
}

export enum FeedbackType {
  BUG = 'bug',
  UNCLEAR = 'unclear',
  OUTDATED = 'outdated',
  TOO_EASY = 'too_easy',
  TOO_HARD = 'too_hard',
  TYPO = 'typo',
  OTHER = 'other'
}

export enum FeedbackCategory {
  CONTENT_QUALITY = 'content_quality',
  TECHNICAL_ISSUE = 'technical_issue',
  DIFFICULTY = 'difficulty',
  RELEVANCE = 'relevance'
}

export enum FeedbackSeverity {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum FeedbackStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  FIXED = 'fixed',
  CLOSED = 'closed',
  WONTFIX = 'wontfix'
}

export enum RecommendationType {
  REFRESH = 'refresh',
  SIMPLIFY = 'simplify',
  EXPAND = 'expand',
  REMOVE = 'remove',
  UPDATE = 'update',
  SPLIT = 'split',
  CLARIFY = 'clarify'
}

export enum RecommendationStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  DECLINED = 'declined',
  DISMISSED = 'dismissed'
}

export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  REFRESHED = 'refreshed',
  DEPRECATED = 'deprecated'
}

export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

// =====================================================================
// DATABASE MODELS (match SQL schema exactly)
// =====================================================================

export interface ContentMetrics {
  id: string;
  content_type: ContentType;
  content_id: string;
  week: number | null;
  day: number | null;

  // Engagement metrics
  total_views: number;
  total_starts: number;
  total_completions: number;
  total_abandons: number;
  avg_time_spent_seconds: number;

  // Quality metrics
  quiz_attempts: number;
  quiz_passes: number;
  quiz_pass_rate: number;
  avg_quiz_score: number;

  // User feedback
  difficulty_rating: number;
  clarity_rating: number;
  satisfaction_rating: number;
  total_ratings: number;

  // Health metrics
  health_score: number | null;
  health_status: HealthStatus;
  last_verified_date: Date | null;
  days_since_verified: number;

  // Trending
  completion_rate_change: number;
  engagement_trend: EngagementTrend;

  created_at: Date;
  updated_at: Date;
}

export interface UserContentInteraction {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;

  interaction_type: InteractionType;
  timestamp: Date;
  time_spent_seconds: number | null;

  // Quiz specific
  quiz_score: number | null;
  quiz_passed: boolean | null;

  // User feedback
  difficulty_rating: number | null;
  clarity_rating: number | null;
  satisfaction_rating: number | null;
  comment: string | null;

  // Lab specific
  lab_hints_used: number | null;
  lab_passed: boolean | null;
  lab_auto_grade_score: number | null;

  // Device/context
  device_type: DeviceType | null;
  referrer: string | null;
}

export interface ContentFeedback {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;

  feedback_type: FeedbackType;
  title: string;
  description: string;

  category: FeedbackCategory | null;
  severity: FeedbackSeverity;

  status: FeedbackStatus;
  admin_response: string | null;
  admin_user_id: string | null;

  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
}

export interface ContentAuditLog {
  id: string;
  content_type: ContentType;
  content_id: string;

  change_type: ChangeType;
  changed_by: string;

  old_data: any | null;  // JSONB
  new_data: any | null;  // JSONB
  change_summary: string | null;

  metrics_before: any | null;  // JSONB
  metrics_after: any | null;   // JSONB

  reason: string | null;
  based_on_metrics: boolean;
  recommendation_id: string | null;

  created_at: Date;
}

export interface ContentRecommendation {
  id: string;
  content_type: ContentType;
  content_id: string;

  recommendation_type: RecommendationType;
  recommendation_title: string;
  recommendation_description: string;

  reason: string;
  metric_source: string | null;
  metric_value: number | null;
  metric_threshold: number | null;
  confidence: number | null;

  status: RecommendationStatus;
  admin_notes: string | null;
  admin_user_id: string | null;

  created_at: Date;
  updated_at: Date;
  implemented_at: Date | null;
}

export interface ContentCohortAnalysis {
  id: string;
  content_id: string;
  content_type: ContentType;
  cohort_name: string;

  cohort_size: number | null;
  completion_rate: number | null;
  quiz_pass_rate: number | null;
  avg_time_spent: number | null;
  satisfaction_rating: number | null;

  trending_up: boolean | null;
  change_vs_overall: number | null;

  created_at: Date;
}

// =====================================================================
// ZOD VALIDATION SCHEMAS (for API request validation)
// =====================================================================

// POST /api/content/:id/track
export const TrackInteractionSchema = z.object({
  interactionType: z.enum(['view', 'start', 'complete', 'abandon', 'quiz_attempt', 'feedback', 'rate']),
  timeSpentSeconds: z.number().int().min(0).optional(),

  // Quiz specific
  quizScore: z.number().int().min(0).max(100).optional(),
  quizPassed: z.boolean().optional(),

  // Ratings (1-5)
  difficultyRating: z.number().int().min(1).max(5).optional(),
  clarityRating: z.number().int().min(1).max(5).optional(),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),

  // Lab specific
  labHintsUsed: z.number().int().min(0).optional(),
  labPassed: z.boolean().optional(),
  labAutoGradeScore: z.number().int().min(0).max(100).optional(),

  // Device/context
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  referrer: z.string().max(500).optional()
});

export type TrackInteractionInput = z.infer<typeof TrackInteractionSchema>;

// POST /api/content/:id/rate
export const RateContentSchema = z.object({
  difficulty: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  satisfaction: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional()
});

export type RateContentInput = z.infer<typeof RateContentSchema>;

// POST /api/content/:id/feedback
export const SubmitFeedbackSchema = z.object({
  type: z.enum(['bug', 'unclear', 'outdated', 'too_easy', 'too_hard', 'typo', 'other']),
  title: z.string().min(5).max(255),
  description: z.string().min(10).max(5000)
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackSchema>;

// POST /api/admin/analytics/recommendations/:id/action
export const RecommendationActionSchema = z.object({
  action: z.enum(['implemented', 'declined', 'dismissed']),
  notes: z.string().max(2000).optional()
});

export type RecommendationActionInput = z.infer<typeof RecommendationActionSchema>;

// POST /api/admin/analytics/feedback/:id/respond
export const RespondToFeedbackSchema = z.object({
  response: z.string().min(10).max(2000),
  status: z.enum(['acknowledged', 'in_progress', 'fixed', 'closed', 'wontfix'])
});

export type RespondToFeedbackInput = z.infer<typeof RespondToFeedbackSchema>;

// =====================================================================
// API RESPONSE TYPES (DTOs with camelCase)
// =====================================================================

export interface ContentMetricsDTO {
  id: string;
  contentType: ContentType;
  contentId: string;
  week: number | null;
  day: number | null;

  engagement: {
    totalViews: number;
    totalStarts: number;
    totalCompletions: number;
    totalAbandons: number;
    avgTimeSpentSeconds: number;
    completionRate: number;  // calculated: completions / starts
  };

  quality: {
    quizAttempts: number;
    quizPasses: number;
    quizPassRate: number;
    avgQuizScore: number;
  };

  feedback: {
    difficultyRating: number;
    clarityRating: number;
    satisfactionRating: number;
    totalRatings: number;
  };

  health: {
    score: number | null;
    status: HealthStatus;
    lastVerifiedDate: Date | null;
    daysSinceVerified: number;
  };

  trending: {
    completionRateChange: number;
    engagementTrend: EngagementTrend;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardSummaryDTO {
  summary: {
    totalContent: number;
    greenContent: number;
    yellowContent: number;
    orangeContent: number;
    redContent: number;
    avgHealthScore: number;
  };
  topPerformers: ContentMetricsDTO[];
  strugglingContent: ContentMetricsDTO[];
  recentFeedback: ContentFeedbackDTO[];
  recommendations: ContentRecommendationDTO[];
}

export interface ContentFeedbackDTO {
  id: string;
  userId: string;
  contentType: ContentType;
  contentId: string;

  feedbackType: FeedbackType;
  title: string;
  description: string;

  category: FeedbackCategory | null;
  severity: FeedbackSeverity;

  status: FeedbackStatus;
  adminResponse: string | null;

  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface ContentRecommendationDTO {
  id: string;
  contentType: ContentType;
  contentId: string;

  recommendationType: RecommendationType;
  recommendationTitle: string;
  recommendationDescription: string;

  reason: string;
  metricSource: string | null;
  metricValue: number | null;
  metricThreshold: number | null;
  confidence: number | null;

  status: RecommendationStatus;
  adminNotes: string | null;

  createdAt: Date;
  updatedAt: Date;
  implementedAt: Date | null;
}

export interface WeekMetricsDTO {
  week: number;
  contentCount: number;
  avgCompletionRate: number;
  avgQuizPassRate: number;
  healthDistribution: {
    green: number;
    yellow: number;
    orange: number;
    red: number;
    unknown: number;
  };
  missions: ContentMetricsDTO[];
  lab: ContentMetricsDTO | null;
}

export interface TrendingDTO {
  trendingUp: ContentMetricsDTO[];
  trendingDown: ContentMetricsDTO[];
  needsRefresh: ContentMetricsDTO[];
  needsRemoval: ContentMetricsDTO[];
  mostSearched: string[];  // Will track search queries later
}

// =====================================================================
// HELPER TYPES
// =====================================================================

export interface HealthScoreWeights {
  completionRate: number;   // Default: 0.25
  quizPassRate: number;      // Default: 0.25
  satisfaction: number;      // Default: 0.20
  engagement: number;        // Default: 0.15
  difficultyBalance: number; // Default: 0.15
}

export const DEFAULT_HEALTH_WEIGHTS: HealthScoreWeights = {
  completionRate: 0.25,
  quizPassRate: 0.25,
  satisfaction: 0.20,
  engagement: 0.15,
  difficultyBalance: 0.15
};

export interface RecommendationTrigger {
  type: RecommendationType;
  title: string;
  description: string;
  metricSource: string;
  metricValue: number;
  threshold: number;
  confidence: number;
}

// Confidence thresholds for recommendations
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,       // Sample size > 100, clear metric deviation
  MEDIUM: 70,     // Sample size 30-100, moderate deviation
  LOW: 50,        // Sample size < 30, speculative
  MIN_DISPLAY: 70 // Only show recommendations with confidence >= 70
};

// Health score ranges
export const HEALTH_SCORE_RANGES = {
  GREEN_MIN: 80,
  YELLOW_MIN: 60,
  ORANGE_MIN: 40,
  RED_MIN: 0
};

// Metric thresholds for recommendations
export const METRIC_THRESHOLDS = {
  COMPLETION_RATE_LOW: 0.60,      // <60% → recommend simplify
  QUIZ_PASS_RATE_LOW: 0.50,       // <50% → recommend clarify
  TIME_SPENT_HIGH_MULTIPLIER: 2.0, // >200% of avg → recommend split
  SATISFACTION_LOW: 3.0,           // <3.0 → get detailed feedback
  DAYS_SINCE_VERIFIED_HIGH: 90,    // >90 days → recommend refresh
  NO_ENGAGEMENT_DAYS: 30,          // No interactions in 30 days → investigate
  COMPLETION_RATE_VERY_HIGH: 0.95  // >95% + low engagement → expand scope
};
