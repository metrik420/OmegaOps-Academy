/**
 * FILE: src/store/index.ts
 * PURPOSE: Global state management using Zustand with localStorage persistence.
 *
 * STATE STRUCTURE:
 * - User progress: XP, level, streak, completed items, reflections
 * - UI state: theme, sidebar visibility, modals, toasts
 * - Admin state: authentication status
 *
 * GAMIFICATION LOGIC:
 * - XP accumulation triggers level ups at defined thresholds
 * - Daily activity maintains streak counter
 * - Achievements unlock based on milestones
 *
 * PERSISTENCE:
 * - User progress saved to localStorage
 * - Survives page reloads and browser restarts
 * - Could sync to backend for cross-device support
 *
 * PERFORMANCE:
 * - Zustand's shallow comparison prevents unnecessary re-renders
 * - Selectors used for accessing specific state slices
 * - Middleware for persistence and devtools
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  UserProgress,
  Achievement,
  Theme,
  SidebarState,
  Toast,
  LevelThreshold,
} from '@/types';

// ============================================================================
// LEVEL PROGRESSION SYSTEM
// ============================================================================

/**
 * Level thresholds define XP required for each level.
 * Exponential growth encourages continued engagement.
 * Titles provide sense of accomplishment.
 */
const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0, title: 'Newcomer' },
  { level: 2, xpRequired: 100, title: 'Apprentice' },
  { level: 3, xpRequired: 250, title: 'Practitioner' },
  { level: 4, xpRequired: 500, title: 'Specialist' },
  { level: 5, xpRequired: 850, title: 'Expert' },
  { level: 6, xpRequired: 1300, title: 'Master' },
  { level: 7, xpRequired: 1850, title: 'Architect' },
  { level: 8, xpRequired: 2500, title: 'Guru' },
  { level: 9, xpRequired: 3250, title: 'Legend' },
  { level: 10, xpRequired: 4200, title: 'DevOps Grandmaster' },
];

/**
 * Calculate level from total XP.
 * Finds highest level threshold that XP exceeds.
 */
const calculateLevel = (xp: number): number => {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.xpRequired) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
};

/**
 * Get level title for display.
 */
const getLevelTitle = (level: number): string => {
  const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
  return threshold?.title || 'Unknown';
};

/**
 * Calculate XP needed for next level.
 * Returns 0 if at max level.
 */
const getXpForNextLevel = (currentLevel: number): number => {
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1);
  return nextThreshold?.xpRequired || 0;
};

/**
 * Check and update streak based on last activity date.
 * Streak breaks if more than 1 day passes without activity.
 * Timezone handling: uses local date comparison.
 */
const updateStreak = (lastActivityDate: string, currentStreak: number): number => {
  const lastDate = new Date(lastActivityDate);
  const today = new Date();

  // Reset time portion for date-only comparison
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day, streak unchanged
    return currentStreak;
  } else if (diffDays === 1) {
    // Consecutive day, increment streak
    return currentStreak + 1;
  } else {
    // Streak broken, reset to 1
    return 1;
  }
};

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

/**
 * Achievement definitions with unlock conditions.
 * Checked after each progress update.
 */
interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (progress: UserProgress) => boolean;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_mission',
    title: 'First Steps',
    description: 'Complete your first mission',
    icon: 'rocket',
    condition: (p) => p.completedMissions.length >= 1,
  },
  {
    id: 'week_complete',
    title: 'Week Warrior',
    description: 'Complete all missions in a week',
    icon: 'calendar-check',
    condition: (p) => p.completedMissions.length >= 5, // Assuming 5 missions per week
  },
  {
    id: 'first_lab',
    title: 'Lab Rat',
    description: 'Complete your first lab',
    icon: 'flask-conical',
    condition: (p) => p.completedLabs.length >= 1,
  },
  {
    id: 'streak_7',
    title: 'Consistent Learner',
    description: 'Maintain a 7-day streak',
    icon: 'flame',
    condition: (p) => p.streak >= 7,
  },
  {
    id: 'xp_1000',
    title: 'Thousand Club',
    description: 'Earn 1000 total XP',
    icon: 'trophy',
    condition: (p) => p.xp >= 1000,
  },
  {
    id: 'level_5',
    title: 'Expert Level',
    description: 'Reach level 5',
    icon: 'award',
    condition: (p) => p.level >= 5,
  },
  {
    id: 'perfect_quiz',
    title: 'Perfect Score',
    description: 'Score 100% on a quiz',
    icon: 'check-circle',
    condition: (p) => Object.values(p.quizScores).some((score) => score === 100),
  },
  {
    id: 'no_hints',
    title: 'Independent Thinker',
    description: 'Complete a lab without using hints',
    icon: 'brain',
    condition: (p) => {
      // Check if any lab was completed without hints
      return p.completedLabs.some((labId) => {
        const hints = p.hintsUsed[labId];
        return !hints || hints.length === 0;
      });
    },
  },
];

/**
 * Check for newly unlocked achievements.
 * Returns list of achievement IDs that were just unlocked.
 */
const checkAchievements = (progress: UserProgress): Achievement[] => {
  const unlockedIds = progress.achievements.map((a) => a.id);
  const newAchievements: Achievement[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!unlockedIds.includes(def.id) && def.condition(progress)) {
      newAchievements.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  return newAchievements;
};

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface AppStore {
  // User Progress State
  userProgress: UserProgress;

  // UI State
  theme: Theme;
  sidebar: SidebarState;
  toasts: Toast[];

  // Admin State
  isAdminAuthenticated: boolean;

  // User Progress Actions
  addXp: (amount: number) => void;
  completeMission: (
    missionId: string,
    quizScore: number,
    reflection: string
  ) => void;
  completeLab: (labId: string, hintsUsed: number[]) => void;
  updateStreak: () => void;
  resetProgress: () => void;

  // UI Actions
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Admin Actions
  setAdminAuth: (authenticated: boolean) => void;

  // Computed Getters (not reactive, call as functions)
  getLevelTitle: () => string;
  getXpToNextLevel: () => number;
  getProgressPercentage: () => number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialUserProgress: UserProgress = {
  xp: 0,
  level: 1,
  streak: 0,
  lastActivityDate: new Date().toISOString(),
  completedMissions: [],
  completedLabs: [],
  hintsUsed: {},
  quizScores: {},
  reflections: {},
  totalTimeSpent: 0,
  achievements: [],
  weeklyProgress: [],
};

// ============================================================================
// STORE CREATION WITH PERSISTENCE
// ============================================================================

/**
 * Main application store.
 * Uses Zustand's persist middleware to save to localStorage.
 * Only persists user progress and theme, not transient UI state.
 */
export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ========== Initial State ==========
      userProgress: initialUserProgress,
      theme: 'dark', // Dark theme by default
      sidebar: {
        isOpen: true,
        isCollapsed: false,
      },
      toasts: [],
      isAdminAuthenticated: false,

      // ========== User Progress Actions ==========

      /**
       * Add XP and check for level ups and achievements.
       * This is the core gamification update function.
       *
       * @param amount - XP to add (always positive)
       *
       * Side effects:
       * - Updates level if threshold crossed
       * - Checks and unlocks achievements
       * - Shows toast notifications for level ups
       */
      addXp: (amount: number) => {
        set((state) => {
          const newXp = state.userProgress.xp + amount;
          const newLevel = calculateLevel(newXp);
          const leveledUp = newLevel > state.userProgress.level;

          // Check for new achievements
          const updatedProgress = {
            ...state.userProgress,
            xp: newXp,
            level: newLevel,
          };
          const newAchievements = checkAchievements(updatedProgress);

          // Show level up toast if leveled up
          if (leveledUp) {
            const toast: Toast = {
              id: `levelup-${Date.now()}`,
              type: 'success',
              message: `Level Up! You're now level ${newLevel}: ${getLevelTitle(newLevel)}`,
              duration: 7000,
            };
            state.toasts = [...state.toasts, toast];
          }

          // Show achievement toasts
          for (const achievement of newAchievements) {
            const toast: Toast = {
              id: `achievement-${achievement.id}`,
              type: 'success',
              message: `Achievement Unlocked: ${achievement.title}!`,
              duration: 7000,
            };
            state.toasts = [...state.toasts, toast];
          }

          return {
            userProgress: {
              ...updatedProgress,
              achievements: [...state.userProgress.achievements, ...newAchievements],
            },
            toasts: state.toasts,
          };
        });
      },

      /**
       * Mark mission as completed with quiz score and reflection.
       * Updates progress and triggers XP gain.
       *
       * @param missionId - Unique mission identifier
       * @param quizScore - Percentage score (0-100)
       * @param reflection - User's reflection text
       *
       * Business logic:
       * - Prevents duplicate completions
       * - Records quiz score for analytics
       * - Stores reflection for review
       * - Updates activity date for streak
       */
      completeMission: (
        missionId: string,
        quizScore: number,
        reflection: string
      ) => {
        set((state) => {
          // Prevent duplicate completion
          if (state.userProgress.completedMissions.includes(missionId)) {
            console.warn(`Mission ${missionId} already completed`);
            return state;
          }

          const updatedStreak = updateStreak(
            state.userProgress.lastActivityDate,
            state.userProgress.streak
          );

          return {
            userProgress: {
              ...state.userProgress,
              completedMissions: [...state.userProgress.completedMissions, missionId],
              quizScores: {
                ...state.userProgress.quizScores,
                [missionId]: quizScore,
              },
              reflections: {
                ...state.userProgress.reflections,
                [missionId]: reflection,
              },
              streak: updatedStreak,
              lastActivityDate: new Date().toISOString(),
            },
          };
        });
      },

      /**
       * Mark lab as completed with hints used.
       * Tracks which hints were revealed for XP penalty calculation.
       *
       * @param labId - Lab identifier
       * @param hintsUsed - Array of hint levels used (1, 2, 3)
       */
      completeLab: (labId: string, hintsUsed: number[]) => {
        set((state) => {
          // Prevent duplicate completion
          if (state.userProgress.completedLabs.includes(labId)) {
            console.warn(`Lab ${labId} already completed`);
            return state;
          }

          const updatedStreak = updateStreak(
            state.userProgress.lastActivityDate,
            state.userProgress.streak
          );

          return {
            userProgress: {
              ...state.userProgress,
              completedLabs: [...state.userProgress.completedLabs, labId],
              hintsUsed: {
                ...state.userProgress.hintsUsed,
                [labId]: hintsUsed,
              },
              streak: updatedStreak,
              lastActivityDate: new Date().toISOString(),
            },
          };
        });
      },

      /**
       * Update streak counter based on current date.
       * Should be called on app load to check if streak maintained.
       */
      updateStreak: () => {
        set((state) => {
          const newStreak = updateStreak(
            state.userProgress.lastActivityDate,
            state.userProgress.streak
          );

          // Only update if streak changed
          if (newStreak !== state.userProgress.streak) {
            return {
              userProgress: {
                ...state.userProgress,
                streak: newStreak,
              },
            };
          }
          return state;
        });
      },

      /**
       * Reset all progress to initial state.
       * Use with caution - irreversible without backup.
       */
      resetProgress: () => {
        set({
          userProgress: initialUserProgress,
        });
      },

      // ========== UI Actions ==========

      /**
       * Set application theme.
       * 'system' follows OS preference via prefers-color-scheme.
       */
      setTheme: (theme: Theme) => {
        set({ theme });

        // Update document class for CSS theme variables
        const root = document.documentElement;
        root.classList.remove('dark', 'light');

        if (theme === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.add(prefersDark ? 'dark' : 'light');
        } else {
          root.classList.add(theme);
        }
      },

      /**
       * Toggle sidebar open/closed state.
       * Used for mobile menu toggle.
       */
      toggleSidebar: () => {
        set((state) => ({
          sidebar: {
            ...state.sidebar,
            isOpen: !state.sidebar.isOpen,
          },
        }));
      },

      /**
       * Collapse sidebar to icons only (desktop).
       */
      collapseSidebar: () => {
        set((state) => ({
          sidebar: {
            ...state.sidebar,
            isCollapsed: true,
          },
        }));
      },

      /**
       * Expand sidebar to full width.
       */
      expandSidebar: () => {
        set((state) => ({
          sidebar: {
            ...state.sidebar,
            isCollapsed: false,
          },
        }));
      },

      /**
       * Add toast notification to queue.
       * Auto-generates unique ID.
       */
      addToast: (toast: Omit<Toast, 'id'>) => {
        const newToast: Toast = {
          ...toast,
          id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        };
        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-remove after duration
        const duration = toast.duration || 5000;
        setTimeout(() => {
          get().removeToast(newToast.id);
        }, duration);
      },

      /**
       * Remove specific toast by ID.
       */
      removeToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      /**
       * Clear all toasts.
       */
      clearToasts: () => {
        set({ toasts: [] });
      },

      // ========== Admin Actions ==========

      /**
       * Set admin authentication status.
       * Simple boolean flag, actual auth handled by API.
       */
      setAdminAuth: (authenticated: boolean) => {
        set({ isAdminAuthenticated: authenticated });
      },

      // ========== Computed Getters ==========

      /**
       * Get current level title string.
       */
      getLevelTitle: () => {
        return getLevelTitle(get().userProgress.level);
      },

      /**
       * Get XP needed to reach next level.
       * Returns 0 if at max level.
       */
      getXpToNextLevel: () => {
        const currentLevel = get().userProgress.level;
        return getXpForNextLevel(currentLevel);
      },

      /**
       * Get progress percentage toward next level.
       * Returns 100 if at max level.
       */
      getProgressPercentage: () => {
        const { xp, level } = get().userProgress;
        const currentThreshold =
          LEVEL_THRESHOLDS.find((t) => t.level === level)?.xpRequired || 0;
        const nextThreshold = getXpForNextLevel(level);

        if (nextThreshold === 0) return 100; // Max level

        const xpInCurrentLevel = xp - currentThreshold;
        const xpNeededForLevel = nextThreshold - currentThreshold;

        return Math.round((xpInCurrentLevel / xpNeededForLevel) * 100);
      },
    }),
    {
      name: 'omegaops-academy-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      /**
       * Partial persistence - only save user progress and theme.
       * Transient UI state (toasts, sidebar) not persisted.
       */
      partialize: (state) => ({
        userProgress: state.userProgress,
        theme: state.theme,
      }),
    }
  )
);

// ============================================================================
// SELECTORS FOR OPTIMIZED SUBSCRIPTIONS
// ============================================================================

/**
 * Selector hooks for accessing specific state slices.
 * Prevents unnecessary re-renders when unrelated state changes.
 */

export const useUserProgress = () => useStore((state) => state.userProgress);
export const useTheme = () => useStore((state) => state.theme);
export const useSidebar = () => useStore((state) => state.sidebar);
export const useToasts = () => useStore((state) => state.toasts);
export const useIsAdminAuthenticated = () =>
  useStore((state) => state.isAdminAuthenticated);

// XP and Level selectors
export const useXp = () => useStore((state) => state.userProgress.xp);
export const useLevel = () => useStore((state) => state.userProgress.level);
export const useStreak = () => useStore((state) => state.userProgress.streak);

// Completion selectors
export const useCompletedMissions = () =>
  useStore((state) => state.userProgress.completedMissions);
export const useCompletedLabs = () =>
  useStore((state) => state.userProgress.completedLabs);

// Action selectors (stable references)
export const useAddXp = () => useStore((state) => state.addXp);
export const useCompleteMission = () => useStore((state) => state.completeMission);
export const useCompleteLab = () => useStore((state) => state.completeLab);
export const useSetTheme = () => useStore((state) => state.setTheme);
export const useToggleSidebar = () => useStore((state) => state.toggleSidebar);
export const useAddToast = () => useStore((state) => state.addToast);

// Export level thresholds for UI display
export { LEVEL_THRESHOLDS, getLevelTitle, getXpForNextLevel };
