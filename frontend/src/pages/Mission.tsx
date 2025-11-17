/**
 * FILE: src/pages/Mission.tsx
 * PURPOSE: Daily mission detail view with full content, quiz, and completion.
 *
 * FEATURES:
 * - Narrative introduction
 * - Objectives list
 * - Warmup questions (expandable)
 * - Step-by-step tasks with code blocks
 * - Interactive quiz with multiple choice
 * - Reflection text input
 * - XP awarding on completion
 *
 * GAMIFICATION:
 * - XP awarded based on quiz score
 * - Reflection saved for logbook
 * - Updates streak counter
 * - Triggers achievement checks
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  HelpCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useStore, useCompletedMissions } from '@/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import CodeBlock from '@/components/CodeBlock';
import styles from './Mission.module.css';

/**
 * Mock mission data for demonstration.
 * In production, fetched from API.
 */
const mockMission = {
  id: 'w1d1',
  week: 1,
  day: 1,
  title: 'Introduction to DevOps Culture',
  narrative: `Welcome to your first day at OmegaOps! You've just joined a fast-growing startup as a junior DevOps engineer.

  The team is struggling with deployment issues - code works on developers' machines but breaks in production.
  Your first task is to understand the DevOps philosophy and how it can solve these problems.`,
  objectives: [
    'Understand the core principles of DevOps',
    'Learn the history and evolution of DevOps',
    'Identify key benefits of DevOps practices',
    'Recognize the DevOps lifecycle phases',
  ],
  warmupQuestions: [
    { question: 'What problems do you think occur when developers and operations teams work separately?', hint: 'Think about communication, deployment, and accountability.' },
    { question: 'Have you experienced "it works on my machine" issues before?', hint: 'Consider environment differences and configuration.' },
  ],
  tasks: [
    {
      id: 't1',
      title: 'Understanding DevOps',
      description: 'DevOps is a set of practices that combines software development (Dev) and IT operations (Ops). It aims to shorten the development lifecycle while delivering features, fixes, and updates frequently.',
      codeSnippets: [],
      verificationSteps: ['Read the explanation above', 'Take notes on key concepts'],
      tips: ['DevOps is about culture as much as tools', 'Focus on collaboration and automation'],
    },
    {
      id: 't2',
      title: 'The DevOps Lifecycle',
      description: 'The DevOps lifecycle consists of several phases that work together in a continuous loop.',
      codeSnippets: [
        {
          language: 'text',
          code: `DevOps Lifecycle Phases:
1. Plan - Define requirements and features
2. Code - Write and review code
3. Build - Compile and package application
4. Test - Automated testing
5. Release - Prepare for deployment
6. Deploy - Push to production
7. Operate - Monitor and maintain
8. Monitor - Collect metrics and feedback`,
          filename: undefined,
          description: 'The eight phases of DevOps lifecycle',
        },
      ],
      tips: ['These phases form a continuous loop', 'Feedback from monitoring influences planning'],
    },
    {
      id: 't3',
      title: 'Your First Git Command',
      description: 'Let\'s verify that Git is installed on your system. Git is essential for version control in DevOps.',
      codeSnippets: [
        {
          language: 'bash',
          code: 'git --version',
          filename: 'terminal',
          description: 'Check Git installation',
        },
      ],
      verificationSteps: [
        'Open your terminal',
        'Run the command above',
        'You should see something like: git version 2.39.0',
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      question: 'What does DevOps stand for?',
      options: [
        'Developer Operations',
        'Development Operations',
        'Device Operations',
        'Digital Operations',
      ],
      correctIndex: 1,
      explanation: 'DevOps combines "Development" and "Operations" - it\'s a set of practices that unifies software development and IT operations.',
    },
    {
      id: 'q2',
      question: 'Which of the following is NOT a phase in the DevOps lifecycle?',
      options: ['Plan', 'Code', 'Sell', 'Deploy'],
      correctIndex: 2,
      explanation: 'The DevOps lifecycle includes Plan, Code, Build, Test, Release, Deploy, Operate, and Monitor - but not Sell.',
    },
    {
      id: 'q3',
      question: 'What is the main goal of DevOps?',
      options: [
        'To eliminate developers',
        'To shorten development lifecycle and deliver frequently',
        'To remove all manual testing',
        'To replace cloud computing',
      ],
      correctIndex: 1,
      explanation: 'DevOps aims to shorten the development lifecycle while delivering features, fixes, and updates frequently with high quality.',
    },
  ],
  reflectionPrompt: 'How do you think DevOps practices could improve the workflow at OmegaOps? What challenges do you anticipate when implementing DevOps culture?',
  xpReward: 50,
  estimatedMinutes: 30,
  prerequisites: [],
  tags: ['devops', 'culture', 'fundamentals'],
};

export function Mission() {
  const { week, day } = useParams<{ week: string; day: string }>();
  const navigate = useNavigate();
  const completedMissions = useCompletedMissions();
  const { completeMission: storeMissionComplete, addXp, addToast } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [expandedWarmup, setExpandedWarmup] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [reflection, setReflection] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const isCompleted = completedMissions.includes(mockMission.id);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [week, day]);

  /**
   * Calculate quiz score percentage.
   */
  const calculateScore = () => {
    let correct = 0;
    mockMission.quiz.forEach((q) => {
      if (quizAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return Math.round((correct / mockMission.quiz.length) * 100);
  };

  /**
   * Handle mission completion.
   * Awards XP, saves reflection, updates progress.
   */
  const handleComplete = () => {
    if (Object.keys(quizAnswers).length < mockMission.quiz.length) {
      addToast({
        type: 'warning',
        message: 'Please answer all quiz questions before completing the mission.',
      });
      return;
    }

    if (reflection.trim().length < 10) {
      addToast({
        type: 'warning',
        message: 'Please write a reflection (at least 10 characters).',
      });
      return;
    }

    setIsCompleting(true);

    // Simulate API call delay
    setTimeout(() => {
      const score = calculateScore();

      // Update store
      storeMissionComplete(mockMission.id, score, reflection);

      // Award XP (bonus for perfect score)
      const bonusXp = score === 100 ? 10 : 0;
      const totalXp = mockMission.xpReward + bonusXp;
      addXp(totalXp);

      addToast({
        type: 'success',
        message: `Mission completed! You earned ${totalXp} XP${bonusXp > 0 ? ' (including perfect score bonus!)' : ''}.`,
        duration: 7000,
      });

      setShowResults(true);
      setIsCompleting(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading mission..." />
      </div>
    );
  }

  return (
    <div className={styles.mission}>
      {/* Back navigation */}
      <button type="button" onClick={() => navigate(-1)} className={styles.backButton}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>

      {/* Mission header */}
      <header className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.weekDay}>Week {week}, Day {day}</span>
          <div className={styles.headerStats}>
            <Clock size={16} aria-hidden="true" />
            <span>{mockMission.estimatedMinutes} min</span>
            <Star size={16} aria-hidden="true" />
            <span>{mockMission.xpReward} XP</span>
          </div>
        </div>
        <h1 className={styles.title}>{mockMission.title}</h1>
        {isCompleted && (
          <div className={styles.completedBadge}>
            <CheckCircle size={18} aria-hidden="true" />
            <span>Completed</span>
          </div>
        )}
      </header>

      {/* Narrative */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <BookOpen size={20} aria-hidden="true" />
          The Story
        </h2>
        <div className={styles.narrative}>
          {mockMission.narrative.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* Objectives */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Target size={20} aria-hidden="true" />
          Objectives
        </h2>
        <ul className={styles.objectivesList}>
          {mockMission.objectives.map((obj, i) => (
            <li key={i} className={styles.objective}>
              <CheckCircle size={16} aria-hidden="true" />
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Warmup questions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <HelpCircle size={20} aria-hidden="true" />
          Warmup Questions
        </h2>
        <div className={styles.warmupList}>
          {mockMission.warmupQuestions.map((wq, i) => (
            <div key={i} className={styles.warmupItem}>
              <button
                type="button"
                className={styles.warmupQuestion}
                onClick={() => setExpandedWarmup(expandedWarmup === i ? null : i)}
                aria-expanded={expandedWarmup === i}
              >
                <span>{wq.question}</span>
                {expandedWarmup === i ? (
                  <ChevronUp size={18} aria-hidden="true" />
                ) : (
                  <ChevronDown size={18} aria-hidden="true" />
                )}
              </button>
              {expandedWarmup === i && wq.hint && (
                <div className={styles.warmupHint}>
                  <strong>Hint:</strong> {wq.hint}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tasks */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Tasks</h2>
        <div className={styles.tasksList}>
          {mockMission.tasks.map((task, i) => (
            <div key={task.id} className={styles.taskItem}>
              <div className={styles.taskHeader}>
                <span className={styles.taskNumber}>Task {i + 1}</span>
                <h3 className={styles.taskTitle}>{task.title}</h3>
              </div>
              <p className={styles.taskDescription}>{task.description}</p>

              {task.codeSnippets?.map((snippet, j) => (
                <CodeBlock
                  key={j}
                  code={snippet.code}
                  language={snippet.language}
                  filename={snippet.filename}
                  description={snippet.description}
                />
              ))}

              {task.verificationSteps && task.verificationSteps.length > 0 && (
                <div className={styles.verificationSteps}>
                  <h4>Verification:</h4>
                  <ol>
                    {task.verificationSteps.map((step, k) => (
                      <li key={k}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {task.tips && task.tips.length > 0 && (
                <div className={styles.tips}>
                  <h4>Tips:</h4>
                  <ul>
                    {task.tips.map((tip, k) => (
                      <li key={k}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quiz */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Knowledge Check</h2>
        <div className={styles.quiz}>
          {mockMission.quiz.map((q, i) => (
            <div key={q.id} className={styles.quizQuestion}>
              <p className={styles.questionText}>
                <strong>Q{i + 1}:</strong> {q.question}
              </p>
              <div className={styles.options}>
                {q.options.map((option, j) => {
                  const isSelected = quizAnswers[q.id] === j;
                  const showCorrect = showResults && j === q.correctIndex;
                  const showWrong = showResults && isSelected && j !== q.correctIndex;

                  return (
                    <label
                      key={j}
                      className={`${styles.option} ${showCorrect ? styles.correct : ''} ${showWrong ? styles.wrong : ''}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={j}
                        checked={isSelected}
                        onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: j })}
                        disabled={showResults}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
              {showResults && (
                <div className={styles.explanation}>
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reflection */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Reflection</h2>
        <p className={styles.reflectionPrompt}>{mockMission.reflectionPrompt}</p>
        <textarea
          className={styles.reflectionInput}
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Write your thoughts here..."
          rows={6}
          disabled={isCompleted}
        />
      </section>

      {/* Completion button */}
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
                <span>Complete Mission & Earn {mockMission.xpReward} XP</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className={styles.results}>
          <h3>Mission Complete!</h3>
          <p>Quiz Score: {calculateScore()}%</p>
          <p>XP Earned: {mockMission.xpReward}{calculateScore() === 100 ? ' + 10 bonus' : ''}</p>
        </div>
      )}
    </div>
  );
}

export default Mission;
