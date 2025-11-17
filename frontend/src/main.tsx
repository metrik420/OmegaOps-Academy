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
 * StrictMode enables additional development warnings:
 * - Identifies unsafe lifecycles
 * - Warns about legacy API usage
 * - Detects unexpected side effects
 * - Ensures reusable state
 */
createRoot(rootElement).render(
  <StrictMode>
    <App />
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
