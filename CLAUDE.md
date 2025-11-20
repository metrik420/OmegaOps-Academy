# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OmegaOps Academy** is a self-updating learning platform for Linux, web hosting, cPanel/WHM, security, and server software. The platform features a "Software Galaxy" that continuously grows with source-verified, human-in-the-loop updates.

**Key Philosophy:** All content must be verified against official sources, with workers proposing changes (not auto-publishing) to an admin approval queue before going live.

**Stack:** React + Vite (frontend), Node.js + Express (backend), SQLite/PostgreSQL (database), Docker (containerization), Nginx Proxy Manager (reverse proxy on Ubuntu).

---

## Common Commands

### Frontend Development
```bash
cd frontend
npm install
npm run dev              # Start Vite dev server with hot reload
npm run build           # Build for production
npm run type-check      # TypeScript type checking
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix linting issues
npm run test            # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Backend Development
```bash
cd backend
npm install
npm run dev             # Start with hot reload (nodemon)
npm run build           # Compile TypeScript to dist/
npm run start           # Run compiled app
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed initial data
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix linting issues
npm run test            # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Running Individual Workers
```bash
cd backend
npm run build
node dist/workers/KnowledgeWorker.js
node dist/workers/SoftwareDiscoveryWorker.js
node dist/workers/SoftwareDocWorker.js

# Content Analytics Worker (runs continuously or on schedule)
node dist/workers/ContentAnalyticsWorker.js              # Run continuously (daemon mode)
node dist/workers/ContentAnalyticsWorker.js --once       # Run once and exit (cron mode)
node dist/workers/ContentAnalyticsWorker.js --content=mission/wk1-day1  # Manual content-specific run
```

### Docker & Deployment
```bash
# Build image
docker build -f docker/Dockerfile -t omegaops-academy:latest .

# Run with docker-compose
cd docker
docker-compose up -d

# View logs
docker-compose logs -f omegaops-academy

# Stop services
docker-compose down
```

### Code Quality
```bash
# Frontend
cd frontend
npm run lint && npm run format && npm run type-check && npm run test

# Backend
cd backend
npm run lint && npm run format && npm run type-check && npm run test
```

---

## High-Level Architecture

### Frontend Structure
```
frontend/src/
├── pages/               # Route components (Dashboard, Roadmap, Missions, Labs, etc.)
├── components/          # Reusable React components
├── hooks/               # Custom React hooks
├── services/            # API client & business logic
├── store/               # State management (Zustand/React Query)
├── types/               # TypeScript interfaces
├── utils/               # Utility functions
├── styles/              # Global styles and CSS modules
└── App.tsx             # Router and main app layout
```

**Key Features:**
- Dark theme by default with light-mode toggle
- Fully responsive (mobile to 4K)
- Keyboard accessible
- Smooth subtle animations

### Backend Structure
```
backend/src/
├── api/
│   ├── routes/          # API endpoints (roadmap, missions, labs, knowledge, software, updates, admin)
│   ├── controllers/      # Request handlers
│   └── middleware/       # Custom middleware
├── database/
│   ├── models/          # TypeScript interfaces and schemas
│   ├── migrations/       # DB migrations
│   └── seeds/           # Initial data
├── workers/             # Background worker processes
│   ├── KnowledgeWorker.ts       # Monitors & proposes content updates
│   ├── SoftwareDiscoveryWorker.ts # Finds new server tools
│   └── SoftwareDocWorker.ts     # Generates install/config guides
├── services/            # Business logic (MissionService, LabService, etc.)
├── types/               # Shared TypeScript types
├── utils/               # Utilities (logging, error handling, auth)
└── app.ts              # Express app setup
```

**Key Concepts:**
- All worker-generated changes go to `pending_updates` table (NOT auto-live)
- Admin must approve/reject updates via `/api/admin/pending-updates/:id/approve`
- Each tool has `confidenceLevel` (high/medium/experimental) based on source verification

### Data Flow: Self-Updating Knowledge

```
Worker Process
  ↓
Fetch official docs (vendor, cloud providers, security bodies)
  ↓
Diff against previous version
  ↓
Generate/update content
  ↓
Create pending_updates entries (NEVER auto-publish)
  ↓
Admin UI displays pending changes
  ↓
Admin approves/rejects via API
  ↓
If approved → content goes live via changelog
  ↓
Frontend fetches latest via /api/updates
```

---

## Key Technologies & Patterns

### Frontend Stack
- **React** with **Vite** (not Create React App)
- **TypeScript** (required)
- **React Router** for SPA routing
- **Zustand** or **React Query** for state management
- **CSS Modules** or **styled-components** for styling (no Tailwind required)
- **Vitest** or **Jest** + **React Testing Library**

### Backend Stack
- **Express.js** for REST API
- **TypeScript** (required)
- **SQLite** or **PostgreSQL** (developer choice, document in .env.example)
- **Knex.js** or **TypeORM** for query building
- **Jest** + **Supertest** for testing
- **node-cron** or similar for worker scheduling
- **Winston** or **Pino** for structured logging

### API Pattern
- RESTful endpoints: `GET /api/missions`, `POST /api/missions/:id/complete`
- All responses include standard structure: `{ success: boolean, data: T, error?: string }`
- Admin routes protected behind auth middleware

### Worker Pattern
- Background processes execute independently from Express
- Each worker has configurable interval in `.env`
- All workers must log their activity clearly (source fetches, diffs, proposals)
- Workers **create** `pending_updates` entries; they don't modify live content

---

## Database Schema (Key Tables)

### Core Curriculum
- `missions` – Daily missions with XP rewards, tasks, quiz
- `labs` – Scenario-based labs with different difficulty levels
- `knowledge_topics` – Knowledge base articles with source references

### Software Galaxy
- `software_tools` – Server software (status: seeded/discovered/approved/deprecated)
- `install_guides` – OS-specific installation steps per tool
- `config_guides` – Secure baseline and performance configs
- `sources` – Trusted upstream sources (vendor docs, cloud providers)

### Admin & Updates
- `pending_updates` – Queue of proposed changes (type: mission/lab/knowledge/software)
- `changelog` – Timeline of applied updates with affected entities

### User Authentication
- `users` – User accounts with: id, email, username, password_hash (bcrypt), isEmailVerified, isAdmin, failedLoginAttempts, lockedUntil, acceptPrivacyPolicy, joinedAt, lastLoginAt
- `refresh_tokens` – Active refresh tokens: id, userId, token, expiresAt, revokedAt, ipAddress, userAgent (token rotation & revocation)
- `password_reset_tokens` – Password reset tokens: id, userId, token, expiresAt (1-hour single-use)
- `auth_logs` – Audit trail: id, userId, action (login/logout/verify_email/reset_password), success, failureReason, ipAddress, userAgent, timestamp (90-day retention)
- `admin_users` – Admin accounts: id, username, password_hash, isActive (currently only 'metrik' user)

### Content Analytics & Monitoring
- `user_content_interactions` – Granular tracking of every user interaction (view, start, complete, quiz, rate, feedback)
- `content_metrics` – Aggregated performance metrics (completion rate, quiz pass rate, health score, trending)
- `content_recommendations` – Auto-generated actionable recommendations (refresh, simplify, expand, remove, clarify)
- `content_feedback` – User-submitted feedback and bug reports (typos, outdated content, difficulty issues)
- `content_audit_log` – Complete change history with before/after snapshots (rollback capability)
- `content_cohort_analysis` – Cohort-based performance analysis (mobile vs desktop, early adopters vs later users)

### Optional: User Progress
- `user_progress` – XP, level, streak, completed missions/labs
- `user_reflections` – Daily reflection journal entries

---

## Important Development Rules

### Source Verification & Confidence Levels

**High Confidence:** ≥3 major sources agree on a pattern or recommendation
- Official vendor docs (Canonical, Red Hat, Debian, MySQL, cPanel, etc.)
- Large reputable cloud providers (Google Cloud, Azure, AWS)
- Security standards bodies (OWASP, CIS, NIST)

**Medium Confidence:** Partial alignment between sources or single strong vendor

**Experimental:** Speculative guidance; labeled as such with warning; requires more sources

**Golden Rule:** If content cannot be verified, do NOT label as "best practice"

### Safe Examples Only
- Domains: `example.com`, `mail.example.com`
- IPs: RFC1918 ranges only (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)
- No production credentials, real domains, or public IP addresses

### Code Comments & Documentation
- All exported functions must have JSDoc comments explaining purpose and parameters
- Include inline comments for non-obvious logic, especially:
  - Security implications (input validation, auth checks)
  - Performance-critical code (caching, batch operations)
  - Complex business logic (worker diffs, approval flows)
- Explain the "why" not just the "what"

### Testing Standards
- All new functions require unit tests
- All API endpoints require integration tests
- Use `/api` routes to test controllers via Supertest
- Coverage target: >80%

### TypeScript Requirements
- Strict mode enabled in `tsconfig.json`
- All function parameters and return types must be explicitly typed
- No `any` types unless absolutely necessary (document with comment)
- Use interfaces for API responses and database models

### Worker Implementation
- Workers are scheduled background processes, NOT triggered by HTTP requests
- Each worker is responsible for fetching, diffing, and proposing updates
- Workers MUST create `pending_updates` entries, never modify live content
- Example: `KnowledgeWorker` fetches official docs, diffs against `knowledge_topics`, creates proposals
- All worker activity must be logged: sources checked, changes found, proposals created

### Admin Approval Workflow
- All changes proposed by workers remain in `pending_updates` with `status = 'pending'`
- Admin reviews via `/api/admin/pending-updates` UI
- Admin can `approve` (applies immediately), `reject`, or `edit-approve` (modify before approving)
- On approval, update is applied to live content and logged in `changelog`

---

## API Endpoints (Quick Reference)

### Public Endpoints
- `GET /api/roadmap` – 12-week overview
- `GET /api/missions?week=1&day=3` – List missions
- `GET /api/missions/:id` – Single mission detail
- `POST /api/missions/:id/complete` – Mark complete, award XP
- `GET /api/labs`, `GET /api/labs/:id` – Labs index and detail
- `GET /api/knowledge`, `GET /api/knowledge/:topicId` – Knowledge base
- `GET /api/software`, `GET /api/software/:id` – Software Galaxy with guides
- `GET /api/updates?status=pending` – Changelog and pending updates

### Admin-Protected Endpoints
- `GET /api/admin/pending-updates` – All pending updates
- `POST /api/admin/pending-updates/:id/approve` – Apply update
- `POST /api/admin/pending-updates/:id/reject` – Reject update
- `POST /api/admin/pending-updates/:id/edit-approve` – Modify then apply
- `GET /api/admin/software/discovered` – Newly discovered tools
- `POST /api/admin/software/:id/deprecate` – Mark tool obsolete

### User Authentication Endpoints
- `POST /api/auth/register` – User registration with email verification (201 Created)
- `POST /api/auth/login` – Login with email/password, set httpOnly cookies (200 OK)
- `POST /api/auth/admin/login` – Admin login (username='metrik' only, 200 OK)
- `POST /api/auth/refresh` – Refresh access token using refresh token (200 OK)
- `POST /api/auth/logout` – Logout current session, revoke refresh token (200 OK)
- `POST /api/auth/logout-all` – Logout all sessions (revoke all refresh tokens, 200 OK)
- `GET /api/auth/me` – Get current authenticated user info (200 OK)
- `POST /api/auth/verify-email` – Verify email with token (200 OK)
- `POST /api/auth/resend-verification` – Resend verification email (200 OK)
- `POST /api/auth/forgot-password` – Request password reset email (200 OK)
- `POST /api/auth/reset-password` – Reset password with token (200 OK)
- `POST /api/auth/change-password` – Change password (authenticated, 200 OK)
- `POST /api/auth/export-data` – GDPR data export (authenticated, 200 OK)
- `DELETE /api/auth/account` – Delete account (authenticated, requires password, 200 OK)

### Content Analytics Endpoints (User-Facing)
- `POST /api/content/:id/track` – Track user interaction (view, start, complete, quiz, rate) [auth required]
- `POST /api/content/:id/rate` – Rate content (difficulty, clarity, satisfaction) [auth required]
- `POST /api/content/:id/feedback` – Submit feedback/bug report [auth required]
- `GET /api/content/:id/metrics` – Public metrics for content (completion rate, avg rating) [public]

### Content Analytics Endpoints (Admin)
- `GET /api/admin/analytics/dashboard` – Complete dashboard summary (health grid, top performers, recommendations)
- `GET /api/admin/analytics/content/:id` – Detailed metrics for single content item
- `GET /api/admin/analytics/week/:week` – Metrics for entire week (missions + lab)
- `GET /api/admin/analytics/trending` – Trending content insights (trending up/down, needs refresh/removal)
- `GET /api/admin/analytics/recommendations` – List all recommendations (filtered by status)
- `POST /api/admin/analytics/recommendations/:id/action` – Act on recommendation (implemented, declined, dismissed)
- `GET /api/admin/analytics/feedback` – List feedback queue (filtered by status, severity)
- `POST /api/admin/analytics/feedback/:id/respond` – Respond to user feedback
- `POST /api/admin/analytics/feedback/:id/severity` – Update feedback severity
- `GET /api/admin/analytics/reports/feedback` – Feedback report (aggregated stats)
- `GET /api/admin/analytics/reports/top-issues` – Top reported content items

### Optional: User Progress
- `GET /api/progress` – User's XP, level, streak
- `POST /api/progress/reflection` – Save reflection journal entry
- `GET /api/logbook` – Learning history

---

## Authentication System

### Overview
The platform includes a production-grade user authentication system with JWT tokens, email verification, password reset, GDPR compliance, and account lockout protection.

**Admin User:** Username: `metrik`, Email: `metrikcorp@gmail.com` (seed-generated)

### Key Components

**Backend Auth:**
- `backend/src/services/AuthService.ts` (1,100+ lines) – Core auth logic: registration, login, token generation, password hashing (bcrypt cost 12), account lockout, GDPR export/deletion
- `backend/src/services/EmailService.ts` (600+ lines) – Transactional email via Nodemailer with HTML/text templates for verification, password reset, welcome, login alerts
- `backend/src/api/middleware/authMiddleware.ts` (550+ lines) – JWT verification, admin checks, rate limiting (5 login/15min, 3 reset/hour), CSRF protection
- `backend/src/api/routes/auth.ts` (1,623 lines) – 14 RESTful endpoints wired to AuthService, comprehensive error handling, logging

**Frontend Auth:**
- `frontend/src/store/authStore.ts` (600+ lines) – Zustand state management with token persistence, auto-refresh (5-min checks), global 401/403 error handling
- `frontend/src/contexts/AuthContext.tsx` (400+ lines) – React Context providing 12+ custom hooks: useAuth(), useLogin(), useRegister(), useForgotPassword(), useResetPassword(), useChangePassword(), useExportData(), useDeleteAccount(), useVerifyEmail(), useAdminLogin(), useLogout()
- `frontend/src/components/auth/*` – Components for all auth flows: LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, ChangePasswordForm, PasswordStrengthMeter, EmailVerificationPrompt, modals
- `frontend/src/pages/auth/*` – Full pages for login, register, forgot-password, reset-password, verify-email, admin-login, dashboard, profile

**Route Guards:**
- `frontend/src/components/auth/ProtectedRoute.tsx` – Requires authentication, redirects to /login if not authenticated
- `frontend/src/components/auth/AdminRoute.tsx` – Requires admin authentication (username === 'metrik'), redirects to /admin/login if not authenticated
- `frontend/src/components/auth/OptionalAuth.tsx` – Public route with auth optional (shows extra features if authenticated)

### Security Features

1. **Password Security:**
   - Bcrypt hashing (cost 12 ≈ 250ms per hash)
   - Minimum 8 chars, uppercase, lowercase, number, special char required
   - Passwords never logged or stored in plain text

2. **JWT Tokens:**
   - Access token: 15 minutes (short-lived)
   - Refresh token: 7 days default, 30 days with rememberMe
   - Tokens stored in httpOnly cookies (XSS protection)
   - Token rotation on refresh (old token revoked)

3. **Account Lockout:**
   - 5 failed login attempts → 15-minute lockout
   - Automatic unlock after timeout

4. **Email Verification:**
   - Required before sensitive operations
   - 24-hour single-use tokens
   - Resend capability with cooldown (60 seconds)

5. **Password Reset:**
   - 1-hour single-use reset tokens
   - All refresh tokens revoked after reset (force re-login)
   - User enumeration prevention (always return success, even if email not found)

6. **CSRF Protection:**
   - Double-submit cookie pattern
   - X-CSRF-Token header validation

7. **Rate Limiting:**
   - Login: 5 attempts per 15 minutes per IP
   - Password reset: 3 attempts per hour per IP
   - API general: 100 requests per 15 minutes

8. **Admin Security:**
   - Separate admin login endpoint (/api/auth/admin/login)
   - Username-only access (username must be 'metrik')
   - Admin routes protected via AdminRoute component

9. **GDPR Compliance:**
   - /api/auth/export-data – Export all user data (account, login history, sessions)
   - /api/auth/account DELETE – Permanently delete account and all associated data
   - Privacy policy acceptance tracking (acceptPrivacyPolicy field)
   - 90-day auth log retention policy (can be configured)

### Authentication Flow

**Registration:**
```
User → /api/auth/register (email, username, password)
  ↓ Validate (Zod schema)
  ↓ Hash password (bcrypt)
  ↓ Create user, generate verification token
  ↓ Send verification email (async, non-blocking)
  ↓ Return user + tokens (201 Created)
  ↓ Frontend: redirect to /verify-email prompt
```

**Login:**
```
User → /api/auth/login (email, password, rememberMe?)
  ↓ Validate input
  ↓ Find user by email
  ↓ Verify password (bcrypt comparison)
  ↓ Check account status (locked, etc.)
  ↓ Generate tokens (access + refresh)
  ↓ Set httpOnly cookies
  ↓ Update last_login timestamp
  ↓ Return user + tokens (200 OK)
  ↓ Frontend: redirect to /dashboard
```

**Token Refresh:**
```
Frontend (5-min auto-refresh) → /api/auth/refresh
  ↓ Verify refresh token signature
  ↓ Check if token revoked
  ↓ Generate new tokens (rotation)
  ↓ Revoke old refresh token
  ↓ Return new tokens (200 OK)
  ↓ Update httpOnly cookies
```

**Email Verification:**
```
User clicks verify link in email → /verify-email/:token
  ↓ Frontend extracts token from URL
  ↓ POST /api/auth/verify-email (token)
  ↓ Backend verifies token is valid, not expired
  ↓ Mark user.isEmailVerified = true
  ↓ Return success (200 OK)
  ↓ Frontend: redirect to /login with success message
```

**Password Reset:**
```
User → /forgot-password → POST /api/auth/forgot-password (email)
  ↓ Backend: prevent user enumeration (always return success)
  ↓ Generate 1-hour reset token (if user found)
  ↓ Send reset email with token link (async)
  ↓ Return success message (200 OK)
User clicks reset link in email → /reset-password/:token
  ↓ POST /api/auth/reset-password (token, newPassword, confirmPassword)
  ↓ Verify token, hash new password
  ↓ Revoke ALL refresh tokens (force re-login)
  ↓ Return success (200 OK)
  ↓ Frontend: redirect to /login
```

### Testing Authentication

**Unit Tests for AuthService:**
```bash
cd backend
npm run test -- AuthService.test.ts
```

**Integration Tests for Auth Routes:**
```bash
cd backend
npm run test -- auth.integration.test.ts
```

**Manual Testing (Frontend):**
```bash
# In one terminal, start backend
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev

# Visit http://localhost:5173/register
# Fill form, verify email, login, change password, logout
```

**Test Admin Login:**
- Username: `metrik`
- Password: `Cooldog420`
- Navigate to /admin/login or /admin after setup

### Configuration

**Backend .env for Auth:**
```env
# JWT
JWT_SECRET=<generate-random-32-byte-string>
JWT_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=7

# Email (Nodemailer SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Admin
ADMIN_USERNAME=metrik
ADMIN_PASSWORD_HASH=<bcrypt-hashed-password>

# Security
ACCOUNT_LOCKOUT_THRESHOLD=5
ACCOUNT_LOCKOUT_DURATION_MS=900000  # 15 minutes
PASSWORD_RESET_TOKEN_EXPIRY_HOURS=1
EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS=24

# GDPR
AUTH_LOG_RETENTION_DAYS=90
```

**Frontend .env for Auth:**
```env
VITE_API_URL=http://localhost:3000
VITE_AUTH_COOKIE_SECURE=false  # Set to true in production
VITE_TOKEN_REFRESH_INTERVAL_MS=300000  # 5 minutes
```

### Known Issues & Fixes

**TypeScript Build Errors (Nov 2025):**
- Frontend auth components needed proper type annotations for state setters
- Backend auth.ts needs AuthService method signature verification
- All Zod schemas must be properly exported from auth.types.ts
- Fixed: Added default exports to all auth pages, fixed import statements

### Documentation References

- `frontend/FRONTEND_AUTH_IMPLEMENTATION.md` – Complete frontend auth architecture and integration
- `frontend/AUTH_FLOW_DIAGRAM.md` – Visual ASCII diagrams for all auth flows
- `frontend/AUTH_QUICK_START.md` – 5-minute quick start guide
- `frontend/INTEGRATION_CHECKLIST.md` – Step-by-step integration instructions
- `frontend/IMPLEMENTATION_SUMMARY.md` – Security audit, performance, compliance
- `backend/AUTH_IMPLEMENTATION.md` – Complete backend auth documentation (if created)

---

## Configuration & Environment

### Backend .env Variables
```env
# Server
NODE_ENV=development|production
PORT=3000
API_URL=http://localhost:3000

# Database
DB_TYPE=sqlite|postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=omegaops
DB_USER=postgres
DB_PASSWORD=password

# Admin Auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>

# Logging
LOG_LEVEL=info|debug|error

# Workers (intervals in milliseconds)
KNOWLEDGE_WORKER_INTERVAL_MS=86400000     # 24 hours
SOFTWARE_DISCOVERY_INTERVAL_MS=604800000  # 7 days
SOFTWARE_DOC_INTERVAL_MS=604800000        # 7 days
```

### Frontend Vite Config
- Proxy API calls to backend: `proxy: { '/api': 'http://localhost:3000' }`
- Ensure `index.html` fallback for SPA routing

### Docker Configuration
- Multi-stage build: builder stage (Node) → runtime stage (Nginx + backend)
- `nginx.conf` must include: SPA fallback (`try_files $uri $uri/ /index.html`) and `/api` proxy
- `docker-compose.yml` must define volume for SQLite DB or managed volume for PostgreSQL
- Connect to external Nginx Proxy Manager network if applicable

---

## Deployment on Ubuntu + Nginx Proxy Manager

1. **Build & Deploy Container:**
   ```bash
   docker build -f docker/Dockerfile -t omegaops-academy:latest .
   cd docker
   docker-compose up -d
   ```

2. **Configure in Nginx Proxy Manager UI (http://npm-server:81):**
   - Proxy Hosts → Add Proxy Host
   - Domain: `academy.yourdomain.com`
   - Forward to: `omegaops-academy:80` (container name and port)
   - SSL: Force SSL + Request new certificate
   - HTTP/2: Enable
   - Save

3. **Verify:** Visit `https://academy.yourdomain.com` and test all routes

---

## Curriculum Structure (12 Weeks)

The platform includes a 12-week roadmap covering:

**Week 1-2:** Linux & systemd basics
**Week 3:** Web servers (Apache, Nginx)
**Week 4:** Databases (MySQL, PostgreSQL)
**Week 5:** DNS & networking
**Week 6:** Email stack (Postfix, Dovecot, SpamAssassin)
**Week 7:** Docker & containerization
**Week 8:** cPanel & WHM
**Week 9:** Security & PCI-DSS
**Week 10:** WordPress & CMS
**Week 11:** Incident response & forensics
**Week 12:** Performance tuning & capacity planning (capstone)

Each day includes a mission with narrative, tasks, quiz, and XP reward. Saturdays feature labs (scenario-based challenges).

---

## Software Galaxy Categories

Initial ~100 server tools organized by category:
- Web servers & proxies (Apache, Nginx, HAProxy, Caddy, Varnish)
- App runtimes (PHP-FPM, Node.js, Python, Ruby)
- Databases (MySQL, MariaDB, PostgreSQL, MongoDB, Redis)
- Mail stack (Exim, Postfix, Dovecot, SpamAssassin, Rspamd)
- DNS (BIND, PowerDNS, Unbound)
- Monitoring (Prometheus, Grafana, Loki, ELK)
- Security (Fail2ban, ModSecurity, Let's Encrypt, OpenVPN)
- Management (cPanel, Plesk, Portainer, Watchtower)
- Containers (Docker, Kubernetes, Docker Compose)
- Additional tools (Git, rsync, iptables, systemd, htop, strace)

Each tool includes install guides, config guides, and source references with confidence levels.

---

## Gamification System

- **XP per mission:** 5–50 XP based on difficulty
- **Leveling:** Every 1000 XP = 1 level
- **Streaks:** Days with ≥1 completed mission
- **Badges:** "Log Diver", "Docker Wrangler", "Incident Responder", "WHM Wizard", etc.

Optional user progress tracking via database (users, user_progress, user_reflections tables).

---

## Responsive Design & Accessibility

- **Breakpoints:** Mobile (<640px), Tablet (640–1024px), Desktop (>1024px), 4K (>2560px)
- **Accessibility:** WCAG 2.1 Level AA compliance
  - Keyboard navigation throughout
  - Semantic HTML (`<button>`, `<nav>`, `<main>`)
  - ARIA labels where needed
- **Theme:** Dark by default with toggle to light mode
- **Animations:** Smooth, subtle (not jarring)

---

## Linting & Formatting

- **ESLint:** Professional TypeScript rules (no `any`, strict null checks)
- **Prettier:** Code formatting (2-space indentation recommended)
- **Pre-commit Hooks:** Husky + lint-staged (optional but recommended)

Run before committing:
```bash
npm run lint && npm run format && npm run type-check && npm run test
```

---

## CI/CD Guidelines

- **GitHub Actions:** Checkout → Install → Type-check → Lint → Test → Build
- **Build artifacts:** Frontend → `dist/`, Backend → `dist/`
- **Docker push:** On merge to main, build and push to registry (or deploy directly)
- **Deployment:** SSH to Ubuntu server, `docker-compose up -d`

---

## What NOT to Do

- ❌ Auto-publish worker-generated changes; all must go through pending_updates approval
- ❌ Use production domains, real IPs, or credentials in code or examples
- ❌ Label unverified recommendations as "best practice"
- ❌ Skip tests or linting before commit
- ❌ Add dependencies without documenting in `package.json`
- ❌ Leave TypeScript errors unresolved
- ❌ Hardcode configuration; use `.env` files
- ❌ Mix frontend and backend logic in a single file

---

## Documentation Files to Maintain

- `README.md` – Project overview and quick start
- `VISION.md` – Long-term vision and mission statement
- `docs/ARCHITECTURE.md` – Deep-dive architecture
- `docs/DEVELOPMENT.md` – Dev setup and workflow
- `docs/DEPLOYMENT.md` – Deployment and ops runbook
- `docs/API.md` – REST API endpoint reference
- `.cursorrules` or `.env.example` – Configuration templates

---

## Debugging Tips

**Frontend issues:**
- Check `npm run type-check` for TypeScript errors
- Open browser DevTools (F12) → Network tab for API calls
- Verify Vite proxy in `vite.config.ts` points to backend
- Check `localStorage` for state persistence issues

**Backend issues:**
- Check logs: `npm run dev` output or `docker-compose logs -f`
- Verify `.env` variables are set correctly
- Test API directly: `curl http://localhost:3000/api/missions`
- Check database: `sqlite3 db.sqlite3 .tables` or Postgres connection string

**Worker issues:**
- Ensure `npm run build` completes without errors
- Check worker logs: `node dist/workers/KnowledgeWorker.js` (run manually)
- Verify source URLs are accessible (test with `curl`)
- Check database for `pending_updates` entries (did worker propose changes?)

**Docker issues:**
- Build locally first: `docker build -f docker/Dockerfile -t test .`
- Check multi-stage build output: `docker build --progress=plain`
- Verify nginx.conf SPA routing with `docker logs container-id`
- Ensure volumes are mounted for persistence (DB files)

---

## Questions?

Refer to the detailed documentation in `/docs/` or check inline code comments for implementation rationale.
