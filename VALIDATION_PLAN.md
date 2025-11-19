# OMEGAOPS ACADEMY - COMPREHENSIVE VALIDATION PLAN
## 3-Round Validation Before Production Deployment

**Date:** 2025-11-19
**Mission:** Validate 100% of features across auth, content, infrastructure, APIs before live deployment

---

## CRITICAL FINDING RESOLUTION

### Issue Identified
- **Problem:** Original container (omegaops-academy) was running ONLY frontend (Nginx serving static React SPA)
- **Backend:** Node.js/Express API was NOT running in container
- **Database:** SQLite database inaccessible (no backend to interact with it)
- **Root Cause:** Container built with `Dockerfile` (frontend-only) instead of `Dockerfile.production` (full stack)

### Solution Implemented
- **Action:** Rebuild container using `Dockerfile.production` + `docker-compose.production.yml`
- **New Architecture:**
  - Frontend: Nginx serving React SPA on port 80
  - Backend: Node.js/Express API on port 3001
  - Database: SQLite with persistent volume (`omegaops-data`)
  - Process Manager: Supervisord managing both Nginx + Node.js
  - Health Check: Validates both frontend (`/`) and backend (`/api/health`)

---

## VALIDATION STRATEGY

### Round 1: Core Functionality (First Pass)
**Objective:** Verify all critical paths work
**Time:** ~45 minutes
**Gate:** All critical features must pass

#### Agent 1: Code Health & Architecture Audit (Explore Agent)
- [ ] TypeScript compilation (frontend + backend) - 0 errors
- [ ] ESLint validation - 0 critical errors
- [ ] Database migrations applied successfully
- [ ] All API routes properly typed
- [ ] Authentication system fully integrated
- [ ] No build warnings or deprecations

**Deliverable:** Code Quality Report (JSON format with pass/fail per component)

#### Agent 2: Performance & System Validation (Analytics-Optimizer)
- [ ] Container health check responding (both Nginx + backend)
- [ ] API response times measured (baseline: <100ms for simple queries)
- [ ] Database query performance (baseline: <50ms for indexed lookups)
- [ ] Nginx static asset caching verified
- [ ] Memory/CPU utilization under 30 concurrent requests (<1GB RAM, <50% CPU)
- [ ] Email service connectivity tested

**Deliverable:** Performance Baseline Report (metrics, bottlenecks, recommendations)

#### Agent 3: Functional Testing (QA-Testing-Agent)

**Authentication Flows:**
- [ ] POST /api/auth/register (new user registration)
- [ ] POST /api/auth/verify-email (email verification)
- [ ] POST /api/auth/login (email/password login)
- [ ] POST /api/auth/admin/login (admin username login: metrik/Cooldog420)
- [ ] POST /api/auth/refresh (token rotation)
- [ ] POST /api/auth/logout (single session)
- [ ] POST /api/auth/logout-all (all sessions)
- [ ] POST /api/auth/forgot-password (reset request)
- [ ] POST /api/auth/reset-password (password reset)
- [ ] POST /api/auth/change-password (authenticated user)
- [ ] POST /api/auth/export-data (GDPR data export)
- [ ] DELETE /api/auth/account (account deletion)

**Content API Routes:**
- [ ] GET /api/roadmap (12-week overview)
- [ ] GET /api/missions (Week 1 missions list)
- [ ] GET /api/missions/:id (single mission detail)
- [ ] GET /api/labs (labs list)
- [ ] GET /api/knowledge (knowledge base)
- [ ] GET /api/software (software galaxy)

**Admin Routes:**
- [ ] GET /api/admin/pending-updates (requires admin auth)
- [ ] GET /api/admin/users (requires admin auth)
- [ ] POST /api/admin/pending-updates/:id/approve
- [ ] POST /api/admin/pending-updates/:id/reject

**Frontend UI:**
- [ ] Homepage loads (HTTP 200, no console errors)
- [ ] All routes work (/dashboard, /roadmap, /missions, /labs, /knowledge, /software, /profile)
- [ ] Authentication UI (register, login, password reset pages)
- [ ] Admin UI (/admin/login, /admin/dashboard)
- [ ] Responsive design (mobile 375px, tablet 768px, desktop 1920px)
- [ ] No React errors in console

**Database:**
- [ ] All 15 tables exist (users, refresh_tokens, missions, labs, knowledge_topics, etc.)
- [ ] Week 1 content seeded (5 missions)
- [ ] Admin user exists (username: metrik, isAdmin: true)
- [ ] Can read/write test records

**Deliverable:** QA Test Matrix (detailed pass/fail per test, screenshots if failures)

#### Agent 4: Type Safety & Security (RootCoder)
- [ ] `npm run build` passes (frontend + backend, 0 errors)
- [ ] `npm run lint` passes (0 errors, <10 warnings acceptable)
- [ ] TypeScript strict mode enabled
- [ ] No `any` types in critical paths (auth, database, API)
- [ ] All exported functions have JSDoc comments
- [ ] Authentication middleware applied to protected routes
- [ ] Input validation (Zod schemas) on all API endpoints
- [ ] Security scan: XSS, SQL injection, CSRF vulnerabilities
- [ ] Secrets not in code or logs (JWT_SECRET, DB_PASSWORD, EMAIL_PASSWORD)

**Deliverable:** Code Quality + Security Report (0 critical vulnerabilities)

#### Agent 5: Documentation Verification (Docs-Knowledge-Manager)
- [ ] SPRINT2_KICKOFF.md matches actual team assignments
- [ ] SPRINT2_READINESS_REPORT.md is accurate
- [ ] CLAUDE.md describes actual implemented features
- [ ] All API endpoints documented
- [ ] .env.example has all required variables
- [ ] Database schema documentation complete
- [ ] Deployment runbook exists (docker-compose, scripts)
- [ ] Authentication system fully documented

**Deliverable:** Documentation Completeness Report (all docs accurate)

---

### Round 2: Consistency & Stability (Second Pass)
**Objective:** Verify features work consistently across different scenarios
**Time:** ~45 minutes
**Gate:** Performance stable, no race conditions, no memory leaks

**Focus Areas:**
- Run same tests as Round 1 with different test data
- Test concurrent requests (10 simultaneous API calls)
- Test session management (multiple browser tabs, different users)
- Test token expiry and refresh edge cases
- Test database transactions under load
- Monitor memory/CPU over 5-minute sustained load

**Deliverable:** Stability Report (performance graphs, race condition checks, memory leak analysis)

---

### Round 3: Stress Testing & Edge Cases (Third Pass)
**Objective:** Validate system handles edge cases and stress
**Time:** ~45 minutes
**Gate:** Load testing passes, error handling robust, rollback scenarios tested

**Stress Tests:**
- [ ] 100 concurrent login requests (rate limiting works)
- [ ] 1000 API requests in 1 minute (no timeouts, <5% error rate)
- [ ] Database: 10,000 records (query performance remains acceptable)
- [ ] Invalid input handling (malformed JSON, SQL injection attempts, XSS payloads)
- [ ] Token expiry edge cases (expired, invalid, revoked tokens)
- [ ] Email service failure scenarios (SMTP down, invalid credentials)
- [ ] Disk space constraints (90% full, log rotation works)

**Edge Cases:**
- [ ] User registration with duplicate email
- [ ] Password reset for non-existent user
- [ ] Admin login with wrong username
- [ ] CORS requests from unauthorized origins
- [ ] Large file uploads (if supported)
- [ ] Network timeouts (API calls >30 seconds)

**Rollback Scenarios:**
- [ ] Container restart (data persists via volumes)
- [ ] Database rollback (migrations reversible)
- [ ] Git revert (code changes reversible)
- [ ] Config change rollback (Nginx, supervisord, .env)

**Deliverable:** Stress Test Report (load test results, edge case matrix, rollback proof)

---

## DEPLOYMENT PROCESS

**ONLY IF ALL 3 ROUNDS PASS:**

### Step 1: Git Commit & Push
```bash
git add .
git commit -m "feat: Sprint 2 production readiness - full stack validation complete

- Rebuilt container with Dockerfile.production (frontend + backend + supervisord)
- Fixed authentication system integration (12 auth endpoints tested)
- Validated all content APIs (roadmap, missions, labs, knowledge, software)
- Verified admin routes and RBAC
- Fixed ESLint errors in frontend
- Documented complete validation results

Validation Summary:
- Round 1: Core Functionality ✅ (100% pass)
- Round 2: Consistency & Stability ✅ (100% pass)
- Round 3: Stress Testing & Edge Cases ✅ (100% pass)
- Security: 0 critical vulnerabilities
- Performance: Baselines established
- Documentation: 100% accurate

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### Step 2: Docker Production Deployment
```bash
cd /home/metrik/docker/learn/docker
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml logs -f
```

### Step 3: Nginx Proxy Manager Configuration
- URL: https://learn.metrikcorp.com
- Forward to: `omegaops-academy:80`
- SSL: Force SSL + Let's Encrypt certificate
- HTTP/2: Enable
- WebSocket Support: Enable (if needed)

### Step 4: Live Deployment Verification
- [ ] https://learn.metrikcorp.com loads (HTTP 200)
- [ ] Login/register flows work
- [ ] Content visible to logged-in users
- [ ] Admin dashboard accessible (/admin)
- [ ] No 500 errors in logs
- [ ] Response times <200ms (99th percentile)
- [ ] SSL certificate valid
- [ ] CORS headers correct

### Step 5: Post-Deployment Monitoring
- [ ] Check logs for errors (first 10 minutes)
- [ ] Monitor CPU/memory on live container
- [ ] Test email notifications (send test verification email)
- [ ] Verify database backups are running
- [ ] Check Nginx Proxy Manager access logs

---

## SUCCESS CRITERIA CHECKLIST

### Code Quality ✅
- [ ] All TypeScript compiles (0 errors)
- [ ] All ESLint passes (<10 warnings)
- [ ] All unit tests pass (if implemented)
- [ ] All integration tests pass

### Functionality ✅
- [ ] All 12 authentication flows work
- [ ] All 6+ content APIs return correct data
- [ ] Frontend UI renders without errors
- [ ] Database operations working
- [ ] Admin routes protected and functional

### Performance ✅
- [ ] API response times <100ms (simple queries)
- [ ] Frontend load time <2 seconds
- [ ] Memory usage <1GB under load
- [ ] CPU usage <50% under 30 concurrent requests

### Security ✅
- [ ] No critical vulnerabilities
- [ ] Secrets not in code or logs
- [ ] CSRF protection enabled
- [ ] Rate limiting working
- [ ] Input validation on all endpoints

### Documentation ✅
- [ ] CLAUDE.md accurate
- [ ] API endpoints documented
- [ ] Deployment runbook complete
- [ ] .env.example has all variables

### Deployment ✅
- [ ] Git push succeeds
- [ ] https://learn.metrikcorp.com loads
- [ ] Login/register flows work
- [ ] Content visible
- [ ] Admin dashboard accessible
- [ ] No 500 errors in logs

---

## RISK ASSESSMENT

### High Risk Items (Require Extra Validation)
1. **Authentication System:** Token management, session security, password reset
2. **Database Migrations:** Data integrity during schema changes
3. **CORS Configuration:** Prevent unauthorized origin access
4. **Email Service:** SMTP credentials, deliverability, spam filters
5. **Admin Routes:** RBAC, authorization checks, privilege escalation

### Medium Risk Items
1. **Frontend Build:** TypeScript compilation, bundle size, asset optimization
2. **API Performance:** Query optimization, N+1 queries, caching
3. **Container Restart:** Data persistence, volume mounting, process management
4. **Nginx Configuration:** Proxy settings, static asset caching, SSL termination

### Low Risk Items
1. **Documentation Updates:** No runtime impact
2. **ESLint Fixes:** Code quality improvements
3. **Logging Configuration:** Non-critical paths
4. **UI Cosmetic Changes:** No functional impact

---

## ROLLBACK PLAN

### If Deployment Fails:

**Immediate Rollback (< 2 minutes):**
```bash
cd /home/metrik/docker/learn/docker
docker-compose -f docker-compose.production.yml down
docker-compose up -d  # Revert to previous working version
```

**Git Rollback:**
```bash
git revert HEAD
git push origin main
```

**Database Rollback (if needed):**
```bash
cd /home/metrik/docker/learn/docker
./scripts/restore.sh <backup-timestamp>
```

**Nginx Proxy Manager Rollback:**
- Revert proxy host configuration to previous working state
- No downtime (NPM handles routing changes instantly)

---

## TIMELINE

```
14:00 - START (container rebuild initiated)
14:10 - Container build complete, services starting
14:15 - Round 1 validation begins (all 5 agents in parallel)
15:00 - Round 1 reports due + review
15:15 - Round 2 validation begins
16:00 - Round 2 reports due + review
16:15 - Round 3 validation begins
17:00 - Round 3 reports due + final decision
17:10 - Git commit & push
17:20 - Live deployment verification
17:30 - COMPLETE (all validation + deployment done)
```

**Total Estimated Time:** ~3.5 hours (build + 3 validation rounds + deployment)

---

## DELIVERABLES

1. **Validation Report #1** – Round 1 results (core functionality)
2. **Validation Report #2** – Round 2 results (consistency & stability)
3. **Validation Report #3** – Round 3 results (stress testing)
4. **Security Report** – Zero vulnerabilities confirmed
5. **Performance Report** – Baselines established
6. **Live Deployment Report** – Go-live confirmation
7. **Master Deployment Log** – All changes documented
8. **MEMORY.md Update** – Decision log with rationale and outcomes

---

## CONTACT & ESCALATION

**If Critical Blocker Found:**
1. Stop validation immediately
2. Document the blocker (logs, screenshots, error messages)
3. Escalate to Director Agent with options:
   - **Option A:** Fix blocker and re-run validation round
   - **Option B:** Defer to next sprint (document technical debt)
   - **Option C:** Rollback deployment and investigate root cause
4. Wait for approval before proceeding

**Success Criteria for Go-Live:**
- ALL 3 validation rounds pass (100% of critical tests)
- ZERO critical security vulnerabilities
- Performance meets baseline requirements
- Documentation 100% accurate

---

**Status:** Container rebuild in progress (ETA: 10 minutes)
**Next Action:** Complete container build → Start Round 1 validation
