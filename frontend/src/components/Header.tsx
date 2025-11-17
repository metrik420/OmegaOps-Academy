/**
 * FILE: src/components/Header.tsx
 * PURPOSE: Top navigation bar with gamification stats and theme toggle.
 *
 * FEATURES:
 * - XP counter with progress bar
 * - Level badge with title
 * - Streak counter with fire icon
 * - Theme toggle (dark/light/system)
 * - Mobile menu toggle button
 *
 * ACCESSIBILITY:
 * - Semantic header element
 * - Keyboard accessible controls
 * - ARIA labels for icon buttons
 * - Screen reader announcements for stats
 */

import { Sun, Moon, Monitor, Menu, Flame, Trophy, Star } from 'lucide-react';
import { useStore, useUserProgress, useTheme, getLevelTitle, getXpForNextLevel } from '@/store';
import styles from './Header.module.css';

export function Header() {
  const { xp, level, streak } = useUserProgress();
  const theme = useTheme();
  const { setTheme, toggleSidebar } = useStore();

  const levelTitle = getLevelTitle(level);
  const nextLevelXp = getXpForNextLevel(level);

  /**
   * Calculate XP progress percentage toward next level.
   * Used for the progress bar visualization.
   */
  const currentLevelXp =
    level === 1
      ? 0
      : (() => {
          // Find current level threshold
          const thresholds = [0, 100, 250, 500, 850, 1300, 1850, 2500, 3250, 4200];
          return thresholds[level - 1] || 0;
        })();

  const xpInCurrentLevel = xp - currentLevelXp;
  const xpNeededForLevel = nextLevelXp > 0 ? nextLevelXp - currentLevelXp : 100;
  const progressPercentage = Math.min(
    100,
    Math.round((xpInCurrentLevel / xpNeededForLevel) * 100)
  );

  /**
   * Cycle through theme options.
   * dark -> light -> system -> dark
   */
  const cycleTheme = () => {
    const themes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  /**
   * Get icon for current theme setting.
   */
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className={styles.header} role="banner">
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={styles.menuButton}
        aria-label="Toggle navigation menu"
      >
        <Menu size={24} aria-hidden="true" />
      </button>

      {/* Logo / Title */}
      <div className={styles.logo}>
        <span className={styles.logoText}>OmegaOps Academy</span>
      </div>

      {/* Gamification stats */}
      <div className={styles.stats}>
        {/* Streak counter */}
        <div className={styles.statItem} title={`${streak} day streak`}>
          <Flame
            size={18}
            className={streak > 0 ? styles.streakActive : styles.streakInactive}
            aria-hidden="true"
          />
          <span className={styles.statValue}>{streak}</span>
          <span className={styles.statLabel}>Streak</span>
        </div>

        {/* Level badge */}
        <div className={styles.statItem} title={`Level ${level}: ${levelTitle}`}>
          <Trophy size={18} className={styles.levelIcon} aria-hidden="true" />
          <span className={styles.statValue}>{level}</span>
          <span className={styles.statLabel}>{levelTitle}</span>
        </div>

        {/* XP with progress bar */}
        <div className={styles.xpContainer} title={`${xp} total XP`}>
          <div className={styles.xpHeader}>
            <Star size={16} className={styles.xpIcon} aria-hidden="true" />
            <span className={styles.xpValue}>{xp} XP</span>
          </div>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${progressPercentage}% progress to next level`}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {nextLevelXp > 0 && (
            <span className={styles.xpToNext}>
              {nextLevelXp - xp} XP to level {level + 1}
            </span>
          )}
        </div>
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={cycleTheme}
        className={styles.themeButton}
        aria-label={`Current theme: ${theme}. Click to change.`}
        title={`Theme: ${theme}`}
      >
        <ThemeIcon size={20} aria-hidden="true" />
      </button>
    </header>
  );
}

export default Header;
