/**
 * FILE: frontend/src/pages/DashboardPage.tsx
 * PURPOSE: User dashboard (protected route, /dashboard).
 * SHOWS: User stats, missions, progress, quick actions
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EmailVerificationPrompt } from '../components/auth/EmailVerificationPrompt';
import styles from './DashboardPage.module.css';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const stats = {
    missionsCompleted: user.profile?.missionsCompleted || 0,
    totalXP: user.profile?.xp || 0,
    currentLevel: user.profile?.level || 1,
    streak: user.profile?.streak || 0,
  };

  return (
    <div className={styles.container}>
      <EmailVerificationPrompt />

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Welcome back, {user.username}!</h1>
          <p className={styles.subtitle}>Ready to continue your learning journey?</p>
        </div>
        <Link to="/profile" className={styles.profileLink}>
          View Profile
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Missions Completed</p>
            <p className={styles.statValue}>{stats.missionsCompleted}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Total XP</p>
            <p className={styles.statValue}>{stats.totalXP}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🏆</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Level</p>
            <p className={styles.statValue}>{stats.currentLevel}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Streak</p>
            <p className={styles.statValue}>{stats.streak} days</p>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Link to="/missions" className={styles.primaryButton}>
          Start New Mission
        </Link>
        <Link to="/roadmap" className={styles.secondaryButton}>
          View Roadmap
        </Link>
        <Link to="/labs" className={styles.secondaryButton}>
          Practice Labs
        </Link>
      </div>

      <div className={styles.recentActivity}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <p className={styles.activityText}>No recent activity</p>
            <p className={styles.activityHint}>Complete missions to see your progress here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
