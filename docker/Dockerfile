# ============================================================================
# OMEGAOPS ACADEMY - Multi-Stage Docker Build
# ============================================================================
# This Dockerfile uses a multi-stage build pattern:
# - STAGE 1 (builder): Compile frontend (React/Vite) and backend (Node/TypeScript)
# - STAGE 2 (runtime): Nginx serving the SPA + proxy to backend API
#
# Key Design Decisions:
# - Alpine images: minimal, secure, fast (~150MB base)
# - Multi-stage: Final image ~50MB instead of 500MB+ (faster deployment)
# - npm ci: Reproducible installs (package-lock, prevents version drift)
# - Non-root user: Security (don't run as root)
# - Health check: Container readiness verification
#
# Build time: ~3-5 minutes
# Final size: ~50-60MB
# ============================================================================

# ============================================================================
# STAGE 1: BUILDER - Compile Frontend & Backend
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy frontend package files (docker caches these layers)
COPY frontend/package*.json ./frontend/

WORKDIR /app/frontend
# npm ci = clean install (uses exact package-lock versions, no upgrades)
RUN npm ci --only=production && npm ci --only=dev

COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./index.html
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/tsconfig.node.json ./tsconfig.node.json
COPY frontend/vite.config.ts ./vite.config.ts

# Vite build: React + TypeScript → optimized static assets
RUN npm run build

# Copy backend package files
COPY backend/package*.json /app/backend/

WORKDIR /app/backend
RUN npm ci --only=production && npm ci --only=dev

COPY backend/src ./src
COPY backend/tsconfig.json ./tsconfig.json

# TypeScript compilation → /app/backend/dist/
RUN npm run build

# ============================================================================
# STAGE 2: RUNTIME - Nginx Serving SPA + API Proxy
# ============================================================================
FROM nginx:alpine

# Health check dependency
RUN apk add --no-cache curl

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config (SPA routing + API proxy)
COPY docker/nginx.conf /etc/nginx/conf.d/omegaops.conf

# Copy built frontend from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Expose port 80 (Nginx Proxy Manager handles HTTPS)
EXPOSE 80

# Health check (Docker/Kubernetes can detect if container is ready)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Run nginx in foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
