/**
 * FILE: src/pages/NotFound.tsx
 * PURPOSE: 404 error page for unknown routes.
 */

import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <div className={styles.notFound}>
      <div className={styles.content}>
        <AlertTriangle size={64} className={styles.icon} aria-hidden="true" />
        <h1 className={styles.title}>404</h1>
        <h2 className={styles.subtitle}>Page Not Found</h2>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className={styles.homeButton}>
          <Home size={18} aria-hidden="true" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
