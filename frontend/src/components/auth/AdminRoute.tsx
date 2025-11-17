/**
 * FILE: frontend/src/components/auth/AdminRoute.tsx
 * PURPOSE: Route guard that restricts access to admin-only pages.
 *          Redirects non-admin users to admin login page.
 * INPUTS: Wrapped component (children), auth state (from store)
 * OUTPUTS: Renders children if admin, else redirects to /admin/login
 * NOTES:
 *   - Admin status: user.username === 'metrik'
 *   - Non-admin authenticated users redirected to /admin/login
 *   - Unauthenticated users also redirected to /admin/login
 * SECURITY:
 *   - Prevents access to admin pages without admin privileges
 *   - Backend must also enforce admin-only access (defense in depth)
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Props for AdminRoute component.
 * @field children - Component to render if admin
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute component.
 * Redirects to /admin/login if user is not an admin.
 * Admin status: user.username === 'metrik'
 *
 * USAGE:
 *   <Route path="/admin" element={
 *     <AdminRoute>
 *       <AdminPage />
 *     </AdminRoute>
 *   } />
 *
 * FLOW:
 *   1. Check if user is authenticated AND admin (username === 'metrik')
 *   2. If yes, render children
 *   3. If no, redirect to /admin/login
 *
 * WHY: Separates admin login from regular login (different UI, different validation).
 *
 * SECURITY:
 *   - Backend must also enforce admin-only access (this is just UX)
 *   - Admin status checked by both username and backend authorization
 *
 * @param children - Component to render if admin
 * @returns Children if admin, Navigate to /admin/login otherwise
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
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

  // If not authenticated OR not admin, redirect to admin login page
  // Store intended route in location state for post-login redirect
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated AND admin; render protected content
  return <>{children}</>;
};
