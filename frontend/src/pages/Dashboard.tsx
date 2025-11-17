/**
 * FILE: src/pages/Dashboard.tsx
 * PURPOSE: Home page with welcome message, progress overview, and quick links.
 *
 * FEATURES:
 * - Personalized welcome message
 * - Today's mission preview (if not completed)
 * - XP/level progress visualization
 * - Streak counter and encouragement
 * - Quick access links to main sections
 * - Recent achievements display
 *
 * DATA FLOW:
 * - Reads user progress from Zustand store
 * - Fetches today's mission from API (or mock)
 * - No write operations on this page
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Map,
  FlaskConical,
  BookOpen,
  Server,
  Flame,
  Trophy,
  Star,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useUserProgress, LEVEL_THRESHOLDS, getLevelTitle } from '@/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import styles from './Dashboard.module.css';

/**
 * Quick link card configuration.
 */
const quickLinks = [
  {
    path: '/roadmap',
    label: '12-Week Roadmap',
    description: 'View your learning journey',
    icon: Map,
    color: 'primary',
  },
  {
    path: '/labs',
    label: 'Labs',
    description: 'Hands-on challenges',
    icon: FlaskConical,
    color: 'xp',
  },
  {
    path: '/knowledge',
    label: 'Knowledge Base',
    description: 'Reference materials',
    icon: BookOpen,
    color: 'info',
  },
  {
    path: '/software',
    label: 'Software Galaxy',
    description: 'Tool documentation',
    icon: Server,
    color: 'success',
  },
];

export function Dashboard() {
  const progress = useUserProgress();
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Simulate loading state for API fetch.
   * In production, this would fetch today's mission.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Calculate current week based on completed missions.
   * Assumes 5 missions per week (Mon-Fri).
   */
  const currentWeek = Math.floor(progress.completedMissions.length / 5) + 1;
  const currentDay = (progress.completedMissions.length % 5) + 1;

  /**
   * Calculate XP progress percentage.
   */
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === progress.level)?.xpRequired || 0;
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === progress.level + 1)?.xpRequired || 0;
  const progressPercentage =
    nextThreshold > 0
      ? Math.round(((progress.xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      : 100;

  /**
   * Get greeting based on time of day.
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Welcome section */}
      <section className={styles.welcome}>
        <h1 className={styles.greeting}>{getGreeting()}, Learner!</h1>
        <p className={styles.subtitle}>
          Ready to continue your DevOps journey? You're on Week {currentWeek}, Day {currentDay}.
        </p>
      </section>

      {/* Progress overview cards */}
      <section className={styles.progressSection}>
        <h2 className={styles.sectionTitle}>Your Progress</h2>
        <div className={styles.progressGrid}>
          {/* Level card */}
          <div className={styles.progressCard}>
            <div className={styles.cardIcon} data-color="level">
              <Trophy size={24} aria-hidden="true" />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>Level {progress.level}</span>
              <span className={styles.cardLabel}>{getLevelTitle(progress.level)}</span>
            </div>
          </div>

          {/* XP card */}
          <div className={styles.progressCard}>
            <div className={styles.cardIcon} data-color="xp">
              <Star size={24} aria-hidden="true" />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{progress.xp} XP</span>
              <div className={styles.xpBar}>
                <div className={styles.xpFill} style={{ width: `${progressPercentage}%` }} />
              </div>
              {nextThreshold > 0 && (
                <span className={styles.cardLabel}>{nextThreshold - progress.xp} XP to next level</span>
              )}
            </div>
          </div>

          {/* Streak card */}
          <div className={styles.progressCard}>
            <div className={styles.cardIcon} data-color="streak">
              <Flame size={24} aria-hidden="true" />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{progress.streak} Days</span>
              <span className={styles.cardLabel}>
                {progress.streak > 0 ? 'Keep it up!' : 'Start your streak!'}
              </span>
            </div>
          </div>

          {/* Missions completed */}
          <div className={styles.progressCard}>
            <div className={styles.cardIcon} data-color="success">
              <Target size={24} aria-hidden="true" />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardValue}>{progress.completedMissions.length} Missions</span>
              <span className={styles.cardLabel}>Completed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Today's mission preview */}
      <section className={styles.todaySection}>
        <h2 className={styles.sectionTitle}>Today's Mission</h2>
        <div className={styles.missionPreview}>
          <div className={styles.missionIcon}>
            <Rocket size={32} aria-hidden="true" />
          </div>
          <div className={styles.missionContent}>
            <h3 className={styles.missionTitle}>
              Week {currentWeek}, Day {currentDay}
            </h3>
            <p className={styles.missionDescription}>
              Continue your learning journey with today's mission. Build real-world DevOps skills
              step by step.
            </p>
            <Link to={`/missions/${currentWeek}/${currentDay}`} className={styles.missionButton}>
              Start Mission
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className={styles.quickLinksSection}>
        <h2 className={styles.sectionTitle}>Quick Access</h2>
        <div className={styles.quickLinksGrid}>
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path} className={styles.quickLink}>
                <div className={styles.quickLinkIcon} data-color={link.color}>
                  <Icon size={24} aria-hidden="true" />
                </div>
                <div className={styles.quickLinkContent}>
                  <span className={styles.quickLinkLabel}>{link.label}</span>
                  <span className={styles.quickLinkDescription}>{link.description}</span>
                </div>
                <ArrowRight size={16} className={styles.quickLinkArrow} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent achievements */}
      {progress.achievements.length > 0 && (
        <section className={styles.achievementsSection}>
          <h2 className={styles.sectionTitle}>Recent Achievements</h2>
          <div className={styles.achievementsList}>
            {progress.achievements.slice(-3).map((achievement) => (
              <div key={achievement.id} className={styles.achievementBadge}>
                <Trophy size={20} aria-hidden="true" />
                <span>{achievement.title}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
