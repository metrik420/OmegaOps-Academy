/**
 * FILE: src/pages/Knowledge.tsx
 * PURPOSE: Knowledge base index with search and category filtering.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, BookOpen, ChevronRight } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import type { KnowledgeCategory } from '@/types';
import styles from './Knowledge.module.css';

const mockTopics = [
  { id: 'containers-101', title: 'Container Fundamentals', category: 'containerization' as KnowledgeCategory, summary: 'Understanding containerization concepts and benefits.' },
  { id: 'docker-basics', title: 'Docker Basics', category: 'containerization' as KnowledgeCategory, summary: 'Getting started with Docker containers.' },
  { id: 'k8s-intro', title: 'Kubernetes Introduction', category: 'orchestration' as KnowledgeCategory, summary: 'Overview of Kubernetes architecture.' },
  { id: 'ci-cd-pipelines', title: 'CI/CD Pipelines', category: 'ci-cd' as KnowledgeCategory, summary: 'Building continuous integration and deployment pipelines.' },
  { id: 'monitoring-basics', title: 'Monitoring Fundamentals', category: 'monitoring' as KnowledgeCategory, summary: 'Introduction to observability and monitoring.' },
  { id: 'security-best-practices', title: 'Security Best Practices', category: 'security' as KnowledgeCategory, summary: 'Essential security practices for DevOps.' },
  { id: 'git-workflows', title: 'Git Workflows', category: 'version-control' as KnowledgeCategory, summary: 'Common Git branching strategies.' },
  { id: 'bash-scripting', title: 'Bash Scripting', category: 'scripting' as KnowledgeCategory, summary: 'Automation with shell scripts.' },
];

export function Knowledge() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTopics = useMemo(() => {
    return mockTopics.filter((topic) => {
      const matchesSearch =
        topic.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.summary.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || topic.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const categories = [...new Set(mockTopics.map((t) => t.category))];

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading knowledge base..." />
      </div>
    );
  }

  return (
    <div className={styles.knowledge}>
      <header className={styles.header}>
        <h1 className={styles.title}>Knowledge Base</h1>
        <p className={styles.subtitle}>Reference materials and concepts for your DevOps journey.</p>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <Filter size={18} aria-hidden="true" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.topicsList}>
        {filteredTopics.map((topic) => (
          <Link key={topic.id} to={`/knowledge/${topic.id}`} className={styles.topicCard}>
            <BookOpen size={24} className={styles.topicIcon} aria-hidden="true" />
            <div className={styles.topicContent}>
              <h3 className={styles.topicTitle}>{topic.title}</h3>
              <p className={styles.topicSummary}>{topic.summary}</p>
              <Badge variant="category" value={topic.category} size="sm" />
            </div>
            <ChevronRight size={20} className={styles.arrow} aria-hidden="true" />
          </Link>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className={styles.emptyState}>
          <p>No topics found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

export default Knowledge;
