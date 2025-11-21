# **Frontend Analytics Integration Guide**

## **Quick Start: Integrating Content Analytics**

This guide shows you how to integrate the Content Analytics & Monitoring System into your frontend components.

---

## **1. Prerequisites**

Ensure backend analytics system is deployed:
- ✅ Database migrations run (`006_create_content_analytics_tables.sql`)
- ✅ ContentAnalyticsWorker running (either daemon or cron)
- ✅ Analytics API routes registered in Express app

---

## **2. Create Custom Hooks**

**File:** `frontend/src/hooks/useContentAnalytics.ts`

```typescript
/**
 * FILE: frontend/src/hooks/useContentAnalytics.ts
 * PURPOSE: React hooks for content analytics (tracking, rating, feedback)
 * USAGE:
 *   const trackInteraction = useTrackInteraction();
 *   trackInteraction('wk1-day1', 'mission', { interactionType: 'view' });
 */

import { useAuth } from '@/contexts/AuthContext';

export type ContentType = 'mission' | 'lab' | 'knowledge' | 'software_tool';

export interface TrackInteractionData {
  interactionType: 'view' | 'start' | 'complete' | 'abandon' | 'quiz_attempt' | 'rate';
  timeSpentSeconds?: number;
  quizScore?: number;
  quizPassed?: boolean;
  difficultyRating?: number; // 1-5
  clarityRating?: number; // 1-5
  satisfactionRating?: number; // 1-5
  comment?: string;
  labHintsUsed?: number;
  labPassed?: boolean;
  labAutoGradeScore?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  referrer?: string;
}

export interface RatingData {
  difficulty: number; // 1-5 (1=too easy, 5=too hard)
  clarity: number; // 1-5 (1=confusing, 5=excellent)
  satisfaction: number; // 1-5 (1=hate, 5=love)
  comment?: string;
}

export interface FeedbackData {
  type: 'bug' | 'unclear' | 'outdated' | 'too_easy' | 'too_hard' | 'typo' | 'other';
  title: string;
  description: string;
}

/**
 * Hook to track user interactions with content
 * Fire-and-forget: does not throw errors, logs failures silently
 */
export const useTrackInteraction = () => {
  const { user } = useAuth();

  return async (contentId: string, contentType: ContentType, data: TrackInteractionData) => {
    if (!user) return; // Don't track anonymous users

    try {
      const response = await fetch(`/api/content/${contentId}/track?type=${contentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}` // Adjust based on your auth setup
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.warn('Failed to track interaction:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
      // Don't throw - tracking failures should not break user flow
    }
  };
};

/**
 * Hook to rate content
 * Throws error on failure (user expects feedback)
 */
export const useRateContent = () => {
  const { user } = useAuth();

  return async (contentId: string, contentType: ContentType, rating: RatingData) => {
    if (!user) throw new Error('Authentication required to rate content');

    const response = await fetch(`/api/content/${contentId}/rate?type=${contentType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.accessToken}`
      },
      body: JSON.stringify(rating)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit rating');
    }

    return response.json();
  };
};

/**
 * Hook to submit feedback
 * Throws error on failure (user expects confirmation)
 */
export const useSubmitFeedback = () => {
  const { user } = useAuth();

  return async (contentId: string, contentType: ContentType, feedback: FeedbackData) => {
    if (!user) throw new Error('Authentication required to submit feedback');

    const response = await fetch(`/api/content/${contentId}/feedback?type=${contentType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.accessToken}`
      },
      body: JSON.stringify(feedback)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit feedback');
    }

    return response.json();
  };
};

/**
 * Hook to fetch public content metrics
 * No authentication required
 */
export const useContentMetrics = (contentId: string, contentType: ContentType) => {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/content/${contentId}/metrics?type=${contentType}`);

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const data = await response.json();
        setMetrics(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [contentId, contentType]);

  return { metrics, loading, error };
};
```

---

## **3. Mission Page Integration**

**File:** `frontend/src/pages/MissionDetailPage.tsx`

```typescript
/**
 * Example: Mission detail page with analytics tracking
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTrackInteraction, useRateContent } from '@/hooks/useContentAnalytics';
import RatingModal from '@/components/RatingModal';

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showRatingModal, setShowRatingModal] = useState(false);
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

  const handleStartMission = () => {
    // Track start interaction
    trackInteraction(id, 'mission', { interactionType: 'start' });

    // Your mission start logic here...
  };

  const handleCompleteMission = () => {
    // Track completion
    trackInteraction(id, 'mission', { interactionType: 'complete' });

    // Show rating modal
    setShowRatingModal(true);
  };

  const handleQuizSubmit = (score: number, passed: boolean) => {
    // Track quiz attempt
    trackInteraction(id, 'mission', {
      interactionType: 'quiz_attempt',
      quizScore: score,
      quizPassed: passed
    });

    if (passed) {
      handleCompleteMission();
    }
  };

  return (
    <div className="mission-detail">
      <h1>Mission: {mission.title}</h1>

      <button onClick={handleStartMission}>Start Mission</button>

      {/* Mission content... */}

      <button onClick={handleCompleteMission}>Complete Mission</button>

      {showRatingModal && (
        <RatingModal
          contentId={id}
          contentType="mission"
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
}
```

---

## **4. Rating Modal Component**

**File:** `frontend/src/components/RatingModal.tsx`

```typescript
/**
 * Modal for rating content after completion
 */

import React, { useState } from 'react';
import { useRateContent } from '@/hooks/useContentAnalytics';
import { ContentType } from '@/types/analytics';

interface RatingModalProps {
  contentId: string;
  contentType: ContentType;
  onClose: () => void;
}

export default function RatingModal({ contentId, contentType, onClose }: RatingModalProps) {
  const [difficulty, setDifficulty] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [satisfaction, setSatisfaction] = useState(3);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const rateContent = useRateContent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      await rateContent(contentId, contentType, {
        difficulty,
        clarity,
        satisfaction,
        comment: comment.trim() || undefined
      });

      alert('Thank you for your feedback!');
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Rate this content</h2>
        <p>Help us improve by sharing your experience</p>

        <form onSubmit={handleSubmit}>
          <div className="rating-field">
            <label htmlFor="difficulty">
              Difficulty
              <span className="rating-hint">1 = Too easy, 5 = Too hard</span>
            </label>
            <input
              id="difficulty"
              type="range"
              min="1"
              max="5"
              value={difficulty}
              onChange={e => setDifficulty(+e.target.value)}
            />
            <div className="rating-value">{difficulty}</div>
          </div>

          <div className="rating-field">
            <label htmlFor="clarity">
              Clarity
              <span className="rating-hint">1 = Confusing, 5 = Excellent</span>
            </label>
            <input
              id="clarity"
              type="range"
              min="1"
              max="5"
              value={clarity}
              onChange={e => setClarity(+e.target.value)}
            />
            <div className="rating-value">{clarity}</div>
          </div>

          <div className="rating-field">
            <label htmlFor="satisfaction">
              Satisfaction
              <span className="rating-hint">1 = Poor, 5 = Excellent</span>
            </label>
            <input
              id="satisfaction"
              type="range"
              min="1"
              max="5"
              value={satisfaction}
              onChange={e => setSatisfaction(+e.target.value)}
            />
            <div className="rating-value">{satisfaction}</div>
          </div>

          <div className="rating-field">
            <label htmlFor="comment">
              Comment (optional)
              <span className="rating-hint">Any additional thoughts?</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={2000}
              placeholder="What did you like? What could be improved?"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Skip
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## **5. Feedback Form Component**

**File:** `frontend/src/components/FeedbackForm.tsx`

```typescript
/**
 * Inline feedback form for reporting issues
 */

import React, { useState } from 'react';
import { useSubmitFeedback } from '@/hooks/useContentAnalytics';
import { ContentType } from '@/types/analytics';

interface FeedbackFormProps {
  contentId: string;
  contentType: ContentType;
}

export default function FeedbackForm({ contentId, contentType }: FeedbackFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<string>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 5 || description.trim().length < 10) {
      alert('Please provide more details (title >= 5 chars, description >= 10 chars)');
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback(contentId, contentType, {
        type: type as any,
        title: title.trim(),
        description: description.trim()
      });

      alert('Feedback submitted successfully. Our team will review it shortly.');
      setTitle('');
      setDescription('');
      setIsOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="feedback-button" onClick={() => setIsOpen(true)}>
        Report an issue
      </button>
    );
  }

  return (
    <div className="feedback-form">
      <h3>Report an issue</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="feedback-type">Issue type</label>
          <select
            id="feedback-type"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="bug">Bug or broken feature</option>
            <option value="unclear">Unclear instructions</option>
            <option value="outdated">Outdated information</option>
            <option value="too_easy">Too easy</option>
            <option value="too_hard">Too hard</option>
            <option value="typo">Typo or grammar issue</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="feedback-title">Title</label>
          <input
            id="feedback-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
            placeholder="Brief summary of the issue"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="feedback-description">Description</label>
          <textarea
            id="feedback-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={5000}
            placeholder="Detailed description of the issue"
            rows={5}
            required
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => setIsOpen(false)} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## **6. Public Metrics Display**

**File:** `frontend/src/components/ContentMetrics.tsx`

```typescript
/**
 * Display public metrics for content (completion rate, avg rating)
 */

import React from 'react';
import { useContentMetrics } from '@/hooks/useContentAnalytics';
import { ContentType } from '@/types/analytics';

interface ContentMetricsProps {
  contentId: string;
  contentType: ContentType;
}

export default function ContentMetrics({ contentId, contentType }: ContentMetricsProps) {
  const { metrics, loading, error } = useContentMetrics(contentId, contentType);

  if (loading) return <div className="metrics-loading">Loading metrics...</div>;
  if (error) return null; // Don't show errors (metrics are optional)
  if (!metrics) return null;

  const { stats } = metrics;

  return (
    <div className="content-metrics">
      <h4>Community Stats</h4>
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-value">{stats.totalViews.toLocaleString()}</div>
          <div className="metric-label">Views</div>
        </div>

        {stats.completionRate && (
          <div className="metric">
            <div className="metric-value">{stats.completionRate}%</div>
            <div className="metric-label">Completion Rate</div>
          </div>
        )}

        {stats.avgRating && (
          <div className="metric">
            <div className="metric-value">{stats.avgRating}/5</div>
            <div className="metric-label">Avg Rating</div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## **7. Usage Example: Full Mission Page**

```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import MissionContent from '@/components/MissionContent';
import FeedbackForm from '@/components/FeedbackForm';
import ContentMetrics from '@/components/ContentMetrics';
import { useTrackInteraction } from '@/hooks/useContentAnalytics';

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const trackInteraction = useTrackInteraction();

  // Track view on mount + time spent on unmount
  React.useEffect(() => {
    trackInteraction(id, 'mission', { interactionType: 'view' });
    const startTime = Date.now();

    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      trackInteraction(id, 'mission', {
        interactionType: 'view',
        timeSpentSeconds: timeSpent
      });
    };
  }, [id]);

  return (
    <div className="mission-page">
      <MissionContent missionId={id} />

      {/* Public metrics */}
      <ContentMetrics contentId={id} contentType="mission" />

      {/* Feedback form */}
      <FeedbackForm contentId={id} contentType="mission" />
    </div>
  );
}
```

---

## **8. Styling (Optional)**

**File:** `frontend/src/styles/analytics.css`

```css
/* Rating Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.rating-field {
  margin-bottom: 1.5rem;
}

.rating-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.rating-hint {
  display: block;
  font-size: 0.875rem;
  color: #666;
  font-weight: 400;
  margin-top: 0.25rem;
}

.rating-field input[type="range"] {
  width: 100%;
}

.rating-value {
  text-align: center;
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions button[type="submit"] {
  background: #0066cc;
  color: white;
}

/* Feedback Form */
.feedback-button {
  padding: 0.5rem 1rem;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.feedback-form {
  border: 1px solid #ddd;
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

/* Content Metrics */
.content-metrics {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.metric {
  text-align: center;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0066cc;
}

.metric-label {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}
```

---

## **9. Testing**

**Manual Testing Checklist:**

1. ✅ View mission → check `user_content_interactions` table (interaction_type = 'view')
2. ✅ Start mission → check interactions (interaction_type = 'start')
3. ✅ Complete mission → check interactions (interaction_type = 'complete')
4. ✅ Submit quiz → check interactions (quiz_score, quiz_passed)
5. ✅ Rate content → check interactions (difficulty_rating, clarity_rating, satisfaction_rating)
6. ✅ Submit feedback → check `content_feedback` table
7. ✅ Wait 5 minutes → check `content_metrics` table (metrics aggregated by worker)
8. ✅ Public metrics endpoint → verify completion rate, avg rating displayed
9. ✅ Duplicate feedback → verify 409 error returned

**E2E Test (Playwright):**

```typescript
test('user completes mission and rates content', async ({ page }) => {
  await page.goto('/missions/wk1-day1');

  // Track view
  await page.waitForTimeout(1000);

  // Start mission
  await page.click('button:has-text("Start Mission")');

  // Complete mission
  await page.click('button:has-text("Complete Mission")');

  // Rating modal appears
  await expect(page.locator('.modal-content')).toBeVisible();

  // Submit rating
  await page.fill('#comment', 'Great mission!');
  await page.click('button[type="submit"]');

  // Verify success message
  await expect(page.locator('text=Thank you for your feedback')).toBeVisible();
});
```

---

## **10. Admin Dashboard (Future)**

The admin dashboard will be built in Phase 2.3 using the following endpoints:

- `GET /api/admin/analytics/dashboard` – Health grid, top performers, recommendations
- `GET /api/admin/analytics/week/:week` – Week-specific metrics
- `POST /api/admin/analytics/recommendations/:id/action` – Act on recommendations
- `POST /api/admin/analytics/feedback/:id/respond` – Respond to feedback

**Components to build:**
- `AdminDashboard.tsx` – Main dashboard with health grid
- `HealthGrid.tsx` – Color-coded content health grid (green/yellow/orange/red)
- `RecommendationQueue.tsx` – List of pending recommendations with approve/decline actions
- `FeedbackQueue.tsx` – List of open feedback items with respond action
- `ContentDetailView.tsx` – Detailed metrics for single content item

---

**This is THE competitive advantage. OmegaOps will continuously improve content based on real user data.**
