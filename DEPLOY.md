# Deployment Guide for OmegaOps Academy

## Prerequisites

- Docker & Docker Compose installed on Ubuntu server
- Nginx Proxy Manager running (accessible at http://npm-server:81)
- Docker network `web` created (for NPM communication)
- Git repository cloned to deployment directory

---

## Step 1: Prepare the Server

```bash
# SSH into production server
ssh user@your-server

# Navigate to project directory
cd /home/metrik/docker/learn

# Ensure git is up to date
git pull origin main

# Verify project structure
ls -la
# Should see: backend/ frontend/ docker/ README.md VISION.md .git/
```

---

## Step 2: Create Docker Network (if not exists)

The `web` network allows Nginx Proxy Manager to discover and route to our container.

```bash
# Check if network exists
docker network ls | grep web

# If not exists, create it
docker network create web

# Verify
docker network ls
# Should see: web (driver: bridge, scope: local)
```

---

## Step 3: Build Docker Image

**Option A: Build on production server (recommended)**

```bash
# Navigate to project root
cd /home/metrik/docker/learn

# Build image (takes 3-5 minutes)
docker build -f docker/Dockerfile -t omegaops-academy:latest .

# Verify image was created
docker images | grep omegaops-academy
# Should show: omegaops-academy  latest  <IMAGE_ID>  <SIZE>
```

**Option B: Build locally, push to registry**

```bash
# On local machine
docker build -f docker/Dockerfile -t your-registry/omegaops-academy:latest .
docker push your-registry/omegaops-academy:latest

# On production server
docker pull your-registry/omegaops-academy:latest
docker tag your-registry/omegaops-academy:latest omegaops-academy:latest
```

---

## Step 4: Start Container with Docker Compose

```bash
# Navigate to docker directory
cd /home/metrik/docker/learn/docker

# Start container
docker-compose up -d

# Verify container is running
docker ps
# Should show: omegaops-academy (status: Up X seconds, healthy)

# View logs (first 50 lines)
docker-compose logs omegaops-academy

# Follow logs (live)
docker-compose logs -f omegaops-academy
```

**Expected log output:**

```
2025-11-17 20:45:00.123 [info]: OmegaOps Academy container started
2025-11-17 20:45:00.456 [info]: Nginx listening on port 80
2025-11-17 20:45:00.789 [info]: Health check passed
```

---

## Step 5: Verify Container is Healthy

```bash
# Check container status
docker ps | grep omegaops-academy

# Run health check manually
docker exec omegaops-academy curl -f http://localhost/ > /dev/null && echo "✅ Healthy" || echo "❌ Unhealthy"

# Test full response
docker exec omegaops-academy curl -s http://localhost/ | head -20
# Should return HTML (React app)
```

---

## Step 6: Configure Nginx Proxy Manager

### Log in to NPM UI

1. Open browser: **http://npm-server:81**
2. Default credentials: `admin@example.com` / `changeme`
3. Click **Settings** → Change default password

### Add Proxy Host

1. Click **Proxy Hosts** (left menu)
2. Click **Add Proxy Host** button
3. Fill in form:

   **Domain Names Tab:**
   - **Domain Names:** `learn.metrikcorp.com`
   - **Scheme:** `http` (internal)
   - **Forward Hostname/IP:** `omegaops-academy` (container name)
   - **Forward Port:** `80` (internal port)
   - **Cache Assets:** ON (optional, improves performance)
   - **Block Common Exploits:** ON (security)

   **SSL Tab:**
   - **Force SSL:** ON
   - **HTTP/2 Support:** ON
   - **SSL Certificate:** Request a new SSL Certificate
   - **Email Address for Let's Encrypt:** your-email@example.com
   - **Agree to Let's Encrypt Terms:** ☑️

   **Advanced Tab:**
   - Leave defaults (custom Nginx conf optional)

4. Click **Save**

NPM will:
- Automatically request SSL certificate from Let's Encrypt
- Configure Nginx to proxy traffic
- Force HTTPS redirect
- Handle certificate renewal

**Wait 30-60 seconds for SSL to be provisioned.**

---

## Step 7: Verify Public Access

### Test HTTP (should redirect to HTTPS)

```bash
curl -v http://learn.metrikcorp.com/
# Should return: Location: https://learn.metrikcorp.com/
```

### Test HTTPS (should return HTML)

```bash
curl -s https://learn.metrikcorp.com/ | head -20
# Should show React HTML, starting with <!DOCTYPE html>
```

### Test in Browser

1. Open: **https://learn.metrikcorp.com**
2. Should see:
   - React app loads
   - Dark theme visible
   - Dashboard page with welcome message
   - XP/level/streak display
   - No HTTPS warnings

### Check SSL Certificate

```bash
# View certificate details
openssl s_client -connect learn.metrikcorp.com:443 -showcerts < /dev/null | grep -A5 "subject="

# Should show Let's Encrypt issuer
```

---

## Step 8: Verify API Connectivity

### Test API from Container

```bash
docker exec omegaops-academy curl -s http://localhost/api/health | python3 -m json.tool
# Should return: {"success":true,"data":{"status":"healthy",...}}
```

### Test API from Public

```bash
curl -s https://learn.metrikcorp.com/api/health | python3 -m json.tool
# Should return health check response
```

### Test Frontend → Backend Communication

1. Open https://learn.metrikcorp.com in browser
2. Open DevTools (F12) → Network tab
3. Navigate around the site (click buttons, routes)
4. Watch for API calls to https://learn.metrikcorp.com/api/*
5. Verify responses are successful (200 status)

---

## Step 9: Monitor & Verify

### Check Container Logs

```bash
# View recent logs
docker-compose logs --tail=100 omegaops-academy

# Watch logs in real-time
docker-compose logs -f omegaops-academy

# Check for errors
docker-compose logs omegaops-academy | grep -i error
```

### Check NPM Logs

In NPM UI:
1. Click **Proxy Hosts** → click your proxy host
2. View **Logs** tab for this specific proxy

### Monitor System Resources

```bash
# CPU/Memory usage
docker stats omegaops-academy

# Disk space
df -h /

# Check for disk pressure
docker exec omegaops-academy df -h /
```

### Health Check Status

```bash
# Show container details (includes HealthStatus)
docker ps --format="table {{.Names}}\t{{.Status}}"

# Should show: omegaops-academy  Up X minutes (healthy)
```

---

## Step 10: Backup & Recovery

### Create Database Backup

```bash
# Backup SQLite database
docker exec omegaops-academy cp /home/app/backend/data/omegaops.db /home/app/omegaops.db.backup

# Copy to host (for safety)
docker cp omegaops-academy:/home/app/omegaops.db.backup ./omegaops.db.backup

# Store on external backup system
scp ./omegaops.db.backup backup-server:/backups/omegaops/
```

### Create Image Backup

```bash
# Tag current image with date
docker tag omegaops-academy:latest omegaops-academy:2025-11-17

# Export image (for offline backup)
docker save omegaops-academy:latest | gzip > omegaops-academy-latest.tar.gz
```

### Recovery Procedure

If container fails:

```bash
# Check logs
docker-compose logs omegaops-academy

# Restart container
docker-compose restart omegaops-academy

# If restart fails, rebuild:
docker build -f docker/Dockerfile -t omegaops-academy:latest .
docker-compose up -d

# Restore database if needed
docker cp ./omegaops.db.backup omegaops-academy:/home/app/backend/data/omegaops.db
docker-compose restart omegaops-academy
```

---

## Step 11: Ongoing Maintenance

### Daily Checks

```bash
# Health check
docker exec omegaops-academy curl -f http://localhost/ > /dev/null && echo "✅ OK" || echo "❌ FAIL"

# View logs for errors
docker-compose logs omegaops-academy | tail -20
```

### Weekly Tasks

```bash
# Update image (if patches available)
git pull origin main
docker build -f docker/Dockerfile -t omegaops-academy:latest .
docker-compose down
docker-compose up -d

# Backup database
docker cp omegaops-academy:/home/app/backend/data/omegaops.db \
  ./backups/omegaops-$(date +%Y-%m-%d).db

# Check disk usage
df -h /
du -sh /var/lib/docker/
```

### Monthly Tasks

```bash
# Review logs for any issues
docker-compose logs omegaops-academy --since 30d | grep -i error

# Test SSL certificate (should not expire soon)
openssl s_client -connect learn.metrikcorp.com:443 -showcerts < /dev/null | grep "Verify return code"

# Update Docker & docker-compose
docker --version
docker-compose --version
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check Docker daemon
docker ps

# Check logs
docker-compose logs omegaops-academy

# Check resource limits
docker stats omegaops-academy

# Rebuild and start
docker build -f docker/Dockerfile -t omegaops-academy:latest .
docker-compose up -d
```

### NPM Can't Reach Container

```bash
# Verify network
docker network ls | grep web

# Verify container is on network
docker inspect omegaops-academy | grep -A5 "Networks"

# Ping container from NPM perspective
docker exec npm-container ping omegaops-academy
```

### SSL Certificate Issues

```bash
# Check certificate renewal status
# In NPM UI: Proxy Hosts → Click host → view Logs

# Force certificate renewal
# In NPM UI: Edit proxy host → force new certificate

# Check system time (must be correct for Let's Encrypt)
date
```

### High CPU/Memory Usage

```bash
# Check which process is using resources
docker stats omegaops-academy

# Check logs for errors/loops
docker-compose logs omegaops-academy | tail -100

# Restart container
docker-compose restart omegaops-academy
```

### API Calls Timing Out

```bash
# Check backend health
docker exec omegaops-academy curl -f http://localhost/api/health

# Check container logs
docker-compose logs omegaops-academy

# Check Nginx config
docker exec omegaops-academy nginx -T | grep upstream

# Restart container
docker-compose restart omegaops-academy
```

---

## Production Checklist

Before considering "production ready":

- [ ] Docker image builds successfully
- [ ] Container starts with `docker-compose up -d`
- [ ] Container shows healthy status
- [ ] NPM proxy host configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] HTTPS works (no warnings)
- [ ] Frontend loads at https://learn.metrikcorp.com
- [ ] API responds at https://learn.metrikcorp.com/api/health
- [ ] Frontend ↔ Backend communication works (check Network tab)
- [ ] All routes navigable (Dashboard, Roadmap, Missions, etc.)
- [ ] Dark theme loads correctly
- [ ] Mobile responsive (test on phone)
- [ ] Admin panel accessible at /admin
- [ ] Database backup automated
- [ ] Logs monitored for errors
- [ ] Uptime monitoring configured (optional)
- [ ] Alert system configured (optional)
- [ ] Disaster recovery plan documented (✓ done)

---

## Post-Deployment

### Announce Launch

```bash
# Commit deployment configuration
git add docker/docker-compose.yml
git commit -m "infra: deploy to production at learn.metrikcorp.com"
git push origin main
```

### Monitor Learner Traffic

```bash
# Watch request logs in real-time
docker-compose logs -f omegaops-academy | grep -i "GET"

# Check API usage
docker-compose logs omegaops-academy | grep "/api" | wc -l
```

### Iterate on Content

As learners use the platform:
1. Review completion rates and feedback
2. Expand curriculum (add more missions, labs)
3. Grow Software Galaxy (more tools, guides)
4. Optimize performance (add caching, optimize queries)
5. Improve UX (based on user feedback)

All changes committed to git and deployed via docker rebuild.

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f omegaops-academy`
2. Review this guide's Troubleshooting section
3. Check GitHub Issues: https://github.com/metrik420/OmegaOps-Academy/issues
4. Consult README.md or VISION.md in repo

---

**Deployment guide created: 2025-11-17**
**Status: PRODUCTION-READY**
