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
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
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

// Auth page imports
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';

// Route guard components
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminRoute } from '@/components/auth/AdminRoute';

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
      <Routes>
        {/* ============================= */}
        {/* AUTHENTICATION ROUTES (No Layout) */}
        {/* ============================= */}

        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

        {/* Admin-specific login */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ============================= */}
        {/* APPLICATION ROUTES (With Layout) */}
        {/* ============================= */}

        <Route element={<Layout><Outlet /></Layout>}>
          {/* Public routes - accessible to all users */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/missions/:week/:day" element={<Mission />} />
          <Route path="/labs" element={<Labs />} />
          <Route path="/labs/:id" element={<Lab />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/knowledge/:topicId" element={<KnowledgeTopic />} />
          <Route path="/software" element={<Software />} />
          <Route path="/software/:id" element={<SoftwareDetail />} />
          <Route path="/updates" element={<Updates />} />
          <Route path="/logbook" element={<Logbook />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes - require admin authentication (username === 'metrik') */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* 404 fallback for unknown routes */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
