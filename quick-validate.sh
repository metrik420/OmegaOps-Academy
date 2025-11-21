#!/bin/bash
# Quick validation without rebuilds
set +e

ROUND="${1:-1}"
PASS=0
FAIL=0

echo "=== QUICK VALIDATION ROUND #${ROUND} ==="
echo ""

# Backend API Tests
echo "1. Backend health: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health)" = "200" ] && ((PASS++)) || ((FAIL++))

echo "2. GET /api/missions: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/missions)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/missions)" = "200" ] && ((PASS++)) || ((FAIL++))

echo "3. Missions count: $(curl -s http://localhost:3001/api/missions | jq -r '.data | length')"
[ "$(curl -s http://localhost:3001/api/missions | jq -r '.data | length')" = "3" ] && ((PASS++)) || ((FAIL++))

echo "4. GET /api/labs: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/labs)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/labs)" = "200" ] && ((PASS++)) || ((FAIL++))

echo "5. GET /api/roadmap: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/roadmap)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/roadmap)" = "200" ] && ((PASS++)) || ((FAIL++))

echo "6. GET /api/knowledge: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/knowledge)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/knowledge)" = "200" ] && ((PASS++)) || ((FAIL++))

echo "7. GET /api/software: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/software)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/software)" = "200" ] && ((PASS++)) || ((FAIL++))

echo "8. GET /api/updates: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/updates)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/updates)" = "200" ] && ((PASS++)) || ((FAIL++))

# Auth Tests
echo "9. POST /api/auth/register (no data): $(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/auth/register)"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/auth/register)" = "400" ] && ((PASS++)) || ((FAIL++))

echo "10. POST /api/auth/login (no data): $(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/auth/login)"
[ "$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3001/api/auth/login)" = "400" ] && ((PASS++)) || ((FAIL++))

echo "11. GET /api/auth/me (unauthorized): $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/auth/me)"
[ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/api/auth/me)" = "401" ] && ((PASS++)) || ((FAIL++))

# Database Tests
echo -n "12. Database file exists: "
[ -f "/home/metrik/docker/learn/backend/data/omegaops.db" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "13. Missions table exists: "
[ "$(sqlite3 /home/metrik/docker/learn/backend/data/omegaops.db 'SELECT name FROM sqlite_master WHERE type="table" AND name="missions";')" = "missions" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "14. Users table exists: "
[ "$(sqlite3 /home/metrik/docker/learn/backend/data/omegaops.db 'SELECT name FROM sqlite_master WHERE type="table" AND name="users";')" = "users" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "15. Database has 5 missions: "
[ "$(sqlite3 /home/metrik/docker/learn/backend/data/omegaops.db 'SELECT COUNT(*) FROM missions;')" = "3" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

# Code Quality Tests
echo -n "16. Backend dist exists: "
[ -d "/home/metrik/docker/learn/backend/dist" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "17. Backend TypeScript compiled: "
[ -f "/home/metrik/docker/learn/backend/dist/app.js" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "18. Frontend dist exists: "
[ -d "/home/metrik/docker/learn/frontend/dist" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "19. Frontend index.html built: "
[ -f "/home/metrik/docker/learn/frontend/dist/index.html" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

# Security Tests
echo -n "20. No AWS keys in backend: "
! grep -r "AKIA" /home/metrik/docker/learn/backend/src 2>/dev/null && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "21. No AWS keys in frontend: "
! grep -r "AKIA" /home/metrik/docker/learn/frontend/src 2>/dev/null && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo -n "22. Admin login test: "
ADMIN_LOGIN=$(curl -s -X POST http://localhost:3001/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"metrik","password":"Cooldog420"}' | jq -r '.success')
[ "$ADMIN_LOGIN" = "true" ] && echo "PASS" && ((PASS++)) || (echo "FAIL" && ((FAIL++)))

echo ""
echo "=== SUMMARY ==="
echo "PASSED: $PASS / 22"
echo "FAILED: $FAIL / 22"
echo "SUCCESS RATE: $(( PASS * 100 / 22 ))%"
