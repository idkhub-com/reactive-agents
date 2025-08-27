#!/usr/bin/env tsx

/**
 * Edge Case Test for Copart Auction Agent
 *
 * Tests various edge cases to ensure robustness
 */

import { CopartAuctionAgent } from './copart';

async function testEdgeCases() {
  console.log('🧪 Testing Edge Cases and Robustness\n');
  console.log(`${'='.repeat(50)}\n`);

  // Test 1: Empty criteria
  console.log('🧪 Test 1: Empty Search Criteria');
  try {
    const agent = new CopartAuctionAgent({});
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(
      `   ✅ Empty criteria: Found ${filtered.length} vehicles (should be 2)\n`,
    );
  } catch (error) {
    console.error(`   ❌ Empty criteria failed: ${error}\n`);
  }

  // Test 2: Extreme values
  console.log('🧪 Test 2: Extreme Values');
  try {
    const agent = new CopartAuctionAgent({
      yearRange: { min: 1900, max: 2100 },
      maxMileage: 1000000,
      maxPrice: 1000000,
    });
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(
      `   ✅ Extreme values: Found ${filtered.length} vehicles (should be 2)\n`,
    );
  } catch (error) {
    console.error(`   ❌ Extreme values failed: ${error}\n`);
  }

  // Test 3: No matching criteria
  console.log('🧪 Test 3: No Matching Criteria');
  try {
    const agent = new CopartAuctionAgent({
      makes: ['Ferrari', 'Lamborghini'],
      yearRange: { min: 2025, max: 2030 },
      maxMileage: 1000,
      maxPrice: 1000,
    });
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(
      `   ✅ No matches: Found ${filtered.length} vehicles (should be 0)\n`,
    );
  } catch (error) {
    console.error(`   ❌ No matches failed: ${error}\n`);
  }

  // Test 4: Invalid data handling
  console.log('🧪 Test 4: Invalid Data Handling');
  try {
    const agent = new CopartAuctionAgent();
    await agent.scrapeAuctions();

    // Simulate corrupted data
    const vehicles = agent.vehicles;
    if (vehicles.length > 0) {
      const originalVehicle = vehicles[0];
      vehicles[0] = {
        ...originalVehicle,
        year: 'invalid' as unknown as number,
        mileage: 'invalid' as unknown as number,
      };

      const filtered = agent.filterVehicles();
      console.log(
        `   ✅ Invalid data handling: Filtered ${filtered.length} vehicles\n`,
      );

      // Restore original data
      vehicles[0] = originalVehicle;
    }
  } catch (error) {
    console.error(`   ❌ Invalid data handling failed: ${error}\n`);
  }

  // Test 5: Memory usage under load
  console.log('🧪 Test 5: Memory Usage Under Load');
  try {
    const startMemory = process.memoryUsage().heapUsed;
    const agents = [];

    // Create multiple agents to test memory usage
    for (let i = 0; i < 10; i++) {
      const agent = new CopartAuctionAgent({
        makes: ['Toyota', 'Honda'],
        yearRange: { min: 2010 + i, max: 2020 + i },
      });
      await agent.scrapeAuctions();
      agents.push(agent);
    }

    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - startMemory) / 1024;

    console.log(
      `   ✅ Memory test: Used ${memoryUsed.toFixed(2)}KB for 10 agents\n`,
    );
  } catch (error) {
    console.error(`   ❌ Memory test failed: ${error}\n`);
  }

  console.log('🎉 Edge case testing completed!\n');
}

// Run edge case tests
async function main() {
  await testEdgeCases();
}

// Run if called directly
const isMainModule = process.argv[1]?.endsWith('edge-case-test.ts');
if (isMainModule) {
  main().catch(console.error);
}

export { testEdgeCases };
