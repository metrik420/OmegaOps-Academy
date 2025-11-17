/**
 * FILE: frontend/src/components/auth/PasswordStrengthMeter.tsx
 * PURPOSE: Visual password strength indicator with real-time requirements checklist.
 * INPUTS: password (string)
 * OUTPUTS: Visual strength meter, color-coded, with requirement checklist
 * NOTES:
 *   - Password requirements:
 *     1. Min 8 characters
 *     2. At least one uppercase letter
 *     3. At least one lowercase letter
 *     4. At least one number
 *     5. At least one special character (!@#$%^&*)
 *   - Strength levels: weak (0-40%), fair (41-70%), good (71-90%), strong (91-100%)
 * SECURITY:
 *   - Client-side validation only (backend enforces requirements)
 *   - No password logging or storage
 */

import React, { useMemo } from 'react';
import styles from './PasswordStrengthMeter.module.css';

/**
 * Props for PasswordStrengthMeter component.
 * @field password - Password to analyze
 * @field showRequirements - Show requirements checklist (default: true)
 */
interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

/**
 * Password requirement check result.
 * @field met - True if requirement is met
 * @field label - User-friendly requirement label
 */
interface Requirement {
  met: boolean;
  label: string;
}

/**
 * Password strength analysis result.
 * @field score - Strength score (0-100)
 * @field level - Strength level (weak, fair, good, strong)
 * @field color - Color code for visual indicator
 * @field requirements - Array of requirement checks
 */
interface StrengthAnalysis {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  color: string;
  requirements: Requirement[];
}

/**
 * Analyzes password strength based on requirements.
 * @param password - Password to analyze
 * @returns Strength analysis result
 * WHY: Real-time feedback helps users create strong passwords.
 * ALGORITHM:
 *   - Each met requirement adds 20 points (5 requirements * 20 = 100%)
 *   - Score mapped to level: weak (0-40), fair (41-70), good (71-90), strong (91+)
 */
function analyzePasswordStrength(password: string): StrengthAnalysis {
  const requirements: Requirement[] = [
    {
      met: password.length >= 8,
      label: 'At least 8 characters',
    },
    {
      met: /[A-Z]/.test(password),
      label: 'At least one uppercase letter',
    },
    {
      met: /[a-z]/.test(password),
      label: 'At least one lowercase letter',
    },
    {
      met: /\d/.test(password),
      label: 'At least one number',
    },
    {
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      label: 'At least one special character (!@#$%^&*)',
    },
  ];

  // Calculate score based on met requirements (0-100)
  const metCount = requirements.filter((req) => req.met).length;
  const score = (metCount / requirements.length) * 100;

  // Determine strength level and color
  let level: 'weak' | 'fair' | 'good' | 'strong';
  let color: string;

  if (score === 0) {
    level = 'weak';
    color = '#6B7280'; // Gray (no input)
  } else if (score <= 40) {
    level = 'weak';
    color = '#EF4444'; // Red
  } else if (score <= 70) {
    level = 'fair';
    color = '#F59E0B'; // Orange
  } else if (score <= 90) {
    level = 'good';
    color = '#10B981'; // Green
  } else {
    level = 'strong';
    color = '#059669'; // Dark green
  }

  return { score, level, color, requirements };
}

/**
 * PasswordStrengthMeter component.
 * Displays visual password strength indicator with requirements checklist.
 *
 * USAGE:
 *   <PasswordStrengthMeter password={password} />
 *
 * ACCESSIBILITY:
 *   - Color is not the only indicator (level text + icons also shown)
 *   - Requirements list is screen-reader friendly
 *
 * @param password - Password to analyze
 * @param showRequirements - Show requirements checklist (default: true)
 * @returns Visual strength meter and requirements checklist
 */
export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRequirements = true,
}) => {
  // Memoize analysis to prevent unnecessary recalculations
  const analysis = useMemo(() => analyzePasswordStrength(password), [password]);

  // Don't show meter if no password entered
  if (!password) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Strength meter bar */}
      <div className={styles.meterWrapper}>
        <div className={styles.meterTrack}>
          <div
            className={styles.meterFill}
            style={{
              width: `${analysis.score}%`,
              backgroundColor: analysis.color,
            }}
          />
        </div>
        <span className={styles.levelLabel} style={{ color: analysis.color }}>
          {analysis.level.charAt(0).toUpperCase() + analysis.level.slice(1)}
        </span>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <ul className={styles.requirementsList}>
          {analysis.requirements.map((req, index) => (
            <li
              key={index}
              className={`${styles.requirement} ${req.met ? styles.met : styles.unmet}`}
            >
              <span className={styles.icon}>{req.met ? '✓' : '○'}</span>
              <span className={styles.label}>{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
