/**
 * FILE: src/pages/Updates.tsx
 * PURPOSE: Changelog/updates timeline view.
 */

import { useState, useEffect } from 'react';
import { History, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import styles from './Updates.module.css';

const mockUpdates = [
  {
    id: 'upd-1',
    type: 'version',
    entityType: 'software',
    entityId: 'docker',
    title: 'Docker 24.0.7 Released',
    description: 'New version with security patches and performance improvements.',
    status: 'applied',
    priority: 'high',
    discoveredAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'upd-2',
    type: 'security',
    entityType: 'software',
    entityId: 'kubernetes',
    title: 'Kubernetes Security Advisory',
    description: 'Critical vulnerability in API server requires immediate attention.',
    status: 'pending',
    priority: 'critical',
    discoveredAt: '2025-01-14T08:00:00Z',
  },
  {
    id: 'upd-3',
    type: 'deprecation',
    entityType: 'software',
    entityId: 'docker-compose-v1',
    title: 'Docker Compose V1 Deprecated',
    description: 'Migrate to Compose V2 for continued support.',
    status: 'approved',
    priority: 'medium',
    discoveredAt: '2025-01-10T12:00:00Z',
  },
];

export function Updates() {
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredUpdates = statusFilter
    ? mockUpdates.filter((u) => u.status === statusFilter)
    : mockUpdates;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <CheckCircle size={18} className={styles.statusApplied} />;
      case 'pending':
        return <Clock size={18} className={styles.statusPending} />;
      case 'rejected':
        return <XCircle size={18} className={styles.statusRejected} />;
      default:
        return <History size={18} />;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner size="lg" label="Loading updates..." />
      </div>
    );
  }

  return (
    <div className={styles.updates}>
      <header className={styles.header}>
        <h1 className={styles.title}>Updates & Changelog</h1>
        <p className={styles.subtitle}>Track changes, new versions, and important updates.</p>
      </header>

      <div className={styles.filters}>
        <Filter size={18} aria-hidden="true" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="applied">Applied</option>
          <option value="rejected">Rejected</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>

      <div className={styles.timeline}>
        {filteredUpdates.map((update) => (
          <div key={update.id} className={styles.updateCard}>
            <div className={styles.updateHeader}>
              {getStatusIcon(update.status)}
              <Badge variant="status" value={update.priority} size="sm" />
              <span className={styles.updateDate}>
                {new Date(update.discoveredAt).toLocaleDateString()}
              </span>
            </div>

            <h3 className={styles.updateTitle}>{update.title}</h3>
            <p className={styles.updateDescription}>{update.description}</p>

            <div className={styles.updateMeta}>
              <Badge variant="category" value={update.type} size="sm" />
              <Badge variant="status" value={update.status} size="sm" />
              <span className={styles.entityInfo}>
                {update.entityType}: {update.entityId}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredUpdates.length === 0 && (
        <div className={styles.emptyState}>
          <p>No updates found with the selected filter.</p>
        </div>
      )}
    </div>
  );
}

export default Updates;
