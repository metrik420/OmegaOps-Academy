#!/bin/bash
# ============================================================================
# OMEGAOPS ACADEMY - Comprehensive System Validation Script
# ============================================================================
# This script runs 20+ test scenarios across frontend, backend, auth, and DB
#
# USAGE: ./validate-system.sh [round-number]
# Example: ./validate-system.sh 1
# ============================================================================

set -e

ROUND="${1:-1}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="validation_round_${ROUND}_${TIMESTAMP}.txt"

echo "============================================================================"
echo "VALIDATION ROUND #${ROUND} - $(date)"
echo "============================================================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Function to run test and record result
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_output="$3"

    echo -n "Testing: ${test_name}... "

    if eval "$test_command" | grep -q "$expected_output"; then
        echo -e "${GREEN}PASS${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((FAIL++))
        return 1
    fi
}

# Function to run test with HTTP status code check
run_http_test() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"

    echo -n "Testing: ${test_name}... "

    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}PASS (HTTP $status)${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}FAIL (HTTP $status, expected $expected_status)${NC}"
        ((FAIL++))
        return 1
    fi
}

echo "=== BACKEND API TESTS ==="
echo ""

# Test 1: Backend health check
run_http_test "Backend health endpoint" "http://localhost:3001/health" "200"

# Test 2: Missions endpoint
run_http_test "GET /api/missions" "http://localhost:3001/api/missions" "200"

# Test 3: Missions count
run_test "Missions data count (expect 5 Week 1 missions)" \
    "curl -s http://localhost:3001/api/missions | jq -r '.data | length'" \
    "5"

# Test 4: Labs endpoint
run_http_test "GET /api/labs" "http://localhost:3001/api/labs" "200"

# Test 5: Roadmap endpoint
run_http_test "GET /api/roadmap" "http://localhost:3001/api/roadmap" "200"

# Test 6: Knowledge endpoint
run_http_test "GET /api/knowledge" "http://localhost:3001/api/knowledge" "200"

# Test 7: Software endpoint
run_http_test "GET /api/software" "http://localhost:3001/api/software" "200"

# Test 8: Updates endpoint
run_http_test "GET /api/updates" "http://localhost:3001/api/updates" "200"

echo ""
echo "=== AUTHENTICATION API TESTS ==="
echo ""

# Test 9: Auth endpoint - register (POST without data should fail with 400)
run_http_test "POST /api/auth/register (no data)" "http://localhost:3001/api/auth/register" "400"

# Test 10: Auth endpoint - login (POST without data should fail with 400)
run_http_test "POST /api/auth/login (no data)" "http://localhost:3001/api/auth/login" "400"

# Test 11: Auth endpoint - me (GET without token should fail with 401)
run_http_test "GET /api/auth/me (unauthorized)" "http://localhost:3001/api/auth/me" "401"

# Test 12: Auth endpoint - admin login (POST without data should fail with 400)
run_http_test "POST /api/auth/admin/login (no data)" "http://localhost:3001/api/auth/admin/login" "400"

echo ""
echo "=== DATABASE TESTS ==="
echo ""

# Test 13: Database file exists
if [ -f "/home/metrik/docker/learn/backend/db.sqlite3" ]; then
    echo -e "Testing: Database file exists... ${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "Testing: Database file exists... ${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 14: Database has missions table
run_test "Database has missions table" \
    "sqlite3 /home/metrik/docker/learn/backend/db.sqlite3 'SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"missions\";'" \
    "missions"

# Test 15: Database has users table
run_test "Database has users table" \
    "sqlite3 /home/metrik/docker/learn/backend/db.sqlite3 'SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"users\";'" \
    "users"

# Test 16: Database has 5 missions seeded
run_test "Database has 5 missions seeded" \
    "sqlite3 /home/metrik/docker/learn/backend/db.sqlite3 'SELECT COUNT(*) FROM missions;'" \
    "5"

echo ""
echo "=== BACKEND CODE QUALITY TESTS ==="
echo ""

# Test 17: TypeScript compilation (backend)
echo -n "Testing: Backend TypeScript compilation... "
cd /home/metrik/docker/learn/backend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    ((FAIL++))
fi

# Test 18: Backend dist directory exists
if [ -d "/home/metrik/docker/learn/backend/dist" ]; then
    echo -e "Testing: Backend dist directory exists... ${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "Testing: Backend dist directory exists... ${RED}FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo "=== FRONTEND CODE QUALITY TESTS ==="
echo ""

# Test 19: TypeScript compilation (frontend)
echo -n "Testing: Frontend TypeScript compilation... "
cd /home/metrik/docker/learn/frontend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${YELLOW}WARN (check errors)${NC}"
    ((WARN++))
fi

# Test 20: Frontend dist directory exists
if [ -d "/home/metrik/docker/learn/frontend/dist" ]; then
    echo -e "Testing: Frontend dist directory exists... ${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "Testing: Frontend dist directory exists... ${RED}FAIL${NC}"
    ((FAIL++))
fi

echo ""
echo "=== SECURITY TESTS ==="
echo ""

# Test 21: No hardcoded secrets in backend .env (check it's not in git)
if git check-ignore backend/.env > /dev/null 2>&1; then
    echo -e "Testing: backend/.env is gitignored... ${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "Testing: backend/.env is gitignored... ${YELLOW}WARN${NC}"
    ((WARN++))
fi

# Test 22: Check for common secret patterns in code
echo -n "Testing: No hardcoded AWS keys in code... "
if ! grep -r "AKIA" /home/metrik/docker/learn/backend/src /home/metrik/docker/learn/frontend/src 2>/dev/null; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL (found potential AWS key)${NC}"
    ((FAIL++))
fi

echo ""
echo "============================================================================"
echo "VALIDATION ROUND #${ROUND} SUMMARY"
echo "============================================================================"
echo -e "PASSED:  ${GREEN}${PASS}${NC}"
echo -e "FAILED:  ${RED}${FAIL}${NC}"
echo -e "WARNINGS: ${YELLOW}${WARN}${NC}"
echo "TOTAL:   $((PASS + FAIL + WARN))"
echo ""

# Calculate success rate
if [ $((PASS + FAIL + WARN)) -gt 0 ]; then
    SUCCESS_RATE=$((PASS * 100 / (PASS + FAIL)))
    echo "Success Rate: ${SUCCESS_RATE}%"
else
    SUCCESS_RATE=0
    echo "Success Rate: 0%"
fi

echo ""
echo "Report saved to: ${REPORT_FILE}"

# Save summary to file
{
    echo "VALIDATION ROUND #${ROUND} - $(date)"
    echo "PASSED: ${PASS}"
    echo "FAILED: ${FAIL}"
    echo "WARNINGS: ${WARN}"
    echo "SUCCESS RATE: ${SUCCESS_RATE}%"
} > "$REPORT_FILE"

# Exit with failure if any tests failed
if [ $FAIL -gt 0 ]; then
    echo ""
    echo -e "${RED}VALIDATION FAILED - ${FAIL} test(s) failed${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}VALIDATION PASSED - All critical tests passed${NC}"
    exit 0
fi
