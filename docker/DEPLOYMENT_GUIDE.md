# OmegaOps Academy - Production Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Backup & Restore](#backup--restore)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## Overview

**OmegaOps Academy** is deployed as a single Docker container running:
- **Frontend**: React SPA served by Nginx (port 80)
- **Backend**: Node.js Express API (port 3001)
- **Database**: SQLite (persistent volume)
- **Process Manager**: Supervisor (manages both Nginx and Node.js)

**Deployment Timeline**: ~10-15 minutes (first build), ~5 minutes (updates)

**System Requirements**:
- Docker 20.10+ and docker-compose 1.29+
- 2GB RAM minimum, 4GB recommended
- 10GB disk space
- Ubuntu 20.04+ or compatible Linux

---

## Prerequisites

### 1. Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 2. Create Docker Network for Nginx Proxy Manager

```bash
docker network create web
```

### 3. Configure SMTP Password

**IMPORTANT**: Update the SMTP password in `/home/metrik/docker/learn/docker/.env`:

```bash
cd /home/metrik/docker/learn/docker
nano .env
```

Replace:
```env
EMAIL_PASSWORD=REPLACE_WITH_YOUR_SMTP_PASSWORD_HERE
```

With your actual SMTP password for `noreply@learn.metrikcorp.com`.

**Security**: Ensure Postfix is configured to accept authenticated SMTP on port 587.

---

## Environment Setup

### Directory Structure

```
/home/metrik/docker/learn/
├── backend/              # Node.js Express API
│   ├── src/
│   ├── .env             # Backend environment variables (CONFIGURED)
│   └── package.json
├── frontend/            # React + Vite SPA
│   ├── src/
│   └── package.json
└── docker/              # Docker deployment files
    ├── Dockerfile.production       # Multi-stage build
    ├── docker-compose.production.yml
    ├── nginx.conf                  # Nginx config
    ├── supervisord.conf            # Process manager
    ├── .env                        # Docker secrets (CONFIGURE THIS!)
    ├── scripts/
    │   ├── full-rebuild.sh         # Main deployment script
    │   ├── backup.sh               # Backup script
    │   └── restore.sh              # Restore script
    ├── backups/                    # Backup storage
    └── logs/                       # Deployment logs
```

### Environment Variables

**Backend `.env` (/home/metrik/docker/learn/backend/.env)**:
- ✅ **CONFIGURED**: JWT secrets, admin credentials, database path

**Docker `.env` (/home/metrik/docker/learn/docker/.env)**:
- ⚠️ **ACTION REQUIRED**: Set `EMAIL_PASSWORD` to your SMTP password
- ✅ All other secrets configured (JWT, session, admin)

---

## Deployment Steps

### Step 1: Pre-Deployment Checklist

```bash
cd /home/metrik/docker/learn/docker

# 1. Verify .env file configured
grep -q "REPLACE_WITH" .env && echo "⚠️ WARNING: Update EMAIL_PASSWORD in .env" || echo "✅ .env configured"

# 2. Verify docker network exists
docker network inspect web >/dev/null 2>&1 && echo "✅ Network 'web' exists" || docker network create web

# 3. Test SMTP connection (optional)
telnet localhost 587
# Should connect to Postfix on port 587 (Ctrl+C to exit)
```

### Step 2: Test Deployment (Dry Run)

```bash
cd /home/metrik/docker/learn/docker/scripts

# Run dry-run to validate configuration
DRY_RUN=true ./full-rebuild.sh
```

**Expected Output**:
```
[INFO] ===== OmegaOps Academy Deployment =====
[INFO] Running preflight checks...
[SUCCESS] Preflight checks passed
[INFO] [DRY RUN] Would create backup...
[INFO] [DRY RUN] Would build image...
[SUCCESS] ===== Deployment completed successfully =====
```

### Step 3: Execute Deployment

```bash
cd /home/metrik/docker/learn/docker/scripts

# Execute actual deployment
./full-rebuild.sh
```

**Build Process** (~5-10 minutes first time):
1. Preflight checks (Docker, compose file, network)
2. Backup current data (if exists)
3. Build Docker image (frontend + backend)
4. Deploy stack with docker-compose
5. Wait for health checks (up to 60 seconds)
6. Run smoke tests

**Deployment Log**:
- Saved to: `/home/metrik/docker/learn/docker/logs/deploy-YYYYMMDD-HHMMSS.log`

### Step 4: Verify Deployment

```bash
# Check container status
docker ps | grep omegaops-academy

# View logs
docker logs -f omegaops-academy

# Check health
curl http://localhost/          # Frontend (should return HTML)
curl http://localhost:3001/health  # Backend health endpoint
```

---

## Post-Deployment Verification

### 1. Service Health Checks

```bash
# Container running and healthy
docker ps --filter "name=omegaops-academy" --format "{{.Status}}"
# Expected: "Up X minutes (healthy)"

# Frontend accessible
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK

# Backend health endpoint
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"2025-11-18T..."}

# API routes responding
curl http://localhost:3001/api/roadmap | jq
# Expected: JSON with 12-week roadmap
```

### 2. Database Verification

```bash
# Verify database file exists
docker exec omegaops-academy ls -lh /app/data/omegaops.db

# Check tables created
docker exec omegaops-academy sqlite3 /app/data/omegaops.db ".tables"
# Expected: admin_users, auth_logs, changelog, knowledge_topics, labs, missions, etc.

# Verify admin user exists
docker exec omegaops-academy sqlite3 /app/data/omegaops.db \
    "SELECT username, email FROM admin_users;"
# Expected: metrik|metrikcorp@gmail.com
```

### 3. Email Service Test

**Option A: Test via API (requires Postman or curl)**

```bash
# Register test user
curl -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email": "test@example.com",
        "username": "testuser",
        "password": "Test1234!",
        "acceptPrivacyPolicy": true
    }'
# Check logs for email sending:
docker logs omegaops-academy | grep -i "email"
```

**Option B: Check Postfix logs**

```bash
# Monitor mail log for email delivery
sudo tail -f /var/log/mail.log

# Look for:
# - "from=<noreply@learn.metrikcorp.com>"
# - "status=sent"
```

### 4. Frontend Access

**Local Test**:
```bash
curl -I http://localhost/
# Expected: HTTP/1.1 200 OK
```

**Browser Test**:
1. Open: `http://localhost/`
2. Should see OmegaOps Academy homepage
3. Click "Register" → verify form loads
4. Click "Login" → verify form loads

---

## Nginx Proxy Manager Integration

### Configure Public Access via NPM

1. **Access NPM UI**: `http://your-npm-server:81`

2. **Add Proxy Host**:
   - **Domain Names**: `learn.metrikcorp.com`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `omegaops-academy` (container name)
   - **Forward Port**: `80`
   - **Block Common Exploits**: ✅ ON
   - **Websockets Support**: ✅ ON

3. **SSL Configuration**:
   - **SSL Certificate**: Request new (Let's Encrypt)
   - **Force SSL**: ✅ ON
   - **HTTP/2 Support**: ✅ ON
   - **HSTS Enabled**: ✅ ON

4. **Advanced Configuration** (Optional):
   ```nginx
   # Rate limiting for auth endpoints
   limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

   location /api/auth/ {
       limit_req zone=auth_limit burst=3 nodelay;
       proxy_pass http://omegaops-academy:80;
   }
   ```

5. **Test Public Access**:
   ```bash
   curl -I https://learn.metrikcorp.com
   # Expected: HTTP/2 200 OK (via HTTPS)
   ```

---

## Backup & Restore

### Create Backup

```bash
cd /home/metrik/docker/learn/docker/scripts

# Create backup with rotation (keeps 14 most recent)
./backup.sh

# Custom retention (keep 30 backups)
KEEP_BACKUPS=30 ./backup.sh
```

**Backup Location**: `/home/metrik/docker/learn/docker/backups/`

**Backup Contents**:
- SQLite database (`omegaops.db`)
- Application logs
- Checksum file (`.sha256`)

**Backup Schedule** (cron):
```bash
# Daily backup at 2 AM
0 2 * * * /home/metrik/docker/learn/docker/scripts/backup.sh >> /var/log/omegaops-backup.log 2>&1
```

### Restore from Backup

```bash
cd /home/metrik/docker/learn/docker/scripts

# List available backups
ls -lth ../backups/

# Restore specific backup
./restore.sh --backup=omegaops-backup-20251118-120000.tar.gz
```

**Restore Process**:
1. Verifies backup integrity (checksum + tar test)
2. Stops running services
3. Removes existing volumes
4. Extracts backup to fresh volumes
5. Restarts services
6. Verifies services healthy

**⚠️ WARNING**: Restore REPLACES ALL current data!

---

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
docker logs -f omegaops-academy

# Last 100 lines
docker logs --tail 100 omegaops-academy

# Follow backend logs only
docker exec omegaops-academy tail -f /app/logs/app.log
```

### Resource Usage

```bash
# Container stats
docker stats omegaops-academy

# Disk usage
docker system df
docker volume ls
```

### Update Deployment

```bash
cd /home/metrik/docker/learn/docker/scripts

# Pull latest code (if using git)
cd /home/metrik/docker/learn
git pull origin main

# Rebuild and deploy
cd docker/scripts
./full-rebuild.sh
```

**Update Process**:
- Automatic backup before deployment
- Zero-downtime possible with blue-green deployment (future enhancement)
- Health checks before marking successful

---

## Troubleshooting

### Container Won't Start

**Check logs**:
```bash
docker logs omegaops-academy
```

**Common issues**:
1. **Port conflict** (3001 or 80 in use):
   ```bash
   sudo netstat -tuln | grep -E '(:80 |:3001 )'
   # Solution: Stop conflicting service or change port in docker-compose.production.yml
   ```

2. **Permission denied** (volumes):
   ```bash
   docker volume inspect omegaops-data
   # Solution: Recreate volume or fix permissions
   docker volume rm omegaops-data
   ./full-rebuild.sh
   ```

3. **Database locked**:
   ```bash
   # Check if another process is using database
   docker exec omegaops-academy fuser /app/data/omegaops.db
   # Solution: Restart container
   docker restart omegaops-academy
   ```

### Email Not Sending

**Check SMTP credentials**:
```bash
grep EMAIL_PASSWORD /home/metrik/docker/learn/docker/.env
# Ensure password is set (not placeholder)
```

**Test SMTP connectivity from container**:
```bash
docker exec -it omegaops-academy sh
nc -zv localhost 587
# Expected: Connection succeeded
```

**Check Postfix logs**:
```bash
sudo tail -f /var/log/mail.log
# Look for authentication failures or relay errors
```

### Frontend Not Loading

**Check Nginx status**:
```bash
docker exec omegaops-academy ps aux | grep nginx
# Should see nginx processes running
```

**Check Nginx logs**:
```bash
docker exec omegaops-academy cat /var/log/nginx/error.log
```

**Rebuild frontend**:
```bash
cd /home/metrik/docker/learn/frontend
npm run build
cd /home/metrik/docker/learn/docker/scripts
./full-rebuild.sh
```

### API Returning 502 Bad Gateway

**Check backend is running**:
```bash
docker exec omegaops-academy ps aux | grep node
# Should see: node /app/backend/dist/app.js
```

**Check backend logs**:
```bash
docker logs omegaops-academy | grep -i error
```

**Test backend directly**:
```bash
docker exec omegaops-academy curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

### Database Migration Failed

**Check migration logs**:
```bash
docker logs omegaops-academy | grep -i migration
```

**Reset database** (⚠️ DELETES ALL DATA):
```bash
docker-compose -f /home/metrik/docker/learn/docker/docker-compose.production.yml down
docker volume rm omegaops-data
./full-rebuild.sh
```

---

## Rollback Procedures

### Option 1: Rollback to Previous Backup

```bash
cd /home/metrik/docker/learn/docker/scripts

# List backups (sorted by date, newest first)
ls -lt ../backups/ | head -5

# Restore previous backup
./restore.sh --backup=omegaops-backup-YYYYMMDD-HHMMSS.tar.gz
```

### Option 2: Rollback to Previous Code Version (Git)

```bash
# If deployment was git commit
cd /home/metrik/docker/learn
git log --oneline | head -5

# Revert to previous commit
git revert <commit-hash>

# Rebuild
cd docker/scripts
./full-rebuild.sh
```

### Option 3: Emergency Stop

```bash
cd /home/metrik/docker/learn/docker

# Stop services immediately
docker-compose -f docker-compose.production.yml down

# Restore from backup
cd scripts
./restore.sh --backup=<last-known-good-backup>
```

---

## Security Checklist

- ✅ JWT secrets are cryptographically random (32 bytes)
- ✅ Admin password set (change from default `Cooldog420` after first login!)
- ✅ SMTP password configured (not placeholder)
- ✅ `.env` files not committed to git (`.gitignore` configured)
- ✅ HTTPS enforced via NPM (Let's Encrypt certificate)
- ✅ Rate limiting configured (5 auth requests/15min)
- ✅ CORS restricted to trusted origins
- ✅ Container runs as non-root user (omegaops:omegaops)
- ✅ Security headers configured (Helmet + Nginx)

---

## Maintenance Schedule

| Task | Frequency | Command |
|------|-----------|---------|
| Database backup | Daily (2 AM) | `./backup.sh` |
| Log rotation | Weekly | `docker logs --since 7d > archive.log` |
| Update dependencies | Monthly | `npm update` + rebuild |
| Security patches | As needed | `apt update && apt upgrade` |
| Test restore | Monthly | `./restore.sh --backup=...` (staging) |
| Review auth logs | Weekly | `docker exec omegaops-academy sqlite3 /app/data/omegaops.db "SELECT * FROM auth_logs WHERE success=0;"` |

---

## Support & Contact

**Documentation**:
- Project README: `/home/metrik/docker/learn/README.md`
- CLAUDE.md: `/home/metrik/docker/learn/CLAUDE.md`

**Logs**:
- Deployment logs: `/home/metrik/docker/learn/docker/logs/`
- Application logs: `docker logs omegaops-academy`

**Emergency Contacts**:
- Admin: metrik (`metrikcorp@gmail.com`)

---

## Quick Reference

### Essential Commands

```bash
# Deploy/update
cd /home/metrik/docker/learn/docker/scripts && ./full-rebuild.sh

# View logs
docker logs -f omegaops-academy

# Restart
docker restart omegaops-academy

# Stop
docker-compose -f /home/metrik/docker/learn/docker/docker-compose.production.yml down

# Backup
cd /home/metrik/docker/learn/docker/scripts && ./backup.sh

# Restore
cd /home/metrik/docker/learn/docker/scripts && ./restore.sh --backup=FILE
```

### File Paths

| Component | Path |
|-----------|------|
| Docker compose | `/home/metrik/docker/learn/docker/docker-compose.production.yml` |
| Deployment script | `/home/metrik/docker/learn/docker/scripts/full-rebuild.sh` |
| Environment secrets | `/home/metrik/docker/learn/docker/.env` |
| Backups | `/home/metrik/docker/learn/docker/backups/` |
| Logs | `/home/metrik/docker/learn/docker/logs/` |
| Database | `Docker volume: omegaops-data:/app/data/omegaops.db` |

---

**Last Updated**: 2025-11-18
**Version**: 1.0.0
**Status**: Production-Ready (Staging)
