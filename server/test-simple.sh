#!/bin/bash

echo "🧪 CodeSaga Execution Server - Simple Tests"
echo "==========================================="
echo ""

# Test 1: Function-based code
echo "Test 1: Sum function"
curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","code":"function sum(a, b) { return a + b; }","testCases":[{"id":"test-1","name":"Test","input":{"a":2,"b":3},"expectedOutput":5,"hidden":false,"weight":1}]}' \
  | jq -r '.jobId' | read JOB1

sleep 2
echo "Result:"
curl -s http://localhost:3001/api/jobs/$JOB1 | jq '.results[0] | {passed, actualOutput, expectedOutput}'
echo ""

# Test 2: Console.log code
echo "Test 2: Console.log (no function)"
JOB2=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","code":"console.log(\"Hello, World!\");","testCases":[{"id":"test-1","name":"Test","input":{},"expectedOutput":null,"hidden":false,"weight":1}]}' \
  | jq -r '.jobId')

sleep 2
echo "Result:"
curl -s http://localhost:3001/api/jobs/$JOB2 | jq '.results[0] | {actualOutput, error}'
echo ""

# Test 3: Array filter
echo "Test 3: Filter even numbers"
JOB3=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"javascript","code":"function filterEven(numbers) { return numbers.filter(n => n % 2 === 0); }","testCases":[{"id":"test-1","name":"Test","input":[1,2,3,4,5,6],"expectedOutput":[2,4,6],"hidden":false,"weight":1}]}' \
  | jq -r '.jobId')

sleep 2
echo "Result:"
curl -s http://localhost:3001/api/jobs/$JOB3 | jq '.results[0] | {passed, actualOutput}'
echo ""

echo "✅ Tests complete!"
