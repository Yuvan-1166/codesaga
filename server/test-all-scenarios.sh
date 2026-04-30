#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     CodeSaga Execution Server - Comprehensive Tests       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local code="$2"
    local input="$3"
    local expected="$4"
    
    echo -n "📝 $test_name... "
    
    RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
      -H "Content-Type: application/json" \
      -d "{
        \"language\": \"javascript\",
        \"code\": $(echo "$code" | jq -Rs .),
        \"testCases\": [{
          \"id\": \"test-1\",
          \"name\": \"Test\",
          \"input\": $input,
          \"expectedOutput\": $expected,
          \"hidden\": false,
          \"weight\": 1
        }],
        \"timeout\": 5000,
        \"memoryLimit\": 128
      }")
    
    JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
    
    if [ "$JOB_ID" == "null" ]; then
        echo -e "${RED}FAILED${NC} (No job ID)"
        FAILED=$((FAILED + 1))
        return
    fi
    
    sleep 2
    
    RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
    STATUS=$(echo $RESULT | jq -r '.status')
    PASSED_TEST=$(echo $RESULT | jq -r '.results[0].passed')
    
    if [ "$STATUS" == "completed" ] && [ "$PASSED_TEST" == "true" ]; then
        echo -e "${GREEN}PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Status: $STATUS"
        echo "  Passed: $PASSED_TEST"
        echo "  Result: $(echo $RESULT | jq -c '.results[0]')"
        FAILED=$((FAILED + 1))
    fi
}

# Function to run test without expected output (for console.log tests)
run_output_test() {
    local test_name="$1"
    local code="$2"
    local expected_output="$3"
    
    echo -n "📝 $test_name... "
    
    RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
      -H "Content-Type: application/json" \
      -d "{
        \"language\": \"javascript\",
        \"code\": $(echo "$code" | jq -Rs .),
        \"testCases\": [{
          \"id\": \"test-1\",
          \"name\": \"Test\",
          \"input\": {},
          \"expectedOutput\": null,
          \"hidden\": false,
          \"weight\": 1
        }],
        \"timeout\": 5000,
        \"memoryLimit\": 128
      }")
    
    JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
    
    if [ "$JOB_ID" == "null" ]; then
        echo -e "${RED}FAILED${NC} (No job ID)"
        FAILED=$((FAILED + 1))
        return
    fi
    
    sleep 2
    
    RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
    STATUS=$(echo $RESULT | jq -r '.status')
    ACTUAL_OUTPUT=$(echo $RESULT | jq -r '.results[0].actualOutput')
    ERROR=$(echo $RESULT | jq -r '.results[0].error // empty')
    
    if [ "$STATUS" == "completed" ] && [ "$ACTUAL_OUTPUT" == "$expected_output" ] && [ -z "$ERROR" ]; then
        echo -e "${GREEN}PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}FAILED${NC}"
        echo "  Status: $STATUS"
        echo "  Expected: $expected_output"
        echo "  Actual: $ACTUAL_OUTPUT"
        echo "  Error: $ERROR"
        FAILED=$((FAILED + 1))
    fi
}

echo "🧪 Testing Function-Based Code"
echo "────────────────────────────────"

# Test 1: Simple sum function
run_test "Sum function (2 + 3)" \
  "function sum(a, b) { return a + b; }" \
  '{"a": 2, "b": 3}' \
  '5'

# Test 2: Array filter function
run_test "Filter even numbers" \
  "function filterEven(numbers) { return numbers.filter(n => n % 2 === 0); }" \
  '[1, 2, 3, 4, 5, 6]' \
  '[2, 4, 6]'

# Test 3: String manipulation
run_test "Count lines function" \
  "function countLines(text) { return text ? text.split('\\n').length : 0; }" \
  '"Hello\\nWorld\\nTest"' \
  '3'

echo ""
echo "🧪 Testing Direct Execution Code (No Functions)"
echo "────────────────────────────────────────────────"

# Test 4: Simple console.log
run_output_test "Console.log statement" \
  "console.log('Hello, CodeSaga!');" \
  "Hello, CodeSaga!"

# Test 5: Multiple console.log
run_output_test "Multiple console.log" \
  "console.log('Line 1'); console.log('Line 2');" \
  "Line 1
Line 2"

# Test 6: Variable and console.log
run_output_test "Variable with console.log" \
  "const message = 'Success'; console.log(message);" \
  "Success"

echo ""
echo "🧪 Testing Edge Cases"
echo "─────────────────────"

# Test 7: Empty function
run_test "Empty function returns undefined" \
  "function main() {}" \
  '{}' \
  'null'

# Test 8: Async function
run_test "Async function" \
  "async function main() { return 'async result'; }" \
  '{}' \
  '"async result"'

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                      Test Summary                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}Passed:${NC} $PASSED"
echo -e "  ${RED}Failed:${NC} $FAILED"
echo -e "  Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
