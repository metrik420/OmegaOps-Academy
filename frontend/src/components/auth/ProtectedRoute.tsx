/**
 * FILE: frontend/src/components/auth/ProtectedRoute.tsx
 * PURPOSE: Route guard that redirects unauthenticated users to login page.
 *          Preserves intended destination for post-login redirect.
 * INPUTS: Wrapped component (children), auth state (from store)
 * OUTPUTS: Renders children if authenticated, else redirects to /login
 * NOTES:
 *   - Stores intended route in location state for post-login redirect
 *   - Shows loading spinner while checking auth state
 * SECURITY:
 *   - Prevents access to protected pages without authentication
 *   - No sensitive data exposed in redirect
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Props for ProtectedRoute component.
 * @field children - Component to render if authenticated
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component.
 * Redirects to /login if user is not authenticated.
 * Preserves intended route for post-login redirect.
 *
 * USAGE:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute>
 *       <DashboardPage />
 *     </ProtectedRoute>
 *   } />
 *
 * FLOW:
 *   1. Check if user is authenticated (from auth store)
 *   2. If yes, render children
 *   3. If no, redirect to /login with intended route in state
 *   4. After login, user is redirected to intended route
 *
 * WHY: Centralized route protection prevents code duplication in every protected page.
 *
 * @param children - Component to render if authenticated
 * @returns Children if authenticated, Navigate to /login otherwise
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is initializing
  // WHY: Prevents flash of login page before auth state is loaded from localStorage
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  // Store intended route in location state for post-login redirect
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated; render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
