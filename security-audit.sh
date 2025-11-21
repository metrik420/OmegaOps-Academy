#!/bin/bash
# Security & Code Quality Audit Script
echo "=== SECURITY & CODE QUALITY AUDIT ==="
echo ""

ISSUES=0

echo "=== TYPESCRIPT COMPILATION ==="
echo -n "Backend TypeScript: "
cd /home/metrik/docker/learn/backend
if npm run build > /tmp/backend_build.log 2>&1; then
    echo "PASS (0 errors)"
else
    echo "FAIL (see /tmp/backend_build.log)"
    ((ISSUES++))
fi

echo -n "Frontend TypeScript: "
cd /home/metrik/docker/learn/frontend
if npm run build > /tmp/frontend_build.log 2>&1; then
    echo "PASS (0 errors)"
else
    echo "WARN (check /tmp/frontend_build.log)"
fi

echo ""
echo "=== SECRETS SCAN ==="
echo -n "Checking for hardcoded AWS keys: "
if ! grep -r "AKIA[0-9A-Z]{16}" /home/metrik/docker/learn/backend/src /home/metrik/docker/learn/frontend/src 2>/dev/null; then
    echo "PASS (none found)"
else
    echo "FAIL (found AWS keys)"
    ((ISSUES++))
fi

echo -n "Checking for hardcoded JWT secrets in code: "
if ! grep -r "JWT_SECRET.*=" /home/metrik/docker/learn/backend/src/*.ts 2>/dev/null | grep -v "process.env"; then
    echo "PASS (none hardcoded)"
else
    echo "FAIL (found hardcoded secret)"
    ((ISSUES++))
fi

echo -n "Checking .env is gitignored: "
if git -C /home/metrik/docker/learn check-ignore backend/.env > /dev/null 2>&1; then
    echo "PASS"
else
    echo "WARN (not gitignored)"
fi

echo ""
echo "=== AUTHENTICATION SECURITY ==="
echo -n "Bcrypt password hashing: "
if grep -r "bcrypt" /home/metrik/docker/learn/backend/src 2>/dev/null | grep -q "hash\|compare"; then
    echo "PASS (found bcrypt usage)"
else
    echo "FAIL (bcrypt not found)"
    ((ISSUES++))
fi

echo -n "JWT token verification: "
if grep -r "jwt.verify" /home/metrik/docker/learn/backend/src 2>/dev/null | grep -q "verify"; then
    echo "PASS (JWT verification present)"
else
    echo "FAIL (JWT verification missing)"
    ((ISSUES++))
fi

echo -n "Rate limiting middleware: "
if grep -r "rateLimit" /home/metrik/docker/learn/backend/src 2>/dev/null | grep -q "limit"; then
    echo "PASS (rate limiting found)"
else
    echo "WARN (rate limiting not found)"
fi

echo ""
echo "=== DEPENDENCY SECURITY ==="
echo "Backend dependencies with known vulnerabilities:"
cd /home/metrik/docker/learn/backend
npm audit --production 2>/dev/null | grep -E "(found|vulnerabilities)" | head -5

echo ""
echo "Frontend dependencies with known vulnerabilities:"
cd /home/metrik/docker/learn/frontend
npm audit --production 2>/dev/null | grep -E "(found|vulnerabilities)" | head -5

echo ""
echo "=== DATABASE SECURITY ==="
echo -n "Database file permissions: "
ls -l /home/metrik/docker/learn/backend/data/omegaops.db | awk '{print $1, $3, $4}'

echo -n "Admin user exists: "
if sqlite3 /home/metrik/docker/learn/backend/data/omegaops.db "SELECT username FROM admin_users WHERE username='metrik';" | grep -q "metrik"; then
    echo "PASS"
else
    echo "FAIL"
    ((ISSUES++))
fi

echo ""
echo "=== SUMMARY ==="
if [ $ISSUES -eq 0 ]; then
    echo "Security audit: PASS (0 critical issues)"
else
    echo "Security audit: FAIL ($ISSUES critical issues found)"
fi
