/**
 * FILE: src/pages/KnowledgeTopic.tsx
 * PURPOSE: Single knowledge topic detail view.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Shield, ExternalLink, BookOpen, FlaskConical, Server } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import styles from './KnowledgeTopic.module.css';

const mockTopic = {
  id: 'containers-101',
  title: 'Container Fundamentals',
  category: 'containerization' as const,
  content: `# Container Fundamentals

Containers are lightweight, standalone, executable packages that include everything needed to run a piece of software.

## What is a Container?

A container is a standard unit of software that packages up code and all its dependencies so the application runs quickly and reliably from one computing environment to another.

## Key Benefits

- **Portability**: Run anywhere
- **Consistency**: Same behavior in dev, test, prod
- **Isolation**: Separate from host system
- **Efficiency**: Lightweight compared to VMs

## Container vs VM

Containers share the host OS kernel, making them more lightweight than virtual machines which each have their own OS.`,
  summary: 'Understanding containerization concepts and benefits.',
  relatedMissions: ['w2d1', 'w2d2'],
  relatedLabs: ['lab-2'],
  relatedSoftware: ['docker', 'containerd'],
  sources: [
    { title: 'Docker Documentation', url: 'https://docs.docker.com/', type: 'official' as const, accessedAt: '2025-01-15' },
    { title: 'Container Basics', url: 'https://example.com', type: 'article' as const, accessedAt: '2025-01-10' },
  ],
  confidenceLevel: 'high' as const,
  tags: ['docker', 'containerization', 'fundamentals'],
};

export function KnowledgeTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [topicId]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading topic..." />
      </div>
    );
  }

  return (
    <div className={styles.topic}>
      <button type="button" onClick={() => navigate(-1)} className={styles.backButton}>
        <ArrowLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>

      <header className={styles.header}>
        <Badge variant="category" value={mockTopic.category} size="md" />
        <h1 className={styles.title}>{mockTopic.title}</h1>
        <div className={styles.confidence}>
          <Shield size={16} aria-hidden="true" />
          <span>Confidence: {mockTopic.confidenceLevel}</span>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          <div className={styles.markdown}>
            {/* Simple markdown rendering - in production use a markdown library */}
            {mockTopic.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i}>{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i}>{line.slice(3)}</h2>;
              }
              if (line.startsWith('- ')) {
                return <li key={i}>{line.slice(2)}</li>;
              }
              if (line.trim() === '') {
                return <br key={i} />;
              }
              return <p key={i}>{line}</p>;
            })}
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>
              <BookOpen size={16} aria-hidden="true" />
              Related Missions
            </h3>
            {mockTopic.relatedMissions.map((id) => (
              <Link key={id} to={`/missions/2/1`} className={styles.relatedLink}>
                Mission {id}
              </Link>
            ))}
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>
              <FlaskConical size={16} aria-hidden="true" />
              Related Labs
            </h3>
            {mockTopic.relatedLabs.map((id) => (
              <Link key={id} to={`/labs/${id}`} className={styles.relatedLink}>
                Lab {id}
              </Link>
            ))}
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>
              <Server size={16} aria-hidden="true" />
              Related Tools
            </h3>
            {mockTopic.relatedSoftware.map((id) => (
              <Link key={id} to={`/software/${id}`} className={styles.relatedLink}>
                {id}
              </Link>
            ))}
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>
              <ExternalLink size={16} aria-hidden="true" />
              Sources
            </h3>
            {mockTopic.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}
              >
                {source.title}
                <Badge variant="status" value={source.type} size="sm" />
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default KnowledgeTopic;
