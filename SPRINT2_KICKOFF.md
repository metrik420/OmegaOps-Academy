# SPRINT 2 FULL KICKOFF - ADMIN UI & PROGRESS TRACKING
## Weeks 3-4 (Foundation Build Phase)

**Status:** 🟢 READY TO EXECUTE
**Sprint Duration:** 2 weeks (Days 1-10, starting now)
**Team Size:** 7 FTE
**Deliverables:** Admin UI, Progress API, Weeks 2-3 Content

---

## SPRINT 2 OVERVIEW

**Sprint Goal:** Enable admins to manage content, users to track progress, and expand curriculum to Weeks 2-3.

**What Gets Built:**
1. ✅ Admin Dashboard (health grid, pending updates, user management)
2. ✅ User Progress API (XP, levels, streaks, badges)
3. ✅ Progress Dashboard (frontend UI)
4. ✅ Weeks 2-3 Curriculum (10 missions, 2 labs)
5. ✅ Testing Infrastructure (>60% coverage)

**What's Ready:**
- ✅ Week 1 curriculum (seeded, working)
- ✅ Infrastructure (Docker, email, database, deployment)
- ✅ Database schema (15 tables designed)
- ✅ Analytics system (designed, backend ready)
- ✅ Frontend structure (authentication, responsive design)
- ✅ Backend API structure (35+ routes designed)

---

## TEAM ASSIGNMENTS

### Team Lead: Project Manager
- Daily standup facilitator
- Blocker unblocking
- Stakeholder communication
- Risk tracking

### Coder #1 (Full-Stack) - 40 hrs/week
**Primary Focus: Admin Dashboard & User Management**
- Week 1: Admin dashboard design & backend routes
- Week 2: Admin dashboard UI + integration tests

**Tasks:**
1. Design admin dashboard components (40 hrs)
   - Health grid (all content color-coded)
   - Pending updates queue
   - User management table
   - Analytics summary cards

2. Implement backend routes for admin features (30 hrs)
   - GET /api/admin/dashboard (summary stats)
   - GET /api/admin/users (list users)
   - GET /api/admin/pending-updates (list updates)
   - POST /api/admin/users/:id/disable (user management)
   - Backend response types, error handling

3. Build frontend components (40 hrs)
   - AdminDashboard page
   - HealthGrid component
   - PendingUpdatesQueue component
   - UserManagementTable component
   - Wire to real API endpoints

4. Integration tests (20 hrs)
   - Admin dashboard API responses
   - User filtering and sorting
   - Update queue functionality
   - Error handling (403 forbidden, etc)

**Deliverables:**
- Admin dashboard fully functional
- All CRUD operations working
- 15+ integration tests passing

---

### Coder #2 (Full-Stack) - 40 hrs/week
**Primary Focus: User Progress API & Progress Dashboard**
- Week 1: Progress API backend
- Week 2: Progress dashboard frontend + tests

**Tasks:**
1. Design progress API routes (20 hrs)
   - GET /api/progress (user's XP, level, streak)
   - POST /api/progress/mission/:id/complete (award XP)
   - GET /api/progress/badges (earned badges)
   - GET /api/progress/leaderboard (top users)

2. Implement XP & leveling system (30 hrs)
   - XP calculation by mission difficulty
   - Level-up logic (1000 XP = 1 level)
   - Streak tracking (consecutive days)
   - Badge award logic (10 initial badges)
   - Database updates (insert/update user_progress)

3. Build progress dashboard UI (30 hrs)
   - ProgressCard (XP bar, level, next milestone)
   - StreakDisplay (days in a row, milestone badges)
   - BadgeShowcase (earned badges with descriptions)
   - RecentActivity (latest completed missions)
   - AchievementUnlock animations

4. Unit & integration tests (20 hrs)
   - XP calculation accuracy
   - Level transitions
   - Streak logic (day rollover)
   - Badge awards
   - Dashboard rendering

**Deliverables:**
- Progress API 100% functional
- Progress dashboard polished & animated
- 20+ tests passing

---

### DevOps Engineer #1 - 30 hrs/week
**Primary Focus: Backend Build & Infrastructure**
- Week 1: Fix backend TypeScript, set up CI/CD
- Week 2: Monitor deployments, optimize

**Tasks:**
1. Fix backend TypeScript errors (15 hrs)
   - Remove/fix analytics code issues
   - Add proper type annotations
   - Test build locally
   - Verify dist/ output
   - Ensure npm run build succeeds

2. Set up CI/CD pipeline (20 hrs)
   - GitHub Actions workflow
   - Automatic tests on PR
   - Build Docker image on main merge
   - Deploy to staging automatically
   - Health check monitoring

3. Database initialization (10 hrs)
   - Create database migration runner
   - Verify migrations execute in Docker
   - Set up seed data pipeline
   - Test backup/restore

4. Monitoring & logging (10 hrs)
   - Implement structured logging
   - Set up log aggregation
   - Configure alerts (errors, crashes)
   - Health check dashboard

**Deliverables:**
- Backend builds successfully
- CI/CD pipeline working
- Automated deployments on merge
- Logging & monitoring in place

---

### DevOps Engineer #2 - 30 hrs/week
**Primary Focus: Database & Worker Setup**
- Week 1: Database hardening, backup
- Week 2: Worker infrastructure, scheduling

**Tasks:**
1. Database optimization (15 hrs)
   - Add missing indices
   - Vacuum/defragment
   - Set up automated backups (daily)
   - Create restore procedures
   - Test backup/restore workflow

2. Database migrations (15 hrs)
   - Create migration for analytics tables (prepared)
   - Create migration for Week 2-3 content
   - Test migrations forward/backward
   - Document rollback procedures

3. Worker scheduling (10 hrs)
   - Set up cron jobs (node-cron or Linux cron)
   - Schedule KnowledgeWorker (weekly)
   - Schedule ContentAnalyticsWorker (5-min, daily)
   - Implement worker error handling & retries
   - Set up worker monitoring & alerts

**Deliverables:**
- Database optimized & backed up daily
- Migrations automated
- Workers scheduled & monitored

---

### Content Writer #1 - 40 hrs/week
**Primary Focus: Week 2-3 Curriculum**

**Week 2: systemd & Services**
1. Mission 1: systemd Units & Services (8 hrs)
   - Learn .service files
   - Create custom service
   - Enable/disable services
   - 100-125 XP

2. Mission 2: Service Management (8 hrs)
   - systemctl commands
   - Dependency management
   - Target/RunLevel concepts
   - 125 XP

3. Mission 3: systemd Timers (8 hrs)
   - Timer units (.timer files)
   - Schedule periodic tasks
   - OnCalendar syntax
   - 125 XP

4. Mission 4: Advanced systemd (8 hrs)
   - System resource limits
   - Hardening units
   - Troubleshooting
   - 125 XP

5. Mission 5: Systemd Mastery (8 hrs)
   - Complex scenarios
   - Performance tuning
   - Integration patterns
   - 150 XP

6. Lab: Broken Service Recovery (8 hrs)
   - Scenario: systemd service failing to start
   - Root cause: missing dependency, bad config
   - User must diagnose and fix
   - Auto-grade validation
   - 200 XP

**Week 3: Web Servers (Apache & Nginx)**
1-5. Mission 1-5: Web Server Deep Dive (40 hrs)
   - Apache installation & configuration
   - Nginx architecture & performance
   - Virtual hosts
   - Security headers
   - SSL/TLS configuration

6. Lab: Web Server Migration (8 hrs)
   - Migrate Apache to Nginx
   - Preserve config, optimize
   - Test load & performance
   - 200 XP

**Deliverables:**
- 10 missions written (1,000+ words each)
- 2 labs designed with auto-grading
- All content verified against official docs
- 1,500+ XP available

---

### Content Writer #2 - 40 hrs/week
**Primary Focus: Week 2-3 Supplementary Content**

**Tasks:**
1. Knowledge base articles (20 hrs)
   - systemd architecture (1,000 words)
   - Apache vs Nginx comparison (1,500 words)
   - Common configuration patterns (1,000 words)
   - Security best practices (1,200 words)
   - Troubleshooting guide (1,000 words)

2. Software tool descriptions (15 hrs)
   - Document 20 web server tools
   - Install guides for each
   - Config examples
   - Security notes

3. Quiz questions & answers (5 hrs)
   - 40+ quiz questions for Week 2-3
   - Detailed explanations for each answer
   - Difficulty calibration

**Deliverables:**
- 5 knowledge articles (5,700+ words)
- 20 software tool guides
- 40+ quiz questions
- All content ready to seed

---

### QA Engineer - 30 hrs/week
**Primary Focus: Testing Infrastructure & Validation**

**Tasks:**
1. Unit tests (15 hrs)
   - XP calculation tests (10 tests)
   - Level-up logic tests (5 tests)
   - Badge award tests (8 tests)
   - Streak tracking tests (5 tests)
   - Admin route tests (10 tests)
   - Total: 38 unit tests

2. Integration tests (15 hrs)
   - Admin dashboard flow (5 tests)
   - Progress update flow (5 tests)
   - User management flow (3 tests)
   - Auth + admin role checks (3 tests)
   - Total: 16 integration tests

3. Manual testing (10 hrs)
   - Admin dashboard UI (responsive, accessible)
   - Progress dashboard UI (animations, responsiveness)
   - Create test user, complete mission, verify XP
   - Test badge unlocks
   - Cross-browser testing (Chrome, Firefox, Safari)

4. Test coverage reporting (5 hrs)
   - Generate coverage report
   - Target: >60% for Sprint 2
   - Document gaps
   - Recommend additional tests

**Deliverables:**
- 54 automated tests passing
- >60% code coverage
- QA sign-off on features
- Test report with gaps documented

---

### Security Engineer (Part-Time) - 10 hrs/week
**Primary Focus: Admin Authorization & Security Review**

**Tasks:**
1. Admin authorization (5 hrs)
   - Review AdminRoute component
   - Verify only 'metrik' user can access admin
   - Test 403 forbidden on non-admin access
   - Rate limiting on admin endpoints

2. Security review (3 hrs)
   - Review new API endpoints for vulnerabilities
   - Check input validation (Zod schemas)
   - Verify CSRF protection
   - Check for XSS vulnerabilities

3. Recommendations (2 hrs)
   - Document security findings
   - Recommend fixes (if any)
   - Sign-off on Sprint 2 release

**Deliverables:**
- Admin authorization verified
- Security review report
- Zero critical vulnerabilities

---

## SPRINT 2 DAILY TIMELINE

### Week 1 (Days 1-5)

**Day 1: Planning & Setup**
- Team standup (30 min)
- Review Sprint 2 goals & acceptance criteria
- Coders: Set up feature branches
- DevOps: Set up CI/CD pipeline skeleton
- Content: Research Week 2-3 official docs
- QA: Create test plan & matrix

**Days 2-5: Development**
- Coders: Implement backend routes + start frontend
- DevOps: Fix backend build, set up testing pipeline
- Content: Draft Week 2-3 missions & knowledge articles
- QA: Write unit tests as features are coded

**Friday 5: Mid-Sprint Check-in**
- Demo: Admin dashboard (early version)
- Metrics: 40% features done, on track
- Risk assessment: Any blockers?

### Week 2 (Days 6-10)

**Days 6-9: Integration & Refinement**
- Coders: Finish frontend, wire to APIs, polish UX
- DevOps: Monitor CI/CD, optimize builds
- Content: Finalize curriculum, seed database
- QA: Integration testing, coverage reporting

**Day 10: Sprint Review & Demo**
- Demo to stakeholders:
  - Admin dashboard walkthrough
  - Progress API & dashboard demo
  - Weeks 2-3 curriculum overview
- Retrospective (30 min)
- Sprint 3 planning (30 min)

---

## ACCEPTANCE CRITERIA (Definition of Done)

### Admin Dashboard
- ✅ Health grid shows all missions/labs color-coded
- ✅ Pending updates queue displays (if any)
- ✅ User management table lists all users
- ✅ Admin can disable/enable users
- ✅ Dashboard loads in <2 seconds
- ✅ Responsive on mobile, tablet, desktop
- ✅ Accessible (WCAG 2.1 AA)
- ✅ 10+ integration tests passing

### Progress API
- ✅ GET /api/progress returns user's XP, level, streak
- ✅ POST /api/missions/:id/complete awards XP correctly
- ✅ GET /api/progress/badges lists earned badges
- ✅ GET /api/progress/leaderboard shows top 10 users
- ✅ Level-up at 1000 XP increments
- ✅ Streak resets on missed days
- ✅ Badges award correctly based on criteria
- ✅ All routes protected by auth middleware
- ✅ 30+ unit tests passing

### Progress Dashboard
- ✅ Shows current XP, level, next milestone
- ✅ Displays day streak with animation on milestone
- ✅ Badge showcase with descriptions
- ✅ Recent activity feed
- ✅ Responsive design (mobile-first)
- ✅ Smooth animations (<300ms)
- ✅ Accessible (keyboard nav, screen reader)
- ✅ 10+ UI tests passing

### Week 2-3 Curriculum
- ✅ 10 missions written (1,000+ words each)
- ✅ 2 labs designed with auto-grading logic
- ✅ 5 knowledge articles (5,700+ words)
- ✅ 20 software tool guides
- ✅ 40+ quiz questions with answers
- ✅ All content verified against official docs
- ✅ Safe examples (example.com, RFC1918)
- ✅ Sources cited for all claims
- ✅ Seeded to database

### Testing Infrastructure
- ✅ Jest configured for backend
- ✅ Vitest configured for frontend
- ✅ 54+ automated tests passing
- ✅ >60% code coverage
- ✅ CI/CD pipeline runs on every PR
- ✅ Build fails if tests fail or coverage drops
- ✅ Health checks green

### Code Quality
- ✅ TypeScript build passes (0 errors)
- ✅ ESLint passes (0 warnings)
- ✅ No security vulnerabilities (npm audit)
- ✅ No `any` types (strict mode)
- ✅ JSDoc comments on all public functions
- ✅ Code review approved (2+ reviewers)

---

## DEPENDENCIES & BLOCKERS

**Critical Path:**
1. Backend TypeScript fix (Day 1-2)
2. Admin dashboard routes (Day 2-3)
3. Progress API (Day 2-4)
4. Admin UI components (Day 4-7)
5. Progress UI components (Day 4-7)
6. Integration (Day 8-9)
7. Testing & polish (Day 9-10)

**Risk: TypeScript Build**
- Mitigation: Have working Docker image from Sprint 1
- Fallback: Deploy frontend only if backend delayed

**Risk: Schema Changes**
- Mitigation: Have migration scripts ready
- Fallback: Manual SQL migrations

---

## SUCCESS METRICS

**By End of Sprint 2:**
- ✅ Admin dashboard functional
- ✅ Progress API complete
- ✅ Progress dashboard polished
- ✅ Weeks 2-3 curriculum seeded (1,500+ XP)
- ✅ >60% test coverage
- ✅ CI/CD pipeline working
- ✅ 0 critical security issues
- ✅ All acceptance criteria met

**User Facing:**
- Users can see their XP, level, streak
- Users earn badges for achievements
- Admins can view dashboard and manage users
- Weeks 2-3 content available for learning

---

## COMMANDS FOR TEAM

### Build & Test
```bash
# Backend
cd backend
npm run build              # Compile TypeScript
npm run test              # Run tests
npm run test:coverage     # Coverage report

# Frontend
cd frontend
npm run build             # Build for production
npm run test              # Run tests
npm run test:coverage     # Coverage report

# Full QA
npm run lint && npm run test && npm run type-check
```

### Deploy to Staging
```bash
cd docker/scripts
./full-rebuild.sh         # Full deployment
```

### Database
```bash
# Run migrations
npm run db:migrate

# Seed data
npm run db:seed

# Backup
cd docker/scripts
./backup.sh
```

---

## COMMUNICATION SCHEDULE

**Daily (9:00 AM):** Sprint standup (15 min)
- What did you complete?
- What are you working on today?
- Any blockers?

**Wednesday (2:00 PM):** Mid-sprint checkpoint (30 min)
- Progress review
- Demos of completed features
- Risk assessment

**Friday (4:00 PM):** Sprint review & retro (90 min)
- Demo to stakeholders
- Retrospective
- Sprint 3 planning

---

## NEXT SPRINT (Sprint 3, Weeks 5-6)

After Sprint 2 completes:
- Implement KnowledgeWorker
- Implement analytics tracking
- Seed Week 4 curriculum
- Expand software tools to 50+

---

**Sprint 2 is GO! Let's build. 🚀**

**Expected Completion: 2 weeks from today**
**Go-Live: Week 12 (November 2025)**
