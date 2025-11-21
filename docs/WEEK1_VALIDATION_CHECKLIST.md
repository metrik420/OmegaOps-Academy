# Week 1 Curriculum - Validation Checklist

This document provides step-by-step instructions for validating the Week 1 curriculum content.

---

## Pre-Deployment Checklist

Before deploying Week 1 content to production, verify all items below:

### 1. Content Files Present

- [ ] SQL seed script exists: `/home/metrik/docker/learn/backend/src/database/seeds/week1-content.sql`
- [ ] JSON missions file exists: `/home/metrik/docker/learn/backend/src/database/seeds/week1-missions.json`
- [ ] JSON labs file exists: `/home/metrik/docker/learn/backend/src/database/seeds/week1-labs.json`
- [ ] Documentation exists: `/home/metrik/docker/learn/docs/WEEK1_CURRICULUM.md`
- [ ] Validation checklist exists: `/home/metrik/docker/learn/docs/WEEK1_VALIDATION_CHECKLIST.md`

### 2. Content Quality

- [ ] All 5 missions have unique IDs starting with `wk1-day`
- [ ] All missions have week=1, days 1-5
- [ ] All missions have engaging narratives (not dry instructions)
- [ ] All missions use safe examples (example.com, RFC1918 IPs, no real credentials)
- [ ] All quiz questions have 4 options with correct answer index
- [ ] All quiz questions have explanations
- [ ] All sources are cited with URLs and confidence levels
- [ ] Lab has realistic scenario description
- [ ] Lab has clear acceptance criteria
- [ ] Lab includes verification commands

### 3. XP Rewards

- [ ] Mission 1 (Monday): 100 XP
- [ ] Mission 2 (Tuesday): 125 XP
- [ ] Mission 3 (Wednesday): 125 XP
- [ ] Mission 4 (Thursday): 125 XP
- [ ] Mission 5 (Friday): 150 XP
- [ ] Lab (Saturday): 200 XP
- [ ] **Total XP: 625 (missions) + 200 (lab) = 825 XP**

### 4. Difficulty Progression

- [ ] Mission 1 is easiest (SSH basics, file navigation)
- [ ] Missions 2-4 are medium difficulty (permissions, systemd, users)
- [ ] Mission 5 is hardest mission (process management, troubleshooting)
- [ ] Lab integrates all Week 1 concepts
- [ ] Lab is beginner-friendly but challenging

### 5. Technical Accuracy

- [ ] All commands are valid and tested
- [ ] All commands use current syntax (no deprecated flags)
- [ ] Commands work on Ubuntu 22.04
- [ ] Commands work on AlmaLinux 9 (where applicable)
- [ ] File paths are correct (/etc/passwd, /var/www/html, etc.)
- [ ] No security anti-patterns (no chmod 777, no hardcoded passwords)

---

## Database Seeding Validation

### Step 1: Backup Existing Database

Before seeding, backup your current database:

```bash
cd /home/metrik/docker/learn
mkdir -p backups
cp data/omegaops.db backups/omegaops-backup-$(date +%Y%m%d-%H%M%S).db
```

**Verification:**
```bash
ls -lh backups/
```

**Expected:** You see a backup file with current timestamp.

### Step 2: Seed Week 1 Content

Run the SQL seed script:

```bash
cd /home/metrik/docker/learn/backend
sqlite3 ../data/omegaops.db < src/database/seeds/week1-content.sql
```

**Expected Output:**
```
Week 1 curriculum seeded successfully!
Missions: 5
Labs: 1
Total XP: 825
```

**Verification Commands:**

```bash
# Verify missions table
sqlite3 ../data/omegaops.db "SELECT id, week, day, title, xpReward FROM missions WHERE week = 1 ORDER BY day;"

# Expected output (5 rows):
# wk1-day1-first-server-access|1|1|Your First Server Access|100
# wk1-day2-file-permissions|1|2|Master File Permissions|125
# wk1-day3-systemd-services|1|3|systemd Service Master|125
# wk1-day4-users-groups|1|4|Manage Users & Groups|125
# wk1-day5-process-management|1|5|Process & Resource Management|150

# Verify labs table
sqlite3 ../data/omegaops.db "SELECT id, title, difficulty, xpReward FROM labs WHERE id = 'wk1-lab-troubleshooting';"

# Expected output (1 row):
# wk1-lab-troubleshooting|Emergency: Critical Service Down|beginner|200

# Verify total XP
sqlite3 ../data/omegaops.db "SELECT SUM(xpReward) as total_mission_xp FROM missions WHERE week = 1;"
# Expected: 625

sqlite3 ../data/omegaops.db "SELECT xpReward as lab_xp FROM labs WHERE id = 'wk1-lab-troubleshooting';"
# Expected: 200

# Grand total should be 825 XP
```

### Step 3: Test API Endpoints

Start the backend server:

```bash
cd /home/metrik/docker/learn/backend
npm run dev
```

In another terminal, test the API endpoints:

```bash
# Test: Get all Week 1 missions
curl -s http://localhost:3000/api/missions?week=1 | jq

# Expected: JSON array with 5 missions
# Verify all missions have week=1, days 1-5

# Test: Get specific mission (Day 1)
curl -s http://localhost:3000/api/missions/wk1-day1-first-server-access | jq

# Expected: Full mission object with title, narrative, objectives, tasks, quiz

# Test: Get Week 1 lab
curl -s http://localhost:3000/api/labs?week=1 | jq

# Expected: JSON array with 1 lab

# Test: Get specific lab
curl -s http://localhost:3000/api/labs/wk1-lab-troubleshooting | jq

# Expected: Full lab object with scenario, objectives, hints
```

**Checklist:**

- [ ] All 5 missions returned by `/api/missions?week=1`
- [ ] Each mission has complete data (title, narrative, objectives, tasks, quiz)
- [ ] All mission IDs are accessible individually
- [ ] Lab is returned by `/api/labs?week=1`
- [ ] Lab has complete data (scenario, objectives, hints)
- [ ] No 404 or 500 errors

### Step 4: Frontend Integration Test

Start the frontend:

```bash
cd /home/metrik/docker/learn/frontend
npm run dev
```

Open browser to `http://localhost:5173` and test:

**Manual Test Checklist:**

- [ ] Navigate to Roadmap page
- [ ] Week 1 is visible with title "Linux & systemd Basics"
- [ ] Week 1 shows 5 missions (Monday-Friday)
- [ ] Click on Mission 1 "Your First Server Access"
- [ ] Mission page loads with narrative, objectives, tasks, quiz
- [ ] All 3 tasks are visible with instructions
- [ ] Quiz has 4 questions with 4 options each
- [ ] Navigate to Labs page
- [ ] Week 1 lab "Emergency: Critical Service Down" is visible
- [ ] Click on lab to view full scenario
- [ ] Lab page shows scenario description, objectives, hints
- [ ] No console errors in browser DevTools
- [ ] No layout issues or broken styling

### Step 5: Data Integrity Validation

Verify JSON structure and data types:

```bash
# Verify missions JSON structure
sqlite3 ../data/omegaops.db "SELECT objectives FROM missions WHERE id = 'wk1-day1-first-server-access';"

# Expected: Valid JSON array with 4 strings

# Verify tasks JSON structure
sqlite3 ../data/omegaops.db "SELECT tasks FROM missions WHERE id = 'wk1-day1-first-server-access';"

# Expected: Valid JSON array with 3 task objects, each with id, title, instructions, expectedOutcome, hints, xpValue

# Verify quiz JSON structure
sqlite3 ../data/omegaops.db "SELECT quiz FROM missions WHERE id = 'wk1-day1-first-server-access';"

# Expected: Valid JSON array with 4 quiz question objects, each with question, options (array of 4), correct (number 0-3), explanation

# Verify lab objectives
sqlite3 ../data/omegaops.db "SELECT objectives FROM labs WHERE id = 'wk1-lab-troubleshooting';"

# Expected: Valid JSON array with 7 strings

# Verify lab hints
sqlite3 ../data/omegaops.db "SELECT hints FROM labs WHERE id = 'wk1-lab-troubleshooting';"

# Expected: Valid JSON array with 10 strings
```

**Validation Checklist:**

- [ ] All JSON fields parse correctly (no syntax errors)
- [ ] All arrays have expected number of elements
- [ ] All objects have required properties
- [ ] All strings are properly escaped
- [ ] All numbers are valid (not strings)
- [ ] All timestamps are ISO 8601 format

### Step 6: Source Verification

Manually verify that all cited sources are accessible and accurate:

**Mission 1 Sources:**
- [ ] https://man7.org/linux/man-pages/man1/ssh.1.html (SSH manual)
- [ ] https://linuxhandbook.com/ssh/ (SSH guide)

**Mission 2 Sources:**
- [ ] https://man7.org/linux/man-pages/man1/chmod.1.html (chmod manual)
- [ ] https://help.ubuntu.com/community/FilePermissions (Ubuntu guide)

**Mission 3 Sources:**
- [ ] https://systemd.io/ (systemd homepage)
- [ ] https://man7.org/linux/man-pages/man1/systemctl.1.html (systemctl manual)

**Mission 4 Sources:**
- [ ] https://man7.org/linux/man-pages/man8/useradd.8.html (useradd manual)
- [ ] https://help.ubuntu.com/community/Sudoers (Ubuntu sudo guide)

**Mission 5 Sources:**
- [ ] https://man7.org/linux/man-pages/man1/ps.1.html (ps manual)
- [ ] https://man7.org/linux/man-pages/man1/kill.1.html (kill manual)

**Lab Sources:**
- [ ] https://nginx.org/en/docs/debugging_log.html (Nginx debugging)
- [ ] https://www.redhat.com/sysadmin/linux-disk-space (Disk space guide)
- [ ] https://www.freedesktop.org/software/systemd/man/systemctl.html (systemctl docs)

**Verification:**
- All URLs return HTTP 200
- All URLs are HTTPS (secure)
- All URLs point to official or reputable sources
- No dead links (404 errors)

---

## User Experience Testing

### Test: Complete Mission Flow

Simulate a student completing Mission 1:

1. **Navigate to Mission:**
   - [ ] Click on Week 1, Day 1 mission
   - [ ] Mission page loads without errors

2. **Read Warmup Questions:**
   - [ ] Warmup questions are visible
   - [ ] Warmup questions are relevant to mission topic

3. **Complete Tasks:**
   - [ ] Task 1 instructions are clear and actionable
   - [ ] Task 2 instructions are clear and actionable
   - [ ] Task 3 instructions are clear and actionable
   - [ ] All code blocks are properly formatted
   - [ ] All commands are copy-pasteable

4. **Take Quiz:**
   - [ ] Quiz has 4 questions
   - [ ] Each question has 4 options
   - [ ] Selecting an option highlights it
   - [ ] Submit button works
   - [ ] Correct/incorrect feedback is shown
   - [ ] Explanation is displayed after answering

5. **Complete Mission:**
   - [ ] "Complete Mission" button is visible
   - [ ] Clicking button awards XP
   - [ ] XP is added to user's total
   - [ ] Mission is marked as completed in progress tracker

6. **Progress Tracking:**
   - [ ] Completed mission shows green checkmark
   - [ ] XP is reflected in user profile
   - [ ] Next mission is unlocked (if applicable)

### Test: Complete Lab Flow

Simulate a student attempting the Week 1 lab:

1. **Navigate to Lab:**
   - [ ] Click on Week 1 lab
   - [ ] Lab page loads without errors

2. **Read Scenario:**
   - [ ] Scenario description is engaging and realistic
   - [ ] Scenario clearly describes the problem
   - [ ] Objectives are clearly listed

3. **Use Hints:**
   - [ ] Hints are available (not shown by default)
   - [ ] Clicking "Show Hint" reveals progressive hints
   - [ ] Hints are helpful but not complete solutions

4. **Complete Lab:**
   - [ ] Acceptance criteria are clear
   - [ ] Student can verify completion
   - [ ] "Complete Lab" button awards XP
   - [ ] Lab is marked as completed

---

## Performance Testing

### Database Query Performance

Test query performance with timing:

```bash
# Time query for all Week 1 missions
time sqlite3 ../data/omegaops.db "SELECT * FROM missions WHERE week = 1;"

# Expected: < 100ms

# Time query for specific mission
time sqlite3 ../data/omegaops.db "SELECT * FROM missions WHERE id = 'wk1-day1-first-server-access';"

# Expected: < 50ms

# Time query for lab
time sqlite3 ../data/omegaops.db "SELECT * FROM labs WHERE id = 'wk1-lab-troubleshooting';"

# Expected: < 50ms
```

**Performance Checklist:**

- [ ] All queries return in < 100ms
- [ ] No N+1 query problems
- [ ] Indexes are present on week and day columns
- [ ] Database size is reasonable (< 10MB for Week 1)

### API Response Time

Test API endpoint performance:

```bash
# Time API call for Week 1 missions
time curl -s http://localhost:3000/api/missions?week=1 > /dev/null

# Expected: < 200ms

# Time API call for specific mission
time curl -s http://localhost:3000/api/missions/wk1-day1-first-server-access > /dev/null

# Expected: < 150ms
```

**Performance Checklist:**

- [ ] API responses in < 200ms
- [ ] No memory leaks
- [ ] No excessive logging
- [ ] Efficient JSON parsing

---

## Security Validation

### Check for Security Issues

**Content Security:**

- [ ] No real credentials in any content (username/password/API keys)
- [ ] No real domain names (only example.com, example.org)
- [ ] No real IP addresses (only RFC1918 private IPs: 192.168.x.x, 10.x.x.x, 172.16.x.x)
- [ ] No SQL injection in example commands
- [ ] No command injection vulnerabilities in examples
- [ ] No unsafe chmod 777 recommendations
- [ ] No recommendations to disable firewalls without context

**Code Security:**

```bash
# Grep for potential security issues in SQL file
grep -i "password.*=" backend/src/database/seeds/week1-content.sql
# Expected: No real passwords (only placeholder examples)

grep -i "api.*key" backend/src/database/seeds/week1-content.sql
# Expected: No real API keys

# Check for unsafe examples
grep -i "chmod 777" backend/src/database/seeds/week1-content.sql
# Expected: Only mentioned as anti-pattern (what NOT to do)
```

**Security Checklist:**

- [ ] No hardcoded secrets
- [ ] No production credentials
- [ ] No real domains or IPs
- [ ] Safe examples only
- [ ] Security best practices followed
- [ ] No anti-patterns recommended

---

## Accessibility Validation

### Frontend Accessibility

Test with browser accessibility tools:

**Checklist:**

- [ ] All headings are semantic (h1, h2, h3 hierarchy)
- [ ] All buttons have accessible labels
- [ ] All form inputs have labels
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader compatible (test with NVDA or VoiceOver)
- [ ] No motion sickness triggers (no autoplay animations)

---

## Rollback Plan

If validation fails or issues are discovered:

### Step 1: Restore Database Backup

```bash
cd /home/metrik/docker/learn
cp backups/omegaops-backup-TIMESTAMP.db data/omegaops.db
```

### Step 2: Verify Rollback

```bash
sqlite3 data/omegaops.db "SELECT COUNT(*) FROM missions WHERE week = 1;"
# Expected: 0 (if rolled back to pre-Week-1 state)
```

### Step 3: Fix Issues

- Review validation checklist
- Fix identified issues in source files
- Re-run seeding process
- Re-run validation checklist

---

## Post-Deployment Monitoring

After deploying Week 1 to production:

### Day 1 Monitoring

- [ ] Monitor error logs for new errors related to Week 1 content
- [ ] Check user feedback (support tickets, forum posts)
- [ ] Monitor API performance (response times, error rates)
- [ ] Check database performance (query times, locks)

### Week 1 Monitoring

- [ ] Track mission completion rates (are students getting stuck?)
- [ ] Track lab completion rates (is lab too hard?)
- [ ] Review user feedback and adjust content if needed
- [ ] Check for broken links in sources
- [ ] Verify all commands still work on latest OS versions

### Metrics to Track

- **Engagement:**
  - % of students who start Week 1
  - % of students who complete all 5 missions
  - % of students who complete the lab
  - Average time to complete each mission
  - Average time to complete lab

- **Quality:**
  - Quiz pass rate (should be > 80%)
  - User satisfaction ratings (target: 4+/5)
  - Support tickets related to Week 1 content
  - Reported errors or unclear instructions

- **Technical:**
  - API error rate (target: < 1%)
  - Database query performance
  - Page load times
  - User drop-off points

---

## Success Criteria

Week 1 curriculum is considered successfully deployed when:

- [ ] All 5 missions seed correctly
- [ ] Lab seeds correctly
- [ ] All API endpoints return expected data
- [ ] Frontend displays all content correctly
- [ ] No console errors or warnings
- [ ] All sources are accessible
- [ ] No security issues detected
- [ ] Performance meets targets (< 200ms API responses)
- [ ] Accessibility passes WCAG AA standards
- [ ] User feedback is positive (4+/5 stars)
- [ ] 80%+ of students complete all missions
- [ ] 60%+ of students complete lab

---

## Maintenance Schedule

**Weekly:**
- Check all source URLs for 404s
- Review user feedback and support tickets
- Monitor performance metrics

**Monthly:**
- Test all commands on latest OS versions (Ubuntu, AlmaLinux)
- Update content if commands/syntax change
- Review quiz pass rates and adjust difficulty if needed

**Quarterly:**
- Re-verify all sources for accuracy
- Update confidence levels if information has changed
- Review and update lab scenarios for relevance

---

## Contact & Support

If you encounter issues during validation:

**Internal Team:**
- Backend Issues: Check backend logs, database schema
- Frontend Issues: Check console errors, API responses
- Content Issues: Review WEEK1_CURRICULUM.md, verify against sources

**External Resources:**
- Ubuntu Documentation: https://help.ubuntu.com/
- systemd Documentation: https://systemd.io/
- Linux Man Pages: https://man7.org/linux/man-pages/

**Escalation:**
If critical issues are found, escalate to:
1. Technical Lead for code/database issues
2. Content Lead for accuracy/pedagogy issues
3. Security Team for security concerns

---

## Appendix: Command Reference

### Useful Database Queries

```sql
-- List all Week 1 missions
SELECT id, day, title, xpReward FROM missions WHERE week = 1 ORDER BY day;

-- Get total XP for Week 1
SELECT SUM(xpReward) FROM missions WHERE week = 1;

-- Check for duplicate mission IDs
SELECT id, COUNT(*) FROM missions GROUP BY id HAVING COUNT(*) > 1;

-- List all labs
SELECT id, title, difficulty, xpReward FROM labs;

-- Check JSON validity (will error if invalid)
SELECT json_valid(objectives) FROM missions WHERE week = 1;
SELECT json_valid(tasks) FROM missions WHERE week = 1;
SELECT json_valid(quiz) FROM missions WHERE week = 1;
```

### Useful API Test Commands

```bash
# Test all Week 1 endpoints
curl -s http://localhost:3000/api/missions?week=1 | jq '.data | length'
curl -s http://localhost:3000/api/missions/wk1-day1-first-server-access | jq '.data.title'
curl -s http://localhost:3000/api/labs?week=1 | jq '.data | length'
curl -s http://localhost:3000/api/labs/wk1-lab-troubleshooting | jq '.data.title'

# Test error handling
curl -s http://localhost:3000/api/missions/invalid-id | jq
# Expected: { "success": false, "error": "Mission not found" }
```

---

**Last Updated:** November 18, 2025
**Version:** 1.0
**Maintained By:** OmegaOps Academy DevOps Team
