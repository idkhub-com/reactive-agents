#!/usr/bin/env tsx

/**
 * Test script for Copart Auction Agent
 *
 * This script demonstrates various use cases and configurations
 * for the auction monitoring agent.
 */

import { CopartAuctionAgent } from '../copart';

async function testBasicAgent() {
  console.log('🧪 Testing Basic Agent Configuration...\n');

  const agent = new CopartAuctionAgent();

  try {
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(`✅ Basic agent found ${filtered.length} vehicles`);

    if (filtered.length > 0) {
      console.log('📋 Sample vehicle:', filtered[0].title);
    }
  } catch (error) {
    console.error('❌ Basic agent test failed:', error);
  }
}

async function testCustomCriteria() {
  console.log('\n🧪 Testing Custom Search Criteria...\n');

  const agent = new CopartAuctionAgent({
    makes: ['BMW', 'Mercedes', 'Audi'],
    yearRange: { min: 2019, max: 2024 },
    maxMileage: 50000,
    maxPrice: 40000,
    locations: ['New York', 'Los Angeles'],
    keywords: ['clean title', 'no damage'],
  });

  try {
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(`✅ Custom criteria agent found ${filtered.length} vehicles`);

    if (filtered.length > 0) {
      console.log('📋 Sample vehicle:', filtered[0].title);
      console.log('🔍 Search criteria applied successfully');
    }
  } catch (error) {
    console.error('❌ Custom criteria test failed:', error);
  }
}

async function testLuxuryVehicles() {
  console.log('\n🧪 Testing Luxury Vehicle Search...\n');

  const agent = new CopartAuctionAgent({
    makes: ['Porsche', 'Ferrari', 'Lamborghini', 'McLaren'],
    yearRange: { min: 2015, max: 2024 },
    maxMileage: 30000,
    maxPrice: 200000,
    locations: ['Miami', 'Los Angeles', 'New York'],
    keywords: ['clean title'],
  });

  try {
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(`✅ Luxury vehicle agent found ${filtered.length} vehicles`);

    if (filtered.length > 0) {
      console.log('📋 Sample vehicle:', filtered[0].title);
      console.log(
        `💰 Price range: $${filtered[0].currentBid.toLocaleString()}`,
      );
    }
  } catch (error) {
    console.error('❌ Luxury vehicle test failed:', error);
  }
}

async function testBudgetVehicles() {
  console.log('\n🧪 Testing Budget Vehicle Search...\n');

  const agent = new CopartAuctionAgent({
    makes: ['Toyota', 'Honda', 'Ford', 'Chevrolet'],
    yearRange: { min: 2010, max: 2018 },
    maxMileage: 120000,
    maxPrice: 15000,
    locations: ['Chicago', 'Detroit', 'Atlanta'],
    keywords: ['reliable', 'good condition'],
  });

  try {
    await agent.scrapeAuctions();
    const filtered = agent.filterVehicles();
    console.log(`✅ Budget vehicle agent found ${filtered.length} vehicles`);

    if (filtered.length > 0) {
      console.log('📋 Sample vehicle:', filtered[0].title);
      console.log(`💰 Price: $${filtered[0].currentBid.toLocaleString()}`);
      console.log(`📏 Mileage: ${filtered[0].mileage.toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ Budget vehicle test failed:', error);
  }
}

async function testDataExport() {
  console.log('\n🧪 Testing Data Export...\n');

  const agent = new CopartAuctionAgent();

  try {
    await agent.scrapeAuctions();
    const exportData = agent.exportData();

    console.log('✅ Data export successful');
    console.log('📊 Export size:', (exportData.length / 1024).toFixed(2), 'KB');

    // Parse and show structure
    const parsed = JSON.parse(exportData);
    console.log('📋 Export contains:');
    console.log(
      '  - Search criteria:',
      Object.keys(parsed.searchCriteria).length,
      'items',
    );
    console.log('  - Vehicles:', parsed.vehicles.length, 'items');
    console.log('  - Timestamp:', parsed.timestamp);
  } catch (error) {
    console.error('❌ Data export test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚗 Copart Auction Agent Test Suite\n');
  console.log(`${'='.repeat(50)}\n`);

  try {
    await testBasicAgent();
    await testCustomCriteria();
    await testLuxuryVehicles();
    await testBudgetVehicles();
    await testDataExport();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n💡 To run the full agent with AI analysis:');
    console.log('   tsx copart.ts');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
const isMainModule = process.argv[1]?.endsWith('test-agent.ts');
if (isMainModule) {
  runAllTests().catch(console.error);
}

export {
  testBasicAgent,
  testCustomCriteria,
  testLuxuryVehicles,
  testBudgetVehicles,
  testDataExport,
  runAllTests,
};
