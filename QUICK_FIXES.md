# OmegaOps Academy - Quick Fixes Guide

## Fix #1: Use Correct Dockerfile (5 minutes)

**File:** `docker/docker-compose.production.yml`  
**Line:** 33

**Change:**
```yaml
build:
  context: ..  # Project root
  dockerfile: docker/Dockerfile  # ❌ WRONG - Frontend only!
```

**To:**
```yaml
build:
  context: ..  # Project root
  dockerfile: docker/Dockerfile.production  # ✓ CORRECT - Frontend + Backend
```

**Why:** The standard Dockerfile only includes Nginx (frontend). The production Dockerfile includes both Nginx and Node.js backend with supervisor, which is what's needed.

---

## Fix #2: Fix Database Path (2 minutes)

**File:** `backend/.env`  
**Line:** 19

**Change:**
```env
DATABASE_PATH=./data/omegaops.db  # ❌ Relative path doesn't work in Docker
```

**To:**
```env
DATABASE_PATH=/app/data/omegaops.db  # ✓ Absolute path
```

**Why:** Relative paths don't work consistently in Docker containers. Use absolute paths that match the volume mount.

---

## Fix #3: Fix Health Check (2 minutes)

**File:** `docker/docker-compose.production.yml`  
**Line:** 139

**Change:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/", "&&", "curl", "-f", "http://localhost:3001/health"]
  # ❌ Invalid: "&&" can't be used in array form
```

**To:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost/ && curl -f http://localhost:3001/health || exit 1"]
  # ✓ CORRECT: Using CMD-SHELL for shell commands
```

**Why:** The array form of healthcheck can't use `&&`. Must use `CMD-SHELL` to execute shell commands.

---

## Fix #4: Rotate Secrets (30 minutes)

**Files:**
- `docker/.env`
- `backend/.env`
- `docker-compose.production.yml`

**Generate New Secrets:**

```bash
# Generate new JWT_SECRET
JWT_SECRET=$(openssl rand -base64 32)
echo "New JWT_SECRET: $JWT_SECRET"

# Generate new admin password
ADMIN_PASSWORD=$(openssl rand -base64 20 | head -c 20)
echo "New ADMIN_PASSWORD: $ADMIN_PASSWORD"

# Generate new email password
EMAIL_PASSWORD=$(openssl rand -base64 20)
echo "New EMAIL_PASSWORD: $EMAIL_PASSWORD"
```

**Update Files:**

**docker/.env:**
```env
JWT_SECRET=<new-jwt-secret>
ADMIN_PASSWORD=<new-password>
EMAIL_PASSWORD=<new-email-password>
```

**backend/.env:**
```env
JWT_SECRET=<same-new-jwt-secret>
ADMIN_PASSWORD=<same-new-password>
EMAIL_PASSWORD=<same-new-email-password>
```

**Remove from Git History:**

```bash
# WARNING: This rewrites Git history!
# Make sure you have a backup first

# Option 1: Using git-filter-repo (recommended)
git filter-repo --replace-text <(echo 'JWT_SECRET=.*
ADMIN_PASSWORD=.*
EMAIL_PASSWORD=.*
')

# Option 2: Using git-filter-branch (older)
git filter-branch --force --index-filter \
  'git rm --cached -r .' \
  --prune-empty --tag-name-filter cat -- --all
```

---

## Fix #5: Test After Fixes

```bash
# Stop current container
docker stop live-test

# Navigate to project
cd /home/metrik/docker/learn

# Rebuild with correct Dockerfile
docker-compose -f docker/docker-compose.production.yml build --no-cache

# Start with new configuration
docker-compose -f docker/docker-compose.production.yml up -d

# Wait for container to start
sleep 10

# Test frontend (should return HTML)
curl -I http://localhost/

# Test backend health (should return JSON)
curl -s http://localhost/health | jq .

# Test API endpoint (should return JSON, not 502!)
curl -s http://localhost/api/missions | jq .

# View logs
docker-compose -f docker/docker-compose.production.yml logs -f
```

**Expected Results:**

```bash
# Frontend: HTTP 200 HTML
$ curl -I http://localhost/
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

# Backend health: HTTP 200 JSON
$ curl http://localhost/health
{"success":true,"data":{"status":"healthy",...}}

# API endpoint: HTTP 200 JSON (NOT 502!)
$ curl http://localhost/api/missions
{"success":true,"data":[...missions...]}
```

---

## Fix #6: Fix Environment Variables in Supervisor (Optional but Recommended)

**File:** `docker/supervisord.conf`  
**Lines:** 19-29

**Current (Hardcoded):**
```ini
[program:backend]
command=node /app/backend/dist/app.js
directory=/app/backend
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
startretries=3
priority=2
environment=NODE_ENV="production",PORT="3001"
```

**Better (Use Entrypoint Script):**

Create `docker/entrypoint.sh`:
```bash
#!/bin/sh
set -e

# Load environment from .env if it exists
if [ -f /app/backend/.env ]; then
  export $(cat /app/backend/.env | grep -v '^#' | xargs)
fi

# Run database migrations
echo "Running database migrations..."
cd /app/backend
npm run db:migrate || echo "No migrations to run"

# Start supervisor
echo "Starting services..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
```

Update `Dockerfile.production` line 125:
```dockerfile
# OLD
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

# NEW
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]
```

---

## Fix #7: Fix Nginx Config for Better Error Messages (Optional)

**File:** `docker/nginx.conf`  
**After line 78:**

Add custom error page for 502:
```nginx
# Custom error pages with better messages
location = /50x.html {
  default_type text/html;
  return 500 '
    <!DOCTYPE html>
    <html>
    <head>
      <title>Service Unavailable</title>
      <style>
        body { font-family: Arial; text-align: center; padding: 50px; }
        h1 { color: #e74c3c; }
        p { color: #7f8c8d; }
      </style>
    </head>
    <body>
      <h1>Service Unavailable</h1>
      <p>The backend service is not responding.</p>
      <p>Please try again in a few moments.</p>
    </body>
    </html>
  ';
}
```

---

## Fix #8: Add Resource Limits (Recommended)

**File:** `docker/docker-compose.yml`

Add before `environment:` section:
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 256M
```

---

## Fix #9: Fix CORS for Production (When Ready)

**File:** `docker/docker-compose.production.yml`  
**Environment section, find CORS_ALLOWED_ORIGINS:**

**For Development (localhost):**
```yaml
CORS_ALLOWED_ORIGINS: http://localhost:3000,http://localhost:5173,http://localhost:80
```

**For Production (learn.metrikcorp.com):**
```yaml
CORS_ALLOWED_ORIGINS: https://learn.metrikcorp.com,https://www.learn.metrikcorp.com
```

Also update `backend/.env`:
```env
CORS_ALLOWED_ORIGINS=https://learn.metrikcorp.com,https://www.learn.metrikcorp.com
FRONTEND_URL=https://learn.metrikcorp.com
```

---

## Fix #10: Add Database Backup Script (Recommended)

Create `docker/scripts/backup.sh`:
```bash
#!/bin/bash
set -e

BACKUP_DIR="/app/backups"
DB_PATH="/app/data/omegaops.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/omegaops_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "Backup created: $BACKUP_FILE"
  
  # Keep only last 7 days of backups
  find "$BACKUP_DIR" -name "omegaops_*.db" -mtime +7 -delete
else
  echo "Database file not found: $DB_PATH"
  exit 1
fi
```

Make executable:
```bash
chmod +x docker/scripts/backup.sh
```

Update `docker/docker-compose.production.yml` volumes:
```yaml
volumes:
  - omegaops-data:/app/data
  - omegaops-logs:/app/logs
  - omegaops-backups:/app/backups  # Add this
```

Add volume definition at bottom:
```yaml
volumes:
  omegaops-data:
    driver: local
  omegaops-logs:
    driver: local
  omegaops-backups:  # Add this
    driver: local
```

Set up cron job:
```bash
# Run backup every day at 2 AM
0 2 * * * docker exec omegaops-academy /app/scripts/backup.sh >> /var/log/omegaops-backup.log 2>&1
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] Docker build completes without errors
- [ ] Container starts and stays running
- [ ] Frontend loads at `http://localhost/`
- [ ] Backend health check passes at `http://localhost/health`
- [ ] API endpoint returns data (not 502): `http://localhost/api/missions`
- [ ] Health check in docker-compose returns healthy status
- [ ] Logs show no errors: `docker logs <container>`
- [ ] Database file created at `/app/data/omegaops.db`
- [ ] Secrets are NOT visible in git log
- [ ] CORS origin matches your domain

---

## Rollback Plan

If something breaks:

```bash
# Stop current container
docker-compose -f docker/docker-compose.production.yml down

# Reset to last known good state
git reset --hard HEAD

# Start previous version
docker-compose -f docker/docker-compose.production.yml up -d
```

---

## Next Steps

1. **Apply all 5 critical fixes** (Fixes #1-5)
2. **Test thoroughly** using verification checklist
3. **Apply optional fixes** (#6-10) for production readiness
4. **Set up monitoring** (see COMPREHENSIVE_AUDIT_REPORT.md)
5. **Schedule security audit** before production deployment

**Total Time: 1-2 hours for critical fixes + testing**

---

## Getting Help

For detailed explanations of each issue, see:
- `COMPREHENSIVE_AUDIT_REPORT.md` - Full audit with root cause analysis
- `AUDIT_FINDINGS_SUMMARY.txt` - Quick reference guide

Questions? Check the logs:
```bash
docker-compose logs -f
docker exec <container> cat /var/log/supervisor/supervisord.log
```
