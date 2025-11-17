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

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],

  /**
   * Path aliases for cleaner imports throughout the codebase.
   * Must match paths defined in tsconfig.json.
   */
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@styles': path.resolve(__dirname, 'src/styles'),
    },
  },

  /**
   * Development server configuration.
   * Proxy routes /api requests to backend server to avoid CORS.
   */
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        /**
         * Rewrite not needed if backend expects /api prefix.
         * If backend serves at root, uncomment:
         * rewrite: (path) => path.replace(/^\/api/, ''),
         */
      },
    },
  },

  /**
   * Production build configuration.
   * Code splitting by route for optimal loading performance.
   */
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps in production for security
    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting for better caching:
         * - vendor: React, React DOM (rarely changes)
         * - router: React Router (moderate change frequency)
         * - state: Zustand (state management)
         * - icons: Lucide icons (large, rarely changes)
         */
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          state: ['zustand'],
          icons: ['lucide-react'],
          http: ['axios'],
        },
      },
    },
    /**
     * Performance budgets:
     * - Warn if chunk exceeds 500KB (gzipped will be much smaller)
     * - Target: < 100KB gzipped for initial bundle
     */
    chunkSizeWarningLimit: 500,
  },

  /**
   * CSS configuration.
   * Using CSS Modules for component-scoped styles.
   */
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
});
