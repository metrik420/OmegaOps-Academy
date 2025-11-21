## **Content Analytics & Monitoring System - Complete Implementation Guide**

### **Table of Contents**
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Backend Services](#backend-services)
5. [API Endpoints](#api-endpoints)
6. [Worker Process](#worker-process)
7. [Frontend Integration](#frontend-integration)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Performance & Security](#performance--security)

---

## **Overview**

The Content Analytics & Monitoring System tracks user interactions, calculates content health scores, and generates actionable recommendations for content improvement. This is THE competitive advantage—continuous, data-driven content optimization.

### **Key Features**
- **Real-time Tracking:** Every user interaction (view, start, complete, quiz, rating, feedback)
- **Health Scoring:** 0-100 score based on weighted metrics (completion rate, quiz pass rate, satisfaction, engagement, difficulty balance)
- **Automated Recommendations:** Refresh, simplify, expand, remove, clarify, split (confidence-based)
- **Admin Dashboard:** Visual health grid, trending insights, feedback queue, recommendation management
- **User Feedback:** Bug reports, typos, outdated content, difficulty feedback
- **Audit Trail:** Complete history of content changes with before/after metrics

### **Success Metrics**
- ✅ Track 100% of user content interactions
- ✅ Calculate health scores for all 72 content items (updated hourly)
- ✅ Admin dashboard showing real-time metrics (<2s load time)
- ✅ Generate weekly recommendations (only confidence >= 70%)
- ✅ Feedback system with 90%+ resolution rate
- ✅ Content refresh cycle established (quarterly reviews)
- ✅ Measurable improvement in content performance based on recommendations

---

## **Architecture**

### **Data Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
│  (view, start, complete, quiz, rate, feedback)                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│         POST /api/content/:id/track (fire-and-forget)           │
│  ContentAnalyticsService.trackInteraction()                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│            INSERT INTO user_content_interactions                 │
│  (granular interaction log with all metadata)                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│      ContentAnalyticsWorker (runs every 5 minutes)              │
│  Aggregates interactions → content_metrics table                │
│  Calculates health scores (0-100)                               │
│  Determines health status (green/yellow/orange/red)             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│   ContentRecommendationEngine (runs daily)                      │
│  Analyzes metrics → generates recommendations                   │
│  Checks triggers (completion rate, quiz pass rate, age, etc.)   │
│  Inserts into content_recommendations (deduplicated)            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│         Admin Dashboard (GET /api/admin/analytics/dashboard)    │
│  Displays health grid, trending, recommendations, feedback      │
│  Admin approves/declines recommendations                        │
│  Admin responds to feedback                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              Content Update (manual or automated)                │
│  Logged in content_audit_log with before/after metrics          │
│  Recommendations marked as 'implemented'                        │
│  Metrics recalculated after 7 days (A/B comparison)             │
└─────────────────────────────────────────────────────────────────┘
```

### **Component Diagram**

```
┌───────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                          │
│  - User interaction hooks (useTrackInteraction, useRateContent)   │
│  - Admin dashboard components (HealthGrid, RecommendationQueue)   │
│  - Feedback forms (bug reports, ratings)                          │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│                    API LAYER (Express Routes)                     │
│  /api/content/:id/track, /api/content/:id/rate, /feedback        │
│  /api/admin/analytics/* (dashboard, recommendations, feedback)    │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│                    SERVICES (Business Logic)                      │
│  ContentAnalyticsService - track, calculate, aggregate           │
│  ContentRecommendationEngine - analyze, generate, update         │
│  ContentFeedbackService - create, list, respond                  │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                        │
│  user_content_interactions (raw event log)                       │
│  content_metrics (aggregated metrics, health scores)             │
│  content_recommendations (actionable insights)                   │
│  content_feedback (user-submitted reports)                       │
│  content_audit_log (change history)                              │
│  content_cohort_analysis (segmented metrics)                     │
└───────────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────────┐
│                 WORKER PROCESS (Background Jobs)                  │
│  ContentAnalyticsWorker.aggregateMetrics() - every 5 minutes     │
│  ContentAnalyticsWorker.generateRecommendations() - daily        │
└───────────────────────────────────────────────────────────────────┘
```

---

## **Database Schema**

### **1. user_content_interactions** (Granular Event Log)

**Purpose:** Logs every user interaction with content (high write volume, partitionable)

| Column                | Type         | Description                                      |
|-----------------------|--------------|--------------------------------------------------|
| id                    | UUID PK      | Unique interaction ID                            |
| user_id               | UUID FK      | User who performed action                        |
| content_type          | VARCHAR(50)  | mission, lab, knowledge, software_tool           |
| content_id            | VARCHAR(255) | Content identifier                               |
| interaction_type      | VARCHAR(50)  | view, start, complete, abandon, quiz_attempt, rate |
| timestamp             | TIMESTAMPTZ  | When interaction occurred                        |
| time_spent_seconds    | INTEGER      | Time spent (NULL if not tracked)                 |
| quiz_score            | INTEGER      | Quiz score 0-100 (NULL if not quiz)              |
| quiz_passed           | BOOLEAN      | Whether quiz passed (NULL if not quiz)           |
| difficulty_rating     | INTEGER      | 1-5 (NULL if not rated)                          |
| clarity_rating        | INTEGER      | 1-5 (NULL if not rated)                          |
| satisfaction_rating   | INTEGER      | 1-5 (NULL if not rated)                          |
| comment               | TEXT         | User comment (NULL if none)                      |
| lab_hints_used        | INTEGER      | Hints used in lab (NULL if not lab)              |
| lab_passed            | BOOLEAN      | Lab success (NULL if not lab)                    |
| lab_auto_grade_score  | INTEGER      | Lab auto-grade score (NULL if not lab)           |
| device_type           | VARCHAR(20)  | mobile, tablet, desktop (NULL if unknown)        |
| referrer              | TEXT         | Where user came from (NULL if direct)            |

**Indices:**
- user_id (user history queries)
- content_type + content_id (content-specific queries)
- timestamp DESC (time-series queries)
- interaction_type (filtering by action type)

**Partitioning Strategy (if >10M rows):**
```sql
-- Partition by month for efficient archival
CREATE TABLE user_content_interactions_2025_01 PARTITION OF user_content_interactions
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

### **2. content_metrics** (Aggregated Performance Metrics)

**Purpose:** Pre-calculated metrics for fast dashboard queries (updated every 5 minutes by worker)

| Column                   | Type         | Description                                      |
|--------------------------|--------------|--------------------------------------------------|
| id                       | UUID PK      | Unique metrics record ID                         |
| content_type             | VARCHAR(50)  | mission, lab, knowledge, software_tool           |
| content_id               | VARCHAR(255) | Content identifier                               |
| week                     | INTEGER      | Week number 1-12 (NULL if not mission/lab)       |
| day                      | INTEGER      | Day number 1-7 (NULL if not mission)             |
| total_views              | INTEGER      | Number of views                                  |
| total_starts             | INTEGER      | Number of starts                                 |
| total_completions        | INTEGER      | Number of completions                            |
| total_abandons           | INTEGER      | Number of abandons                               |
| avg_time_spent_seconds   | INTEGER      | Average time spent                               |
| quiz_attempts            | INTEGER      | Number of quiz attempts                          |
| quiz_passes              | INTEGER      | Number of quiz passes                            |
| quiz_pass_rate           | NUMERIC(5,2) | Pass rate percentage (0-100)                     |
| avg_quiz_score           | INTEGER      | Average quiz score (0-100)                       |
| difficulty_rating        | NUMERIC(3,2) | Average difficulty rating (1-5)                  |
| clarity_rating           | NUMERIC(3,2) | Average clarity rating (1-5)                     |
| satisfaction_rating      | NUMERIC(3,2) | Average satisfaction rating (1-5)                |
| total_ratings            | INTEGER      | Number of ratings                                |
| **health_score**         | **INTEGER**  | **0-100 health score (NULL if insufficient data)** |
| **health_status**        | **VARCHAR(20)** | **green, yellow, orange, red, unknown**        |
| last_verified_date       | TIMESTAMPTZ  | Last content verification date                   |
| days_since_verified      | INTEGER      | Days since last verification                     |
| completion_rate_change   | NUMERIC(6,2) | % change from previous week                      |
| engagement_trend         | VARCHAR(20)  | trending_up, stable, trending_down               |

**Unique Constraint:** (content_type, content_id)

**Indices:**
- content_type (filter by type)
- health_status (filter by status)
- week (week-specific queries)
- health_score DESC NULLS LAST (leaderboard queries)

**Health Score Algorithm:**
```
health_score = (
  completion_rate * 0.25 +
  quiz_pass_rate * 0.25 +
  satisfaction_rating * 0.20 +
  engagement_score * 0.15 +
  difficulty_balance * 0.15
) * 100

WHERE:
  completion_rate = completions / starts
  quiz_pass_rate = quiz_passes / quiz_attempts
  satisfaction_rating = avg_satisfaction / 5 (normalized to 0-1)
  engagement_score = starts / views (high engagement = users start after viewing)
  difficulty_balance = 1 - abs(avg_difficulty - 3) / 2 (penalize too easy/hard)

RANGES:
  80-100: Green (excellent)
  60-79:  Yellow (good)
  40-59:  Orange (needs attention)
  0-39:   Red (critical)
  NULL:   Unknown (insufficient data)
```

---

### **3. content_recommendations** (Actionable Insights)

**Purpose:** Auto-generated recommendations for content improvement (created daily by worker)

| Column                      | Type         | Description                                      |
|-----------------------------|--------------|--------------------------------------------------|
| id                          | UUID PK      | Unique recommendation ID                         |
| content_type                | VARCHAR(50)  | mission, lab, knowledge, software_tool           |
| content_id                  | VARCHAR(255) | Content identifier                               |
| recommendation_type         | VARCHAR(50)  | refresh, simplify, expand, remove, update, split, clarify |
| recommendation_title        | VARCHAR(255) | Short title                                      |
| recommendation_description  | TEXT         | Detailed description                             |
| reason                      | TEXT         | Why this recommendation was generated            |
| metric_source               | VARCHAR(100) | completion_rate, quiz_pass_rate, user_feedback, age, engagement |
| metric_value                | NUMERIC(10,2)| Actual metric value                              |
| metric_threshold            | NUMERIC(10,2)| Threshold that triggered recommendation          |
| confidence                  | INTEGER      | 0-100 confidence score                           |
| status                      | VARCHAR(20)  | pending, acknowledged, in_progress, implemented, declined, dismissed |
| admin_notes                 | TEXT         | Admin response notes                             |
| admin_user_id               | UUID FK      | Admin who acted on recommendation                |
| implemented_at              | TIMESTAMPTZ  | When recommendation was implemented              |

**Unique Constraint:** (content_type, content_id, recommendation_type, created_at::date) (prevent duplicates within 24h)

**Indices:**
- status (filter pending vs implemented)
- confidence DESC (prioritize high-confidence recommendations)
- created_at DESC (chronological order)

**Recommendation Triggers:**

| Trigger                     | Metric                    | Threshold           | Type      | Confidence Calculation                  |
|-----------------------------|---------------------------|---------------------|-----------|-----------------------------------------|
| Low completion rate         | completion_rate           | < 0.60              | simplify  | Based on total_starts (>=100 = 85%)     |
| Low quiz pass rate          | quiz_pass_rate            | < 0.50              | clarify   | Based on quiz_attempts (>=100 = 85%)    |
| Excessive time spent        | avg_time_spent_seconds    | > 1800 (30 min)     | split     | Based on total_completions (>=100 = 85%)|
| Low satisfaction            | satisfaction_rating       | < 3.0               | refresh   | Based on total_ratings (>=100 = 85%)    |
| Outdated content            | days_since_verified       | > 90                | refresh   | 100% (objective metric)                 |
| No engagement               | total_views               | == 0                | remove    | 90% (objective metric)                  |
| Very high completion rate   | completion_rate           | > 0.95              | expand    | Based on total_starts (>=100 = 85%)     |

---

### **4. content_feedback** (User-Submitted Reports)

**Purpose:** Users report bugs, typos, outdated content, difficulty issues

| Column          | Type         | Description                                      |
|-----------------|--------------|--------------------------------------------------|
| id              | UUID PK      | Unique feedback ID                               |
| user_id         | UUID FK      | User who submitted feedback                      |
| content_type    | VARCHAR(50)  | mission, lab, knowledge, software_tool           |
| content_id      | VARCHAR(255) | Content identifier                               |
| feedback_type   | VARCHAR(50)  | bug, unclear, outdated, too_easy, too_hard, typo, other |
| title           | VARCHAR(255) | Short title                                      |
| description     | TEXT         | Detailed description                             |
| category        | VARCHAR(50)  | content_quality, technical_issue, difficulty, relevance |
| severity        | VARCHAR(20)  | low, normal, high, critical                      |
| status          | VARCHAR(20)  | open, acknowledged, in_progress, fixed, closed, wontfix |
| admin_response  | TEXT         | Admin response                                   |
| admin_user_id   | UUID FK      | Admin who responded                              |
| resolved_at     | TIMESTAMPTZ  | When feedback was resolved                       |

**Indices:**
- status + severity (feedback queue queries)
- created_at DESC (chronological order)
- content_type + content_id (content-specific feedback)

**Auto-Categorization:**
- bug → technical_issue (severity: high)
- unclear, typo → content_quality (severity: normal)
- too_easy, too_hard → difficulty (severity: normal)
- outdated → relevance (severity: high)

**Duplicate Detection:** Same user + content_id + feedback_type within 24 hours

---

### **5. content_audit_log** (Change History)

**Purpose:** Complete audit trail of all content changes with before/after snapshots

| Column           | Type         | Description                                      |
|------------------|--------------|--------------------------------------------------|
| id               | UUID PK      | Unique audit log entry ID                        |
| content_type     | VARCHAR(50)  | mission, lab, knowledge, software_tool           |
| content_id       | VARCHAR(255) | Content identifier                               |
| change_type      | VARCHAR(50)  | created, updated, deleted, refreshed, deprecated |
| changed_by       | VARCHAR(255) | admin username, 'system', 'worker:KnowledgeWorker' |
| old_data         | JSONB        | Content before change (NULL if created)          |
| new_data         | JSONB        | Content after change (NULL if deleted)           |
| change_summary   | TEXT         | What changed and why                             |
| metrics_before   | JSONB        | Performance metrics before change                |
| metrics_after    | JSONB        | Performance metrics after change (captured 7 days later) |
| reason           | TEXT         | Why this change was made                         |
| based_on_metrics | BOOLEAN      | Whether change was data-driven                   |
| recommendation_id| UUID FK      | Link to recommendation (if triggered by one)     |

**Indices:**
- content_type + content_id (content history)
- created_at DESC (chronological order)
- change_type (filter by action type)

**Rollback Capability:**
```sql
-- Restore previous version
UPDATE missions
SET title = old_data->>'title', content = old_data->>'content'
WHERE id = (SELECT content_id FROM content_audit_log WHERE id = 'audit-log-id');
```

---

### **6. content_cohort_analysis** (Segmented Metrics)

**Purpose:** Compare content performance across user cohorts (mobile vs desktop, early adopters vs later users, etc.)

| Column             | Type         | Description                                      |
|--------------------|--------------|--------------------------------------------------|
| id                 | UUID PK      | Unique cohort analysis ID                        |
| content_id         | VARCHAR(255) | Content identifier                               |
| content_type       | VARCHAR(50)  | mission, lab, knowledge, software_tool           |
| cohort_name        | VARCHAR(100) | early_adopters, week1, mobile_users, desktop_users, by_region, etc. |
| cohort_size        | INTEGER      | Number of users in cohort                        |
| completion_rate    | NUMERIC(5,2) | Cohort completion rate                           |
| quiz_pass_rate     | NUMERIC(5,2) | Cohort quiz pass rate                            |
| avg_time_spent     | INTEGER      | Cohort avg time spent                            |
| satisfaction_rating| NUMERIC(3,2) | Cohort avg satisfaction                          |
| trending_up        | BOOLEAN      | Whether cohort performance improving             |
| change_vs_overall  | NUMERIC(6,2) | % difference from overall population             |

**Unique Constraint:** (content_id, cohort_name, created_at::date)

**Use Cases:**
- Mobile users have 20% lower completion rate → UI/UX issue
- Early adopters (first week) have higher satisfaction → onboarding quality dropped
- Users from specific region struggle → localization/cultural context issue

---

## **Backend Services**

### **1. ContentAnalyticsService** (Core Analytics Logic)

**File:** `backend/src/services/ContentAnalyticsService.ts`

**Methods:**

#### `trackInteraction(userId, contentType, contentId, data)`
- **Purpose:** Log user interaction (view, start, complete, quiz, rate, etc.)
- **Complexity:** O(1) - single INSERT
- **Performance:** <50ms p95
- **Fire-and-forget:** Does not block user flow, logs errors but doesn't throw
- **Usage:**
```typescript
await ContentAnalyticsService.trackInteraction(
  userId,
  ContentType.MISSION,
  'wk1-day1',
  {
    interactionType: InteractionType.COMPLETE,
    timeSpentSeconds: 180
  }
);
```

#### `recordQuizAttempt(userId, contentId, score, passed)`
- **Purpose:** Convenience method for quiz interactions
- **Calls:** trackInteraction() internally
- **Usage:**
```typescript
await ContentAnalyticsService.recordQuizAttempt(
  userId,
  'wk1-day1',
  85, // score
  true // passed
);
```

#### `calculateCompletionRate(contentType, contentId)`
- **Purpose:** Calculate completion rate (completions / starts)
- **Returns:** Number (0-1) or null if no data
- **Complexity:** O(n) where n = number of interactions for content
- **Performance:** <100ms p95 (indexed query)
- **Usage:**
```typescript
const rate = await ContentAnalyticsService.calculateCompletionRate(
  ContentType.MISSION,
  'wk1-day1'
);
// rate = 0.82 (82% completion)
```

#### `calculateQuizPassRate(contentType, contentId)`
- **Purpose:** Calculate quiz pass rate (passes / attempts)
- **Returns:** Number (0-1) or null if no quiz data
- **Usage:**
```typescript
const passRate = await ContentAnalyticsService.calculateQuizPassRate(
  ContentType.MISSION,
  'wk1-day1'
);
// passRate = 0.75 (75% pass rate)
```

#### `calculateHealthScore(contentType, contentId)`
- **Purpose:** Calculate 0-100 health score using weighted algorithm
- **Returns:** Number (0-100) or null if insufficient data
- **Algorithm:** See database schema section
- **Usage:**
```typescript
const healthScore = await ContentAnalyticsService.calculateHealthScore(
  ContentType.MISSION,
  'wk1-day1'
);
// healthScore = 85 (green status)
```

#### `aggregateMetrics(contentType, contentId)`
- **Purpose:** Update content_metrics table with latest calculated values (called by worker)
- **Complexity:** O(n) where n = number of interactions for content
- **Performance:** <500ms p95
- **Usage:**
```typescript
// Called by ContentAnalyticsWorker every 5 minutes
await ContentAnalyticsService.aggregateMetrics(
  ContentType.MISSION,
  'wk1-day1'
);
```

#### `getContentMetrics(contentType, contentId)`
- **Purpose:** Fetch metrics for single content item
- **Returns:** ContentMetrics object or null
- **Usage:**
```typescript
const metrics = await ContentAnalyticsService.getContentMetrics(
  ContentType.MISSION,
  'wk1-day1'
);
```

#### `getTopPerformers(limit)`
- **Purpose:** Fetch top-performing content (health score DESC)
- **Returns:** Array of ContentMetrics
- **Usage:**
```typescript
const topPerformers = await ContentAnalyticsService.getTopPerformers(10);
```

#### `getStrugglingContent(limit)`
- **Purpose:** Fetch struggling content (health score ASC, orange/red status)
- **Returns:** Array of ContentMetrics
- **Usage:**
```typescript
const strugglingContent = await ContentAnalyticsService.getStrugglingContent(10);
```

---

### **2. ContentRecommendationEngine** (Recommendation Generation)

**File:** `backend/src/services/ContentRecommendationEngine.ts`

**Methods:**

#### `analyze(contentType, contentId)`
- **Purpose:** Analyze content and generate recommendations
- **Returns:** Array of RecommendationTrigger objects
- **Complexity:** O(1) - checks metrics, generates recommendations
- **Performance:** <100ms per content item
- **Usage:**
```typescript
const recommendations = await ContentRecommendationEngine.analyze(
  ContentType.MISSION,
  'wk1-day1'
);
// [
//   { type: 'simplify', title: 'Low completion rate...', confidence: 85 },
//   { type: 'refresh', title: 'Content not verified...', confidence: 100 }
// ]
```

#### `generateAll()`
- **Purpose:** Generate recommendations for all content (batch job, called daily)
- **Returns:** Number of recommendations created
- **Complexity:** O(n) where n = number of content items
- **Performance:** ~10s for 100 content items
- **Usage:**
```typescript
// Called by ContentAnalyticsWorker daily
const count = await ContentRecommendationEngine.generateAll();
// count = 12 (12 new recommendations created)
```

#### `listPending(limit)`
- **Purpose:** Fetch pending recommendations (for admin dashboard)
- **Returns:** Array of ContentRecommendation sorted by confidence DESC
- **Usage:**
```typescript
const pendingRecs = await ContentRecommendationEngine.listPending(50);
```

#### `updateStatus(id, status, notes, adminUserId)`
- **Purpose:** Admin acts on recommendation (implemented, declined, dismissed)
- **Usage:**
```typescript
await ContentRecommendationEngine.updateStatus(
  'rec-123',
  'implemented',
  'Simplified instructions based on recommendation',
  adminUserId
);
```

---

### **3. ContentFeedbackService** (User Feedback Management)

**File:** `backend/src/services/ContentFeedbackService.ts`

**Methods:**

#### `createFeedback(userId, contentType, contentId, data)`
- **Purpose:** User submits feedback or bug report
- **Duplicate Detection:** Same user + content + type within 24 hours
- **Auto-Categorization:** Sets category and severity based on feedback type
- **Returns:** ContentFeedback object
- **Usage:**
```typescript
const feedback = await ContentFeedbackService.createFeedback(
  userId,
  ContentType.MISSION,
  'wk1-day1',
  {
    type: FeedbackType.BUG,
    title: 'Broken link in task 2',
    description: 'The link to the SSH tutorial returns 404'
  }
);
// feedback.severity = 'high' (auto-set for bugs)
```

#### `listFeedback(filters)`
- **Purpose:** Admin fetches feedback queue with filters
- **Filters:** status, severity, contentType, contentId, userId, limit, offset
- **Returns:** Array of ContentFeedback sorted by severity + created_at
- **Usage:**
```typescript
const openBugs = await ContentFeedbackService.listFeedback({
  status: FeedbackStatus.OPEN,
  severity: FeedbackSeverity.HIGH,
  limit: 50
});
```

#### `respondToFeedback(feedbackId, response, status, adminUserId)`
- **Purpose:** Admin responds to user feedback
- **Updates:** admin_response, status, resolved_at (if fixed/closed)
- **Usage:**
```typescript
await ContentFeedbackService.respondToFeedback(
  'feedback-123',
  'Fixed the broken link, thanks for reporting!',
  FeedbackStatus.FIXED,
  adminUserId
);
```

#### `generateFeedbackReport()`
- **Purpose:** Generate aggregated feedback report (counts by status, severity, type)
- **Returns:** Report object with counts and avg resolution time
- **Usage:**
```typescript
const report = await ContentFeedbackService.generateFeedbackReport();
// {
//   total_feedback: 150,
//   open_count: 12,
//   fixed_count: 120,
//   bug_count: 35,
//   avg_resolution_time_hours: 18.5
// }
```

#### `getTopIssues(limit)`
- **Purpose:** Fetch most-reported content items
- **Returns:** Array of { content_type, content_id, feedback_count }
- **Usage:**
```typescript
const topIssues = await ContentFeedbackService.getTopIssues(10);
// [ { content_id: 'wk2-day3', feedback_count: 8 }, ... ]
```

---

## **API Endpoints**

### **User-Facing Endpoints** (`/api/content/*`)

**File:** `backend/src/api/routes/content-analytics.ts`

#### `POST /api/content/:id/track`
Track user interaction with content.

**Auth:** Required (user auth middleware)

**Query Params:**
- `type`: Content type (mission, lab, knowledge, software_tool)

**Request Body:**
```json
{
  "interactionType": "complete",
  "timeSpentSeconds": 180,
  "quizScore": 85,
  "quizPassed": true,
  "deviceType": "desktop",
  "referrer": "https://academy.omegaops.com/roadmap"
}
```

**Response:** 202 Accepted (fire-and-forget)
```json
{
  "success": true,
  "message": "Interaction tracked"
}
```

**Rate Limit:** 100 requests per 15 minutes per user

**Example:**
```bash
curl -X POST http://localhost:3000/api/content/wk1-day1/track?type=mission \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"interactionType":"complete","timeSpentSeconds":180}'
```

---

#### `POST /api/content/:id/rate`
User rates content after completing.

**Auth:** Required

**Query Params:**
- `type`: Content type

**Request Body:**
```json
{
  "difficulty": 3,
  "clarity": 4,
  "satisfaction": 5,
  "comment": "Really helpful mission!"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Rating saved, thank you for your feedback!"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/content/wk1-day1/rate?type=mission \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"difficulty":3,"clarity":4,"satisfaction":5}'
```

---

#### `POST /api/content/:id/feedback`
User submits feedback or bug report.

**Auth:** Required

**Query Params:**
- `type`: Content type

**Request Body:**
```json
{
  "type": "bug",
  "title": "Broken link in task 2",
  "description": "The SSH tutorial link returns 404"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "Feedback submitted successfully. Our team will review it shortly.",
  "data": {
    "feedbackId": "fb-123"
  }
}
```

**Error Response (Duplicate):** 409 Conflict
```json
{
  "success": false,
  "error": "You have already submitted similar feedback for this content within the last 24 hours"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/content/wk1-day1/feedback?type=mission \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"bug","title":"Broken link","description":"Task 2 link is 404"}'
```

---

#### `GET /api/content/:id/metrics`
Public-facing content metrics (completion rate, avg ratings).

**Auth:** Not required (public data)

**Query Params:**
- `type`: Content type

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "contentId": "wk1-day1",
    "contentType": "mission",
    "stats": {
      "totalViews": 1250,
      "completionRate": "82.5",
      "avgRating": "4.2",
      "totalRatings": 185
    }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/content/wk1-day1/metrics?type=mission
```

---

### **Admin Endpoints** (`/api/admin/analytics/*`)

**File:** `backend/src/api/routes/admin/analytics.ts`

**Auth:** All routes require admin authentication (adminAuth middleware)

#### `GET /api/admin/analytics/dashboard`
Complete dashboard summary with key metrics and insights.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalContent": 72,
      "greenContent": 45,
      "yellowContent": 20,
      "orangeContent": 6,
      "redContent": 1,
      "avgHealthScore": 78
    },
    "topPerformers": [ /* top 5 content items */ ],
    "strugglingContent": [ /* bottom 5 content items */ ],
    "recentFeedback": [ /* last 10 feedback items */ ],
    "recommendations": [ /* top 10 pending recommendations */ ]
  }
}
```

**Performance:** <2s p95 (cached queries)

**Example:**
```bash
curl http://localhost:3000/api/admin/analytics/dashboard \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN"
```

---

#### `GET /api/admin/analytics/content/:id?type=mission`
Detailed metrics for single content item.

**Query Params:**
- `type`: Content type (required)

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": "wk1-day1",
    "content_type": "mission",
    "week": 1,
    "day": 1,
    "total_views": 1250,
    "total_starts": 980,
    "total_completions": 805,
    "total_abandons": 175,
    "avg_time_spent_seconds": 180,
    "quiz_attempts": 805,
    "quiz_passes": 605,
    "quiz_pass_rate": "75.16",
    "avg_quiz_score": 78,
    "difficulty_rating": "3.1",
    "clarity_rating": "4.2",
    "satisfaction_rating": "4.3",
    "total_ratings": 185,
    "health_score": 85,
    "health_status": "green",
    "last_verified_date": "2025-10-15T10:30:00Z",
    "days_since_verified": 34,
    "completion_rate_change": "5.2",
    "engagement_trend": "trending_up"
  }
}
```

---

#### `GET /api/admin/analytics/week/:week`
Metrics for entire week (missions + lab).

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "week": 1,
    "contentCount": 6,
    "avgCompletionRate": "0.82",
    "avgQuizPassRate": "75.50",
    "healthDistribution": {
      "green": 4,
      "yellow": 2,
      "orange": 0,
      "red": 0,
      "unknown": 0
    },
    "missions": [ /* metrics for all 5 missions */ ],
    "lab": { /* metrics for Saturday lab */ }
  }
}
```

---

#### `GET /api/admin/analytics/trending`
Trending content insights.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "trendingUp": [ /* content with positive completion_rate_change */ ],
    "trendingDown": [ /* content with negative completion_rate_change */ ],
    "needsRefresh": [ /* content with days_since_verified > 90 */ ],
    "needsRemoval": [ /* content with health_status = red or total_views = 0 */ ],
    "mostSearched": []
  }
}
```

---

#### `GET /api/admin/analytics/recommendations`
List pending recommendations.

**Query Params:**
- `status`: Filter by status (default: pending)
- `limit`: Number of results (default: 50)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "rec-123",
      "content_type": "mission",
      "content_id": "wk2-day3",
      "recommendation_type": "simplify",
      "recommendation_title": "Low completion rate - content may be too difficult",
      "recommendation_description": "Only 68.2% of users complete this content...",
      "reason": "Only 68.2% of users complete this content...",
      "metric_source": "completion_rate",
      "metric_value": "0.682",
      "metric_threshold": "0.60",
      "confidence": 85,
      "status": "pending",
      "admin_notes": null,
      "created_at": "2025-11-18T08:00:00Z"
    }
  ]
}
```

---

#### `POST /api/admin/analytics/recommendations/:id/action`
Admin acts on recommendation.

**Request Body:**
```json
{
  "action": "implemented",
  "notes": "Simplified instructions based on recommendation"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Recommendation implemented"
}
```

---

#### `GET /api/admin/analytics/feedback`
List feedback queue with filters.

**Query Params:**
- `status`: Filter by status (default: all)
- `severity`: Filter by severity
- `contentType`: Filter by content type
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "fb-123",
      "user_id": "user-456",
      "content_type": "mission",
      "content_id": "wk1-day1",
      "feedback_type": "bug",
      "title": "Broken link in task 2",
      "description": "The SSH tutorial link returns 404",
      "category": "technical_issue",
      "severity": "high",
      "status": "open",
      "admin_response": null,
      "created_at": "2025-11-18T14:30:00Z"
    }
  ]
}
```

---

#### `POST /api/admin/analytics/feedback/:id/respond`
Admin responds to feedback.

**Request Body:**
```json
{
  "response": "Fixed the broken link, thanks for reporting!",
  "status": "fixed"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Feedback response saved"
}
```

---

#### `GET /api/admin/analytics/reports/feedback`
Feedback report with aggregated stats.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "total_feedback": 150,
    "open_count": 12,
    "acknowledged_count": 8,
    "in_progress_count": 5,
    "fixed_count": 120,
    "closed_count": 3,
    "wontfix_count": 2,
    "critical_count": 1,
    "high_count": 15,
    "normal_count": 100,
    "low_count": 34,
    "bug_count": 35,
    "unclear_count": 40,
    "outdated_count": 20,
    "avg_resolution_time_hours": "18.50"
  }
}
```

---

## **Worker Process**

### **ContentAnalyticsWorker**

**File:** `backend/src/workers/ContentAnalyticsWorker.ts`

**Purpose:** Background worker to aggregate metrics and generate recommendations

**Schedule:**
- **Metrics Aggregation:** Every 5 minutes (near real-time)
- **Recommendations Generation:** Daily (avoid noise)

**Configuration (.env):**
```env
ANALYTICS_METRICS_INTERVAL_MS=300000      # 5 minutes
ANALYTICS_RECOMMENDATIONS_INTERVAL_MS=86400000  # 24 hours
```

**Standalone Execution:**
```bash
# Run continuously (daemon mode)
node dist/workers/ContentAnalyticsWorker.js

# Run once and exit (cron mode)
node dist/workers/ContentAnalyticsWorker.js --once

# Manual content-specific run
node dist/workers/ContentAnalyticsWorker.js --content=mission/wk1-day1
```

**Integration with Main App:**
```typescript
// backend/src/app.ts
import ContentAnalyticsWorker from './workers/ContentAnalyticsWorker';

const analyticsWorker = new ContentAnalyticsWorker();
await analyticsWorker.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await analyticsWorker.stop();
});
```

**Logging:**
```
[INFO] ContentAnalyticsWorker initialized
[INFO] ContentAnalyticsWorker starting...
[INFO] Aggregating content metrics...
[INFO] Found 72 content items with interactions
[DEBUG] Aggregated metrics for mission/wk1-day1: health_score=85, status=green
[INFO] Metrics aggregation complete: 72 succeeded, 0 failed, 4523ms
[INFO] Generating content recommendations...
[INFO] Generated 12 recommendations for 72 content items
[INFO] Worker running. Press Ctrl+C to stop.
```

---

## **Frontend Integration**

### **Custom Hooks**

**File:** `frontend/src/hooks/useContentAnalytics.ts`

```typescript
import { useAuth } from '@/contexts/AuthContext';
import { ContentType } from '@/types/analytics';

export const useTrackInteraction = () => {
  const { user } = useAuth();

  return async (contentId: string, contentType: ContentType, data: any) => {
    if (!user) return; // Don't track anonymous users

    try {
      await fetch(`/api/content/${contentId}/track?type=${contentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
      // Don't throw - tracking failures should not break user flow
    }
  };
};

export const useRateContent = () => {
  const { user } = useAuth();

  return async (contentId: string, contentType: ContentType, rating: any) => {
    if (!user) throw new Error('Authentication required');

    const response = await fetch(`/api/content/${contentId}/rate?type=${contentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rating)
    });

    if (!response.ok) {
      throw new Error('Failed to submit rating');
    }

    return response.json();
  };
};

export const useSubmitFeedback = () => {
  const { user } = useAuth();

  return async (contentId: string, contentType: ContentType, feedback: any) => {
    if (!user) throw new Error('Authentication required');

    const response = await fetch(`/api/content/${contentId}/feedback?type=${contentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit feedback');
    }

    return response.json();
  };
};
```

### **Usage in Components**

**Mission Page with Tracking:**

```typescript
// frontend/src/pages/MissionDetailPage.tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTrackInteraction } from '@/hooks/useContentAnalytics';

export default function MissionDetailPage() {
  const { id } = useParams();
  const trackInteraction = useTrackInteraction();
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Track view on mount
    trackInteraction(id, 'mission', { interactionType: 'view' });

    // Track time spent on unmount
    return () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      trackInteraction(id, 'mission', {
        interactionType: 'view',
        timeSpentSeconds: timeSpent
      });
    };
  }, [id]);

  const handleStart = () => {
    trackInteraction(id, 'mission', { interactionType: 'start' });
    // ... mission logic
  };

  const handleComplete = () => {
    trackInteraction(id, 'mission', { interactionType: 'complete' });
    // ... show rating modal
  };

  return (
    <div>
      <h1>{mission.title}</h1>
      <button onClick={handleStart}>Start Mission</button>
      {/* ... mission content */}
    </div>
  );
}
```

**Rating Modal:**

```typescript
// frontend/src/components/RatingModal.tsx
import { useState } from 'react';
import { useRateContent } from '@/hooks/useContentAnalytics';

export default function RatingModal({ contentId, contentType, onClose }) {
  const [difficulty, setDifficulty] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [satisfaction, setSatisfaction] = useState(3);
  const [comment, setComment] = useState('');
  const rateContent = useRateContent();

  const handleSubmit = async () => {
    try {
      await rateContent(contentId, contentType, {
        difficulty,
        clarity,
        satisfaction,
        comment
      });
      alert('Thank you for your feedback!');
      onClose();
    } catch (error) {
      alert('Failed to submit rating');
    }
  };

  return (
    <div className="modal">
      <h2>Rate this content</h2>
      <div>
        <label>Difficulty (1=too easy, 5=too hard)</label>
        <input type="range" min="1" max="5" value={difficulty} onChange={e => setDifficulty(+e.target.value)} />
      </div>
      <div>
        <label>Clarity (1=confusing, 5=excellent)</label>
        <input type="range" min="1" max="5" value={clarity} onChange={e => setClarity(+e.target.value)} />
      </div>
      <div>
        <label>Satisfaction (1=hate, 5=love)</label>
        <input type="range" min="1" max="5" value={satisfaction} onChange={e => setSatisfaction(+e.target.value)} />
      </div>
      <div>
        <label>Comment (optional)</label>
        <textarea value={comment} onChange={e => setComment(e.target.value)} />
      </div>
      <button onClick={handleSubmit}>Submit Rating</button>
    </div>
  );
}
```

---

## **Testing**

### **Unit Tests**

**File:** `backend/src/services/__tests__/ContentAnalyticsService.test.ts`

**Run Tests:**
```bash
cd backend
npm run test -- ContentAnalyticsService.test.ts
```

**Coverage Target:** >80% for critical paths

**Test Cases:**
- ✅ trackInteraction: view, start, complete, quiz, rate
- ✅ calculateCompletionRate: normal, zero data, zero completions
- ✅ calculateQuizPassRate: normal, zero data
- ✅ calculateAvgTimeSpent: normal, NULL handling
- ✅ aggregateMetrics: full aggregation, upsert behavior
- ✅ calculateHealthScore: full components, NULL handling, clamping
- ✅ getHealthStatus: all score ranges

### **Integration Tests**

**File:** `backend/src/api/routes/__tests__/content-analytics.integration.test.ts`

```bash
npm run test -- content-analytics.integration.test.ts
```

**Test Cases:**
- ✅ POST /api/content/:id/track (auth required, valid input, fire-and-forget)
- ✅ POST /api/content/:id/rate (auth required, rating saved)
- ✅ POST /api/content/:id/feedback (auth required, duplicate detection)
- ✅ GET /api/content/:id/metrics (public access, metrics returned)
- ✅ GET /api/admin/analytics/dashboard (admin auth, full dashboard)
- ✅ POST /api/admin/analytics/recommendations/:id/action (admin auth, status update)
- ✅ POST /api/admin/analytics/feedback/:id/respond (admin auth, feedback response)

### **E2E Tests (Playwright)**

**File:** `e2e/content-analytics.spec.ts`

```bash
npx playwright test content-analytics.spec.ts
```

**Test Flows:**
1. User views mission → completes → rates → submits feedback
2. Admin logs in → views dashboard → acts on recommendation → responds to feedback
3. Worker runs → metrics aggregated → recommendations generated

---

## **Deployment**

### **Database Migration**

```bash
cd backend

# Run migration
psql -U postgres -d omegaops < src/database/migrations/006_create_content_analytics_tables.sql

# Verify tables created
psql -U postgres -d omegaops -c "\dt content_*"
```

**Expected Output:**
```
                      List of relations
 Schema |            Name            | Type  |  Owner
--------+----------------------------+-------+----------
 public | content_audit_log          | table | postgres
 public | content_cohort_analysis    | table | postgres
 public | content_feedback           | table | postgres
 public | content_metrics            | table | postgres
 public | content_recommendations    | table | postgres
```

### **Backend Deployment**

**Build:**
```bash
cd backend
npm run build
```

**Start Worker (systemd service):**

**File:** `/etc/systemd/system/omegaops-analytics-worker.service`
```ini
[Unit]
Description=OmegaOps Analytics Worker
After=network.target postgresql.service

[Service]
Type=simple
User=omegaops
WorkingDirectory=/opt/omegaops-academy/backend
Environment="NODE_ENV=production"
EnvironmentFile=/opt/omegaops-academy/backend/.env
ExecStart=/usr/bin/node dist/workers/ContentAnalyticsWorker.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and Start:**
```bash
sudo systemctl enable omegaops-analytics-worker
sudo systemctl start omegaops-analytics-worker
sudo systemctl status omegaops-analytics-worker
```

**Logs:**
```bash
sudo journalctl -u omegaops-analytics-worker -f
```

### **Alternative: Cron-based Worker**

**Crontab:**
```cron
# Metrics aggregation every 5 minutes
*/5 * * * * cd /opt/omegaops-academy/backend && node dist/workers/ContentAnalyticsWorker.js --once >> /var/log/omegaops-analytics.log 2>&1

# Recommendations generation daily at 3 AM
0 3 * * * cd /opt/omegaops-academy/backend && node dist/workers/ContentAnalyticsWorker.js --content=all >> /var/log/omegaops-analytics.log 2>&1
```

---

## **Performance & Security**

### **Performance Optimizations**

1. **Database Indices:**
   - ✅ user_content_interactions: user_id, content_type+content_id, timestamp, interaction_type
   - ✅ content_metrics: content_type, health_status, week, health_score DESC
   - ✅ content_recommendations: status, confidence DESC, created_at
   - ✅ content_feedback: status+severity, created_at, content_type+content_id

2. **Query Optimization:**
   - Use indexed columns in WHERE clauses
   - EXPLAIN ANALYZE slow queries (>100ms)
   - Add partial indices for common filters (e.g., `WHERE status = 'pending'`)

3. **Caching:**
   - Cache dashboard summary (Redis, 5-minute TTL)
   - Cache health scores (1-hour TTL, invalidate on worker run)
   - Memoize expensive calculations (difficulty_balance score)

4. **Partitioning:**
   - Partition user_content_interactions by month (if >10M rows)
   - Archive old interactions to cold storage (>6 months old)

5. **Rate Limiting:**
   - Tracking: 100 requests per 15 minutes per user
   - Feedback submission: 5 requests per hour per user
   - Admin endpoints: 1000 requests per hour per admin

### **Security Measures**

1. **Input Validation:**
   - ✅ All API inputs validated with Zod schemas
   - ✅ SQL injection prevention via parameterized queries
   - ✅ XSS prevention via output encoding

2. **Authentication & Authorization:**
   - ✅ User endpoints require valid JWT access token
   - ✅ Admin endpoints require admin role (isAdmin = true)
   - ✅ Feedback responses include admin_user_id (audit trail)

3. **Data Privacy:**
   - ✅ User IDs hashed in logs (GDPR compliance)
   - ✅ PII excluded from public metrics endpoint
   - ✅ User comments sanitized before storage

4. **Abuse Protection:**
   - ✅ Duplicate feedback detection (24-hour window)
   - ✅ Rate limiting on all POST endpoints
   - ✅ CAPTCHA on high-risk actions (optional, future)

5. **Monitoring:**
   - ✅ Log all admin actions (recommendation approvals, feedback responses)
   - ✅ Alert on anomalies (sudden spike in feedback, low health scores)
   - ✅ Track worker execution time (alert if >10s)

---

## **Next Steps**

1. **Phase 2.1** (Sprint 2-3): Implement basic tracking + metrics aggregation
2. **Phase 2.2** (Sprint 3-4): Implement user feedback + ratings system
3. **Phase 2.3** (Sprint 4-5): Implement analytics dashboard + recommendations
4. **Phase 2.4** (Sprint 5-6): Advanced features (cohort analysis, predictive insights)

**Success Criteria:**
- ✅ 100% of user interactions tracked
- ✅ Admin dashboard loads <2s
- ✅ Weekly recommendations generated with 70%+ confidence
- ✅ Feedback response time <24 hours (90th percentile)
- ✅ Measurable improvement in content health scores (quarterly review)

---

**This is THE competitive advantage. Most learning platforms don't have content health monitoring. OmegaOps will continuously improve and stay fresh with data-driven decisions.**
