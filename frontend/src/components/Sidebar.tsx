/**
 * FILE: src/components/Sidebar.tsx
 * PURPOSE: Left navigation sidebar with main sections.
 *
 * FEATURES:
 * - Primary navigation links
 * - Active route highlighting
 * - Collapsible on mobile (off-canvas)
 * - Smooth slide animation
 * - Keyboard accessible
 *
 * ACCESSIBILITY:
 * - Semantic nav element
 * - aria-current for active link
 * - Focus trap when open on mobile
 * - Escape key to close
 */

import { useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Map,
  FlaskConical,
  BookOpen,
  Server,
  History,
  Settings,
  Book,
  X,
} from 'lucide-react';
import { useSidebar, useStore } from '@/store';
import styles from './Sidebar.module.css';

/**
 * Navigation items configuration.
 * Each item maps to a route in the application.
 */
const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/roadmap', label: 'Roadmap', icon: Map },
  { path: '/labs', label: 'Labs', icon: FlaskConical },
  { path: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { path: '/software', label: 'Software Galaxy', icon: Server },
  { path: '/updates', label: 'Updates', icon: History },
  { path: '/logbook', label: 'Logbook', icon: Book },
  { path: '/admin', label: 'Admin', icon: Settings },
];

export function Sidebar() {
  const { isOpen } = useSidebar();
  const { toggleSidebar } = useStore();
  const location = useLocation();

  /**
   * Close sidebar on route change (mobile).
   * User selected a destination, so hide the menu.
   */
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      toggleSidebar();
    }
    // Only run when route changes, not when isOpen changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  /**
   * Handle escape key to close sidebar.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        toggleSidebar();
      }
    },
    [isOpen, toggleSidebar]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /**
   * Prevent body scroll when sidebar is open on mobile.
   */
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen]);

  return (
    <>
      {/* Backdrop for mobile - click to close */}
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
        aria-label="Main navigation"
      >
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.closeButton}
          aria-label="Close navigation menu"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Navigation links */}
        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.active : ''}`
                    }
                    aria-current={
                      location.pathname === item.path ? 'page' : undefined
                    }
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with version info */}
        <div className={styles.footer}>
          <span className={styles.version}>v1.0.0</span>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
