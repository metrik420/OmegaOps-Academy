# Week 1 Curriculum - Quick Start Guide

This is a quick reference for deploying and testing Week 1 curriculum content.

---

## Files Created

All Week 1 content is ready to deploy:

```
backend/src/database/seeds/
├── week1-content.sql          # SQL seed script (ready to execute)
├── week1-missions.json        # JSON missions data (backup/import)
└── week1-labs.json            # JSON labs data (backup/import)

docs/
├── WEEK1_CURRICULUM.md        # Complete curriculum documentation
├── WEEK1_VALIDATION_CHECKLIST.md  # Testing & validation guide
└── WEEK1_QUICK_START.md       # This file
```

---

## 5-Minute Deploy

### 1. Backup Database (Safety First)

```bash
cd /home/metrik/docker/learn
mkdir -p backups
cp data/omegaops.db backups/omegaops-backup-$(date +%Y%m%d-%H%M%S).db
```

### 2. Seed Week 1 Content

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

### 3. Verify Seeding

```bash
sqlite3 ../data/omegaops.db "SELECT COUNT(*) FROM missions WHERE week = 1;"
# Expected: 5

sqlite3 ../data/omegaops.db "SELECT COUNT(*) FROM labs WHERE id = 'wk1-lab-troubleshooting';"
# Expected: 1
```

### 4. Test API (Backend)

Start backend:
```bash
cd /home/metrik/docker/learn/backend
npm run dev
```

In another terminal:
```bash
# Test missions endpoint
curl http://localhost:3000/api/missions?week=1 | jq '.data | length'
# Expected: 5

# Test specific mission
curl http://localhost:3000/api/missions/wk1-day1-first-server-access | jq '.data.title'
# Expected: "Your First Server Access"

# Test lab endpoint
curl http://localhost:3000/api/labs/wk1-lab-troubleshooting | jq '.data.title'
# Expected: "Emergency: Critical Service Down"
```

### 5. Test Frontend

Start frontend:
```bash
cd /home/metrik/docker/learn/frontend
npm run dev
```

Open browser: http://localhost:5173

**Quick Visual Check:**
- ✓ Roadmap shows Week 1 with 5 missions
- ✓ Can click on Mission 1 and see full content
- ✓ Labs page shows Week 1 lab
- ✓ No console errors

---

## Week 1 Content Summary

### Missions (625 XP Total)

| Day | Title | XP | Theme |
|-----|-------|----|----|
| 1 (Mon) | Your First Server Access | 100 | SSH, filesystem navigation |
| 2 (Tue) | Master File Permissions | 125 | chmod, chown, rwx |
| 3 (Wed) | systemd Service Master | 125 | systemctl, service management |
| 4 (Thu) | Manage Users & Groups | 125 | useradd, groups, sudo |
| 5 (Fri) | Process & Resource Management | 150 | ps, top, kill, resource monitoring |

### Lab (200 XP)

| Title | Difficulty | XP | Theme |
|-------|-----------|----|----|
| Emergency: Critical Service Down | Beginner | 200 | Real-world troubleshooting scenario |

**Total Week 1 XP: 825**

---

## Content Quality Highlights

✅ **Engaging Narratives**: Each mission tells a story (new hire, production outage, security incident)
✅ **Progressive Difficulty**: Starts easy (SSH), builds to complex (process management)
✅ **Safe Examples**: Only example.com, RFC1918 IPs, no real credentials
✅ **Verified Sources**: All commands cite official documentation (man pages, vendor docs)
✅ **Real-World Scenarios**: Lab simulates actual production incident
✅ **Clear Learning Objectives**: Each mission has 3-5 specific skills to master
✅ **Comprehensive Quizzes**: 3-5 questions per mission with explanations

---

## Common Issues & Solutions

### Issue: SQL Syntax Error on Insert

**Error:** `UNIQUE constraint failed: missions.week, missions.day`

**Cause:** Week 1 content already seeded.

**Solution:**
```bash
# Check if already seeded
sqlite3 ../data/omegaops.db "SELECT COUNT(*) FROM missions WHERE week = 1;"

# If already seeded, delete and re-seed
sqlite3 ../data/omegaops.db "DELETE FROM missions WHERE week = 1; DELETE FROM labs WHERE id = 'wk1-lab-troubleshooting';"

# Then re-run seed script
sqlite3 ../data/omegaops.db < src/database/seeds/week1-content.sql
```

### Issue: API Returns Empty Array

**Error:** `curl /api/missions?week=1` returns `{"data": []}`

**Cause:** Database not seeded or backend not connected to correct database.

**Solution:**
1. Check database path in backend `.env`:
   ```bash
   cat backend/.env | grep DATABASE_PATH
   # Should point to: /home/metrik/docker/learn/data/omegaops.db
   ```

2. Verify data exists:
   ```bash
   sqlite3 data/omegaops.db "SELECT COUNT(*) FROM missions WHERE week = 1;"
   ```

3. Restart backend:
   ```bash
   cd backend
   npm run dev
   ```

### Issue: Frontend Shows "Mission Not Found"

**Cause:** Frontend trying to fetch mission that doesn't exist or API call failing.

**Solution:**
1. Open browser DevTools (F12) → Network tab
2. Look for failed API calls (404, 500 errors)
3. Verify mission ID in URL matches database:
   ```bash
   sqlite3 data/omegaops.db "SELECT id FROM missions WHERE week = 1;"
   ```

4. Check backend logs for errors

### Issue: Quiz Questions Not Displaying

**Cause:** Invalid JSON in quiz field.

**Solution:**
1. Verify JSON validity:
   ```bash
   sqlite3 data/omegaops.db "SELECT json_valid(quiz) FROM missions WHERE week = 1;"
   # Should return 1 for all rows
   ```

2. If invalid, check SQL file for JSON syntax errors (missing quotes, commas)

---

## Quick Reference: Key IDs

Copy these IDs for testing:

**Mission IDs:**
- `wk1-day1-first-server-access` (Mission 1 - SSH)
- `wk1-day2-file-permissions` (Mission 2 - Permissions)
- `wk1-day3-systemd-services` (Mission 3 - systemd)
- `wk1-day4-users-groups` (Mission 4 - Users)
- `wk1-day5-process-management` (Mission 5 - Processes)

**Lab ID:**
- `wk1-lab-troubleshooting` (Week 1 Lab)

---

## Next Steps: Creating Week 2

Use Week 1 as a template for creating Week 2 content:

1. **Choose Theme**: Week 2 = Web Servers (Nginx, Apache)
2. **Define Learning Path**:
   - Day 1: Install and configure Nginx
   - Day 2: Virtual hosts and server blocks
   - Day 3: SSL/TLS certificates with Let's Encrypt
   - Day 4: Apache basics and comparison to Nginx
   - Day 5: Reverse proxy and load balancing
   - Lab: Set up production-ready multi-site hosting

3. **Copy Template**:
   ```bash
   cp backend/src/database/seeds/week1-content.sql backend/src/database/seeds/week2-content.sql
   # Edit to replace all Week 1 content with Week 2 content
   ```

4. **Update IDs**: Change `wk1-` to `wk2-` throughout

5. **Adjust XP**: Keep similar progression (100-150 for missions, 200 for lab)

6. **Verify Sources**: Cite official Nginx/Apache documentation

7. **Test Thoroughly**: Use WEEK1_VALIDATION_CHECKLIST.md as guide

---

## Support & Documentation

**Full Documentation:**
- `/home/metrik/docker/learn/docs/WEEK1_CURRICULUM.md` - Complete curriculum
- `/home/metrik/docker/learn/docs/WEEK1_VALIDATION_CHECKLIST.md` - Testing guide
- `/home/metrik/docker/learn/CLAUDE.md` - Project overview and guidelines

**Database Schema:**
- `/home/metrik/docker/learn/backend/src/database/db.ts` - Schema definition
- `/home/metrik/docker/learn/backend/src/types/index.ts` - TypeScript types

**API Endpoints:**
- `GET /api/missions?week=1` - List all Week 1 missions
- `GET /api/missions/:id` - Get specific mission
- `GET /api/labs?week=1` - List all Week 1 labs
- `GET /api/labs/:id` - Get specific lab

---

## Success Metrics

Week 1 is successful when:

- ✓ All 5 missions seed correctly
- ✓ Lab seeds correctly
- ✓ API returns complete data
- ✓ Frontend displays all content
- ✓ No console errors
- ✓ All sources accessible
- ✓ 80%+ student completion rate
- ✓ 4+/5 user satisfaction

---

**Created:** November 18, 2025
**Version:** 1.0
**Status:** Ready for Production
