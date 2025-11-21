# **Content Analytics System - Quick Reference Card**

## **Database Tables (6 Total)**

| Table                        | Purpose                                    | Key Fields                                |
|------------------------------|--------------------------------------------|-------------------------------------------|
| user_content_interactions    | Raw event log (every user action)          | user_id, content_type, content_id, interaction_type, timestamp |
| content_metrics              | Aggregated metrics (updated every 5 min)   | content_id, health_score, health_status, completion_rate_change |
| content_recommendations      | Auto-generated recommendations (daily)     | content_id, recommendation_type, confidence, status |
| content_feedback             | User-submitted feedback/bug reports        | user_id, content_id, feedback_type, severity, status |
| content_audit_log            | Change history with before/after snapshots | content_id, change_type, old_data, new_data, metrics_before/after |
| content_cohort_analysis      | Cohort-based performance (mobile vs desktop, etc.) | content_id, cohort_name, completion_rate, change_vs_overall |

---

## **API Endpoints (15 Total)**

### **User-Facing (4)**
```bash
POST /api/content/:id/track?type=mission    # Track interaction (view, start, complete, quiz, rate)
POST /api/content/:id/rate?type=mission     # Rate content (difficulty, clarity, satisfaction)
POST /api/content/:id/feedback?type=mission # Submit feedback/bug report
GET  /api/content/:id/metrics?type=mission  # Public metrics (completion rate, avg rating)
```

### **Admin (11)**
```bash
GET  /api/admin/analytics/dashboard                    # Complete dashboard summary
GET  /api/admin/analytics/content/:id?type=mission     # Detailed metrics for single content
GET  /api/admin/analytics/week/:week                   # Metrics for entire week (missions + lab)
GET  /api/admin/analytics/trending                     # Trending insights (up/down/refresh/remove)
GET  /api/admin/analytics/recommendations?status=pending # List recommendations
POST /api/admin/analytics/recommendations/:id/action   # Act on recommendation (implemented/declined)
GET  /api/admin/analytics/feedback?status=open         # Feedback queue
POST /api/admin/analytics/feedback/:id/respond         # Respond to feedback
POST /api/admin/analytics/feedback/:id/severity        # Update feedback severity
GET  /api/admin/analytics/reports/feedback             # Feedback report (aggregated stats)
GET  /api/admin/analytics/reports/top-issues           # Top reported content items
```

---

## **Health Score Algorithm**

```
health_score = (
  completion_rate * 0.25 +
  quiz_pass_rate * 0.25 +
  satisfaction_rating * 0.20 +
  engagement_score * 0.15 +
  difficulty_balance * 0.15
) * 100

RANGES:
  80-100: Green (excellent)
  60-79:  Yellow (good)
  40-59:  Orange (needs attention)
  0-39:   Red (critical)
  NULL:   Unknown (insufficient data)
```

---

## **Recommendation Triggers**

| Metric                    | Threshold | Recommendation | Confidence      |
|---------------------------|-----------|----------------|-----------------|
| completion_rate < 60%     | 0.60      | simplify       | Based on starts |
| quiz_pass_rate < 50%      | 0.50      | clarify        | Based on attempts |
| avg_time > 30 min         | 1800s     | split          | Based on completions |
| satisfaction < 3.0        | 3.0       | refresh        | Based on ratings |
| days_since_verified > 90  | 90 days   | refresh        | 100% (objective) |
| total_views == 0          | 0         | remove         | 90% (objective) |
| completion_rate > 95%     | 0.95      | expand         | Based on starts |

**Confidence Tiers:**
- High (85%): Sample size >= 100
- Medium (70%): Sample size 30-99
- Low (50%): Sample size 10-29
- Min Display: 70% (don't show recommendations <70% confidence)

---

## **Worker Commands**

```bash
# Build backend
cd backend
npm run build

# Run worker continuously (daemon mode)
node dist/workers/ContentAnalyticsWorker.js

# Run once and exit (cron mode)
node dist/workers/ContentAnalyticsWorker.js --once

# Manual content-specific run
node dist/workers/ContentAnalyticsWorker.js --content=mission/wk1-day1

# View worker logs (systemd)
sudo journalctl -u omegaops-analytics-worker -f
```

**Worker Schedule:**
- Metrics aggregation: Every 5 minutes
- Recommendations generation: Daily at 3 AM (cron) or every 24 hours (daemon)

---

## **Frontend Integration (Quick Start)**

### **1. Create hooks**

```typescript
// frontend/src/hooks/useContentAnalytics.ts
export const useTrackInteraction = () => {
  const { user } = useAuth();
  return async (contentId, contentType, data) => {
    await fetch(`/api/content/${contentId}/track?type=${contentType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.accessToken}` },
      body: JSON.stringify(data)
    });
  };
};
```

### **2. Track interactions in mission page**

```typescript
// frontend/src/pages/MissionDetailPage.tsx
const trackInteraction = useTrackInteraction();

useEffect(() => {
  trackInteraction(id, 'mission', { interactionType: 'view' });

  return () => {
    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
    trackInteraction(id, 'mission', { interactionType: 'view', timeSpentSeconds: timeSpent });
  };
}, [id]);

const handleComplete = () => {
  trackInteraction(id, 'mission', { interactionType: 'complete' });
  setShowRatingModal(true);
};
```

### **3. Add rating modal after completion**

```typescript
// frontend/src/components/RatingModal.tsx
const rateContent = useRateContent();

const handleSubmit = async () => {
  await rateContent(contentId, contentType, {
    difficulty: 3,
    clarity: 4,
    satisfaction: 5,
    comment: 'Great content!'
  });
};
```

---

## **Database Queries (Common)**

### **Get content metrics**
```sql
SELECT * FROM content_metrics
WHERE content_type = 'mission' AND content_id = 'wk1-day1';
```

### **Get all interactions for user**
```sql
SELECT * FROM user_content_interactions
WHERE user_id = 'user-123'
ORDER BY timestamp DESC
LIMIT 100;
```

### **Get pending recommendations**
```sql
SELECT * FROM content_recommendations
WHERE status = 'pending'
ORDER BY confidence DESC, created_at DESC
LIMIT 50;
```

### **Get open feedback**
```sql
SELECT * FROM content_feedback
WHERE status = 'open'
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  created_at DESC
LIMIT 50;
```

### **Get struggling content (health score < 60)**
```sql
SELECT content_type, content_id, health_score, health_status
FROM content_metrics
WHERE health_score < 60
ORDER BY health_score ASC;
```

---

## **Environment Variables**

```env
# Analytics Worker Configuration
ANALYTICS_METRICS_INTERVAL_MS=300000      # 5 minutes
ANALYTICS_RECOMMENDATIONS_INTERVAL_MS=86400000  # 24 hours

# Database (PostgreSQL required)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omegaops
DB_USER=postgres
DB_PASSWORD=your-password

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379
```

---

## **Testing Commands**

```bash
# Unit tests (ContentAnalyticsService)
cd backend
npm run test -- ContentAnalyticsService.test.ts

# Integration tests (API routes)
npm run test -- content-analytics.integration.test.ts

# E2E tests (Playwright)
cd ..
npx playwright test content-analytics.spec.ts

# Coverage report
cd backend
npm run test -- --coverage
```

---

## **Deployment Checklist**

### **Database**
- [ ] Run migration: `psql -U postgres -d omegaops < src/database/migrations/006_create_content_analytics_tables.sql`
- [ ] Verify tables created: `psql -U postgres -d omegaops -c "\dt content_*"`
- [ ] Check indices: `psql -U postgres -d omegaops -c "\di"`

### **Backend**
- [ ] Build: `npm run build`
- [ ] Add routes to `app.ts`: `app.use('/api/content', authMiddleware, contentAnalyticsRoutes)`
- [ ] Add services initialization: `ContentAnalyticsService.initialize(pool)`
- [ ] Add worker systemd service (or cron jobs)
- [ ] Start worker: `sudo systemctl start omegaops-analytics-worker`

### **Security**
- [ ] Add helmet middleware for security headers (CSP, HSTS, X-Frame-Options)
- [ ] Add express-rate-limit middleware (tracking, feedback, admin)
- [ ] Verify auth middleware active on all routes
- [ ] Check HTTPS enforced in production (nginx config)

### **Performance**
- [ ] Add Redis caching for dashboard (5-minute TTL)
- [ ] Add compression middleware (gzip/brotli)
- [ ] Run EXPLAIN ANALYZE on common queries
- [ ] Add missing indices if needed
- [ ] Run load testing (k6) to verify p95 latency

### **Monitoring**
- [ ] Check worker logs: `sudo journalctl -u omegaops-analytics-worker -f`
- [ ] Monitor database connections: `SELECT count(*) FROM pg_stat_activity WHERE datname = 'omegaops';`
- [ ] Check metrics table updated: `SELECT max(updated_at) FROM content_metrics;`
- [ ] Verify recommendations generated: `SELECT count(*) FROM content_recommendations WHERE created_at >= CURRENT_DATE;`

---

## **Troubleshooting**

### **Worker not running**
```bash
# Check systemd service status
sudo systemctl status omegaops-analytics-worker

# View recent logs
sudo journalctl -u omegaops-analytics-worker -n 100

# Restart worker
sudo systemctl restart omegaops-analytics-worker
```

### **Metrics not aggregating**
```bash
# Check if worker is processing
sudo journalctl -u omegaops-analytics-worker -f

# Manually run aggregation
cd backend
node dist/workers/ContentAnalyticsWorker.js --once

# Check for errors in logs
grep "ERROR" /var/log/omegaops-analytics.log
```

### **Database slow queries**
```sql
-- Enable slow query logging (queries > 100ms)
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM content_metrics WHERE health_status = 'red';
```

### **High memory usage**
```bash
# Check memory usage
ps aux | grep ContentAnalyticsWorker

# Check Node.js heap usage
node --inspect dist/workers/ContentAnalyticsWorker.js
# Open chrome://inspect and view heap snapshot

# Reduce batch size (edit worker code)
# Process 50 items at a time instead of 100
```

---

## **File Locations**

```
backend/src/
├── api/routes/
│   ├── content-analytics.ts                  (User-facing endpoints)
│   └── admin/analytics.ts                    (Admin endpoints)
├── services/
│   ├── ContentAnalyticsService.ts            (Core analytics logic)
│   ├── ContentRecommendationEngine.ts        (Recommendation generation)
│   └── ContentFeedbackService.ts             (Feedback management)
├── types/
│   └── analytics.types.ts                    (TypeScript types + Zod schemas)
├── workers/
│   └── ContentAnalyticsWorker.ts             (Background job)
└── database/migrations/
    ├── 006_create_content_analytics_tables.sql
    └── 006_rollback_content_analytics_tables.sql

frontend/src/
├── hooks/
│   └── useContentAnalytics.ts                (React hooks)
├── components/
│   ├── RatingModal.tsx
│   ├── FeedbackForm.tsx
│   └── ContentMetrics.tsx
└── styles/
    └── analytics.css

Documentation:
├── ANALYTICS_SYSTEM_README.md                (8,000+ lines complete guide)
├── ANALYTICS_INTEGRATION_GUIDE.md            (600+ lines frontend guide)
├── CONTENT_ANALYTICS_IMPLEMENTATION_SUMMARY.md (1,500+ lines executive summary)
├── ANALYTICS_SYSTEM_AUDIT.md                 (Self-audit checklist)
└── ANALYTICS_QUICK_REFERENCE.md              (This file)
```

---

## **Key Metrics to Monitor**

### **Content Health**
- Total content: 72 items
- Green (80-100): Target >= 60%
- Yellow (60-79): Target <= 30%
- Orange (40-59): Target <= 10%
- Red (0-39): Target <= 5%

### **User Engagement**
- Avg completion rate: Target >= 75%
- Avg quiz pass rate: Target >= 70%
- Avg satisfaction rating: Target >= 4.0/5
- Avg time spent: Compare against category baseline

### **Recommendations**
- Pending recommendations: Review weekly
- High confidence (>85%): Act within 1 week
- Medium confidence (70-85%): Act within 2 weeks
- Low confidence (<70%): Don't display

### **Feedback**
- Open feedback: Target <= 20 items
- Critical/High severity: Respond within 24 hours
- Normal severity: Respond within 72 hours
- Avg resolution time: Target <= 48 hours

---

## **Support & Documentation**

- **README:** `/backend/ANALYTICS_SYSTEM_README.md` (complete implementation guide)
- **Integration Guide:** `/frontend/ANALYTICS_INTEGRATION_GUIDE.md` (frontend integration)
- **Summary:** `/CONTENT_ANALYTICS_IMPLEMENTATION_SUMMARY.md` (executive summary)
- **Audit:** `/backend/ANALYTICS_SYSTEM_AUDIT.md` (self-audit checklist)
- **Quick Reference:** `/ANALYTICS_QUICK_REFERENCE.md` (this file)

**Questions?** Check the README first, then consult the implementation summary for architecture details.

---

**This is THE competitive advantage.** OmegaOps Academy will continuously improve content based on real user data.
