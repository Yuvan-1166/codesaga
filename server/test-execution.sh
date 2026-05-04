#!/bin/bash

echo "🧪 Testing Code Execution Server"
echo "================================"
echo ""

# Test 1: JavaScript sum function
echo "📝 Test 1: JavaScript sum function (CommonJS)"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "function sum(a, b) { return a + b; }",
    "testCases": [{
      "id": "test-1",
      "name": "Sum test",
      "input": {"a": 5, "b": 10},
      "expectedOutput": 15,
      "hidden": false,
      "weight": 1
    }],
    "timeout": 5000,
    "memoryLimit": 128
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
sleep 2
RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
echo "Result: $RESULT"
echo ""

# Test 2: JavaScript array filter
echo "📝 Test 2: JavaScript filterEven function (CommonJS)"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "function filterEven(numbers) { return numbers.filter(n => n % 2 === 0); }",
    "testCases": [{
      "id": "test-1",
      "name": "Filter even",
      "input": [1, 2, 3, 4, 5, 6],
      "expectedOutput": [2, 4, 6],
      "hidden": false,
      "weight": 1
    }],
    "timeout": 5000,
    "memoryLimit": 128
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
sleep 2
RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
echo "Result: $RESULT"
echo ""

# Test 3: Express package (CommonJS)
echo "📝 Test 3: Express package (CommonJS)"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "const express = require(\"express\");\nconst app = express();\nconsole.log(\"Express loaded successfully!\");",
    "testCases": [{
      "id": "test-1",
      "name": "Express test",
      "input": {},
      "expectedOutput": null,
      "hidden": false,
      "weight": 1
    }],
    "timeout": 5000,
    "memoryLimit": 128
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
sleep 2
RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
echo "Result: $RESULT"
echo ""

# Test 4: Express package (ES Module)
echo "📝 Test 4: Express package (ES Module)"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "import express from \"express\";\nconst app = express();\nconsole.log(\"ES Module: Express loaded!\");",
    "testCases": [{
      "id": "test-1",
      "name": "Express ES test",
      "input": {},
      "expectedOutput": null,
      "hidden": false,
      "weight": 1
    }],
    "timeout": 5000,
    "memoryLimit": 128
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
sleep 2
RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
echo "Result: $RESULT"
echo ""

# Test 5: Lodash package (CommonJS)
echo "📝 Test 5: Lodash package (CommonJS)"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "const _ = require(\"lodash\");\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = _.sum(numbers);\nconsole.log(\"Sum:\", sum);",
    "testCases": [{
      "id": "test-1",
      "name": "Lodash test",
      "input": {},
      "expectedOutput": null,
      "hidden": false,
      "weight": 1
    }],
    "timeout": 5000,
    "memoryLimit": 128
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
sleep 2
RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
echo "Result: $RESULT"
echo ""

# Test 6: Lodash package (ES Module)
echo "📝 Test 6: Lodash package (ES Module)"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "language": "javascript",
    "code": "import _ from \"lodash\";\nconst numbers = [1, 2, 3, 4, 5];\nconst sum = _.sum(numbers);\nconsole.log(\"ES Module Sum:\", sum);",
    "testCases": [{
      "id": "test-1",
      "name": "Lodash ES test",
      "input": {},
      "expectedOutput": null,
      "hidden": false,
      "weight": 1
    }],
    "timeout": 5000,
    "memoryLimit": 128
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
echo "Job ID: $JOB_ID"
sleep 2
RESULT=$(curl -s http://localhost:3001/api/jobs/$JOB_ID)
echo "Result: $RESULT"
echo ""

echo "✅ Tests completed!"
