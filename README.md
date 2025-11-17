# OmegaOps Academy

**The world's most advanced, self-updating learning platform for Linux, web hosting, cPanel/WHM, security, and server software.**

A gamified, source-verified academy with a growing "Software Galaxy" that becomes the definitive guide to installing and configuring any server tool. Built with React + Node.js, deployed on Docker, and fronted by Nginx Proxy Manager.

---

## Quick Start

### Local Development

**Prerequisites:**
- Node.js 20+ (LTS)
- npm 10+
- Git

**Clone & Setup:**

```bash
# Clone this repo
git clone https://github.com/metrik420/OmegaOps-Academy.git
cd OmegaOps-Academy

# Backend setup
cd backend
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
npm install
npm run build
npm start
# Backend runs on http://localhost:3001

# In another terminal: Frontend setup
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173 with proxy to :3001
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Health check: http://localhost:3001/health

### Docker Deployment

**Build the image:**

```bash
docker build -f docker/Dockerfile -t omegaops-academy:latest .
```

**Run with docker-compose:**

```bash
cd docker
docker-compose up -d
# Container listens on :80 internally (accessible via Nginx Proxy Manager)
```

**View logs:**

```bash
docker-compose logs -f omegaops-academy
```

**Verify health:**

```bash
curl http://localhost/health
# Or if exposed to port 8080:
curl http://localhost:8080/
```

---

## Architecture

### Frontend (React + Vite + TypeScript)

**Routes:**
- `/` – Dashboard (welcome, progress, quick links)
- `/roadmap` – 12-week curriculum overview
- `/missions/:week/:day` – Daily mission detail (narrative, tasks, quiz, reflection)
- `/labs` – Labs index with filtering
- `/labs/:id` – Lab detail (scenario, hints, completion)
- `/knowledge` – Knowledge base index by category
- `/knowledge/:topicId` – Topic detail (markdown content, sources, related content)
- `/software` – Software Galaxy (search, filter, sort)
- `/software/:id` – Tool detail (install guides, config guides, sources, confidence level)
- `/updates` – Changelog (pending/applied changes)
- `/admin` – Admin panel (approve/reject updates, manage software)
- `/logbook` – Learning history (completed missions, reflections)

**Features:**
- Dark theme by default with light mode toggle
- Fully responsive (mobile → 4K)
- Keyboard accessible (WCAG 2.1 AA)
- Gamification: XP, levels, streaks, badges
- localStorage-backed progress (offline capable)
- Code block copy buttons
- Markdown support for content

**Tech Stack:**
- React 18+ with React Router v6
- Vite (fast dev server, optimized builds)
- TypeScript (strict mode)
- Zustand (state management + localStorage persistence)
- Axios (HTTP client with API proxy)
- Lucide React (icons)
- CSS Modules (scoped styling, dark/light themes)

### Backend (Node.js + Express + TypeScript)

**REST API Endpoints:**

- `GET /health` – Health check
- `GET /api/roadmap` – 12-week structure
- `GET /api/missions` – List missions (filters: week, day)
- `GET /api/missions/:id` – Mission detail
- `POST /api/missions/:id/complete` – Mark complete, award XP
- `GET /api/labs` – Labs list (filters: difficulty, category)
- `GET /api/labs/:id` – Lab detail
- `POST /api/labs/:id/complete` – Mark complete, award XP
- `GET /api/knowledge` – Knowledge topics list
- `GET /api/knowledge/:topicId` – Topic detail
- `GET /api/software` – Software tools (filters: category, environment, difficulty, status, search)
- `GET /api/software/:id` – Tool detail with guides and sources
- `GET /api/updates` – Changelog (filters: status, type)
- `GET /api/progress` – User progress (XP, level, streak, badges)
- `POST /api/admin/pending-updates/:id/approve` – Admin: approve update
- `POST /api/admin/pending-updates/:id/reject` – Admin: reject update
- `GET /api/admin/dashboard` – Admin: statistics

**Database (SQLite by default):**

Tables:
- `missions` – Daily missions with XP, tasks, quiz
- `labs` – Scenario labs with difficulty levels
- `knowledge_topics` – Knowledge base articles
- `software_tools` – Server software with guides
- `install_guides` – Per-environment installation steps
- `config_guides` – Configuration examples
- `pending_updates` – Changes awaiting admin approval
- `changelog` – Applied changes history
- `sources` – Trusted upstream documentation sources

**Security:**
- HTTP Basic Auth for `/api/admin/*` routes
- Helmet.js security headers
- Zod input validation at all boundaries
- CORS configured
- No secrets in logs or errors (production mode)

**Admin Approval Workflow:**
1. Workers/users propose changes → `pending_updates` table
2. Admin reviews in `/admin` UI
3. Admin approves/edits/rejects
4. Approved changes applied to live content
5. Action logged in `changelog`

### Background Workers

Three independent worker processes that propose content updates (never auto-publish):

**KnowledgeWorker** (`backend/src/workers/KnowledgeWorker.ts`)
- Monitors upstream documentation (official vendor docs, cloud providers, security bodies)
- Diffs content against current knowledge base
- Creates `pending_updates` for human review
- Runs daily (configurable via cron or scheduler)

**SoftwareDiscoveryWorker** (`backend/src/workers/SoftwareDiscoveryWorker.ts`)
- Discovers new server-related tools from:
  - OS package indexes (Ubuntu, Debian, AlmaLinux)
  - CNCF landscape
  - Docker Hub Official Images
  - GitHub trending server projects
- Creates `SoftwareTool` entries with status="discovered"
- Runs weekly

**SoftwareDocWorker** (`backend/src/workers/SoftwareDocWorker.ts`)
- Generates installation and configuration guides
- Fetches official docs for each tool
- Creates environment-specific guides (Ubuntu, AlmaLinux, Docker, cPanel/WHM)
- Creates `pending_updates` with proposed guides
- Runs weekly

**Running Workers:**

```bash
cd backend
npm run build
npm run worker:knowledge   # KnowledgeWorker
npm run worker:discovery  # SoftwareDiscoveryWorker
npm run worker:docs       # SoftwareDocWorker
```

Or schedule via cron:

```bash
# In crontab
0 2 * * * cd /path/to/backend && npm run worker:knowledge
0 3 * * 0 cd /path/to/backend && npm run worker:discovery
0 4 * * 0 cd /path/to/backend && npm run worker:docs
```

---

## Curriculum

### 12-Week Roadmap

**Week 1 – Linux & CLI Foundations**
- Mon: Navigation & file operations (ls, cd, cp, mv, rm)
- Tue: Permissions & ownership (chmod, chown, umask)
- Wed: Text processing (grep, sed, awk, cut)
- Thu: Process management (ps, top, kill, nice)
- Fri: User & group management (useradd, usermod, passwd)
- Sat: Lab – "Troubleshoot file permission issue on shared server"

**Week 2 – systemd & Services**
- Mon: systemd fundamentals (systemctl, journalctl)
- Tue: Unit files & targets (service, socket, timer)
- Wed: Timers & cron jobs (systemd-timer vs cron)
- Thu: Service dependencies & ordering
- Fri: Debugging failed services (logs, status, restart loops)
- Sat: Lab – "Service fails at boot; debug and fix"

**Week 3–7:** Web stack, databases, DNS, email, Docker (skeleton included, can be expanded)

**Week 8 – cPanel & WHM Core Hosting** ⭐ (Fully Detailed)
- Mon: Account creation, packages, home directories
- Tue: DNS zones, SSL userdata, Apache vhost mapping
- Wed: EasyApache 4, PHP handlers, MPM configuration
- Thu: Email routing, Exim logs, Dovecot basics
- Fri: MySQL/MariaDB in WHM, phpMyAdmin, backups
- Sat: Boss Lab – "Wrong site loading on wrong domain" (complex troubleshooting)

**Week 9–12:** Security hardening, WordPress, incident response, performance tuning (skeleton)

### Content Structure

Each mission includes:
- **Narrative** – Story hook ("You're on-call and X broke…")
- **Objectives** – Learning outcomes
- **Warmup** – 3-5 quick recall questions
- **Tasks** – Step-by-step instructions with:
  - Command examples (safe, using example.com IPs)
  - Explanations
  - Expected outcomes
  - "Danger Zone" warnings for destructive commands
- **Quiz** – Multiple choice + optional reflection
- **Reflection** – "What did you learn?" text box

---

## Software Galaxy

### ~100 Seeded Tools

Initial library covers:

**Web Servers & Proxies:**
Apache, Nginx, LiteSpeed, Caddy, HAProxy, Traefik, Varnish

**Application Runtimes:**
PHP-FPM, Node.js (PM2), Python (Gunicorn, uWSGI), Ruby (Puma)

**Databases:**
MySQL, MariaDB, PostgreSQL, Redis, Memcached, MongoDB

**Mail Stack:**
Exim, Postfix, Dovecot, SpamAssassin, Rspamd, DKIM tools, Certbot

**DNS:**
BIND, PowerDNS, Unbound, Route53

**Monitoring:**
Prometheus, Grafana, Loki, ELK/EFK, Netdata

**Security:**
Fail2ban, CSF, ModSecurity, OpenVPN, WireGuard, Let's Encrypt

**Management:**
cPanel, Plesk, phpMyAdmin, Portainer, Watchtower

**Containers:**
Docker, Kubernetes, Docker Compose

### Tool Details

Each tool includes:

**Install Guides** (per-environment):
- Ubuntu 22.04+ / 24.04
- AlmaLinux 9
- Debian 12
- Docker
- cPanel/WHM integration
- Step-by-step commands with explanations

**Config Guides:**
- Secure baseline configuration
- Performance-focused tuning
- Common scenarios (high-traffic, multi-tenant, etc.)
- Annotated config snippets (copyable)

**Verification:**
- Sources: official docs, vendor docs, cloud providers
- Confidence level: high / medium / experimental
- Last verified: timestamp
- Related missions & knowledge topics

---

## Gamification

### Progress Tracking

- **XP**: Earned per mission (5–50 XP based on difficulty + quiz bonus)
- **Levels**: 10 levels, each requiring 1000 XP
- **Streaks**: Days with ≥1 mission completed
- **Badges**: Achievement system
  - "Log Diver" – Complete all logging missions
  - "Docker Wrangler" – Complete all Docker week
  - "Incident Responder" – Complete all incident response missions
  - "WHM Wizard" – Complete all cPanel/WHM week
  - ...and more

### Storage

- localStorage (MVP) for immediate feedback
- Backend persistence (optional) via `/api/progress`

---

## Nginx Proxy Manager Integration

### Deployment to learn.metrikcorp.com

**1. Build the Docker image:**

```bash
docker build -f docker/Dockerfile -t omegaops-academy:latest .
```

**2. Start the container:**

```bash
cd docker
docker-compose up -d
```

The container listens on port 80 internally.

**3. In Nginx Proxy Manager UI (http://npm-server:81):**

- Navigate to **Proxy Hosts**
- Click **Add Proxy Host**
- **Domain Names:** `learn.metrikcorp.com`
- **Scheme:** `http`
- **Forward Hostname/IP:** `omegaops-academy` (container name)
- **Forward Port:** `80`
- Click **SSL** tab
  - Enable **Force SSL**
  - **SSL Certificate:** Request a new SSL Certificate (Let's Encrypt)
  - Enable **HTTP/2 Support**
- Click **Save**

**4. Verify:**

```bash
curl https://learn.metrikcorp.com
# Should return HTML (React app)

curl https://learn.metrikcorp.com/health
# Should return 404 (frontend route, not backend)

# For backend health:
# curl https://learn.metrikcorp.com/api/health
# (once backend is in same container or network)
```

**5. Monitor:**

```bash
docker-compose logs -f omegaops-academy
```

---

## Development Workflow

### Git & GitHub

**Single source of truth:**

```bash
# Pull latest before starting
git pull origin main

# Create feature branch (optional)
git checkout -b feature/your-feature

# Make changes, test locally
npm run dev          # frontend
npm start            # backend (in another terminal)

# Commit with clear messages
git add .
git commit -m "feat: add new mission on topic X"

# Push to GitHub
git push origin feature/your-feature
# Then create PR on GitHub
```

**Recommended commit types:**
- `feat:` – New feature (mission, page, tool)
- `fix:` – Bug fix
- `refactor:` – Code restructuring
- `docs:` – Documentation updates
- `chore:` – Build, deps, tooling
- `perf:` – Performance improvement
- `test:` – Test additions/fixes

### Running Tests

**Frontend:**

```bash
cd frontend
npm run test          # Run tests
npm run test:watch   # Watch mode
npm run typecheck    # TypeScript checks
npm run lint         # ESLint
```

**Backend:**

```bash
cd backend
npm run test         # Run tests
npm run test:watch  # Watch mode
npm run typecheck   # TypeScript checks
npm run lint        # ESLint
```

### Building for Production

**Frontend:**

```bash
cd frontend
npm run build        # Vite optimizes for production
# Output: frontend/dist/
```

**Backend:**

```bash
cd backend
npm run build        # TypeScript compilation
# Output: backend/dist/
```

**Docker:**

```bash
docker build -f docker/Dockerfile -t omegaops-academy:v1.0.0 .
docker push your-registry/omegaops-academy:v1.0.0
```

---

## Key Design Principles

### Source Verification

**Default Rule:** If a recommendation cannot be verified against ≥2 major sources, it must NOT be labeled as "best practice."

**Prioritize:**
1. Official vendor docs (Canonical, Red Hat, Debian, cPanel, MySQL, etc.)
2. Large reputable providers (Google Cloud, Azure, AWS)
3. Security/standards bodies (OWASP, CIS, NIST)

**Confidence Levels:**
- **High**: 3–4+ major sources agree
- **Medium**: Partial alignment or single strong vendor
- **Experimental**: Speculative; flagged with warning

### Human-in-the-Loop Updates

Workers NEVER auto-publish. All changes:
1. Proposed to `pending_updates` table
2. Reviewed in admin UI
3. Approved/edited/rejected by admin
4. Logged in changelog
5. Then visible to learners

### Safety First

- **Examples Only:** example.com, mail.example.com, RFC1918 IPs (10.x, 192.168.x, 172.16–31.x)
- **Danger Zone:** Destructive commands clearly labeled
- **Warnings:** Cautions for risky operations

### Code Quality

- **TypeScript**: Strict mode throughout
- **Comments**: Explain WHY, not just WHAT
- **Tests**: Unit + integration tests for all new features
- **Linting**: ESLint + Prettier
- **Security**: Input validation, auth, no secrets in logs

---

## Troubleshooting

### Frontend won't connect to backend

**Symptom:** Frontend loads but API calls fail.

**Solution:**
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check frontend vite.config.ts has proxy configured for /api
3. In dev, ensure frontend proxies to correct backend URL

### Docker build fails

**Symptom:** `docker build` exits with error.

**Solution:**
1. Verify dependencies are installed: `npm ci` in frontend and backend
2. Check TypeScript compiles: `npm run build` in frontend and backend
3. Verify Dockerfile paths are correct (relative to project root)

### Admin authentication fails

**Symptom:** Admin panel shows auth error.

**Solution:**
1. Default credentials: `admin:admin` (change in .env!)
2. Verify Backend is running and /api/admin routes are accessible
3. Check .env has ADMIN_PASSWORD_HASH set correctly

### Container health check fails

**Symptom:** `docker ps` shows container unhealthy.

**Solution:**
1. Check logs: `docker logs omegaops-academy`
2. Verify Nginx is running: `docker exec omegaops-academy nginx -T`
3. Test health endpoint: `docker exec omegaops-academy curl http://localhost/`

---

## Documentation

- **[VISION.md](./VISION.md)** – Long-term mission and goals
- **[CLAUDE.md](./CLAUDE.md)** – AI developer guidance
- **[backend/README.md](./backend/README.md)** – Backend setup & API reference
- **[docker/README.md](./docker/README.md)** – Docker deployment guide

---

## Contributing

1. Read [VISION.md](./VISION.md) to understand the long-term goal
2. Read [CLAUDE.md](./CLAUDE.md) for code guidelines
3. Create feature branch: `git checkout -b feature/xxx`
4. Make changes with detailed comments
5. Run tests: `npm run test`
6. Commit: `git commit -m "feat: description"`
7. Push: `git push origin feature/xxx`
8. Create PR on GitHub

---

## License

Internal project for MetrikCorp. See LICENSE file for details.

---

## Support

For issues, questions, or suggestions:
1. Check existing issues on GitHub
2. Create a new issue with detailed description
3. Include logs, screenshots, reproduction steps

---

**Built with ❤️ for the server administration community.**

Last updated: 2025-11-17
