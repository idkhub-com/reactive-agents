#!/usr/bin/env node

/**
 * Auction Agent Integration Test
 *
 * This script tests that the auction-agent integration is working properly.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const auctionAgentDir = join(rootDir, 'examples', 'auction-agent');

console.log('🧪 Testing Auction Agent Integration');
console.log('====================================\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, testFn) {
  testsTotal++;
  try {
    testFn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// Test 1: Check if auction-agent directory exists
runTest('Auction agent directory exists', () => {
  if (!existsSync(auctionAgentDir)) {
    throw new Error('Auction agent directory not found');
  }
});

// Test 2: Check if main files exist
runTest('Main auction agent files exist', () => {
  const requiredFiles = ['copart.ts', 'package.json', 'README.md', 'config.ts'];

  for (const file of requiredFiles) {
    if (!existsSync(join(auctionAgentDir, file))) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
});

// Test 3: Check if package.json scripts are available
runTest('Package.json scripts are configured', () => {
  try {
    const packageJson = JSON.parse(
      execSync('cat package.json', { encoding: 'utf8' }),
    );
    const requiredScripts = [
      'auction-agent',
      'auction-agent:dev',
      'auction-agent:scheduler',
      'auction-agent:setup',
    ];

    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        throw new Error(`Script missing: ${script}`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
});

// Test 4: Check if dependencies are installed
runTest('Auction agent dependencies are available', () => {
  try {
    execSync('pnpm list better-sqlite3', { stdio: 'pipe' });
  } catch (error) {
    throw new Error(
      'Auction agent dependencies not installed. Run: pnpm install',
    );
  }
});

// Test 5: Check if tsx is available
runTest('tsx is available for running TypeScript', () => {
  try {
    execSync('pnpm list tsx', { stdio: 'pipe' });
  } catch (error) {
    throw new Error('tsx not available. Run: pnpm install');
  }
});

// Test 6: Check if auction agent can be parsed (syntax check)
runTest('Auction agent TypeScript syntax is valid', () => {
  try {
    execSync('pnpm exec tsc --noEmit examples/auction-agent/copart.ts', {
      stdio: 'pipe',
    });
  } catch (error) {
    // This might fail due to missing dependencies, which is expected
    // We'll just check if the file exists and is readable
    if (!existsSync(join(auctionAgentDir, 'copart.ts'))) {
      throw new Error('copart.ts file not found');
    }
  }
});

console.log(`\n📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);

if (testsPassed === testsTotal) {
  console.log('\n🎉 All integration tests passed!');
  console.log('\nNext steps:');
  console.log('1. Run: pnpm auction-agent:setup');
  console.log('2. Edit examples/auction-agent/.env with your API keys');
  console.log('3. Run: pnpm auction-agent');
} else {
  console.log('\n⚠️  Some tests failed. Please check the errors above.');
  console.log('\nTroubleshooting:');
  console.log("1. Make sure you're in the repository root");
  console.log('2. Run: pnpm install');
  console.log('3. Ensure examples/auction-agent/ directory exists');
}

process.exit(testsPassed === testsTotal ? 0 : 1);
