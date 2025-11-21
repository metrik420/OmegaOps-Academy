# Week 1 Curriculum - Master Index

Welcome to the OmegaOps Academy Week 1 curriculum documentation. This index provides quick access to all Week 1 resources.

---

## Quick Links

**I want to...**

- **Deploy Week 1 content** → [Quick Start Guide](WEEK1_QUICK_START.md)
- **Understand the curriculum** → [Complete Curriculum Guide](WEEK1_CURRICULUM.md)
- **Test and validate** → [Validation Checklist](WEEK1_VALIDATION_CHECKLIST.md)
- **Review the project** → [Delivery Summary](WEEK1_DELIVERY_SUMMARY.md)

---

## Week 1 Overview

**Theme:** Linux & systemd Basics
**Target Audience:** Beginners (0-1 years Linux experience)
**Total XP:** 825 XP (625 missions + 200 lab)
**Estimated Time:** 5-7 hours total
**Status:** ✅ Ready for Deployment

### Daily Missions (625 XP)

1. **Monday - Your First Server Access** (100 XP)
   - SSH, filesystem navigation, system information
   
2. **Tuesday - Master File Permissions** (125 XP)
   - chmod, chown, rwx notation, ownership
   
3. **Wednesday - systemd Service Master** (125 XP)
   - systemctl, service management, enable/disable
   
4. **Thursday - Manage Users & Groups** (125 XP)
   - useradd, groups, sudo configuration
   
5. **Friday - Process & Resource Management** (150 XP)
   - ps, top, kill, resource monitoring

### Weekend Lab (200 XP)

**Emergency: Critical Service Down**
- Real-world troubleshooting scenario
- Multiple issues to diagnose and fix
- Disk space, permissions, service failures

---

## Documentation Files

### For Students & Instructors

**[Complete Curriculum Guide](WEEK1_CURRICULUM.md)** (29 KB)
- Full mission descriptions with narratives
- All tasks with instructions and hints
- Complete quiz questions with explanations
- Lab scenario with acceptance criteria
- Learning objectives and outcomes
- Source citations and confidence levels

### For Developers & DevOps

**[Quick Start Guide](WEEK1_QUICK_START.md)** (7.6 KB)
- 5-minute deployment instructions
- Quick verification commands
- Common issues and solutions
- Key IDs reference
- Next steps for Week 2

**[Validation Checklist](WEEK1_VALIDATION_CHECKLIST.md)** (18 KB)
- Pre-deployment checklist
- Database seeding validation
- API endpoint testing
- Frontend integration testing
- Performance testing
- Security validation
- Rollback procedures

### For Stakeholders & Management

**[Delivery Summary](WEEK1_DELIVERY_SUMMARY.md)** (This file)
- Executive summary
- Deliverables list
- Content quality metrics
- Technical specifications
- Deployment instructions
- Success criteria
- Risk assessment
- KPIs and monitoring plan

---

## Data Files

### Database Seeds

**SQL Seed Script** (37 KB)
- Location: `/backend/src/database/seeds/week1-content.sql`
- Contains: 5 missions + 1 lab
- Format: SQLite-compatible SQL
- Status: Ready to execute

**JSON Missions** (38 KB)
- Location: `/backend/src/database/seeds/week1-missions.json`
- Contains: 5 missions with full data
- Format: JSON array
- Purpose: Backup and import alternative

**JSON Labs** (11 KB)
- Location: `/backend/src/database/seeds/week1-labs.json`
- Contains: 1 lab with full data
- Format: JSON array
- Purpose: Backup and import alternative

---

## Deployment Options

### Option 1: Quick Deploy (5 Minutes)

```bash
# Backup database
cp data/omegaops.db backups/omegaops-backup-$(date +%Y%m%d-%H%M%S).db

# Seed content
cd backend
sqlite3 ../data/omegaops.db < src/database/seeds/week1-content.sql

# Verify
sqlite3 ../data/omegaops.db "SELECT COUNT(*) FROM missions WHERE week = 1;"
# Expected: 5
```

See: [Quick Start Guide](WEEK1_QUICK_START.md)

### Option 2: Full Validation (30 Minutes)

Complete validation with testing:
- Pre-deployment checks
- Database seeding
- API testing
- Frontend testing
- Performance testing
- Security validation

See: [Validation Checklist](WEEK1_VALIDATION_CHECKLIST.md)

---

## Key Identifiers

### Mission IDs

```
wk1-day1-first-server-access      # Monday - SSH & Navigation (100 XP)
wk1-day2-file-permissions          # Tuesday - Permissions (125 XP)
wk1-day3-systemd-services          # Wednesday - systemd (125 XP)
wk1-day4-users-groups              # Thursday - Users & Groups (125 XP)
wk1-day5-process-management        # Friday - Processes (150 XP)
```

### Lab ID

```
wk1-lab-troubleshooting            # Saturday - Troubleshooting Lab (200 XP)
```

---

## API Endpoints

```bash
# List all Week 1 missions
GET /api/missions?week=1

# Get specific mission
GET /api/missions/wk1-day1-first-server-access

# List all Week 1 labs
GET /api/labs?week=1

# Get specific lab
GET /api/labs/wk1-lab-troubleshooting
```

---

## Quality Assurance

### Content Quality ✅

- Engaging narratives (story-driven learning)
- Progressive difficulty (100 XP → 150 XP)
- Safe examples only (no real credentials)
- Verified sources (official documentation)
- Comprehensive quizzes (23 questions total)
- Clear learning objectives (4-5 per mission)

### Technical Quality ✅

- All commands tested on Ubuntu 22.04
- All commands tested on AlmaLinux 9
- Database schema validated
- JSON structure validated
- API endpoints tested
- Performance benchmarked

### Security Quality ✅

- No hardcoded secrets
- No production credentials
- No real domains (only example.com)
- No real IPs (only RFC1918 private)
- No security anti-patterns
- Safe practices taught

---

## Success Metrics

**Engagement Targets:**
- 90% of users start Week 1
- 80% complete all 5 missions
- 60% complete the lab

**Quality Targets:**
- 80%+ quiz pass rate
- 4+/5 user satisfaction
- < 5% support tickets

**Performance Targets:**
- API responses < 200ms
- Database queries < 100ms
- Page loads < 3 seconds

---

## Support & Troubleshooting

### Common Issues

**Issue:** SQL syntax error during seeding
**Solution:** Check if already seeded, delete and re-seed if needed

**Issue:** API returns empty array
**Solution:** Verify database path, check data exists, restart backend

**Issue:** Frontend shows "Mission Not Found"
**Solution:** Check browser DevTools Network tab, verify API calls

See: [Quick Start Guide - Common Issues](WEEK1_QUICK_START.md#common-issues--solutions)

### Full Troubleshooting

See: [Validation Checklist - Rollback Plan](WEEK1_VALIDATION_CHECKLIST.md#rollback-plan)

---

## Next Steps

### After Deploying Week 1

1. Monitor error logs (first 24 hours)
2. Track user engagement (first week)
3. Review feedback and adjust content
4. Plan Week 2 development

### Creating Week 2

Use Week 1 as template:
1. Choose theme (Web Servers)
2. Define 5 missions + 1 lab
3. Copy SQL/JSON structure
4. Update IDs (wk1 → wk2)
5. Create new content
6. Test thoroughly
7. Deploy

See: [Quick Start Guide - Next Steps](WEEK1_QUICK_START.md#next-steps-creating-week-2)

---

## Credits & Attribution

**Content Design:** OmegaOps Academy Team + Claude Code (Anthropic)
**Technical Review:** Linux Foundation, Ubuntu, Red Hat documentation
**Quality Assurance:** Metrik (Project Lead)

**Sources Cited:** 12 official documentation sources
**Total Content:** 6,600 words
**Commands Taught:** 68 unique commands
**Code Examples:** 120+

---

## Project Information

**Project:** OmegaOps Academy Phase 2 Sprint 1
**Deliverable:** Week 1 Curriculum (Linux & systemd Basics)
**Created:** November 18, 2025
**Status:** ✅ READY FOR DEPLOYMENT
**Version:** 1.0

**Repository:** /home/metrik/docker/learn
**Database:** SQLite (data/omegaops.db)
**Backend:** Node.js + Express + TypeScript
**Frontend:** React + Vite + TypeScript

---

## License

MIT License - See project LICENSE file

All content verified against official sources and properly attributed.

---

**Quick Navigation:**
- [📚 Complete Curriculum](WEEK1_CURRICULUM.md) - Full content guide
- [🚀 Quick Start](WEEK1_QUICK_START.md) - 5-minute deploy
- [✅ Validation](WEEK1_VALIDATION_CHECKLIST.md) - Testing procedures
- [📊 Summary](WEEK1_DELIVERY_SUMMARY.md) - Project overview
- [🏠 Project README](../README.md) - Main project docs

---

**Last Updated:** November 18, 2025
**Maintained By:** OmegaOps Academy DevOps Team
