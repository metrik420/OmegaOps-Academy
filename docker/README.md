# OmegaOps Academy - Docker Deployment Guide

This directory contains the Docker infrastructure for deploying OmegaOps Academy as a production-ready containerized application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Build Process](#detailed-build-process)
- [Configuration](#configuration)
- [Deployment with Nginx Proxy Manager](#deployment-with-nginx-proxy-manager)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Advanced Topics](#advanced-topics)

---

## Overview

OmegaOps Academy uses a **multi-stage Docker build** to create a lightweight, secure production image. The final image contains only:

- Nginx web server (~30MB)
- Compiled React frontend (~5-15MB)
- Health check utilities

**Total image size: ~30-50MB** (compared to ~800MB+ with a full Node.js image)

### Key Benefits

1. **Small Attack Surface**: No Node.js runtime, npm, or source code in production
2. **Fast Deployments**: Smaller images mean faster pulls and startups
3. **Reproducible Builds**: `npm ci` ensures exact dependency versions
4. **High Performance**: Nginx serves static files efficiently
5. **Easy Scaling**: Stateless frontend can be replicated

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Deployment                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────────┐                  │
│  │   Internet  │      │  Nginx Proxy     │                  │
│  │   Traffic   │─────▶│  Manager (NPM)   │                  │
│  │   (HTTPS)   │      │  - SSL/TLS       │                  │
│  └─────────────┘      │  - Rate Limiting │                  │
│                       │  - Security      │                  │
│                       └────────┬─────────┘                  │
│                                │                            │
│                                │ port 80 (internal)         │
│                                ▼                            │
│                       ┌──────────────────┐                  │
│                       │  omegaops-academy│                  │
│                       │  (Nginx + React) │                  │
│                       │  - Static Files  │                  │
│                       │  - SPA Routing   │                  │
│                       │  - /api Proxy    │                  │
│                       └────────┬─────────┘                  │
│                                │                            │
│                                │ (Phase 2: /api proxy)     │
│                                ▼                            │
│                       ┌──────────────────┐                  │
│                       │  Backend Service │                  │
│                       │  (Node.js/Express)│                 │
│                       │  - REST API      │                  │
│                       │  - Database      │                  │
│                       └──────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

1. **Docker Engine** (v20.10+)
   ```bash
   # Check version
   docker --version

   # Install on Ubuntu/Debian
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. **Docker Compose** (v2.0+)
   ```bash
   # Check version (should be included with Docker)
   docker compose version
   ```

3. **curl** (for health checks)
   ```bash
   # Usually pre-installed, or:
   sudo apt install curl
   ```

### Optional (for Production)

- **Nginx Proxy Manager**: For TLS termination and routing
- **Domain Name**: Pointed to your server
- **Git**: For version control

### System Requirements

- **CPU**: 1+ cores (2+ recommended)
- **RAM**: 512MB minimum, 1GB+ recommended
- **Disk**: 2GB+ for images and build cache
- **Network**: Outbound access for npm registry

---

## Quick Start

### Option 1: Using the Helper Script (Recommended)

```bash
# From project root
./docker/scripts/start.sh

# Preview what will happen (dry-run)
./docker/scripts/start.sh --dry-run

# Skip build (use existing image)
./docker/scripts/start.sh --no-build

# Verbose output for debugging
./docker/scripts/start.sh --verbose
```

### Option 2: Manual Commands

```bash
# 1. Create the web network (if using NPM)
docker network create web

# 2. Build the Docker image
docker build -f docker/Dockerfile -t omegaops-academy:latest .

# 3. Start the container
docker compose -f docker/docker-compose.yml up -d

# 4. Verify it's running
docker ps | grep omegaops-academy

# 5. Check health status
docker inspect --format='{{.State.Health.Status}}' omegaops-academy

# 6. View logs
docker logs -f omegaops-academy
```

### Option 3: Local Testing (Without NPM)

If you want to test locally without Nginx Proxy Manager:

1. Edit `docker/docker-compose.yml`
2. Uncomment the `ports` section:
   ```yaml
   ports:
     - "8080:80"
   ```
3. Comment out the `networks` section
4. Run:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   curl http://localhost:8080/health  # Should return "OK"
   ```

---

## Detailed Build Process

### Understanding the Multi-Stage Build

The `Dockerfile` uses two stages:

**Stage 1: Builder**
```
Base: node:20-alpine
Purpose: Compile TypeScript and bundle assets
Contents: Node.js, npm, source code, node_modules
Size: ~800MB
```

**Stage 2: Runtime**
```
Base: nginx:alpine
Purpose: Serve static files
Contents: Nginx, compiled frontend, curl
Size: ~30-50MB
```

### Build Commands

```bash
# Standard build
docker build -f docker/Dockerfile -t omegaops-academy:latest .

# Build with no cache (force fresh build)
docker build --no-cache -f docker/Dockerfile -t omegaops-academy:latest .

# Build for specific platform (e.g., on Mac for Linux server)
docker build --platform linux/amd64 -f docker/Dockerfile -t omegaops-academy:latest .

# Build with custom tag
docker build -f docker/Dockerfile -t omegaops-academy:v1.0.0 .

# View build stages
docker build -f docker/Dockerfile --target builder -t omegaops-academy:builder .
docker images omegaops-academy:builder  # See builder size
```

### Build Time Expectations

| Step | First Build | Incremental (source change) | Incremental (no change) |
|------|-------------|-----------------------------|-----------------------|
| Pull base image | 30-60s | 0s (cached) | 0s (cached) |
| Install dependencies | 2-5 min | 0s (cached) | 0s (cached) |
| Build frontend | 30-60s | 30-60s | 0s (cached) |
| Build backend | 10-20s | 10-20s | 0s (cached) |
| Copy to runtime | 5-10s | 5-10s | 5-10s |
| **Total** | **3-7 min** | **1-2 min** | **~10s** |

---

## Configuration

### Environment Variables

Copy the example file:
```bash
cp docker/.env.example docker/.env
```

Key variables:
```bash
NODE_ENV=production          # Application mode
TZ=UTC                       # Container timezone
```

### Nginx Configuration

The `nginx.conf` file controls:

- **Static file serving**: /usr/share/nginx/html
- **SPA routing**: All non-file requests serve index.html
- **API proxy**: /api/* requests proxy to backend:3001
- **Security headers**: CSP, HSTS, X-Frame-Options
- **Compression**: Gzip for text-based files
- **Caching**: 1-year cache for static assets

To modify:
1. Edit `docker/nginx.conf`
2. Rebuild image or mount as volume for development

### Docker Compose Configuration

Modify `docker/docker-compose.yml` for:

- **Resource limits**: CPU and memory constraints
- **Logging**: Log rotation and drivers
- **Networking**: Bridge, host, or overlay networks
- **Volumes**: Persistent storage mounts
- **Health checks**: Timing and thresholds

---

## Deployment with Nginx Proxy Manager

### Step 1: Ensure NPM is Running

Nginx Proxy Manager should be running on your host and have created the `web` network.

```bash
# Check if network exists
docker network ls | grep web

# If not, create it
docker network create web
```

### Step 2: Deploy OmegaOps Academy

```bash
./docker/scripts/start.sh
```

### Step 3: Configure NPM Routing

1. Open NPM web interface (typically http://your-server-ip:81)
2. Login (default: admin@example.com / changeme)
3. Go to "Proxy Hosts" → "Add Proxy Host"

**Details Tab:**
- Domain Names: `learn.metrikcorp.com` (your domain)
- Scheme: `http`
- Forward Hostname/IP: `omegaops-academy` (container name)
- Forward Port: `80`
- Cache Assets: ✅
- Block Common Exploits: ✅
- Websockets Support: ✅

**SSL Tab:**
- SSL Certificate: Request new or select existing
- Force SSL: ✅
- HTTP/2 Support: ✅
- HSTS Enabled: ✅

**Advanced Tab (Optional):**
```nginx
# Custom Nginx directives (add security headers)
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
```

4. Click "Save"

### Step 4: Verify

```bash
# Check routing
curl -I https://learn.metrikcorp.com

# Expected response includes:
# HTTP/2 200
# strict-transport-security: max-age=...
# x-frame-options: DENY
```

---

## Monitoring and Maintenance

### Health Checks

The container includes a health check endpoint:

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' omegaops-academy

# Possible values: starting, healthy, unhealthy

# View health check logs
docker inspect --format='{{json .State.Health.Log}}' omegaops-academy | jq
```

### Viewing Logs

```bash
# Stream all logs
docker logs -f omegaops-academy

# Last 100 lines
docker logs --tail 100 omegaops-academy

# Logs with timestamps
docker logs --timestamps omegaops-academy

# Filter for errors
docker logs omegaops-academy 2>&1 | grep -i error
```

### Resource Monitoring

```bash
# Real-time stats
docker stats omegaops-academy

# One-time snapshot
docker stats --no-stream omegaops-academy
```

### Container Management

```bash
# Stop container
docker compose -f docker/docker-compose.yml stop

# Start container
docker compose -f docker/docker-compose.yml start

# Restart container
docker compose -f docker/docker-compose.yml restart

# Remove container (keeps image)
docker compose -f docker/docker-compose.yml down

# Remove container and volumes
docker compose -f docker/docker-compose.yml down -v

# Rebuild and restart
docker compose -f docker/docker-compose.yml up -d --build
```

### Updating the Application

```bash
# 1. Pull latest source code
git pull origin main

# 2. Rebuild image
docker build -f docker/Dockerfile -t omegaops-academy:latest .

# 3. Replace running container
docker compose -f docker/docker-compose.yml up -d

# Or use the helper script
./docker/scripts/start.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Build Fails: "npm ci" Error

```
npm ERR! code ERESOLVE
npm ERR! peer dependency conflict
```

**Solution:**
```bash
# Option 1: Update package-lock.json
cd frontend
npm install
cd ..
docker build -f docker/Dockerfile -t omegaops-academy:latest .

# Option 2: Use legacy peer deps
# Add to Dockerfile RUN command: npm ci --legacy-peer-deps
```

#### 2. Container Unhealthy

```bash
# Check health logs
docker inspect omegaops-academy | jq '.[0].State.Health'

# View container logs
docker logs --tail 50 omegaops-academy

# Common causes:
# - Nginx config syntax error
# - Missing files in /usr/share/nginx/html
# - Port already in use
```

#### 3. Cannot Connect to Container

```bash
# If using NPM:
# - Ensure container is on 'web' network
docker network inspect web | jq '.[0].Containers'

# If exposing ports directly:
# - Check no port conflicts
sudo netstat -tuln | grep 8080

# - Check firewall
sudo ufw status
```

#### 4. 502 Bad Gateway on /api Routes

```
nginx: upstream "backend_api" not found
```

**Solution:**
- Backend service is not running
- For MVP, backend runs separately (not in container)
- For Phase 2, add backend service to docker-compose.yml

#### 5. Image Size Too Large

```bash
# Check image layers
docker history omegaops-academy:latest

# Ensure .dockerignore excludes:
# - node_modules/
# - dist/
# - .git/
# - *.log
```

### Debug Commands

```bash
# Enter container shell
docker exec -it omegaops-academy sh

# Inside container:
nginx -t                        # Test nginx config
ls -la /usr/share/nginx/html/   # Verify files
cat /etc/nginx/nginx.conf       # View config
curl localhost/health           # Test health endpoint

# Outside container:
docker compose -f docker/docker-compose.yml logs  # Compose logs
docker events --filter container=omegaops-academy  # Docker events
```

---

## Security Considerations

### Current Security Measures

1. **Multi-stage build**: No source code in final image
2. **Alpine Linux**: Minimal base image (smaller attack surface)
3. **Non-root user**: Nginx workers run as unprivileged user
4. **Security headers**: CSP, HSTS, X-Frame-Options, etc.
5. **No exposed ports**: Traffic routed through NPM
6. **Read-only artifacts**: Static files don't change at runtime

### Recommendations for Production

1. **Scan images for vulnerabilities**:
   ```bash
   docker scan omegaops-academy:latest
   # Or use Trivy:
   trivy image omegaops-academy:latest
   ```

2. **Pin base image versions**:
   ```dockerfile
   # Instead of:
   FROM nginx:alpine
   # Use:
   FROM nginx:1.25.3-alpine3.18
   ```

3. **Remove shell access** (extreme):
   ```dockerfile
   RUN rm -rf /bin/sh /bin/bash
   ```

4. **Use Docker Content Trust**:
   ```bash
   export DOCKER_CONTENT_TRUST=1
   docker build ...
   ```

5. **Rotate secrets regularly** (for Phase 2 with backend)

6. **Enable audit logging** in Docker daemon

---

## Advanced Topics

### Building for Multiple Architectures

```bash
# Set up buildx
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f docker/Dockerfile \
  -t omegaops-academy:latest \
  --push .
```

### CI/CD Integration (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -f docker/Dockerfile -t omegaops-academy:${{ github.sha }} .

      - name: Push to registry
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker tag omegaops-academy:${{ github.sha }} ghcr.io/${{ github.repository }}:${{ github.sha }}
          docker push ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /home/metrik/docker/learn
            git pull
            docker compose -f docker/docker-compose.yml up -d --build
```

### Adding Backend Service (Phase 2)

Update `docker/docker-compose.yml`:

```yaml
services:
  omegaops-academy:
    # ... existing frontend config ...
    depends_on:
      backend:
        condition: service_healthy

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile.backend  # Create this
    container_name: omegaops-backend
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/omegaops.db
    volumes:
      - backend_data:/app/data
    networks:
      - web
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  backend_data:
    driver: local
```

### Backup Strategy

```bash
# Create backup script (docker/scripts/backup.sh)
#!/bin/bash
BACKUP_DIR="/backups/omegaops"
DATE=$(date +%Y%m%d-%H%M%S)

# Backup volumes (if any)
docker run --rm \
  -v backend_data:/data \
  -v ${BACKUP_DIR}:/backup \
  alpine tar czf /backup/backend-${DATE}.tar.gz /data

# Keep last 30 backups
ls -tp ${BACKUP_DIR}/*.tar.gz | tail -n +31 | xargs -I {} rm -- {}
```

---

## File Structure

```
docker/
├── Dockerfile              # Multi-stage build configuration
├── docker-compose.yml      # Container orchestration
├── nginx.conf              # Nginx web server configuration
├── .env.example            # Environment variables template
├── README.md               # This documentation
└── scripts/
    └── start.sh            # Deployment helper script
```

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker logs omegaops-academy`
3. Verify configuration files for syntax errors
4. Ensure all prerequisites are met

---

## License

OmegaOps Academy is proprietary software. Docker infrastructure is provided for deployment purposes only.
