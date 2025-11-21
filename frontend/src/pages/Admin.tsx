/**
 * FILE: src/pages/Admin.tsx
 * PURPOSE: Admin panel for managing updates and reviewing pending items.
 * INPUTS: Admin authentication via AuthContext (username='metrik')
 * OUTPUTS: Admin dashboard with pending updates and software management
 * NOTES:
 *   - Protected by AdminRoute component (redirects to /admin/login if not admin)
 *   - Admin status: user.username === 'metrik' (from authStore)
 *   - Uses NEW auth system (AuthContext/authStore), not old store-based auth
 * SECURITY:
 *   - Admin-only access enforced by AdminRoute guard
 *   - Backend must also enforce admin authorization (defense in depth)
 */

import { useAuth, useLogout } from '@/contexts/AuthContext';
import { useStore } from '@/store';
import { Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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

/**
 * Admin component - main admin dashboard.
 * NOTE: This component is wrapped by AdminRoute, so it's only rendered if user is admin.
 * WHY: AdminRoute handles auth checks and redirects; this component focuses on admin UI.
 */
export function Admin() {
  const { user, isLoading } = useAuth();
  const { execute: logout, isLoading: isLoggingOut } = useLogout();
  const { addToast } = useStore();

  const handleAction = (action: string, id: string) => {
    addToast({ type: 'info', message: `${action} action triggered for ${id}` });
  };

  const handleLogout = async () => {
    try {
      await logout();
      addToast({ type: 'success', message: 'Logged out successfully' });
    } catch (error) {
      addToast({ type: 'error', message: 'Logout failed. Please try again.' });
    }
  };

  // Show loading spinner if auth state is loading
  // WHY: Prevents flash of content before auth state is loaded
  if (isLoading) {
    return (
      <div className={styles.loginContainer}>
        <LoadingSpinner size="lg" />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className={styles.admin}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Shield size={28} aria-hidden="true" />
          Admin Panel
          {user && <span className={styles.username}>({user.username})</span>}
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className={styles.logoutButton}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
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
