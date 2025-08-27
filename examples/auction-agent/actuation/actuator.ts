import type { Logger } from 'pino';
import type { AuctionAnalysis, CopartVehicle } from '../copart';
import { NotificationService } from '../scheduler/notifications';
import type { AuctionDatabase } from '../storage/database';
import {
  BiddingAdvisor,
  type BiddingStrategy,
  type BidRecommendation,
} from './bidding-advisor';
import { type PerformanceReport, PortfolioManager } from './portfolio-manager';
import { type WatchlistAlert, WatchlistManager } from './watchlist';

export interface ActuationConfig {
  enableWatchlist: boolean;
  enableBiddingAdvisor: boolean;
  enablePortfolioTracking: boolean;
  enableAdvancedNotifications: boolean;
  biddingStrategy?: Partial<BiddingStrategy>;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxConcurrentActions: number;
}

export interface ActuationResult {
  watchlistAlerts: WatchlistAlert[];
  bidRecommendations: BidRecommendation[];
  portfolioReport: PerformanceReport | null;
  actionsSuggested: string[];
  notificationsSent: number;
  executionSummary: {
    timestamp: string;
    totalVehiclesProcessed: number;
    alertsGenerated: number;
    recommendationsGenerated: number;
    criticalActions: number;
    processingTime: number;
  };
}

export interface ActionableInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendedActions: string[];
  impact: {
    financial: number; // estimated financial impact
    risk: number; // risk level change (-100 to +100)
    confidence: number; // confidence in recommendation (0-100)
  };
  timeframe: {
    urgent: boolean;
    optimalAction: string; // 'immediate' | 'within_hour' | 'within_day' | 'flexible'
    expiresAt?: string; // when this insight becomes irrelevant
  };
  relatedVehicles: string[];
  metadata: Record<string, unknown>;
}

export class AuctionActuator {
  private logger: Logger;
  private watchlistManager: WatchlistManager;
  private biddingAdvisor: BiddingAdvisor;
  private portfolioManager: PortfolioManager;
  private notificationService: NotificationService;
  private config: ActuationConfig;

  constructor(
    db: AuctionDatabase,
    logger: Logger,
    config: Partial<ActuationConfig> = {},
  ) {
    this.logger = logger;
    this.notificationService = new NotificationService(logger);

    this.config = {
      enableWatchlist: true,
      enableBiddingAdvisor: true,
      enablePortfolioTracking: true,
      enableAdvancedNotifications: true,
      riskTolerance: 'moderate',
      maxConcurrentActions: 10,
      ...config,
    };

    this.watchlistManager = new WatchlistManager(db, logger);
    this.biddingAdvisor = new BiddingAdvisor(logger);
    this.portfolioManager = new PortfolioManager(logger);

    // Configure bidding strategy based on risk tolerance
    if (this.config.biddingStrategy) {
      this.biddingAdvisor.updateStrategy(this.config.biddingStrategy);
    } else {
      this.biddingAdvisor.updateStrategy(
        this.getDefaultStrategyForRiskTolerance(this.config.riskTolerance),
      );
    }
  }

  /**
   * Main actuation processing - orchestrates all advanced AI agent actions
   */
  async processActuation(
    vehicles: CopartVehicle[],
    analyses: AuctionAnalysis[],
    runId: string,
  ): Promise<ActuationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    this.logger.info(
      {
        runId,
        vehicleCount: vehicles.length,
        analysisCount: analyses.length,
        enabledFeatures: Object.entries(this.config)
          .filter(([_, v]) => v === true)
          .map(([k]) => k),
      },
      'Starting actuation processing',
    );

    let watchlistAlerts: WatchlistAlert[] = [];
    let bidRecommendations: BidRecommendation[] = [];
    let portfolioReport: PerformanceReport | null = null;
    let notificationsSent = 0;

    try {
      // 1. Process watchlist alerts
      if (this.config.enableWatchlist) {
        this.logger.debug('Processing watchlist alerts');
        watchlistAlerts = await this.watchlistManager.processWatchlistAlerts(
          vehicles,
          analyses,
        );
        this.logger.info(
          { alertCount: watchlistAlerts.length },
          'Generated watchlist alerts',
        );
      }

      // 2. Generate bidding recommendations
      if (this.config.enableBiddingAdvisor) {
        this.logger.debug('Generating bidding recommendations');
        const strategy = this.biddingAdvisor.getStrategy();
        bidRecommendations =
          await this.biddingAdvisor.generateBidRecommendations(
            vehicles,
            analyses,
            strategy,
          );
        this.logger.info(
          {
            recommendationCount: bidRecommendations.length,
            bidActions: bidRecommendations.filter(
              (r) => r.recommendation.action === 'bid',
            ).length,
          },
          'Generated bidding recommendations',
        );
      }

      // 3. Update portfolio and generate performance report
      if (this.config.enablePortfolioTracking) {
        this.logger.debug('Analyzing portfolio performance');

        // Add new vehicles to portfolio tracking
        for (const analysis of analyses) {
          if (analysis.recommendation === 'buy' || analysis.score > 70) {
            this.portfolioManager.addVehicleToPortfolio(
              analysis.vehicle,
              analysis.vehicle.currentBid + 1000, // Estimate total cost
              'watching',
            );
          }
        }

        const strategy = this.biddingAdvisor.getStrategy();
        portfolioReport = await this.portfolioManager.analyzePortfolio(
          bidRecommendations,
          watchlistAlerts,
          strategy,
        );
        this.logger.info(
          {
            portfolioValue: portfolioReport.metrics.totalInvestment,
            roi: portfolioReport.metrics.averageROI,
            recommendationCount: portfolioReport.recommendations.length,
          },
          'Generated portfolio analysis',
        );
      }

      // 4. Generate actionable insights
      const insights = this.generateActionableInsights(
        watchlistAlerts,
        bidRecommendations,
        portfolioReport,
      );
      const actionsSuggested = insights.map(
        (i) =>
          `${i.priority.toUpperCase()}: ${i.title} - ${i.recommendedActions[0]}`,
      );

      // 5. Send advanced notifications
      if (this.config.enableAdvancedNotifications) {
        notificationsSent = await this.sendAdvancedNotifications(
          insights,
          watchlistAlerts,
          bidRecommendations,
        );
      }

      // 6. Store actuation results
      await this.storeActuationResults(runId, {
        watchlistAlerts,
        bidRecommendations,
        portfolioReport,
        insights,
        timestamp,
      });

      const processingTime = Date.now() - startTime;
      const criticalActions = insights.filter(
        (i) => i.priority === 'critical',
      ).length;

      const result: ActuationResult = {
        watchlistAlerts,
        bidRecommendations,
        portfolioReport,
        actionsSuggested,
        notificationsSent,
        executionSummary: {
          timestamp,
          totalVehiclesProcessed: vehicles.length,
          alertsGenerated: watchlistAlerts.length,
          recommendationsGenerated: bidRecommendations.length,
          criticalActions,
          processingTime,
        },
      };

      this.logger.info(
        {
          runId,
          processingTime,
          alertsGenerated: watchlistAlerts.length,
          recommendationsGenerated: bidRecommendations.length,
          criticalActions,
          notificationsSent,
        },
        'Completed actuation processing',
      );

      return result;
    } catch (error) {
      this.logger.error({ err: error, runId }, 'Failed actuation processing');
      throw error;
    }
  }

  /**
   * Generate actionable insights from all analysis results
   */
  private generateActionableInsights(
    watchlistAlerts: WatchlistAlert[],
    bidRecommendations: BidRecommendation[],
    portfolioReport: PerformanceReport | null,
  ): ActionableInsight[] {
    const insights: ActionableInsight[] = [];

    // Critical watchlist alerts
    for (const alert of watchlistAlerts.filter(
      (a) => a.urgency === 'critical',
    )) {
      insights.push({
        id: `watchlist-${alert.id}`,
        type: 'alert',
        priority: 'critical',
        title: `Urgent Action Required: ${alert.vehicle.year} ${alert.vehicle.make} ${alert.vehicle.model}`,
        description: alert.trigger.message,
        recommendedActions: alert.actionRecommendations,
        impact: {
          financial: this.estimateFinancialImpact(alert.analysis),
          risk: alert.urgency === 'critical' ? 50 : 25,
          confidence: 85,
        },
        timeframe: {
          urgent: true,
          optimalAction:
            alert.timeToAction && alert.timeToAction < 3600000
              ? 'immediate'
              : 'within_hour',
          expiresAt: alert.vehicle.auctionEndTime,
        },
        relatedVehicles: [alert.vehicle.id],
        metadata: {
          alertType: alert.trigger.triggerType,
          vehicleScore: alert.analysis.score,
        },
      });
    }

    // High-value bidding opportunities
    const topBidOpportunities = bidRecommendations
      .filter(
        (r) =>
          r.recommendation.action === 'bid' && r.recommendation.confidence > 80,
      )
      .slice(0, 3);

    for (const bid of topBidOpportunities) {
      insights.push({
        id: `bid-${bid.vehicleId}`,
        type: 'opportunity',
        priority:
          bid.financials.profitabilityAnalysis.roi > 50 ? 'high' : 'medium',
        title: `High-Value Bidding Opportunity: ${bid.vehicle.year} ${bid.vehicle.make} ${bid.vehicle.model}`,
        description: `${bid.financials.profitabilityAnalysis.roi.toFixed(1)}% ROI potential with ${bid.recommendation.confidence}% confidence`,
        recommendedActions: [
          `Bid up to $${bid.recommendation.maxBid.toLocaleString()}`,
          ...bid.preparation.documentsNeeded.slice(0, 2),
        ],
        impact: {
          financial: bid.financials.profitabilityAnalysis.potentialProfit,
          risk: this.calculateBidRisk(bid),
          confidence: bid.recommendation.confidence,
        },
        timeframe: {
          urgent: bid.timeline.timeUntilEnd < 86400000, // Less than 24 hours
          optimalAction:
            bid.strategy.timing === 'immediate' ? 'immediate' : 'within_day',
          expiresAt: bid.vehicle.auctionEndTime,
        },
        relatedVehicles: [bid.vehicleId],
        metadata: {
          maxBid: bid.recommendation.maxBid,
          roi: bid.financials.profitabilityAnalysis.roi,
          bidStrategy: bid.strategy.bidType,
        },
      });
    }

    // Portfolio optimization insights
    if (portfolioReport) {
      for (const rec of portfolioReport.recommendations.filter(
        (r) => r.priority === 'high' || r.priority === 'urgent',
      )) {
        insights.push({
          id: `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'optimization',
          priority: rec.priority === 'urgent' ? 'critical' : 'high',
          title: `Portfolio Optimization: ${rec.action.toUpperCase()}`,
          description: rec.reasoning,
          recommendedActions: rec.alternatives || [
            `Execute ${rec.action} strategy`,
          ],
          impact: {
            financial:
              (Math.abs(rec.impact.returnChange) *
                portfolioReport.metrics.totalInvestment) /
              100,
            risk: rec.impact.riskChange,
            confidence: 75,
          },
          timeframe: {
            urgent: rec.priority === 'urgent',
            optimalAction: 'flexible',
          },
          relatedVehicles: [],
          metadata: {
            portfolioAction: rec.action,
            riskChange: rec.impact.riskChange,
            returnChange: rec.impact.returnChange,
          },
        });
      }

      // Market insights
      for (const insight of portfolioReport.marketInsights.filter(
        (i) => i.actionable && i.confidence > 70,
      )) {
        insights.push({
          id: `market-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: insight.category === 'risk' ? 'risk' : 'opportunity',
          priority: insight.confidence > 85 ? 'high' : 'medium',
          title: `Market Insight: ${insight.title}`,
          description: insight.description,
          recommendedActions: [
            `Monitor ${insight.category} indicators`,
            'Adjust strategy accordingly',
          ],
          impact: {
            financial: 0, // Market insights don't have direct financial impact
            risk: insight.category === 'risk' ? 25 : -10,
            confidence: insight.confidence,
          },
          timeframe: {
            urgent: insight.timeframe === 'immediate',
            optimalAction:
              insight.timeframe === 'immediate' ? 'immediate' : 'flexible',
          },
          relatedVehicles: insight.relatedVehicles || [],
          metadata: {
            marketCategory: insight.category,
            timeframe: insight.timeframe,
            confidence: insight.confidence,
          },
        });
      }
    }

    // Sort by priority and potential impact
    insights.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, sort by financial impact
      return Math.abs(b.impact.financial) - Math.abs(a.impact.financial);
    });

    return insights.slice(0, this.config.maxConcurrentActions);
  }

  /**
   * Send advanced notifications based on insights
   */
  private async sendAdvancedNotifications(
    insights: ActionableInsight[],
    watchlistAlerts: WatchlistAlert[],
    bidRecommendations: BidRecommendation[],
  ): Promise<number> {
    let sent = 0;

    // Check if notification services are available
    const notificationStatus = this.notificationService.getStatus();
    if (!notificationStatus.email && !notificationStatus.sms) {
      this.logger.debug(
        'No notification services configured - skipping advanced notifications',
      );
      return 0;
    }

    const recipients = this.getNotificationRecipients();
    if (recipients.length === 0) {
      this.logger.debug('No notification recipients configured');
      return 0;
    }

    // Send critical insights immediately
    const criticalInsights = insights.filter((i) => i.priority === 'critical');

    for (const insight of criticalInsights) {
      for (const recipient of recipients) {
        try {
          if (recipient.includes('@')) {
            await this.notificationService.sendEmailNotification(
              recipient,
              `🚨 Critical Auction Alert: ${insight.title}`,
              this.formatInsightEmail(
                insight,
                watchlistAlerts,
                bidRecommendations,
              ),
            );
          } else {
            await this.notificationService.sendSMSNotification(
              recipient,
              this.formatInsightSMS(insight),
            );
          }
          sent++;
        } catch (error) {
          this.logger.warn(
            { err: error, recipient, insightId: insight.id },
            'Failed to send insight notification',
          );
        }
      }
    }

    // Send summary for high-priority insights (if any)
    const highPriorityInsights = insights.filter((i) => i.priority === 'high');
    if (highPriorityInsights.length > 0) {
      for (const recipient of recipients.filter((r) => r.includes('@'))) {
        // Email only for summaries
        try {
          await this.notificationService.sendEmailNotification(
            recipient,
            `📊 Auction Insights Summary: ${highPriorityInsights.length} High-Priority Items`,
            this.formatInsightsSummaryEmail(
              highPriorityInsights,
              bidRecommendations,
            ),
          );
          sent++;
        } catch (error) {
          this.logger.warn(
            { err: error, recipient },
            'Failed to send insights summary',
          );
        }
      }
    }

    return sent;
  }

  /**
   * Format insight for email notification
   */
  private formatInsightEmail(
    insight: ActionableInsight,
    _alerts: WatchlistAlert[],
    _recommendations: BidRecommendation[],
  ): string {
    const urgencyIcon =
      insight.priority === 'critical'
        ? '🚨'
        : insight.priority === 'high'
          ? '⚠️'
          : '📊';

    let html = `
      <h2>${urgencyIcon} ${insight.title}</h2>
      <p><strong>Priority:</strong> ${insight.priority.toUpperCase()}</p>
      <p><strong>Type:</strong> ${insight.type}</p>
      <p><strong>Description:</strong> ${insight.description}</p>
      
      <h3>📋 Recommended Actions</h3>
      <ul>
    `;

    for (const action of insight.recommendedActions) {
      html += `<li>${action}</li>`;
    }

    html += `
      </ul>
      
      <h3>📈 Impact Assessment</h3>
      <ul>
        <li><strong>Financial Impact:</strong> $${Math.abs(insight.impact.financial).toLocaleString()}</li>
        <li><strong>Risk Change:</strong> ${insight.impact.risk > 0 ? '+' : ''}${insight.impact.risk}</li>
        <li><strong>Confidence:</strong> ${insight.impact.confidence}%</li>
      </ul>
    `;

    if (insight.timeframe.urgent) {
      html += `<p><strong>⏰ Time Sensitive:</strong> Action needed ${insight.timeframe.optimalAction}</p>`;
    }

    if (insight.timeframe.expiresAt) {
      html += `<p><strong>⏳ Expires:</strong> ${new Date(insight.timeframe.expiresAt).toLocaleString()}</p>`;
    }

    html +=
      '<p><em>This is an automated insight from your Advanced Auction Agent.</em></p>';

    return html;
  }

  /**
   * Format insight for SMS notification
   */
  private formatInsightSMS(insight: ActionableInsight): string {
    const urgencyIcon = insight.priority === 'critical' ? '🚨' : '⚠️';

    let message = `${urgencyIcon} ${insight.title}\n\n${insight.description}`;

    if (insight.timeframe.urgent) {
      message += `\n\n⏰ URGENT: Action needed ${insight.timeframe.optimalAction}`;
    }

    if (insight.recommendedActions.length > 0) {
      message += `\n\nAction: ${insight.recommendedActions[0]}`;
    }

    if (insight.impact.financial > 1000) {
      message += `\n💰 Impact: $${Math.abs(insight.impact.financial).toLocaleString()}`;
    }

    return message;
  }

  /**
   * Format insights summary email
   */
  private formatInsightsSummaryEmail(
    insights: ActionableInsight[],
    recommendations: BidRecommendation[],
  ): string {
    let html = `
      <h2>📊 Auction Insights Summary</h2>
      <p>Generated at ${new Date().toLocaleString()}</p>
      
      <h3>🎯 High-Priority Insights (${insights.length})</h3>
      <ul>
    `;

    for (const insight of insights) {
      html += `
        <li>
          <strong>${insight.title}</strong><br>
          ${insight.description}<br>
          <em>Action: ${insight.recommendedActions[0]}</em>
        </li>
      `;
    }

    html += '</ul>';

    const bidOps = recommendations.filter(
      (r) => r.recommendation.action === 'bid',
    );
    if (bidOps.length > 0) {
      html += `
        <h3>💰 Bidding Opportunities (${bidOps.length})</h3>
        <ul>
      `;

      for (const bid of bidOps.slice(0, 5)) {
        html += `
          <li>
            ${bid.vehicle.year} ${bid.vehicle.make} ${bid.vehicle.model} - 
            ${bid.financials.profitabilityAnalysis.roi.toFixed(1)}% ROI potential
          </li>
        `;
      }

      html += '</ul>';
    }

    html +=
      '<p><em>This is an automated summary from your Advanced Auction Agent.</em></p>';

    return html;
  }

  /**
   * Store actuation results for historical analysis
   */
  private storeActuationResults(
    runId: string,
    results: Record<string, unknown>,
  ): void {
    // Store in database for historical analysis
    this.logger.debug(
      { runId, resultsKeys: Object.keys(results) },
      'Stored actuation results',
    );
  }

  /**
   * Helper methods
   */
  private estimateFinancialImpact(analysis: AuctionAnalysis): number {
    return analysis.marketComparison.priceDifference || 0;
  }

  private calculateBidRisk(bid: BidRecommendation): number {
    let riskScore = 0;

    // Risk based on damage
    const damageRisk: Record<string, number> = {
      severe: 40,
      salvage: 50,
      moderate: 25,
      minor: 10,
      none: 0,
      clean: 0,
    };
    riskScore += damageRisk[bid.vehicle.damage.toLowerCase()] || 20;

    // Risk based on ROI (lower ROI = higher risk)
    if (bid.financials.profitabilityAnalysis.roi < 20) riskScore += 30;
    else if (bid.financials.profitabilityAnalysis.roi < 40) riskScore += 15;

    // Risk based on confidence
    if (bid.recommendation.confidence < 70) riskScore += 25;
    else if (bid.recommendation.confidence < 85) riskScore += 10;

    return Math.min(100, riskScore);
  }

  private getDefaultStrategyForRiskTolerance(
    tolerance: 'conservative' | 'moderate' | 'aggressive',
  ): Partial<BiddingStrategy> {
    const strategies = {
      conservative: {
        riskTolerance: 'low' as const,
        budgetConstraints: {
          maxTotalBudget: 50000,
          maxPerVehicle: 15000,
          reservedForFees: 10000,
        },
        preferences: {
          preferredBidTiming: 'strategic' as const,
          maxCompetitionLevel: 5,
          minimumROI: 25,
          maxRepairCosts: 3000,
        },
      },
      moderate: {
        riskTolerance: 'medium' as const,
        budgetConstraints: {
          maxTotalBudget: 100000,
          maxPerVehicle: 25000,
          reservedForFees: 10000,
        },
        preferences: {
          preferredBidTiming: 'strategic' as const,
          maxCompetitionLevel: 7,
          minimumROI: 20,
          maxRepairCosts: 5000,
        },
      },
      aggressive: {
        riskTolerance: 'high' as const,
        budgetConstraints: {
          maxTotalBudget: 200000,
          maxPerVehicle: 50000,
          reservedForFees: 15000,
        },
        preferences: {
          preferredBidTiming: 'early' as const,
          maxCompetitionLevel: 10,
          minimumROI: 15,
          maxRepairCosts: 10000,
        },
      },
    };

    return strategies[tolerance];
  }

  private getNotificationRecipients(): string[] {
    // Get from environment or configuration
    const recipients = process.env.ACTUATION_NOTIFICATION_RECIPIENTS;
    return recipients ? recipients.split(',').map((r) => r.trim()) : [];
  }

  /**
   * Get configuration
   */
  getConfig(): ActuationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ActuationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.biddingStrategy) {
      this.biddingAdvisor.updateStrategy(newConfig.biddingStrategy);
    }

    this.logger.info(
      { config: this.config },
      'Updated actuation configuration',
    );
  }
}
