/**
 * FILE: src/main.tsx
 * PURPOSE: Vite entry point - bootstraps React application.
 *
 * INITIALIZATION:
 * - Imports global styles
 * - Mounts React app to DOM
 * - StrictMode enabled for development checks
 *
 * PERFORMANCE:
 * - Minimal entry point for fast initial load
 * - Global CSS loaded first to prevent FOUC
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/global.css';

/**
 * Root element validation.
 * Ensures root element exists before mounting.
 * Throws clear error if missing (development aid).
 */
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Root element not found. Ensure index.html contains <div id="root"></div>.'
  );
}

/**
 * Create React root and render application.
 * Wrapped in StrictMode for development checks.
 * Wrapped in AuthProvider to enable authentication context globally.
 *
 * StrictMode enables additional development warnings:
 * - Identifies unsafe lifecycles
 * - Warns about legacy API usage
 * - Detects unexpected side effects
 * - Ensures reusable state
 *
 * AuthProvider initializes:
 * - Auth state from localStorage
 * - Token refresh logic (checks every 5 minutes)
 * - Global 401/403 error handling
 * - Custom hooks for all auth operations
 */
createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

/**
 * Optional: Performance monitoring placeholder.
 * In production, could integrate with analytics service.
 *
 * Example:
 * if (import.meta.env.PROD) {
 *   reportWebVitals(console.log);
 * }
 */
