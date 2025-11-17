/**
 * FILE: src/pages/Labs.tsx
 * PURPOSE: Labs index page with filtering and search.
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LabCard from '@/components/LabCard';
import type { DifficultyLevel } from '@/types';
import styles from './Labs.module.css';

const mockLabs = Array.from({ length: 12 }, (_, i) => ({
  id: `lab-${i + 1}`,
  week: i + 1,
  title: `Week ${i + 1} Challenge Lab`,
  difficulty: (i < 4 ? 'beginner' : i < 8 ? 'intermediate' : 'advanced') as DifficultyLevel,
  xpReward: 100 + i * 25,
  estimatedMinutes: 60 + i * 10,
  tags: ['devops', 'linux', 'docker'].slice(0, (i % 3) + 1),
}));

export function Labs() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | ''>('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredLabs = useMemo(() => {
    return mockLabs.filter((lab) => {
      const matchesSearch = lab.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = !selectedDifficulty || lab.difficulty === selectedDifficulty;
      return matchesSearch && matchesDifficulty;
    });
  }, [searchTerm, selectedDifficulty]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading labs..." />
      </div>
    );
  }

  return (
    <div className={styles.labs}>
      <header className={styles.header}>
        <h1 className={styles.title}>Labs</h1>
        <p className={styles.subtitle}>Hands-on challenges to test your skills. Complete labs to earn bonus XP.</p>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search labs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')} className={styles.clearButton}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={styles.filterGroup}>
          <Filter size={18} aria-hidden="true" />
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel | '')}
            className={styles.filterSelect}
          >
            <option value="">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className={styles.results}>
        <span>{filteredLabs.length} labs found</span>
      </div>

      <div className={styles.labsGrid}>
        {filteredLabs.map((lab) => (
          <LabCard
            key={lab.id}
            id={lab.id}
            title={lab.title}
            difficulty={lab.difficulty}
            xpReward={lab.xpReward}
            estimatedMinutes={lab.estimatedMinutes}
            week={lab.week}
          />
        ))}
      </div>

      {filteredLabs.length === 0 && (
        <div className={styles.emptyState}>
          <p>No labs found matching your criteria.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedDifficulty('');
            }}
            className={styles.resetButton}
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}

export default Labs;
