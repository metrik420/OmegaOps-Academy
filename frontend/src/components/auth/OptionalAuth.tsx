/**
 * FILE: frontend/src/components/auth/OptionalAuth.tsx
 * PURPOSE: Wrapper for pages with optional authentication.
 *          Shows extra features if user is logged in, but allows access for guests.
 * INPUTS: Wrapped component (children), auth state (from store)
 * OUTPUTS: Always renders children; passes auth state as props
 * NOTES:
 *   - Used for pages like home, roadmap, labs (available to all, enhanced for users)
 *   - Does NOT redirect; always allows access
 * SECURITY:
 *   - No security implications (always renders content)
 *   - Backend must enforce access control for protected resources
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Props for OptionalAuth component.
 * @field children - Render function receiving auth state
 */
interface OptionalAuthProps {
  children: (authState: {
    isAuthenticated: boolean;
    isAdmin: boolean;
    user: any;
  }) => React.ReactNode;
}

/**
 * OptionalAuth component.
 * Wraps pages with optional authentication (available to all, enhanced for logged-in users).
 *
 * USAGE:
 *   <Route path="/roadmap" element={
 *     <OptionalAuth>
 *       {({ isAuthenticated, user }) => (
 *         <RoadmapPage
 *           showProgress={isAuthenticated}
 *           user={user}
 *         />
 *       )}
 *     </OptionalAuth>
 *   } />
 *
 * FLOW:
 *   1. Get auth state from store
 *   2. Pass auth state to children render function
 *   3. Children decide what to show based on auth state
 *
 * WHY: Allows pages to adapt based on auth state without redirecting.
 *
 * @param children - Render function receiving auth state
 * @returns Rendered children with auth state
 */
export const OptionalAuth: React.FC<OptionalAuthProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, user } = useAuth();

  // Always render children; pass auth state for conditional rendering
  return <>{children({ isAuthenticated, isAdmin, user })}</>;
};
