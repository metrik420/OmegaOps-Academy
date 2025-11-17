/**
 * FILE: src/pages/Admin.tsx
 * PURPOSE: Admin panel for managing updates and reviewing pending items.
 */

import { useState } from 'react';
import { Shield, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useStore, useIsAdminAuthenticated } from '@/store';
import LoadingSpinner from '@/components/LoadingSpinner';
import Badge from '@/components/Badge';
import styles from './Admin.module.css';

const mockPendingUpdates = [
  { id: 'upd-1', title: 'Docker 24.0.8 Available', type: 'version', priority: 'high' },
  { id: 'upd-2', title: 'Kubernetes Security Patch', type: 'security', priority: 'critical' },
];

const mockPendingSoftware = [
  { id: 'tool-1', name: 'Podman', category: 'container-runtime', discovered: '2025-01-15' },
  { id: 'tool-2', name: 'ArgoCD', category: 'ci-cd', discovered: '2025-01-14' },
];

export function Admin() {
  const isAuthenticated = useIsAdminAuthenticated();
  const { setAdminAuth, addToast } = useStore();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock authentication - in production would call API
    setTimeout(() => {
      if (password === 'admin123') {
        setAdminAuth(true);
        addToast({ type: 'success', message: 'Admin login successful!' });
      } else {
        addToast({ type: 'error', message: 'Invalid password.' });
      }
      setIsLoading(false);
      setPassword('');
    }, 1000);
  };

  const handleAction = (action: string, id: string) => {
    addToast({ type: 'info', message: `${action} action triggered for ${id}` });
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}>
            <Lock size={32} />
          </div>
          <h2 className={styles.loginTitle}>Admin Access Required</h2>
          <p className={styles.loginDescription}>Enter admin password to continue.</p>

          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={styles.passwordInput}
              required
            />
            <button type="submit" className={styles.loginButton} disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="sm" /> : 'Login'}
            </button>
          </form>

          <p className={styles.hint}>Demo password: admin123</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.admin}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Shield size={28} aria-hidden="true" />
          Admin Panel
        </h1>
        <button
          type="button"
          onClick={() => setAdminAuth(false)}
          className={styles.logoutButton}
        >
          Logout
        </button>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>12</span>
          <span className={styles.statLabel}>Total Weeks</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>60</span>
          <span className={styles.statLabel}>Missions</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>12</span>
          <span className={styles.statLabel}>Labs</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{mockPendingUpdates.length}</span>
          <span className={styles.statLabel}>Pending Updates</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pending Updates</h2>
        <div className={styles.table}>
          {mockPendingUpdates.map((update) => (
            <div key={update.id} className={styles.tableRow}>
              <div className={styles.tableInfo}>
                <span className={styles.tableName}>{update.title}</span>
                <div className={styles.tableMeta}>
                  <Badge variant="category" value={update.type} size="sm" />
                  <Badge variant="status" value={update.priority} size="sm" />
                </div>
              </div>
              <div className={styles.tableActions}>
                <button
                  type="button"
                  onClick={() => handleAction('Approve', update.id)}
                  className={styles.approveButton}
                >
                  <CheckCircle size={16} /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('Reject', update.id)}
                  className={styles.rejectButton}
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Discovered Software</h2>
        <div className={styles.table}>
          {mockPendingSoftware.map((tool) => (
            <div key={tool.id} className={styles.tableRow}>
              <div className={styles.tableInfo}>
                <span className={styles.tableName}>{tool.name}</span>
                <div className={styles.tableMeta}>
                  <Badge variant="category" value={tool.category} size="sm" />
                  <span className={styles.discoveredDate}>Discovered: {tool.discovered}</span>
                </div>
              </div>
              <div className={styles.tableActions}>
                <button
                  type="button"
                  onClick={() => handleAction('Add', tool.id)}
                  className={styles.approveButton}
                >
                  <CheckCircle size={16} /> Add
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('Deprecate', tool.id)}
                  className={styles.warnButton}
                >
                  <AlertTriangle size={16} /> Deprecate
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Admin;
