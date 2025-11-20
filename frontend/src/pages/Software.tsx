/**
 * FILE: src/pages/Software.tsx
 * PURPOSE: Software Galaxy index with search, filters, and sorting.
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, SortAsc } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import SoftwareCard from '@/components/SoftwareCard';
import type { SoftwareTool, Environment } from '@/types';
import styles from './Software.module.css';

const mockTools: SoftwareTool[] = [
  {
    id: 'docker',
    name: 'Docker',
    description: 'Container platform for building, shipping, and running applications in isolated environments.',
    category: 'container-runtime',
    useCases: ['Containerization', 'Development environments', 'Microservices'],
    environments: ['ubuntu', 'debian', 'centos', 'macos', 'windows'],
    installGuides: [],
    configGuide: { overview: '', commonSettings: [], bestPractices: [], exampleConfigs: [] },
    securityConsiderations: ['Run as non-root', 'Use trusted images'],
    sources: [],
    lastVerifiedAt: '2025-01-15',
    confidenceLevel: 'high',
    deprecated: false,
    relatedTools: ['containerd', 'podman'],
    tags: ['container', 'devops'],
    createdAt: '2024-01-01',
    updatedAt: '2025-01-15',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    description: 'Open-source container orchestration platform for automating deployment, scaling, and management.',
    category: 'orchestration',
    useCases: ['Container orchestration', 'Scaling', 'Service discovery'],
    environments: ['ubuntu', 'centos', 'alma'],
    installGuides: [],
    configGuide: { overview: '', commonSettings: [], bestPractices: [], exampleConfigs: [] },
    securityConsiderations: ['RBAC', 'Network policies', 'Pod security'],
    sources: [],
    lastVerifiedAt: '2025-01-10',
    confidenceLevel: 'high',
    deprecated: false,
    relatedTools: ['helm', 'kubectl'],
    tags: ['orchestration', 'k8s'],
    createdAt: '2024-01-01',
    updatedAt: '2025-01-10',
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    description: 'Open-source automation server for building, testing, and deploying software.',
    category: 'ci-cd',
    useCases: ['CI/CD pipelines', 'Build automation', 'Testing'],
    environments: ['ubuntu', 'debian', 'docker'],
    installGuides: [],
    configGuide: { overview: '', commonSettings: [], bestPractices: [], exampleConfigs: [] },
    securityConsiderations: ['Plugin security', 'Credential management'],
    sources: [],
    lastVerifiedAt: '2025-01-05',
    confidenceLevel: 'medium',
    deprecated: false,
    relatedTools: ['github-actions', 'gitlab-ci'],
    tags: ['ci-cd', 'automation'],
    createdAt: '2024-01-01',
    updatedAt: '2025-01-05',
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Open-source monitoring and alerting toolkit designed for reliability.',
    category: 'monitoring',
    useCases: ['Metrics collection', 'Alerting', 'Time series data'],
    environments: ['ubuntu', 'docker'],
    installGuides: [],
    configGuide: { overview: '', commonSettings: [], bestPractices: [], exampleConfigs: [] },
    securityConsiderations: ['Access control', 'Data retention'],
    sources: [],
    lastVerifiedAt: '2025-01-08',
    confidenceLevel: 'high',
    deprecated: false,
    relatedTools: ['grafana', 'alertmanager'],
    tags: ['monitoring', 'metrics'],
    createdAt: '2024-01-01',
    updatedAt: '2025-01-08',
  },
];

export function Software() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredTools = useMemo(() => {
    const tools = mockTools.filter((tool) => {
      const matchesSearch =
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || tool.category === selectedCategory;
      const matchesEnv = !selectedEnv || tool.environments.includes(selectedEnv as Environment);
      return matchesSearch && matchesCategory && matchesEnv;
    });

    // Sort
    tools.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return 0;
    });

    return tools;
  }, [searchTerm, selectedCategory, selectedEnv, sortBy]);

  const categories = [...new Set(mockTools.map((t) => t.category))];
  const environments = [...new Set(mockTools.flatMap((t) => t.environments))];

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading software..." />
      </div>
    );
  }

  return (
    <div className={styles.software}>
      <header className={styles.header}>
        <h1 className={styles.title}>Software Galaxy</h1>
        <p className={styles.subtitle}>Comprehensive guides for DevOps tools and technologies.</p>
      </header>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search tools..."
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

        <div className={styles.filterGroup}>
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Environments</option>
            {environments.map((env) => (
              <option key={env} value={env}>
                {env.charAt(0).toUpperCase() + env.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <SortAsc size={18} aria-hidden="true" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={styles.filterSelect}>
            <option value="name">Name</option>
            <option value="updated">Recently Updated</option>
          </select>
        </div>
      </div>

      <div className={styles.results}>
        <span>{filteredTools.length} tools found</span>
      </div>

      <div className={styles.toolsGrid}>
        {filteredTools.map((tool) => (
          <SoftwareCard key={tool.id} tool={tool} />
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className={styles.emptyState}>
          <p>No tools found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

export default Software;
