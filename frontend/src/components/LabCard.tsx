/**
 * FILE: src/components/LabCard.tsx
 * PURPOSE: Preview card for labs in lists.
 *
 * FEATURES:
 * - Shows lab title, difficulty, XP reward, time estimate
 * - Difficulty badge (beginner/intermediate/advanced)
 * - Completion status indicator
 * - Click to navigate to lab detail
 */

import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Star, ChevronRight, FlaskConical } from 'lucide-react';
import { useCompletedLabs } from '@/store';
import Badge from './Badge';
import type { DifficultyLevel } from '@/types';
import styles from './LabCard.module.css';

interface LabCardProps {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  xpReward: number;
  estimatedMinutes: number;
  week?: number;
}

export function LabCard({
  id,
  title,
  difficulty,
  xpReward,
  estimatedMinutes,
  week,
}: LabCardProps) {
  const completedLabs = useCompletedLabs();
  const isCompleted = completedLabs.includes(id);

  return (
    <Link
      to={`/labs/${id}`}
      className={`${styles.card} ${isCompleted ? styles.completed : ''}`}
      aria-label={`${isCompleted ? 'Completed: ' : ''}${title}, ${difficulty} difficulty, ${estimatedMinutes} minutes, ${xpReward} XP`}
    >
      {/* Lab icon and week indicator */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <FlaskConical size={20} aria-hidden="true" />
        </div>
        {week && <span className={styles.week}>Week {week}</span>}
      </div>

      {/* Completion indicator */}
      {isCompleted && (
        <div className={styles.completedBadge}>
          <CheckCircle size={16} aria-hidden="true" />
          <span>Completed</span>
        </div>
      )}

      {/* Main content */}
      <h3 className={styles.title}>{title}</h3>

      {/* Difficulty badge */}
      <div className={styles.badgeWrapper}>
        <Badge variant="difficulty" value={difficulty} size="sm" />
      </div>

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
        <span>{isCompleted ? 'Review' : 'Start Lab'}</span>
        <ChevronRight size={16} aria-hidden="true" />
      </div>
    </Link>
  );
}

export default LabCard;
