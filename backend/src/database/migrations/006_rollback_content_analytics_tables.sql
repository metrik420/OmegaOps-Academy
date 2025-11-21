/**
 * FILE: backend/src/database/migrations/006_rollback_content_analytics_tables.sql
 * PURPOSE: Rollback migration for content analytics tables
 * USAGE: Run this to reverse migration 006 (drop all analytics tables)
 * WARNING: This will DELETE all analytics data (interactions, metrics, feedback, audit logs)
 * NOTES:
 *   - Drop tables in reverse dependency order (no FK violations)
 *   - Drop triggers before functions
 *   - Always confirm before running in production
 */

-- Drop triggers first (prevent function-in-use errors)
DROP TRIGGER IF EXISTS update_content_metrics_updated_at ON content_metrics;
DROP TRIGGER IF EXISTS update_content_feedback_updated_at ON content_feedback;
DROP TRIGGER IF EXISTS update_content_recommendations_updated_at ON content_recommendations;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (reverse order of creation to avoid FK violations)
DROP TABLE IF EXISTS content_cohort_analysis CASCADE;
DROP TABLE IF EXISTS content_recommendations CASCADE;
DROP TABLE IF EXISTS content_audit_log CASCADE;
DROP TABLE IF EXISTS content_feedback CASCADE;
DROP TABLE IF EXISTS user_content_interactions CASCADE;
DROP TABLE IF EXISTS content_metrics CASCADE;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Content analytics tables and triggers have been dropped successfully';
END $$;
