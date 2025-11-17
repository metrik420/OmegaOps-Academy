/**
 * FILE: vite.config.ts
 * PURPOSE: Vite bundler configuration for OmegaOps Academy frontend.
 *
 * CONFIGURATION:
 * - React plugin for JSX transformation and Fast Refresh
 * - API proxy to backend on port 3001 (avoids CORS issues in development)
 * - Path aliases matching tsconfig.json for clean imports
 * - Production build optimizations: code splitting, minification
 *
 * SECURITY NOTES:
 * - Proxy only active in development mode
 * - No sensitive data exposed in client bundle
 * - Source maps disabled in production by default
 */
declare const _default: import("vite").UserConfig;
export default _default;
