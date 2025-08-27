import type { Logger } from 'pino';
import type { CopartVehicle } from '../copart';
import type { BiddingStrategy, BidRecommendation } from './bidding-advisor';
import type { WatchlistAlert } from './watchlist';

export interface PortfolioMetrics {
  totalInvestment: number;
  activeWatchlistItems: number;
  averageROI: number;
  successRate: number; // percentage of winning bids that were profitable
  totalProfitLoss: number;
  riskScore: number; // 0-100, higher = riskier portfolio
  diversificationScore: number; // 0-100, higher = more diversified
  liquidityScore: number; // 0-100, higher = more liquid assets
}

export interface PortfolioRecommendation {
  action: 'buy' | 'sell' | 'hold' | 'rebalance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reasoning: string;
  impact: {
    riskChange: number;
    returnChange: number;
    diversificationChange: number;
  };
  alternatives?: string[];
}

export interface MarketInsight {
  category: 'trend' | 'opportunity' | 'risk' | 'seasonal';
  title: string;
  description: string;
  confidence: number; // 0-100
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  actionable: boolean;
  relatedVehicles?: string[]; // vehicle IDs
}

export interface PerformanceReport {
  period: {
    start: string;
    end: string;
    duration: number; // days
  };
  metrics: PortfolioMetrics;
  topPerformers: Array<{
    vehicleId: string;
    roi: number;
    profit: number;
    reasoning: string;
  }>;
  underperformers: Array<{
    vehicleId: string;
    roi: number;
    loss: number;
    lessonsLearned: string;
  }>;
  marketInsights: MarketInsight[];
  recommendations: PortfolioRecommendation[];
  nextActions: string[];
}

export class PortfolioManager {
  private logger: Logger;
  private portfolio: Map<string, PortfolioVehicle> = new Map();
  private performanceHistory: PerformanceReport[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Analyze current portfolio and generate recommendations
   */
  async analyzePortfolio(
    currentRecommendations: BidRecommendation[],
    watchlistAlerts: WatchlistAlert[],
    strategy: BiddingStrategy,
  ): Promise<PerformanceReport> {
    const currentTime = new Date().toISOString();
    const period = {
      start:
        this.getLastReportDate() ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      end: currentTime,
      duration: 30,
    };

    // Calculate current metrics
    const metrics = await this.calculatePortfolioMetrics();

    // Analyze performance
    const { topPerformers, underperformers } = this.analyzePerformance();

    // Generate market insights
    const marketInsights = await this.generateMarketInsights(
      currentRecommendations,
      watchlistAlerts,
    );

    // Generate portfolio recommendations
    const recommendations = await this.generatePortfolioRecommendations(
      metrics,
      currentRecommendations,
      strategy,
    );

    // Generate next actions
    const nextActions = this.generateNextActions(
      recommendations,
      watchlistAlerts,
    );

    const report: PerformanceReport = {
      period,
      metrics,
      topPerformers,
      underperformers,
      marketInsights,
      recommendations,
      nextActions,
    };

    this.performanceHistory.push(report);

    this.logger.info(
      {
        portfolioValue: metrics.totalInvestment,
        activeItems: metrics.activeWatchlistItems,
        roi: metrics.averageROI,
        recommendationsCount: recommendations.length,
      },
      'Generated portfolio analysis',
    );

    return report;
  }

  /**
   * Calculate comprehensive portfolio metrics
   */
  private calculatePortfolioMetrics(): PortfolioMetrics {
    const vehicles = Array.from(this.portfolio.values());

    if (vehicles.length === 0) {
      return {
        totalInvestment: 0,
        activeWatchlistItems: 0,
        averageROI: 0,
        successRate: 0,
        totalProfitLoss: 0,
        riskScore: 0,
        diversificationScore: 0,
        liquidityScore: 0,
      };
    }

    const totalInvestment = vehicles.reduce((sum, v) => sum + v.totalCost, 0);
    const totalProfitLoss = vehicles.reduce(
      (sum, v) => sum + (v.currentValue - v.totalCost),
      0,
    );
    const avgROI =
      totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    const soldVehicles = vehicles.filter((v) => v.status === 'sold');
    const profitableVehicles = soldVehicles.filter(
      (v) => v.currentValue > v.totalCost,
    );
    const successRate =
      soldVehicles.length > 0
        ? (profitableVehicles.length / soldVehicles.length) * 100
        : 0;

    const riskScore = this.calculateRiskScore(vehicles);
    const diversificationScore = this.calculateDiversificationScore(vehicles);
    const liquidityScore = this.calculateLiquidityScore(vehicles);

    return {
      totalInvestment,
      activeWatchlistItems: vehicles.filter(
        (v) => v.status === 'watching' || v.status === 'owned',
      ).length,
      averageROI: avgROI,
      successRate,
      totalProfitLoss,
      riskScore,
      diversificationScore,
      liquidityScore,
    };
  }

  /**
   * Calculate portfolio risk score
   */
  private calculateRiskScore(vehicles: PortfolioVehicle[]): number {
    if (vehicles.length === 0) return 0;

    let totalRisk = 0;
    let totalWeight = 0;

    for (const vehicle of vehicles) {
      const weight = vehicle.totalCost;
      let riskScore = 0;

      // Age risk (older vehicles are riskier)
      const age = new Date().getFullYear() - vehicle.year;
      riskScore += Math.min(age * 2, 20); // Max 20 points for age

      // Mileage risk
      const mileageRisk = Math.min((vehicle.mileage / 200000) * 25, 25); // Max 25 points
      riskScore += mileageRisk;

      // Damage risk
      const damageRiskMap: Record<string, number> = {
        none: 0,
        clean: 0,
        minor: 10,
        moderate: 20,
        severe: 35,
        salvage: 50,
      };
      riskScore += damageRiskMap[vehicle.damage.toLowerCase()] || 15;

      // Market volatility risk (simplified)
      if (
        vehicle.make.toLowerCase().includes('luxury') ||
        vehicle.totalCost > 50000
      ) {
        riskScore += 10; // Luxury vehicles are more volatile
      }

      totalRisk += riskScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.min(100, totalRisk / totalWeight) : 0;
  }

  /**
   * Calculate diversification score
   */
  private calculateDiversificationScore(vehicles: PortfolioVehicle[]): number {
    if (vehicles.length === 0) return 0;
    if (vehicles.length === 1) return 20; // Single vehicle = low diversification

    const makeDistribution = new Map<string, number>();
    const yearDistribution = new Map<number, number>();
    const priceRangeDistribution = new Map<string, number>();

    for (const vehicle of vehicles) {
      // Make distribution
      makeDistribution.set(
        vehicle.make,
        (makeDistribution.get(vehicle.make) || 0) + 1,
      );

      // Year distribution
      const decade = Math.floor(vehicle.year / 10) * 10;
      yearDistribution.set(decade, (yearDistribution.get(decade) || 0) + 1);

      // Price range distribution
      const priceRange =
        vehicle.totalCost < 10000
          ? 'low'
          : vehicle.totalCost < 30000
            ? 'medium'
            : 'high';
      priceRangeDistribution.set(
        priceRange,
        (priceRangeDistribution.get(priceRange) || 0) + 1,
      );
    }

    // Calculate diversity scores (higher = more diverse)
    const makeScore = Math.min(
      100,
      (makeDistribution.size / vehicles.length) * 100,
    );
    const yearScore = Math.min(
      100,
      (yearDistribution.size / Math.min(3, vehicles.length)) * 100,
    );
    const priceScore = Math.min(
      100,
      (priceRangeDistribution.size / Math.min(3, vehicles.length)) * 100,
    );

    return (makeScore + yearScore + priceScore) / 3;
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(vehicles: PortfolioVehicle[]): number {
    if (vehicles.length === 0) return 100; // No positions = fully liquid

    let totalWeight = 0;
    let liquidityScore = 0;

    for (const vehicle of vehicles) {
      const weight = vehicle.totalCost;
      let vehicleLiquidity = 100; // Start at 100%

      // Reduce liquidity based on condition
      const damageReduction: Record<string, number> = {
        severe: 40,
        salvage: 60,
        moderate: 20,
        minor: 10,
        none: 0,
        clean: 0,
      };
      vehicleLiquidity -= damageReduction[vehicle.damage.toLowerCase()] || 15;

      // Reduce liquidity for very high or very low value vehicles
      if (vehicle.totalCost > 75000) {
        vehicleLiquidity -= 25; // Luxury vehicles harder to sell
      } else if (vehicle.totalCost < 3000) {
        vehicleLiquidity -= 15; // Very cheap vehicles may have limited market
      }

      // Age factor
      const age = new Date().getFullYear() - vehicle.year;
      if (age > 15) {
        vehicleLiquidity -= 20; // Older vehicles harder to sell
      }

      liquidityScore += Math.max(0, vehicleLiquidity) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? liquidityScore / totalWeight : 100;
  }

  /**
   * Analyze top and underperforming vehicles
   */
  private analyzePerformance(): {
    topPerformers: PerformanceReport['topPerformers'];
    underperformers: PerformanceReport['underperformers'];
  } {
    const vehicles = Array.from(this.portfolio.values())
      .filter((v) => v.status === 'sold') // Only analyze sold vehicles
      .map((v) => ({
        vehicleId: v.id,
        roi:
          v.totalCost > 0
            ? ((v.currentValue - v.totalCost) / v.totalCost) * 100
            : 0,
        profit: v.currentValue - v.totalCost,
        vehicle: v,
      }))
      .sort((a, b) => b.roi - a.roi);

    const topPerformers = vehicles.slice(0, 3).map((v) => ({
      vehicleId: v.vehicleId,
      roi: v.roi,
      profit: v.profit,
      reasoning: this.generatePerformanceReasoning(v.vehicle, 'positive'),
    }));

    const underperformers = vehicles
      .slice(-3)
      .filter((v) => v.roi < 0)
      .map((v) => ({
        vehicleId: v.vehicleId,
        roi: v.roi,
        loss: Math.abs(v.profit),
        lessonsLearned: this.generatePerformanceReasoning(
          v.vehicle,
          'negative',
        ),
      }));

    return { topPerformers, underperformers };
  }

  /**
   * Generate performance reasoning
   */
  private generatePerformanceReasoning(
    vehicle: PortfolioVehicle,
    type: 'positive' | 'negative',
  ): string {
    const reasons: string[] = [];

    if (type === 'positive') {
      if (vehicle.damage === 'none' || vehicle.damage === 'clean') {
        reasons.push('Clean condition vehicle');
      }
      if (vehicle.year >= new Date().getFullYear() - 5) {
        reasons.push('Recent model year');
      }
      if (vehicle.mileage < 50000) {
        reasons.push('Low mileage');
      }
      reasons.push('Strong market demand for this make/model');
    } else {
      if (vehicle.damage === 'severe' || vehicle.damage === 'salvage') {
        reasons.push('Underestimated repair costs');
      }
      if (vehicle.year < new Date().getFullYear() - 10) {
        reasons.push('Older vehicle with limited market appeal');
      }
      if (vehicle.mileage > 150000) {
        reasons.push('High mileage affected resale value');
      }
      reasons.push('Market conditions or pricing misjudgment');
    }

    return (
      reasons.join(', ') ||
      (type === 'positive' ? 'Good market timing' : 'Poor market timing')
    );
  }

  /**
   * Generate market insights
   */
  private generateMarketInsights(
    recommendations: BidRecommendation[],
    alerts: WatchlistAlert[],
  ): MarketInsight[] {
    const insights: MarketInsight[] = [];

    // Analyze bid recommendations for trends
    const bidVehicles = recommendations.filter(
      (r) => r.recommendation.action === 'bid',
    );

    if (bidVehicles.length > 0) {
      const makeCount = new Map<string, number>();
      let totalROI = 0;

      for (const rec of bidVehicles) {
        makeCount.set(
          rec.vehicle.make,
          (makeCount.get(rec.vehicle.make) || 0) + 1,
        );
        totalROI += rec.financials.profitabilityAnalysis.roi;
      }

      const avgROI = totalROI / bidVehicles.length;
      const topMake = Array.from(makeCount.entries()).sort(
        (a, b) => b[1] - a[1],
      )[0];

      if (avgROI > 30) {
        insights.push({
          category: 'opportunity',
          title: 'Strong Market Opportunities',
          description: `${bidVehicles.length} vehicles with average ${avgROI.toFixed(1)}% ROI potential`,
          confidence: 85,
          timeframe: 'immediate',
          actionable: true,
          relatedVehicles: bidVehicles.map((r) => r.vehicleId),
        });
      }

      if (topMake && topMake[1] >= 3) {
        insights.push({
          category: 'trend',
          title: `${topMake[0]} Market Strength`,
          description: `${topMake[0]} vehicles showing strong value in current market`,
          confidence: 70,
          timeframe: 'short_term',
          actionable: true,
        });
      }
    }

    // Analyze watchlist alerts for market dynamics
    const urgentAlerts = alerts.filter(
      (a) => a.urgency === 'critical' || a.urgency === 'high',
    );

    if (urgentAlerts.length > 3) {
      insights.push({
        category: 'risk',
        title: 'High Market Activity',
        description: `${urgentAlerts.length} urgent alerts suggest increased competition or price volatility`,
        confidence: 75,
        timeframe: 'immediate',
        actionable: true,
        relatedVehicles: urgentAlerts.map((a) => a.vehicle.id),
      });
    }

    // Seasonal insights (simplified)
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 9 || currentMonth <= 2) {
      // Oct-Feb
      insights.push({
        category: 'seasonal',
        title: 'Winter Market Conditions',
        description:
          'Lower demand typical in winter months, potential for better prices',
        confidence: 60,
        timeframe: 'medium_term',
        actionable: false,
      });
    }

    return insights;
  }

  /**
   * Generate portfolio-level recommendations
   */
  private generatePortfolioRecommendations(
    metrics: PortfolioMetrics,
    recommendations: BidRecommendation[],
    strategy: BiddingStrategy,
  ): PortfolioRecommendation[] {
    const portfolioRecs: PortfolioRecommendation[] = [];

    // Risk management recommendations
    if (metrics.riskScore > 70) {
      portfolioRecs.push({
        action: 'rebalance',
        priority: 'high',
        reasoning: `Portfolio risk score of ${metrics.riskScore.toFixed(1)} is above target. Consider reducing high-risk positions.`,
        impact: {
          riskChange: -20,
          returnChange: -5,
          diversificationChange: 10,
        },
        alternatives: [
          'Sell highest-risk vehicles',
          'Focus on lower-risk acquisitions',
        ],
      });
    }

    // Diversification recommendations
    if (metrics.diversificationScore < 40) {
      portfolioRecs.push({
        action: 'rebalance',
        priority: 'medium',
        reasoning: `Low diversification score of ${metrics.diversificationScore.toFixed(1)}. Consider broader make/model variety.`,
        impact: {
          riskChange: -10,
          returnChange: 5,
          diversificationChange: 25,
        },
        alternatives: [
          'Target different vehicle categories',
          'Vary price ranges',
        ],
      });
    }

    // Investment opportunity recommendations
    const strongBids = recommendations.filter(
      (r) =>
        r.recommendation.action === 'bid' &&
        r.recommendation.confidence > 80 &&
        r.financials.profitabilityAnalysis.roi >
          strategy.preferences.minimumROI,
    );

    if (
      strongBids.length > 0 &&
      metrics.totalInvestment < strategy.budgetConstraints.maxTotalBudget * 0.8
    ) {
      portfolioRecs.push({
        action: 'buy',
        priority: 'high',
        reasoning: `${strongBids.length} high-confidence opportunities available within budget constraints.`,
        impact: {
          riskChange: 5,
          returnChange: 15,
          diversificationChange: 0,
        },
      });
    }

    // Liquidity recommendations
    if (metrics.liquidityScore < 30) {
      portfolioRecs.push({
        action: 'sell',
        priority: 'medium',
        reasoning: `Low liquidity score of ${metrics.liquidityScore.toFixed(1)}. Consider selling less liquid assets.`,
        impact: {
          riskChange: -5,
          returnChange: -2,
          diversificationChange: -5,
        },
        alternatives: ['Liquidate damaged vehicles', 'Sell older inventory'],
      });
    }

    return portfolioRecs;
  }

  /**
   * Generate actionable next steps
   */
  private generateNextActions(
    recommendations: PortfolioRecommendation[],
    alerts: WatchlistAlert[],
  ): string[] {
    const actions: string[] = [];

    // High priority recommendations
    const highPriorityRecs = recommendations.filter(
      (r) => r.priority === 'high' || r.priority === 'urgent',
    );
    for (const rec of highPriorityRecs) {
      actions.push(`${rec.action.toUpperCase()}: ${rec.reasoning}`);
    }

    // Critical alerts
    const criticalAlerts = alerts.filter((a) => a.urgency === 'critical');
    for (const alert of criticalAlerts.slice(0, 3)) {
      // Limit to top 3
      actions.push(
        `URGENT: ${alert.trigger.message} for ${alert.vehicle.year} ${alert.vehicle.make} ${alert.vehicle.model}`,
      );
    }

    // Default actions if none generated
    if (actions.length === 0) {
      actions.push('Monitor current watchlist for new opportunities');
      actions.push('Review and update bidding strategy if needed');
      actions.push('Consider adding more vehicles to watchlist');
    }

    return actions.slice(0, 5); // Limit to 5 actions
  }

  /**
   * Add vehicle to portfolio tracking
   */
  addVehicleToPortfolio(
    vehicle: CopartVehicle,
    totalCost: number,
    status: 'watching' | 'bidding' | 'owned',
  ): void {
    const portfolioVehicle: PortfolioVehicle = {
      id: vehicle.lotNumber || vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
      mileage: vehicle.mileage,
      damage: vehicle.damage,
      totalCost,
      currentValue: vehicle.estimatedValue,
      status,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.portfolio.set(portfolioVehicle.id, portfolioVehicle);
    this.logger.info(
      { vehicleId: portfolioVehicle.id, status },
      'Added vehicle to portfolio tracking',
    );
  }

  /**
   * Update vehicle status in portfolio
   */
  updateVehicleStatus(
    vehicleId: string,
    status: PortfolioVehicle['status'],
    currentValue?: number,
  ): void {
    const vehicle = this.portfolio.get(vehicleId);
    if (vehicle) {
      vehicle.status = status;
      vehicle.updatedAt = new Date().toISOString();
      if (currentValue !== undefined) {
        vehicle.currentValue = currentValue;
      }
      this.logger.info(
        { vehicleId, status, currentValue },
        'Updated vehicle status in portfolio',
      );
    }
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(): {
    totalVehicles: number;
    totalInvestment: number;
    byStatus: Record<string, number>;
    topMakes: Array<{ make: string; count: number }>;
  } {
    const vehicles = Array.from(this.portfolio.values());
    const byStatus: Record<string, number> = {};
    const makeCount = new Map<string, number>();

    for (const vehicle of vehicles) {
      byStatus[vehicle.status] = (byStatus[vehicle.status] || 0) + 1;
      makeCount.set(vehicle.make, (makeCount.get(vehicle.make) || 0) + 1);
    }

    const topMakes = Array.from(makeCount.entries())
      .map(([make, count]) => ({ make, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalVehicles: vehicles.length,
      totalInvestment: vehicles.reduce((sum, v) => sum + v.totalCost, 0),
      byStatus,
      topMakes,
    };
  }

  /**
   * Get last report date
   */
  private getLastReportDate(): string | null {
    if (this.performanceHistory.length === 0) return null;
    return this.performanceHistory[this.performanceHistory.length - 1].period
      .end;
  }
}

interface PortfolioVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  mileage: number;
  damage: string;
  totalCost: number;
  currentValue: number;
  status: 'watching' | 'bidding' | 'owned' | 'sold';
  addedAt: string;
  updatedAt: string;
}
