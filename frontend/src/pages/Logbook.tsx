/**
 * FILE: src/pages/Logbook.tsx
 * PURPOSE: Learning history with completed missions and reflections.
 */

import { useState } from 'react';
import { Book, Calendar, Star, Filter } from 'lucide-react';
import { useUserProgress } from '@/store';
import styles from './Logbook.module.css';

export function Logbook() {
  const progress = useUserProgress();
  const [filter, setFilter] = useState<'all' | 'missions' | 'labs'>('all');

  const entries = [
    ...progress.completedMissions.map((id) => ({
      type: 'mission' as const,
      id,
      date: new Date().toISOString(),
      score: progress.quizScores[id] || 0,
      reflection: progress.reflections[id] || '',
    })),
    ...progress.completedLabs.map((id) => ({
      type: 'lab' as const,
      id,
      date: new Date().toISOString(),
      hintsUsed: progress.hintsUsed[id]?.length || 0,
    })),
  ];

  const filteredEntries =
    filter === 'all' ? entries : entries.filter((e) => e.type === filter.slice(0, -1));

  return (
    <div className={styles.logbook}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Book size={28} aria-hidden="true" />
          Learning Logbook
        </h1>
        <p className={styles.subtitle}>Your journey through OmegaOps Academy.</p>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{progress.completedMissions.length}</span>
          <span className={styles.summaryLabel}>Missions Completed</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{progress.completedLabs.length}</span>
          <span className={styles.summaryLabel}>Labs Completed</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{progress.xp}</span>
          <span className={styles.summaryLabel}>Total XP</span>
        </div>
      </div>

      <div className={styles.filters}>
        <Filter size={18} aria-hidden="true" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className={styles.filterSelect}
        >
          <option value="all">All Entries</option>
          <option value="missions">Missions Only</option>
          <option value="labs">Labs Only</option>
        </select>
      </div>

      {filteredEntries.length > 0 ? (
        <div className={styles.entriesList}>
          {filteredEntries.map((entry, i) => (
            <div key={`${entry.type}-${entry.id}-${i}`} className={styles.entryCard}>
              <div className={styles.entryHeader}>
                <span className={styles.entryType}>
                  {entry.type === 'mission' ? 'Mission' : 'Lab'}
                </span>
                <span className={styles.entryId}>{entry.id}</span>
                <Calendar size={14} aria-hidden="true" />
                <span className={styles.entryDate}>
                  {new Date(entry.date).toLocaleDateString()}
                </span>
              </div>

              {entry.type === 'mission' && 'score' in entry && (
                <div className={styles.entryDetails}>
                  <div className={styles.scoreRow}>
                    <Star size={16} aria-hidden="true" />
                    <span>Quiz Score: {entry.score}%</span>
                  </div>
                  {entry.reflection && (
                    <div className={styles.reflection}>
                      <strong>Reflection:</strong>
                      <p>{entry.reflection}</p>
                    </div>
                  )}
                </div>
              )}

              {entry.type === 'lab' && 'hintsUsed' in entry && (
                <div className={styles.entryDetails}>
                  <span>Hints used: {entry.hintsUsed}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>No completed items yet. Start your journey from the Dashboard!</p>
        </div>
      )}
    </div>
  );
}

export default Logbook;
