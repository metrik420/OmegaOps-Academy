/**
 * FILE: src/components/MissionCard.tsx
 * PURPOSE: Preview card for missions in lists and roadmap.
 *
 * FEATURES:
 * - Shows mission title, day, XP reward, time estimate
 * - Completion status indicator
 * - Click to navigate to mission detail
 * - Responsive design
 */

import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Star, ChevronRight } from 'lucide-react';
import { useCompletedMissions } from '@/store';
import styles from './MissionCard.module.css';

interface MissionCardProps {
  id: string;
  week: number;
  day: number;
  title: string;
  xpReward: number;
  estimatedMinutes: number;
}

/**
 * Day names for display.
 * Sunday = 0 in JS, but missions are 1-indexed (1=Monday).
 */
const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MissionCard({
  id,
  week,
  day,
  title,
  xpReward,
  estimatedMinutes,
}: MissionCardProps) {
  const completedMissions = useCompletedMissions();
  const isCompleted = completedMissions.includes(id);

  return (
    <Link
      to={`/missions/${week}/${day}`}
      className={`${styles.card} ${isCompleted ? styles.completed : ''}`}
      aria-label={`${isCompleted ? 'Completed: ' : ''}${title}, ${estimatedMinutes} minutes, ${xpReward} XP`}
    >
      {/* Completion indicator */}
      {isCompleted && (
        <div className={styles.completedBadge}>
          <CheckCircle size={16} aria-hidden="true" />
          <span>Completed</span>
        </div>
      )}

      {/* Day indicator */}
      <div className={styles.dayBadge}>
        <span className={styles.dayNumber}>Day {day}</span>
        <span className={styles.dayName}>{dayNames[day]}</span>
      </div>

      {/* Main content */}
      <h3 className={styles.title}>{title}</h3>

      {/* Meta information */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <Clock size={14} aria-hidden="true" />
          <span>{estimatedMinutes} min</span>
        </div>
        <div className={styles.metaItem}>
          <Star size={14} aria-hidden="true" />
          <span>{xpReward} XP</span>
        </div>
      </div>

      {/* Action indicator */}
      <div className={styles.action}>
        <span>{isCompleted ? 'Review' : 'Start'}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}

export default MissionCard;
