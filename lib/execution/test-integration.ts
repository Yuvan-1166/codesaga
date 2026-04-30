/**
 * Integration Test for Execution Server
 * Run this to verify the execution server is working correctly
 */

import { executeServerCode, runServerTests, checkExecutionServerHealth } from './server-executor';
import type { TestCase } from './browser-executor';

async function testExecutionServer() {
  console.log('🧪 Testing CodeSaga Execution Server Integration\n');

  // Test 1: Health Check
  console.log('1️⃣ Testing health check...');
  const isHealthy = await checkExecutionServerHealth();
  console.log(isHealthy ? '✅ Server is healthy' : '❌ Server is not responding');
  
  if (!isHealthy) {
    console.log('\n⚠️  Make sure the execution server is running:');
    console.log('   cd server && docker-compose up -d\n');
    return;
  }

  // Test 2: Simple Code Execution
  console.log('\n2️⃣ Testing simple code execution...');
  const simpleCode = `
function sum(a, b) {
  return a + b;
}

console.log('Testing sum function');
const result = sum(2, 3);
console.log('Result:', result);
`;

  const execResult = await executeServerCode(simpleCode, 5000, 'javascript');
  console.log('Success:', execResult.success);
  console.log('Output:', execResult.output);
  console.log('Console:', execResult.consoleOutput);
  console.log('Time:', execResult.executionTime, 'ms');

  // Test 3: Code with Test Cases
  console.log('\n3️⃣ Testing code with test cases...');
  const testCode = `
function sum(a, b) {
  return a + b;
}
`;

  const testCases: TestCase[] = [
    {
      id: 'test-1',
      name: 'Sum positive numbers',
      input: { a: 2, b: 3 },
      expectedOutput: 5,
      hidden: false,
      weight: 1,
    },
    {
      id: 'test-2',
      name: 'Sum negative numbers',
      input: { a: -5, b: -3 },
      expectedOutput: -8,
      hidden: false,
      weight: 1,
    },
    {
      id: 'test-3',
      name: 'Sum with zero',
      input: { a: 10, b: 0 },
      expectedOutput: 10,
      hidden: false,
      weight: 1,
    },
  ];

  const testResult = await runServerTests(testCode, testCases, 5000, 'javascript');
  console.log('Tests passed:', testResult.passed, '/', testResult.total);
  console.log('\nTest Results:');
  testResult.results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} ${result.name}`);
    if (!result.passed) {
      console.log(`     Expected: ${JSON.stringify(result.expectedOutput)}`);
      console.log(`     Got: ${JSON.stringify(result.actualOutput)}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  });

  // Test 4: Python Execution
  console.log('\n4️⃣ Testing Python execution...');
  const pythonCode = `
def sum(a, b):
    return a + b

print('Testing sum function')
result = sum(2, 3)
print(f'Result: {result}')
`;

  const pythonResult = await executeServerCode(pythonCode, 5000, 'python');
  console.log('Success:', pythonResult.success);
  console.log('Output:', pythonResult.output);
  console.log('Console:', pythonResult.consoleOutput);

  // Test 5: Error Handling
  console.log('\n5️⃣ Testing error handling...');
  const errorCode = `
function broken() {
  throw new Error('Intentional error');
}

broken();
`;

  const errorResult = await executeServerCode(errorCode, 5000, 'javascript');
  console.log('Success:', errorResult.success);
  console.log('Error:', errorResult.error);

  console.log('\n✅ Integration tests complete!\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testExecutionServer().catch(console.error);
}

export { testExecutionServer };
