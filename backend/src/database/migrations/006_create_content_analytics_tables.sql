/**
 * FILE: backend/src/database/migrations/006_create_content_analytics_tables.sql
 * PURPOSE: Create comprehensive content analytics and monitoring tables
 * SCHEMA: PostgreSQL (uses JSONB for flexible audit data, better indexing)
 * TABLES:
 *   - content_metrics: Aggregated performance metrics per content item
 *   - user_content_interactions: Granular user interaction tracking
 *   - content_feedback: User-submitted feedback and bug reports
 *   - content_audit_log: Change history with before/after snapshots
 *   - content_recommendations: Auto-generated actionable recommendations
 *   - content_cohort_analysis: Cohort-based performance analysis
 * NOTES:
 *   - All timestamps use TIMESTAMPTZ for timezone awareness
 *   - Indices optimized for common query patterns (dashboard, trending, feedback queue)
 *   - Foreign keys enforce referential integrity (users table must exist)
 *   - Partition user_content_interactions by month if volume exceeds 10M rows
 */

-- =====================================================================
-- 1. CONTENT_METRICS: Aggregated performance metrics per content item
-- =====================================================================
-- Stores calculated metrics for each piece of content (mission, lab, etc.)
-- Updated by ContentAnalyticsWorker (runs every 5 minutes)
-- Health score algorithm: weighted average of completion, quiz pass, satisfaction, engagement, difficulty
CREATE TABLE IF NOT EXISTS content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('mission', 'lab', 'knowledge', 'software_tool')),
  content_id VARCHAR(255) NOT NULL,
  week INTEGER,
  day INTEGER,

  -- Engagement metrics (raw counts)
  total_views INTEGER DEFAULT 0,
  total_starts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  total_abandons INTEGER DEFAULT 0,
  avg_time_spent_seconds INTEGER DEFAULT 0,

  -- Quality metrics (quiz performance)
  quiz_attempts INTEGER DEFAULT 0,
  quiz_passes INTEGER DEFAULT 0,
  quiz_pass_rate NUMERIC(5,2) DEFAULT 0 CHECK (quiz_pass_rate >= 0 AND quiz_pass_rate <= 100),
  avg_quiz_score INTEGER DEFAULT 0 CHECK (avg_quiz_score >= 0 AND avg_quiz_score <= 100),

  -- User feedback (1-5 scale ratings)
  difficulty_rating NUMERIC(3,2) DEFAULT 0 CHECK (difficulty_rating >= 0 AND difficulty_rating <= 5),
  clarity_rating NUMERIC(3,2) DEFAULT 0 CHECK (clarity_rating >= 0 AND clarity_rating <= 5),
  satisfaction_rating NUMERIC(3,2) DEFAULT 0 CHECK (satisfaction_rating >= 0 AND satisfaction_rating <= 5),
  total_ratings INTEGER DEFAULT 0,

  -- Health metrics (calculated by ContentRecommendationEngine)
  health_score INTEGER DEFAULT NULL CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('green', 'yellow', 'orange', 'red', 'unknown')),
  last_verified_date TIMESTAMPTZ,
  days_since_verified INTEGER DEFAULT 0,

  -- Trending (week-over-week comparison)
  completion_rate_change NUMERIC(6,2) DEFAULT 0,  -- % change from previous week
  engagement_trend VARCHAR(20) DEFAULT 'stable' CHECK (engagement_trend IN ('trending_up', 'stable', 'trending_down')),

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(content_type, content_id)
);

-- Indices for fast lookups (dashboard queries filter by type, status, week)
CREATE INDEX idx_content_metrics_content_type ON content_metrics(content_type);
CREATE INDEX idx_content_metrics_health_status ON content_metrics(health_status);
CREATE INDEX idx_content_metrics_week ON content_metrics(week);
CREATE INDEX idx_content_metrics_health_score ON content_metrics(health_score DESC NULLS LAST);
CREATE INDEX idx_content_metrics_updated_at ON content_metrics(updated_at);

COMMENT ON TABLE content_metrics IS 'Aggregated performance metrics for all content items, updated by ContentAnalyticsWorker every 5 minutes';
COMMENT ON COLUMN content_metrics.health_score IS 'Weighted score (0-100): completion_rate*25% + quiz_pass_rate*25% + satisfaction*20% + engagement*15% + difficulty_balance*15%';
COMMENT ON COLUMN content_metrics.completion_rate_change IS 'Percentage change in completion rate compared to previous week (for trending detection)';

-- =====================================================================
-- 2. USER_CONTENT_INTERACTIONS: Granular user interaction tracking
-- =====================================================================
-- Logs every user action (view, start, complete, quiz, feedback)
-- High write volume: partition by month if >10M rows, consider TimescaleDB for time-series optimization
CREATE TABLE IF NOT EXISTS user_content_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('mission', 'lab', 'knowledge', 'software_tool')),
  content_id VARCHAR(255) NOT NULL,

  -- Interaction type and timing
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'start', 'complete', 'abandon', 'quiz_attempt', 'feedback', 'rate')),
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  time_spent_seconds INTEGER,

  -- Quiz specific (only populated if interaction_type = 'quiz_attempt')
  quiz_score INTEGER CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
  quiz_passed BOOLEAN,

  -- User feedback (only populated if interaction_type = 'rate')
  difficulty_rating INTEGER CHECK (difficulty_rating IS NULL OR (difficulty_rating >= 1 AND difficulty_rating <= 5)),
  clarity_rating INTEGER CHECK (clarity_rating IS NULL OR (clarity_rating >= 1 AND clarity_rating <= 5)),
  satisfaction_rating INTEGER CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5)),
  comment TEXT,

  -- Lab specific (only populated for content_type = 'lab')
  lab_hints_used INTEGER,
  lab_passed BOOLEAN,
  lab_auto_grade_score INTEGER CHECK (lab_auto_grade_score IS NULL OR (lab_auto_grade_score >= 0 AND lab_auto_grade_score <= 100)),

  -- Device/context (for cohort analysis: mobile vs desktop engagement)
  device_type VARCHAR(20) CHECK (device_type IS NULL OR device_type IN ('mobile', 'tablet', 'desktop')),
  referrer TEXT,

  -- Foreign key to users table (assumes users.id is UUID)
  CONSTRAINT fk_user_content_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for common queries (user history, content interactions, time-series analysis)
CREATE INDEX idx_user_content_interactions_user_id ON user_content_interactions(user_id);
CREATE INDEX idx_user_content_interactions_content ON user_content_interactions(content_type, content_id);
CREATE INDEX idx_user_content_interactions_timestamp ON user_content_interactions(timestamp DESC);
CREATE INDEX idx_user_content_interactions_type ON user_content_interactions(interaction_type);
CREATE INDEX idx_user_content_interactions_user_content ON user_content_interactions(user_id, content_id);

COMMENT ON TABLE user_content_interactions IS 'Granular tracking of every user interaction with content (view, start, complete, quiz, feedback)';
COMMENT ON COLUMN user_content_interactions.device_type IS 'Device type for cohort analysis (mobile users may have lower completion rates)';
COMMENT ON COLUMN user_content_interactions.time_spent_seconds IS 'Time spent on this interaction (NULL if not tracked, e.g., instant views)';

-- =====================================================================
-- 3. CONTENT_FEEDBACK: User-submitted feedback and bug reports
-- =====================================================================
-- Users report issues with content (typos, outdated info, unclear instructions)
-- Admin triages and responds via feedback management dashboard
CREATE TABLE IF NOT EXISTS content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('mission', 'lab', 'knowledge', 'software_tool')),
  content_id VARCHAR(255) NOT NULL,

  feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN ('bug', 'unclear', 'outdated', 'too_easy', 'too_hard', 'typo', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Categorization (helps admin prioritize)
  category VARCHAR(50) CHECK (category IS NULL OR category IN ('content_quality', 'technical_issue', 'difficulty', 'relevance')),
  severity VARCHAR(20) DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),

  -- Status tracking (feedback lifecycle)
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'fixed', 'closed', 'wontfix')),
  admin_response TEXT,
  admin_user_id UUID,  -- Admin who responded (optional FK to users table)

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,

  CONSTRAINT fk_content_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indices for feedback queue (admin filters by status, severity, date)
CREATE INDEX idx_content_feedback_status_severity ON content_feedback(status, severity);
CREATE INDEX idx_content_feedback_created_at ON content_feedback(created_at DESC);
CREATE INDEX idx_content_feedback_content ON content_feedback(content_type, content_id);
CREATE INDEX idx_content_feedback_user_id ON content_feedback(user_id);

COMMENT ON TABLE content_feedback IS 'User-submitted feedback and bug reports for content (typos, outdated info, unclear instructions)';
COMMENT ON COLUMN content_feedback.severity IS 'Admin-set priority (critical = content unusable, high = major issue, normal = minor, low = nice-to-have)';
COMMENT ON COLUMN content_feedback.status IS 'Feedback lifecycle: open → acknowledged → in_progress → fixed/closed/wontfix';

-- =====================================================================
-- 4. CONTENT_AUDIT_LOG: Change history with before/after snapshots
-- =====================================================================
-- Every content change (create, update, delete, refresh) logged here
-- Stores before/after snapshots for rollback and impact analysis
CREATE TABLE IF NOT EXISTS content_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('mission', 'lab', 'knowledge', 'software_tool')),
  content_id VARCHAR(255) NOT NULL,

  -- Change tracking
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'refreshed', 'deprecated')),
  changed_by VARCHAR(255) NOT NULL,  -- admin username or 'system' or 'worker:KnowledgeWorker'

  -- Before/after snapshots (JSONB for flexible schema)
  old_data JSONB,
  new_data JSONB,
  change_summary TEXT,

  -- Metrics snapshot (performance before/after change)
  metrics_before JSONB,
  metrics_after JSONB,

  -- Reasoning (why was this change made?)
  reason TEXT,
  based_on_metrics BOOLEAN DEFAULT FALSE,
  recommendation_id UUID,  -- Link to content_recommendations if change was triggered by recommendation

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for audit trail queries (filter by content, date, change type)
CREATE INDEX idx_content_audit_log_content ON content_audit_log(content_type, content_id);
CREATE INDEX idx_content_audit_log_created_at ON content_audit_log(created_at DESC);
CREATE INDEX idx_content_audit_log_change_type ON content_audit_log(change_type);
CREATE INDEX idx_content_audit_log_changed_by ON content_audit_log(changed_by);

COMMENT ON TABLE content_audit_log IS 'Complete audit trail of all content changes with before/after snapshots for rollback and impact analysis';
COMMENT ON COLUMN content_audit_log.old_data IS 'JSONB snapshot of content before change (NULL for created)';
COMMENT ON COLUMN content_audit_log.new_data IS 'JSONB snapshot of content after change (NULL for deleted)';
COMMENT ON COLUMN content_audit_log.metrics_before IS 'Performance metrics before change (completion rate, quiz pass rate, etc.)';
COMMENT ON COLUMN content_audit_log.metrics_after IS 'Performance metrics after change (captured 7 days later for A/B comparison)';

-- =====================================================================
-- 5. CONTENT_RECOMMENDATIONS: Auto-generated actionable recommendations
-- =====================================================================
-- ContentRecommendationEngine generates recommendations based on metrics
-- Admin reviews, approves/declines, and tracks implementation
CREATE TABLE IF NOT EXISTS content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('mission', 'lab', 'knowledge', 'software_tool')),
  content_id VARCHAR(255) NOT NULL,

  -- Recommendation details
  recommendation_type VARCHAR(50) NOT NULL CHECK (recommendation_type IN ('refresh', 'simplify', 'expand', 'remove', 'update', 'split', 'clarify')),
  recommendation_title VARCHAR(255) NOT NULL,
  recommendation_description TEXT NOT NULL,

  -- Reasoning (what metrics triggered this recommendation?)
  reason TEXT NOT NULL,
  metric_source VARCHAR(100),  -- 'completion_rate', 'quiz_pass_rate', 'user_feedback', 'age', 'engagement'
  metric_value NUMERIC(10,2),
  metric_threshold NUMERIC(10,2),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),  -- 0-100, how confident is this recommendation?

  -- Status tracking (recommendation lifecycle)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'implemented', 'declined', 'dismissed')),
  admin_notes TEXT,
  admin_user_id UUID,  -- Admin who acted on recommendation

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  implemented_at TIMESTAMPTZ,

  -- Prevent duplicate recommendations (same type for same content within 30 days)
  UNIQUE(content_type, content_id, recommendation_type, created_at::date)
);

-- Indices for recommendation queue (admin filters by status, confidence, priority)
CREATE INDEX idx_content_recommendations_status ON content_recommendations(status);
CREATE INDEX idx_content_recommendations_created_at ON content_recommendations(created_at DESC);
CREATE INDEX idx_content_recommendations_confidence ON content_recommendations(confidence DESC);
CREATE INDEX idx_content_recommendations_content ON content_recommendations(content_type, content_id);

COMMENT ON TABLE content_recommendations IS 'Auto-generated actionable recommendations based on content performance metrics';
COMMENT ON COLUMN content_recommendations.confidence IS 'Confidence score 0-100 (based on sample size, metric deviation, historical accuracy)';
COMMENT ON COLUMN content_recommendations.metric_source IS 'Which metric triggered this recommendation (completion_rate, quiz_pass_rate, user_feedback, etc.)';
COMMENT ON COLUMN content_recommendations.status IS 'Lifecycle: pending → acknowledged → in_progress → implemented/declined/dismissed';

-- =====================================================================
-- 6. CONTENT_COHORT_ANALYSIS: Cohort-based performance analysis
-- =====================================================================
-- Compare content performance across user cohorts (mobile vs desktop, early adopters vs later users, etc.)
-- Helps identify if content difficulty varies by user segment
CREATE TABLE IF NOT EXISTS content_cohort_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('mission', 'lab', 'knowledge', 'software_tool')),
  cohort_name VARCHAR(100) NOT NULL,  -- 'early_adopters', 'week1', 'mobile_users', 'desktop_users', 'by_region', etc.

  -- Cohort metrics
  cohort_size INTEGER,
  completion_rate NUMERIC(5,2),
  quiz_pass_rate NUMERIC(5,2),
  avg_time_spent INTEGER,
  satisfaction_rating NUMERIC(3,2),

  -- Trending (cohort vs overall population)
  trending_up BOOLEAN,
  change_vs_overall NUMERIC(6,2),  -- % difference from overall population (positive = better, negative = worse)

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(content_id, cohort_name, created_at::date)
);

-- Indices for cohort analysis queries
CREATE INDEX idx_content_cohort_analysis_content ON content_cohort_analysis(content_id, cohort_name);
CREATE INDEX idx_content_cohort_analysis_created_at ON content_cohort_analysis(created_at DESC);

COMMENT ON TABLE content_cohort_analysis IS 'Cohort-based performance analysis (mobile vs desktop, early adopters vs later users, etc.)';
COMMENT ON COLUMN content_cohort_analysis.change_vs_overall IS 'Percentage difference from overall population (positive = cohort performs better, negative = worse)';
COMMENT ON COLUMN content_cohort_analysis.trending_up IS 'True if cohort performance improving week-over-week';

-- =====================================================================
-- AUTO-UPDATE TIMESTAMPS (updated_at trigger)
-- =====================================================================
-- Automatically update updated_at column on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_content_metrics_updated_at BEFORE UPDATE ON content_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_feedback_updated_at BEFORE UPDATE ON content_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_recommendations_updated_at BEFORE UPDATE ON content_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to automatically update updated_at timestamp on row updates';
