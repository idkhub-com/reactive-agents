#!/usr/bin/env tsx

/**
 * Performance Test for Copart Auction Agent
 *
 * This test analyzes the agent's performance across different scenarios
 * and provides detailed insights into its capabilities.
 */

import {
  CopartAuctionAgent,
  type CopartVehicle,
  type SearchCriteria,
} from './copart';

interface PerformanceMetrics {
  scenario: string;
  vehiclesFound: number;
  vehiclesFiltered: number;
  averageScore: number;
  buyRecommendations: number;
  executionTime: number;
  memoryUsage: number;
  accuracy: number;
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetrics[] = [];

  async runPerformanceTests() {
    console.log('🚀 Copart Auction Agent Performance Analysis\n');
    console.log(`${'='.repeat(60)}\n`);

    // Test 1: Basic Configuration
    await this.testScenario('Basic Configuration', {
      makes: ['Toyota', 'Honda', 'Ford'],
      yearRange: { min: 2015, max: 2023 },
      maxMileage: 100000,
      maxPrice: 25000,
    });

    // Test 2: Luxury Vehicles
    await this.testScenario('Luxury Vehicles', {
      makes: ['BMW', 'Mercedes', 'Audi', 'Porsche'],
      yearRange: { min: 2018, max: 2024 },
      maxMileage: 50000,
      maxPrice: 100000,
    });

    // Test 3: Budget Vehicles
    await this.testScenario('Budget Vehicles', {
      makes: ['Toyota', 'Honda', 'Ford', 'Chevrolet'],
      yearRange: { min: 2010, max: 2018 },
      maxMileage: 150000,
      maxPrice: 15000,
    });

    // Test 4: Specific Models
    await this.testScenario('Specific Models', {
      makes: ['Toyota'],
      models: ['Camry', 'Corolla'],
      yearRange: { min: 2015, max: 2022 },
      maxMileage: 80000,
      maxPrice: 20000,
    });

    // Test 5: High Mileage Vehicles
    await this.testScenario('High Mileage Vehicles', {
      makes: ['Toyota', 'Honda'],
      yearRange: { min: 2008, max: 2015 },
      maxMileage: 200000,
      maxPrice: 10000,
    });

    // Generate performance report
    this.generatePerformanceReport();
  }

  private async testScenario(
    name: string,
    criteria: Partial<SearchCriteria>,
  ): Promise<void> {
    console.log(`🧪 Testing: ${name}`);
    console.log(`   Criteria: ${JSON.stringify(criteria, null, 2)}`);

    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const agent = new CopartAuctionAgent(criteria);

      // Scrape auctions
      await agent.scrapeAuctions();
      const vehiclesFound = agent.vehicles.length;

      // Filter vehicles
      const filteredVehicles = agent.filterVehicles();
      const vehiclesFiltered = filteredVehicles.length;

      // Create basic analysis
      const basicAnalyses = filteredVehicles.map((vehicle) => {
        const priceDifference = vehicle.estimatedValue - vehicle.currentBid;
        const score = Math.max(
          0,
          Math.min(
            100,
            (priceDifference / vehicle.estimatedValue) * 100 +
              (vehicle.year - 2000) / 2 +
              (200000 - vehicle.mileage) / 2000,
          ),
        );

        return {
          vehicle,
          score: Math.round(score),
          reasoning: `Basic analysis: ${priceDifference > 0 ? 'Good value' : 'Overpriced'}`,
          marketComparison: {
            averagePrice: vehicle.estimatedValue,
            priceDifference,
            marketTrend: priceDifference > 0 ? 'below' : 'above',
          },
          riskAssessment: {
            level: vehicle.damage === 'none' ? 'low' : 'medium',
            factors: [
              vehicle.damage === 'none'
                ? 'No damage'
                : `Damage: ${vehicle.damage}`,
            ],
          },
          recommendation: score > 70 ? 'buy' : score > 50 ? 'monitor' : 'pass',
        };
      });

      // Set analysis results
      (agent as any).analysisResults = basicAnalyses;

      // Calculate metrics
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      const averageScore =
        basicAnalyses.length > 0
          ? basicAnalyses.reduce((sum, a) => sum + a.score, 0) /
            basicAnalyses.length
          : 0;

      const buyRecommendations = basicAnalyses.filter(
        (a) => a.recommendation === 'buy',
      ).length;

      // Calculate accuracy (how well the filtering matches the criteria)
      const accuracy = this.calculateAccuracy(filteredVehicles, criteria);

      const metrics: PerformanceMetrics = {
        scenario: name,
        vehiclesFound,
        vehiclesFiltered,
        averageScore: Math.round(averageScore),
        buyRecommendations,
        executionTime: Math.round(endTime - startTime),
        memoryUsage: Math.round((endMemory - startMemory) / 1024),
        accuracy: Math.round(accuracy * 100),
      };

      this.metrics.push(metrics);

      console.log(
        `   ✅ Found: ${vehiclesFound} | Filtered: ${vehiclesFiltered} | Score: ${Math.round(averageScore)}/100 | Buy: ${buyRecommendations}`,
      );
      console.log(
        `   ⏱️  Time: ${metrics.executionTime}ms | Memory: ${metrics.memoryUsage}KB | Accuracy: ${metrics.accuracy}%\n`,
      );
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  private calculateAccuracy(
    vehicles: CopartVehicle[],
    criteria: Partial<SearchCriteria>,
  ): number {
    if (vehicles.length === 0) return 0;

    let correctMatches = 0;

    for (const vehicle of vehicles) {
      let matches = true;

      // Check make
      if (criteria.makes && criteria.makes.length > 0) {
        matches = matches && criteria.makes.includes(vehicle.make);
      }

      // Check year range
      if (criteria.yearRange) {
        matches =
          matches &&
          vehicle.year >= criteria.yearRange.min &&
          vehicle.year <= criteria.yearRange.max;
      }

      // Check mileage
      if (criteria.maxMileage) {
        matches = matches && vehicle.mileage <= criteria.maxMileage;
      }

      // Check price
      if (criteria.maxPrice) {
        matches = matches && vehicle.currentBid <= criteria.maxPrice;
      }

      if (matches) correctMatches++;
    }

    return correctMatches / vehicles.length;
  }

  private generatePerformanceReport() {
    console.log('📊 Performance Analysis Report\n');
    console.log(`${'='.repeat(60)}\n`);

    // Overall statistics
    const totalScenarios = this.metrics.length;
    const totalVehiclesFound = this.metrics.reduce(
      (sum, m) => sum + m.vehiclesFound,
      0,
    );
    const totalVehiclesFiltered = this.metrics.reduce(
      (sum, m) => sum + m.vehiclesFiltered,
      0,
    );
    const averageExecutionTime =
      this.metrics.reduce((sum, m) => sum + m.executionTime, 0) /
      totalScenarios;
    const averageAccuracy =
      this.metrics.reduce((sum, m) => sum + m.accuracy, 0) / totalScenarios;

    console.log('📈 Overall Performance:');
    console.log(`   Total Scenarios Tested: ${totalScenarios}`);
    console.log(`   Total Vehicles Found: ${totalVehiclesFound}`);
    console.log(`   Total Vehicles Filtered: ${totalVehiclesFiltered}`);
    console.log(
      `   Average Execution Time: ${Math.round(averageExecutionTime)}ms`,
    );
    console.log(`   Average Accuracy: ${Math.round(averageAccuracy)}%\n`);

    // Scenario breakdown
    console.log('🔍 Scenario Breakdown:');
    for (const metric of this.metrics) {
      console.log(`   ${metric.scenario}:`);
      console.log(
        `     Vehicles: ${metric.vehiclesFound} → ${metric.vehiclesFiltered} (${Math.round((metric.vehiclesFiltered / metric.vehiclesFound) * 100)}% filtered)`,
      );
      console.log(
        `     Score: ${metric.averageScore}/100 | Buy Recs: ${metric.buyRecommendations}`,
      );
      console.log(
        `     Performance: ${metric.executionTime}ms | Memory: ${metric.memoryUsage}KB | Accuracy: ${metric.accuracy}%`,
      );
      console.log('');
    }

    // Performance insights
    console.log('💡 Performance Insights:');

    const fastestScenario = this.metrics.reduce((fastest, current) =>
      current.executionTime < fastest.executionTime ? current : fastest,
    );
    console.log(
      `   🏃 Fastest: ${fastestScenario.scenario} (${fastestScenario.executionTime}ms)`,
    );

    const mostAccurateScenario = this.metrics.reduce((most, current) =>
      current.accuracy > most.accuracy ? current : most,
    );
    console.log(
      `   🎯 Most Accurate: ${mostAccurateScenario.scenario} (${mostAccurateScenario.accuracy}%)`,
    );

    const bestScoringScenario = this.metrics.reduce((best, current) =>
      current.averageScore > best.averageScore ? current : best,
    );
    console.log(
      `   ⭐ Best Scoring: ${bestScoringScenario.scenario} (${bestScoringScenario.averageScore}/100)`,
    );

    console.log('\n🎉 Performance analysis completed!');
  }
}

// Run performance tests
async function main() {
  const analyzer = new PerformanceAnalyzer();
  await analyzer.runPerformanceTests();
}

// Run if called directly
const isMainModule = process.argv[1]?.endsWith('performance-test.ts');
if (isMainModule) {
  main().catch(console.error);
}

export { PerformanceAnalyzer };
