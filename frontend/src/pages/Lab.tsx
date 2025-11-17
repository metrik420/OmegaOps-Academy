/**
 * FILE: src/pages/Lab.tsx
 * PURPOSE: Individual lab detail with objectives, hints, and completion.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Lightbulb, CheckCircle, AlertTriangle, Star } from 'lucide-react';
import { useStore, useCompletedLabs } from '@/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import styles from './Lab.module.css';

const mockLab = {
  id: 'lab-1',
  week: 1,
  title: 'Set Up Git Repository',
  scenario: `Your team needs a centralized code repository for the new OmegaOps project.

  As the DevOps engineer, you need to initialize a Git repository, set up a proper .gitignore file, and create the initial commit structure that the team will build upon.`,
  objectives: [
    'Initialize a new Git repository',
    'Create a comprehensive .gitignore file',
    'Set up a README with project information',
    'Make your first commit with proper message format',
    'Configure Git user settings locally',
  ],
  difficulty: 'beginner' as const,
  hints: [
    { level: 1, content: 'Use "git init" to start a new repository.', xpPenalty: 5 },
    { level: 2, content: 'Check GitHub\'s .gitignore templates for common patterns.', xpPenalty: 10 },
    { level: 3, content: 'Use "git config --local user.name" and "user.email" for local settings.', xpPenalty: 15 },
  ],
  successCriteria: [
    '.git directory exists in project root',
    '.gitignore file contains appropriate patterns',
    'README.md has project description',
    'At least one commit with descriptive message',
    'Git user configured locally',
  ],
  xpReward: 100,
  estimatedMinutes: 60,
  tags: ['git', 'version-control', 'setup'],
};

export function Lab() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const completedLabs = useCompletedLabs();
  const { completeLab, addXp, addToast } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  const isCompleted = completedLabs.includes(mockLab.id);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [id]);

  const revealHint = (level: number) => {
    if (!revealedHints.includes(level)) {
      setRevealedHints([...revealedHints, level]);
      addToast({
        type: 'warning',
        message: `Hint revealed! -${mockLab.hints.find((h) => h.level === level)?.xpPenalty || 0} XP penalty applied.`,
      });
    }
  };

  const handleComplete = () => {
    setIsCompleting(true);

    setTimeout(() => {
      const totalPenalty = revealedHints.reduce((sum, level) => {
        const hint = mockLab.hints.find((h) => h.level === level);
        return sum + (hint?.xpPenalty || 0);
      }, 0);

      const finalXp = Math.max(0, mockLab.xpReward - totalPenalty);

      completeLab(mockLab.id, revealedHints);
      addXp(finalXp);

      addToast({
        type: 'success',
        message: `Lab completed! You earned ${finalXp} XP${totalPenalty > 0 ? ` (-${totalPenalty} hint penalty)` : ''}.`,
        duration: 7000,
      });

      setIsCompleting(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading lab..." />
      </div>
    );
  }

  return (
    <div className={styles.lab}>
      <button type="button" onClick={() => navigate(-1)} className={styles.backButton}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>

      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.week}>Week {mockLab.week}</span>
          <Badge variant="difficulty" value={mockLab.difficulty} size="md" />
        </div>
        <h1 className={styles.title}>{mockLab.title}</h1>
        <div className={styles.headerStats}>
          <span>{mockLab.estimatedMinutes} minutes</span>
          <span>{mockLab.xpReward} XP</span>
        </div>
        {isCompleted && (
          <div className={styles.completedBadge}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>Completed</span>
          </div>
        )}
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Scenario</h2>
        <div className={styles.scenario}>
          {mockLab.scenario.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Target size={20} aria-hidden="true" />
          Objectives
        </h2>
        <ul className={styles.objectivesList}>
          {mockLab.objectives.map((obj, i) => (
            <li key={i}>{obj}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Lightbulb size={20} aria-hidden="true" />
          Hints
        </h2>
        <div className={styles.hintWarning}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Using hints will reduce your XP reward!</span>
        </div>
        <div className={styles.hintsList}>
          {mockLab.hints.map((hint) => (
            <div key={hint.level} className={styles.hintItem}>
              <div className={styles.hintHeader}>
                <span className={styles.hintLevel}>Hint Level {hint.level}</span>
                <span className={styles.hintPenalty}>-{hint.xpPenalty} XP</span>
              </div>
              {revealedHints.includes(hint.level) ? (
                <p className={styles.hintContent}>{hint.content}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => revealHint(hint.level)}
                  className={styles.revealButton}
                  disabled={isCompleted}
                >
                  Reveal Hint
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <CheckCircle size={20} aria-hidden="true" />
          Success Criteria
        </h2>
        <ul className={styles.criteriaList}>
          {mockLab.successCriteria.map((criterion, i) => (
            <li key={i}>{criterion}</li>
          ))}
        </ul>
      </section>

      {!isCompleted && (
        <div className={styles.completionSection}>
          <button
            type="button"
            onClick={handleComplete}
            className={styles.completeButton}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Star size={20} aria-hidden="true" />
                <span>Complete Lab</span>
              </>
            )}
          </button>
          {revealedHints.length > 0 && (
            <p className={styles.penaltyNote}>
              Hints used: {revealedHints.length} (-
              {revealedHints.reduce(
                (sum, level) => sum + (mockLab.hints.find((h) => h.level === level)?.xpPenalty || 0),
                0
              )}{' '}
              XP)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Lab;
