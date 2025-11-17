/**
 * FILE: src/components/Layout.tsx
 * PURPOSE: Main application layout wrapper with header, sidebar, and content area.
 *
 * ARCHITECTURE:
 * - Fixed header at top
 * - Fixed sidebar on left (desktop) or off-canvas (mobile)
 * - Main content area with proper spacing
 * - Toast container for notifications
 *
 * RESPONSIVE DESIGN:
 * - Mobile-first approach
 * - Content area adjusts for sidebar presence
 * - Proper scrolling behavior
 *
 * ACCESSIBILITY:
 * - Semantic HTML structure (header, aside, main)
 * - Skip to content link
 * - Proper focus management
 */

import { type ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import ToastContainer from './Toast';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      {/*
        Skip link for keyboard users.
        Allows jumping directly to main content.
      */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* Top navigation bar with gamification stats */}
      <Header />

      {/* Left sidebar navigation */}
      <Sidebar />

      {/*
        Main content area.
        ID used by skip link.
        tabIndex for focus management.
      */}
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <div className={styles.content}>{children}</div>
      </main>

      {/* Toast notification container */}
      <ToastContainer />
    </div>
  );
}

export default Layout;
