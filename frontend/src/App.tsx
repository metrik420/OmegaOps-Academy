/**
 * FILE: src/App.tsx
 * PURPOSE: Main application component with router setup.
 *
 * ROUTING:
 * - All routes wrapped in Layout component
 * - Lazy loading for code splitting (optional, could be added)
 * - 404 fallback for unknown routes
 *
 * STATE:
 * - Theme initialization on mount
 * - Streak check on app load
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from '@/store';
import Layout from '@/components/Layout';

// Page imports
import Dashboard from '@/pages/Dashboard';
import Roadmap from '@/pages/Roadmap';
import Mission from '@/pages/Mission';
import Labs from '@/pages/Labs';
import Lab from '@/pages/Lab';
import Knowledge from '@/pages/Knowledge';
import KnowledgeTopic from '@/pages/KnowledgeTopic';
import Software from '@/pages/Software';
import SoftwareDetail from '@/pages/SoftwareDetail';
import Updates from '@/pages/Updates';
import Admin from '@/pages/Admin';
import Logbook from '@/pages/Logbook';
import NotFound from '@/pages/NotFound';

/**
 * Main App component.
 * Sets up routing and global state initialization.
 */
function App() {
  const { theme, setTheme, updateStreak } = useStore();

  /**
   * Initialize theme on mount.
   * Applies saved theme preference from localStorage.
   * Listens for system theme changes if using 'system' setting.
   */
  useEffect(() => {
    // Apply initial theme
    setTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, setTheme]);

  /**
   * Check and update streak on app load.
   * Determines if streak should continue or reset based on last activity.
   */
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Dashboard - Home page */}
          <Route path="/" element={<Dashboard />} />

          {/* Roadmap - 12-week overview */}
          <Route path="/roadmap" element={<Roadmap />} />

          {/* Mission detail - Dynamic route with week and day params */}
          <Route path="/missions/:week/:day" element={<Mission />} />

          {/* Labs index */}
          <Route path="/labs" element={<Labs />} />

          {/* Lab detail - Dynamic route with lab ID */}
          <Route path="/labs/:id" element={<Lab />} />

          {/* Knowledge base index */}
          <Route path="/knowledge" element={<Knowledge />} />

          {/* Knowledge topic detail */}
          <Route path="/knowledge/:topicId" element={<KnowledgeTopic />} />

          {/* Software Galaxy index */}
          <Route path="/software" element={<Software />} />

          {/* Software tool detail */}
          <Route path="/software/:id" element={<SoftwareDetail />} />

          {/* Updates/Changelog */}
          <Route path="/updates" element={<Updates />} />

          {/* Admin panel */}
          <Route path="/admin" element={<Admin />} />

          {/* Learning logbook */}
          <Route path="/logbook" element={<Logbook />} />

          {/* 404 fallback for unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
