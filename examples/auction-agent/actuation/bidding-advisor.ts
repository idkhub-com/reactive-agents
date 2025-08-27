import type { Logger } from 'pino';
import type { AuctionAnalysis, CopartVehicle } from '../copart';

export interface BidRecommendation {
  vehicleId: string;
  vehicle: CopartVehicle;
  analysis: AuctionAnalysis;
  recommendation: {
    action: 'bid' | 'watch' | 'pass';
    maxBid: number;
    confidence: number; // 0-100
    reasoning: string[];
    riskFactors: string[];
    opportunityFactors: string[];
  };
  strategy: {
    bidType: 'aggressive' | 'conservative' | 'strategic';
    timing: 'immediate' | 'wait' | 'last_minute' | 'strategic';
    increment: number;
    reserveBuffer: number; // amount to stay below reserve
  };
  financials: {
    totalCost: number; // bid + fees + transport + repairs
    breakdownCosts: {
      bid: number;
      buyersPremium: number;
      transportEstimate: number;
      repairEstimate: number;
      registrationFees: number;
    };
    profitabilityAnalysis: {
      estimatedMarketValue: number;
      potentialProfit: number;
      roi: number; // percentage
      paybackPeriod: number; // days
    };
  };
  timeline: {
    auctionEndTime: string;
    timeUntilEnd: number; // milliseconds
    optimalBidWindow: {
      start: number; // milliseconds before end
      end: number; // milliseconds before end
    };
  };
  preparation: {
    documentsNeeded: string[];
    inspectionRecommended: boolean;
    financingRequired: number;
    transportationPlan: string;
  };
}

export interface BiddingStrategy {
  riskTolerance: 'low' | 'medium' | 'high';
  budgetConstraints: {
    maxTotalBudget: number;
    maxPerVehicle: number;
    reservedForFees: number;
  };
  preferences: {
    preferredBidTiming: 'early' | 'strategic' | 'last_minute';
    maxCompetitionLevel: number; // 1-10 scale
    minimumROI: number; // percentage
    maxRepairCosts: number;
  };
  automation: {
    enableAutoBid: boolean;
    maxAutoBidAmount: number;
    bidIncrements: number[];
    stopLossPercentage: number;
  };
}

export class BiddingAdvisor {
  private logger: Logger;
  private defaultStrategy: BiddingStrategy;

  constructor(logger: Logger) {
    this.logger = logger;
    this.defaultStrategy = this.getDefaultStrategy();
  }

  /**
   * Generate comprehensive bid recommendations for vehicles
   */
  async generateBidRecommendations(
    vehicles: CopartVehicle[],
    analyses: AuctionAnalysis[],
    strategy: Partial<BiddingStrategy> = {},
  ): Promise<BidRecommendation[]> {
    const mergedStrategy = { ...this.defaultStrategy, ...strategy };
    const recommendations: BidRecommendation[] = [];

    // Create analysis map for quick lookup
    const analysisMap = new Map<string, AuctionAnalysis>();
    for (const analysis of analyses) {
      const key = analysis.vehicle.lotNumber || analysis.vehicle.id;
      analysisMap.set(key, analysis);
    }

    for (const vehicle of vehicles) {
      const analysis = analysisMap.get(vehicle.lotNumber || vehicle.id);
      if (!analysis) continue;

      // Only generate recommendations for viable candidates
      if (analysis.score >= 50 || analysis.recommendation !== 'pass') {
        const recommendation = await this.generateSingleRecommendation(
          vehicle,
          analysis,
          mergedStrategy,
        );
        recommendations.push(recommendation);
      }
    }

    // Sort by priority (score * confidence * urgency)
    recommendations.sort((a, b) => {
      const scoreA =
        a.analysis.score *
        a.recommendation.confidence *
        this.getUrgencyMultiplier(a);
      const scoreB =
        b.analysis.score *
        b.recommendation.confidence *
        this.getUrgencyMultiplier(b);
      return scoreB - scoreA;
    });

    this.logger.info(
      {
        totalVehicles: vehicles.length,
        recommendationsGenerated: recommendations.length,
        bidRecommendations: recommendations.filter(
          (r) => r.recommendation.action === 'bid',
        ).length,
      },
      'Generated bid recommendations',
    );

    return recommendations;
  }

  /**
   * Generate recommendation for a single vehicle
   */
  private generateSingleRecommendation(
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    strategy: BiddingStrategy,
  ): BidRecommendation {
    // Calculate financial breakdown
    const financials = this.calculateFinancials(vehicle, analysis, strategy);

    // Determine bid strategy
    const bidStrategy = this.determineBidStrategy(
      vehicle,
      analysis,
      strategy,
      financials,
    );

    // Generate timeline
    const timeline = this.calculateTimeline(vehicle, bidStrategy);

    // Determine action and confidence
    const { action, confidence, reasoning, riskFactors, opportunityFactors } =
      this.analyzeRecommendation(vehicle, analysis, financials, strategy);

    // Calculate max bid
    const maxBid = this.calculateMaxBid(
      vehicle,
      analysis,
      financials,
      strategy,
    );

    // Generate preparation checklist
    const preparation = this.generatePreparationList(
      vehicle,
      analysis,
      financials,
    );

    return {
      vehicleId: vehicle.lotNumber || vehicle.id,
      vehicle,
      analysis,
      recommendation: {
        action,
        maxBid,
        confidence,
        reasoning,
        riskFactors,
        opportunityFactors,
      },
      strategy: bidStrategy,
      financials,
      timeline,
      preparation,
    };
  }

  /**
   * Calculate comprehensive financial breakdown
   */
  private calculateFinancials(
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    _strategy: BiddingStrategy,
  ): BidRecommendation['financials'] {
    const bid = vehicle.currentBid;

    // Estimate fees (Copart typically charges 10-15% buyer's premium)
    const buyersPremium = bid * 0.12; // 12% average

    // Estimate transport costs based on location (simplified)
    const transportEstimate = 500; // Base estimate

    // Estimate repair costs based on damage level
    const repairEstimate = this.estimateRepairCosts(vehicle);

    // Registration and misc fees
    const registrationFees = 200;

    const totalCost =
      bid +
      buyersPremium +
      transportEstimate +
      repairEstimate +
      registrationFees;

    // Market value from analysis or vehicle estimate
    const estimatedMarketValue =
      analysis.marketComparison.averagePrice || vehicle.estimatedValue;

    const potentialProfit = estimatedMarketValue - totalCost;
    const roi = totalCost > 0 ? (potentialProfit / totalCost) * 100 : 0;
    const paybackPeriod =
      potentialProfit > 0
        ? Math.round((totalCost / potentialProfit) * 30)
        : Number.POSITIVE_INFINITY; // days

    return {
      totalCost,
      breakdownCosts: {
        bid,
        buyersPremium,
        transportEstimate,
        repairEstimate,
        registrationFees,
      },
      profitabilityAnalysis: {
        estimatedMarketValue,
        potentialProfit,
        roi,
        paybackPeriod,
      },
    };
  }

  /**
   * Estimate repair costs based on vehicle condition
   */
  private estimateRepairCosts(vehicle: CopartVehicle): number {
    const damageLevel = vehicle.damage.toLowerCase();
    const baseValue = vehicle.estimatedValue;

    switch (damageLevel) {
      case 'none':
      case 'clean':
        return baseValue * 0.02; // 2% for minor maintenance
      case 'minor':
        return baseValue * 0.08; // 8% for minor repairs
      case 'moderate':
      case 'normal wear':
        return baseValue * 0.15; // 15% for moderate repairs
      case 'severe':
      case 'heavy damage':
        return baseValue * 0.3; // 30% for major repairs
      case 'salvage':
      case 'total loss':
        return baseValue * 0.5; // 50% for salvage rebuild
      default:
        return baseValue * 0.1; // 10% default
    }
  }

  /**
   * Determine optimal bidding strategy
   */
  private determineBidStrategy(
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    strategy: BiddingStrategy,
    financials: BidRecommendation['financials'],
  ): BidRecommendation['strategy'] {
    // Determine bid type based on competition and value
    let bidType: 'aggressive' | 'conservative' | 'strategic';
    const valueRatio = financials.profitabilityAnalysis.roi;

    if (valueRatio > 50 && analysis.score > 80) {
      bidType = 'aggressive'; // High value, high confidence
    } else if (valueRatio > 25 && analysis.score > 60) {
      bidType = 'strategic'; // Good value, moderate confidence
    } else {
      bidType = 'conservative'; // Lower value or confidence
    }

    // Determine timing based on strategy and auction end time
    const timing: 'immediate' | 'wait' | 'last_minute' | 'strategic' =
      strategy.preferences.preferredBidTiming === 'last_minute'
        ? 'last_minute'
        : bidType === 'aggressive'
          ? 'immediate'
          : 'strategic';

    // Calculate bid increment (Copart typically uses $25-100 increments)
    const increment =
      vehicle.currentBid < 5000 ? 25 : vehicle.currentBid < 20000 ? 50 : 100;

    // Reserve buffer (stay below reserve to avoid triggering reserve)
    const reserveBuffer = vehicle.estimatedValue * 0.1; // 10% buffer

    return {
      bidType,
      timing,
      increment,
      reserveBuffer,
    };
  }

  /**
   * Calculate auction timeline and optimal bidding windows
   */
  private calculateTimeline(
    vehicle: CopartVehicle,
    strategy: BidRecommendation['strategy'],
  ): BidRecommendation['timeline'] {
    const auctionEndTime =
      vehicle.auctionEndTime || new Date(Date.now() + 86400000).toISOString(); // Default 24h
    const timeUntilEnd = new Date(auctionEndTime).getTime() - Date.now();

    // Calculate optimal bidding window based on strategy
    let optimalStart: number;
    let optimalEnd: number;

    switch (strategy.timing) {
      case 'immediate':
        optimalStart = timeUntilEnd;
        optimalEnd = Math.max(0, timeUntilEnd - 3600000); // 1 hour window
        break;
      case 'last_minute':
        optimalStart = 300000; // 5 minutes before
        optimalEnd = 60000; // 1 minute before
        break;
      case 'strategic':
        optimalStart = 1800000; // 30 minutes before
        optimalEnd = 300000; // 5 minutes before
        break;
      default:
        optimalStart = 1800000; // 30 minutes before
        optimalEnd = 300000; // 5 minutes before
        break;
    }

    return {
      auctionEndTime,
      timeUntilEnd,
      optimalBidWindow: {
        start: optimalStart,
        end: optimalEnd,
      },
    };
  }

  /**
   * Analyze and determine recommendation action
   */
  private analyzeRecommendation(
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    financials: BidRecommendation['financials'],
    strategy: BiddingStrategy,
  ): {
    action: 'bid' | 'watch' | 'pass';
    confidence: number;
    reasoning: string[];
    riskFactors: string[];
    opportunityFactors: string[];
  } {
    const reasoning: string[] = [];
    const riskFactors: string[] = [];
    const opportunityFactors: string[] = [];

    // ROI analysis
    const roi = financials.profitabilityAnalysis.roi;
    if (roi >= strategy.preferences.minimumROI) {
      opportunityFactors.push(`Strong ROI potential: ${roi.toFixed(1)}%`);
      reasoning.push(
        `Exceeds minimum ROI requirement of ${strategy.preferences.minimumROI}%`,
      );
    } else {
      riskFactors.push(
        `ROI below target: ${roi.toFixed(1)}% < ${strategy.preferences.minimumROI}%`,
      );
    }

    // Analysis score consideration
    if (analysis.score >= 80) {
      opportunityFactors.push(
        `High analysis confidence: ${analysis.score}/100`,
      );
      reasoning.push('Strong buy signal from AI analysis');
    } else if (analysis.score >= 60) {
      reasoning.push('Moderate confidence from analysis');
    } else {
      riskFactors.push(`Low analysis score: ${analysis.score}/100`);
    }

    // Budget constraints
    if (financials.totalCost <= strategy.budgetConstraints.maxPerVehicle) {
      reasoning.push('Within per-vehicle budget constraints');
    } else {
      riskFactors.push('Exceeds per-vehicle budget limit');
    }

    // Repair cost analysis
    const repairRatio =
      financials.breakdownCosts.repairEstimate / vehicle.estimatedValue;
    if (repairRatio > 0.3) {
      riskFactors.push(
        `High repair costs: ${(repairRatio * 100).toFixed(1)}% of value`,
      );
    } else if (repairRatio < 0.1) {
      opportunityFactors.push('Low repair costs expected');
    }

    // Market comparison
    if (analysis.marketComparison.priceDifference > 0) {
      opportunityFactors.push(
        `Below market average by $${analysis.marketComparison.priceDifference.toLocaleString()}`,
      );
    }

    // Risk level consideration
    if (analysis.riskAssessment.level === 'high') {
      riskFactors.push(
        `High risk vehicle: ${analysis.riskAssessment.factors.join(', ')}`,
      );
    }

    // Determine action and confidence
    let action: 'bid' | 'watch' | 'pass';
    let confidence: number;

    if (riskFactors.length > opportunityFactors.length + 1) {
      action = 'pass';
      confidence = Math.max(20, 60 - riskFactors.length * 10);
      reasoning.push('Too many risk factors identified');
    } else if (
      roi >= strategy.preferences.minimumROI &&
      analysis.score >= 70 &&
      financials.totalCost <= strategy.budgetConstraints.maxPerVehicle
    ) {
      action = 'bid';
      confidence = Math.min(
        95,
        70 + opportunityFactors.length * 5 + (analysis.score - 70),
      );
      reasoning.push('Strong opportunity with acceptable risk');
    } else {
      action = 'watch';
      confidence =
        40 + opportunityFactors.length * 5 + Math.max(0, analysis.score - 50);
      reasoning.push('Monitor for better conditions or price changes');
    }

    return {
      action,
      confidence,
      reasoning,
      riskFactors,
      opportunityFactors,
    };
  }

  /**
   * Calculate maximum recommended bid
   */
  private calculateMaxBid(
    vehicle: CopartVehicle,
    _analysis: AuctionAnalysis,
    financials: BidRecommendation['financials'],
    strategy: BiddingStrategy,
  ): number {
    // Start with market value minus all costs except the bid itself
    const nonBidCosts = financials.totalCost - financials.breakdownCosts.bid;
    const marketValue = financials.profitabilityAnalysis.estimatedMarketValue;

    // Calculate max bid to achieve minimum ROI
    const targetProfit = marketValue * (strategy.preferences.minimumROI / 100);
    const maxBidForROI = marketValue - nonBidCosts - targetProfit;

    // Apply strategy constraints
    const strategyMax = strategy.budgetConstraints.maxPerVehicle - nonBidCosts;

    // Conservative approach: lower of the two
    const calculatedMax = Math.min(maxBidForROI, strategyMax);

    // Ensure it's above current bid (or no recommendation)
    const finalMax = Math.max(vehicle.currentBid, calculatedMax);

    // Round to nearest increment
    const increment =
      vehicle.currentBid < 5000 ? 25 : vehicle.currentBid < 20000 ? 50 : 100;

    return Math.floor(finalMax / increment) * increment;
  }

  /**
   * Generate preparation checklist
   */
  private generatePreparationList(
    vehicle: CopartVehicle,
    _analysis: AuctionAnalysis,
    financials: BidRecommendation['financials'],
  ): BidRecommendation['preparation'] {
    const documentsNeeded: string[] = [
      'Photo ID or passport',
      'Credit card for registration',
      'Proof of dealer license (if applicable)',
    ];

    if (financials.totalCost > 10000) {
      documentsNeeded.push('Financing pre-approval letter');
      documentsNeeded.push('Bank wire transfer capability');
    }

    const inspectionRecommended =
      vehicle.damage !== 'none' && vehicle.damage !== 'clean';

    if (inspectionRecommended) {
      documentsNeeded.push('Professional inspection report (recommended)');
    }

    return {
      documentsNeeded,
      inspectionRecommended,
      financingRequired: Math.max(0, financials.totalCost - 5000), // Assume $5k cash available
      transportationPlan: `Arrange transport from ${vehicle.location} (est. $${financials.breakdownCosts.transportEstimate})`,
    };
  }

  /**
   * Get urgency multiplier for priority sorting
   */
  private getUrgencyMultiplier(recommendation: BidRecommendation): number {
    const timeUntilEnd = recommendation.timeline.timeUntilEnd;

    if (timeUntilEnd < 3600000) return 2.0; // < 1 hour: very urgent
    if (timeUntilEnd < 86400000) return 1.5; // < 24 hours: urgent
    if (timeUntilEnd < 604800000) return 1.2; // < 1 week: moderate
    return 1.0; // > 1 week: normal
  }

  /**
   * Get default bidding strategy
   */
  private getDefaultStrategy(): BiddingStrategy {
    return {
      riskTolerance: 'medium',
      budgetConstraints: {
        maxTotalBudget: 100000,
        maxPerVehicle: 25000,
        reservedForFees: 5000,
      },
      preferences: {
        preferredBidTiming: 'strategic',
        maxCompetitionLevel: 7,
        minimumROI: 20, // 20% minimum return
        maxRepairCosts: 5000,
      },
      automation: {
        enableAutoBid: false,
        maxAutoBidAmount: 15000,
        bidIncrements: [25, 50, 100],
        stopLossPercentage: 10,
      },
    };
  }

  /**
   * Update bidding strategy
   */
  updateStrategy(newStrategy: Partial<BiddingStrategy>): void {
    this.defaultStrategy = { ...this.defaultStrategy, ...newStrategy };
    this.logger.info(
      { strategy: this.defaultStrategy },
      'Updated bidding strategy',
    );
  }

  /**
   * Get current strategy
   */
  getStrategy(): BiddingStrategy {
    return { ...this.defaultStrategy };
  }
}
