/**
 * FILE: src/pages/Roadmap.tsx
 * PURPOSE: 12-week curriculum overview with progress tracking.
 *
 * FEATURES:
 * - Grid view of all 12 weeks
 * - Each week shows theme, missions, and lab
 * - Visual progress indicators (completed checkmarks)
 * - Click to expand week details
 * - Responsive card layout
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
} from 'lucide-react';
import { useCompletedMissions, useCompletedLabs } from '@/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import type { DifficultyLevel } from '@/types';
import styles from './Roadmap.module.css';

interface WeekMission {
  id: string;
  day: number;
  title: string;
  xp: number;
  minutes: number;
}

interface WeekLab {
  id: string;
  title: string;
  xp: number;
  difficulty: DifficultyLevel;
}

interface WeekData {
  week: number;
  theme: string;
  description: string;
  missions: WeekMission[];
  lab: WeekLab;
}

/**
 * Mock roadmap data for demonstration.
 * In production, this would be fetched from API.
 */
const mockWeeks: WeekData[] = [
  {
    week: 1,
    theme: 'Introduction to DevOps',
    description: 'Understanding DevOps culture and principles',
    missions: [
      { id: 'w1d1', day: 1, title: 'What is DevOps?', xp: 50, minutes: 30 },
      { id: 'w1d2', day: 2, title: 'DevOps Culture', xp: 50, minutes: 35 },
      { id: 'w1d3', day: 3, title: 'CI/CD Fundamentals', xp: 60, minutes: 40 },
      { id: 'w1d4', day: 4, title: 'Version Control Basics', xp: 55, minutes: 35 },
      { id: 'w1d5', day: 5, title: 'Infrastructure Overview', xp: 50, minutes: 30 },
    ],
    lab: { id: 'w1lab', title: 'Set Up Git Repository', xp: 100, difficulty: 'beginner' },
  },
  {
    week: 2,
    theme: 'Linux Fundamentals',
    description: 'Essential Linux commands and system administration',
    missions: [
      { id: 'w2d1', day: 1, title: 'Linux File System', xp: 55, minutes: 35 },
      { id: 'w2d2', day: 2, title: 'Command Line Basics', xp: 60, minutes: 40 },
      { id: 'w2d3', day: 3, title: 'User Management', xp: 65, minutes: 45 },
      { id: 'w2d4', day: 4, title: 'Permissions & Security', xp: 70, minutes: 50 },
      { id: 'w2d5', day: 5, title: 'Process Management', xp: 60, minutes: 40 },
    ],
    lab: { id: 'w2lab', title: 'Linux Server Setup', xp: 150, difficulty: 'intermediate' },
  },
  // Add more weeks as needed...
];

// Generate remaining weeks
for (let i = 3; i <= 12; i++) {
  mockWeeks.push({
    week: i,
    theme: `Week ${i} Topic`,
    description: `Learning content for week ${i}`,
    missions: Array.from({ length: 5 }, (_, j) => ({
      id: `w${i}d${j + 1}`,
      day: j + 1,
      title: `Week ${i} Mission ${j + 1}`,
      xp: 50 + i * 5 + j * 5,
      minutes: 30 + j * 5,
    })),
    lab: {
      id: `w${i}lab`,
      title: `Week ${i} Challenge Lab`,
      xp: 100 + i * 25,
      difficulty: (i < 5 ? 'beginner' : i < 9 ? 'intermediate' : 'advanced') as 'beginner' | 'intermediate' | 'advanced',
    },
  });
}

export function Roadmap() {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const completedMissions = useCompletedMissions();
  const completedLabs = useCompletedLabs();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const toggleWeek = (week: number) => {
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  /**
   * Calculate completion percentage for a week.
   */
  const getWeekProgress = (week: typeof mockWeeks[0]) => {
    const missionIds = week.missions.map((m) => m.id);
    const completedCount = missionIds.filter((id) => completedMissions.includes(id)).length;
    const labCompleted = completedLabs.includes(week.lab.id);
    const total = week.missions.length + 1; // +1 for lab
    const completed = completedCount + (labCompleted ? 1 : 0);
    return Math.round((completed / total) * 100);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading roadmap..." />
      </div>
    );
  }

  return (
    <div className={styles.roadmap}>
      <header className={styles.header}>
        <h1 className={styles.title}>12-Week Roadmap</h1>
        <p className={styles.subtitle}>
          Your structured journey to DevOps mastery. Each week builds on the previous one.
        </p>
      </header>

      <div className={styles.weeksGrid}>
        {mockWeeks.map((week) => {
          const progress = getWeekProgress(week);
          const isExpanded = expandedWeek === week.week;

          return (
            <div key={week.week} className={styles.weekCard}>
              {/* Week header - clickable to expand */}
              <button
                type="button"
                className={styles.weekHeader}
                onClick={() => toggleWeek(week.week)}
                aria-expanded={isExpanded}
                aria-controls={`week-${week.week}-content`}
              >
                <div className={styles.weekInfo}>
                  <div className={styles.weekBadge}>
                    <Calendar size={16} aria-hidden="true" />
                    <span>Week {week.week}</span>
                  </div>
                  <h3 className={styles.weekTheme}>{week.theme}</h3>
                  <p className={styles.weekDescription}>{week.description}</p>
                </div>

                <div className={styles.weekProgress}>
                  <div className={styles.progressCircle}>
                    <svg viewBox="0 0 36 36" className={styles.progressRing}>
                      <path
                        className={styles.progressBg}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={styles.progressFill}
                        strokeDasharray={`${progress}, 100`}
                        d="M18 2.0845
                          a 15.9155 15.9155 0 0 1 0 31.831
                          a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <span className={styles.progressText}>{progress}%</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={20} aria-hidden="true" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div id={`week-${week.week}-content`} className={styles.weekContent}>
                  <h4 className={styles.contentTitle}>Missions</h4>
                  <ul className={styles.missionList}>
                    {week.missions.map((mission) => {
                      const isCompleted = completedMissions.includes(mission.id);
                      return (
                        <li key={mission.id} className={styles.missionItem}>
                          <Link
                            to={`/missions/${week.week}/${mission.day}`}
                            className={styles.missionLink}
                          >
                            {isCompleted ? (
                              <CheckCircle size={18} className={styles.checkIcon} aria-hidden="true" />
                            ) : (
                              <Circle size={18} className={styles.circleIcon} aria-hidden="true" />
                            )}
                            <span className={styles.missionDay}>Day {mission.day}</span>
                            <span className={styles.missionTitle}>{mission.title}</span>
                            <div className={styles.missionMeta}>
                              <Clock size={12} aria-hidden="true" />
                              <span>{mission.minutes}m</span>
                              <Star size={12} aria-hidden="true" />
                              <span>{mission.xp} XP</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <h4 className={styles.contentTitle}>Saturday Lab</h4>
                  <Link
                    to={`/labs/${week.lab.id}`}
                    className={`${styles.labCard} ${completedLabs.includes(week.lab.id) ? styles.labCompleted : ''}`}
                  >
                    {completedLabs.includes(week.lab.id) ? (
                      <CheckCircle size={20} className={styles.checkIcon} aria-hidden="true" />
                    ) : (
                      <Circle size={20} className={styles.circleIcon} aria-hidden="true" />
                    )}
                    <div className={styles.labInfo}>
                      <span className={styles.labTitle}>{week.lab.title}</span>
                      <Badge variant="difficulty" value={week.lab.difficulty} size="sm" />
                    </div>
                    <div className={styles.labXp}>
                      <Star size={14} aria-hidden="true" />
                      <span>{week.lab.xp} XP</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Roadmap;
