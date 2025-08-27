import type { Logger } from 'pino';
import type { AuctionAnalysis, CopartVehicle } from '../copart';
import type { AuctionDatabase } from '../storage/database';

export interface WatchlistItem {
  id: string;
  vehicleId: string;
  vin: string;
  lotNumber: string;
  createdAt: string;
  updatedAt: string;
  criteria: {
    maxPrice: number;
    minScore: number;
    priceDropThreshold: number;
    targetConditions: string[];
  };
  status: 'active' | 'triggered' | 'expired' | 'sold';
  triggerHistory: WatchlistTrigger[];
  metadata: {
    originalPrice: number;
    originalScore: number;
    estimatedValue: number;
    notes?: string;
    tags: string[];
  };
}

export interface WatchlistTrigger {
  id: string;
  triggeredAt: string;
  triggerType:
    | 'price_drop'
    | 'score_increase'
    | 'status_change'
    | 'bid_threshold';
  oldValue: string | number | null;
  newValue: string | number | null;
  message: string;
  actionTaken?: string;
}

export interface WatchlistAlert {
  id: string;
  watchlistItemId: string;
  vehicle: CopartVehicle;
  analysis: AuctionAnalysis;
  trigger: WatchlistTrigger;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  actionRecommendations: string[];
  timeToAction?: number; // milliseconds until auction ends
}

export class WatchlistManager {
  private logger: Logger;

  constructor(_db: AuctionDatabase, logger: Logger) {
    this.logger = logger;
  }

  /**
   * Add a vehicle to the watchlist
   */
  async addToWatchlist(
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    criteria: WatchlistItem['criteria'],
    notes?: string,
    tags: string[] = [],
  ): Promise<string> {
    const watchlistId = this.generateWatchlistId();

    const item: WatchlistItem = {
      id: watchlistId,
      vehicleId: vehicle.lotNumber || vehicle.id,
      vin: vehicle.vin,
      lotNumber: vehicle.lotNumber || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      criteria,
      status: 'active',
      triggerHistory: [],
      metadata: {
        originalPrice: vehicle.currentBid,
        originalScore: analysis.score,
        estimatedValue: vehicle.estimatedValue,
        notes,
        tags,
      },
    };

    await this.storeWatchlistItem(item);

    this.logger.info(
      {
        watchlistId,
        vehicleId: vehicle.id,
        vin: vehicle.vin,
        originalPrice: vehicle.currentBid,
      },
      'Added vehicle to watchlist',
    );

    return watchlistId;
  }

  /**
   * Process vehicles against active watchlist items
   */
  async processWatchlistAlerts(
    vehicles: CopartVehicle[],
    analyses: AuctionAnalysis[],
  ): Promise<WatchlistAlert[]> {
    const activeWatchlist = await this.getActiveWatchlistItems();
    const alerts: WatchlistAlert[] = [];

    // Create a map for quick analysis lookup
    const analysisMap = new Map<string, AuctionAnalysis>();
    for (const analysis of analyses) {
      const key = analysis.vehicle.lotNumber || analysis.vehicle.id;
      analysisMap.set(key, analysis);
    }

    for (const item of activeWatchlist) {
      // Find matching vehicle in current run
      const vehicle = vehicles.find(
        (v) =>
          v.vin === item.vin ||
          v.lotNumber === item.lotNumber ||
          (v.lotNumber || v.id) === item.vehicleId,
      );

      if (!vehicle) {
        // Vehicle not found - might be sold or ended
        await this.checkVehicleStatus(item);
        continue;
      }

      const analysis = analysisMap.get(vehicle.lotNumber || vehicle.id);
      if (!analysis) continue;

      // Check for triggers
      const triggers = await this.checkTriggers(item, vehicle, analysis);

      for (const trigger of triggers) {
        const alert = await this.createAlert(item, vehicle, analysis, trigger);
        alerts.push(alert);

        // Update watchlist item with trigger
        item.triggerHistory.push(trigger);
        item.updatedAt = new Date().toISOString();
        await this.updateWatchlistItem(item);
      }
    }

    return alerts;
  }

  /**
   * Check for trigger conditions
   */
  private checkTriggers(
    item: WatchlistItem,
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
  ): WatchlistTrigger[] {
    const triggers: WatchlistTrigger[] = [];

    // Price drop trigger
    const priceDrop = item.metadata.originalPrice - vehicle.currentBid;
    if (priceDrop >= item.criteria.priceDropThreshold) {
      triggers.push({
        id: this.generateTriggerId(),
        triggeredAt: new Date().toISOString(),
        triggerType: 'price_drop',
        oldValue: item.metadata.originalPrice,
        newValue: vehicle.currentBid,
        message: `Price dropped by $${priceDrop.toLocaleString()} (${((priceDrop / item.metadata.originalPrice) * 100).toFixed(1)}%)`,
      });
    }

    // Score increase trigger
    const scoreIncrease = analysis.score - item.metadata.originalScore;
    if (scoreIncrease >= 10 && analysis.score >= item.criteria.minScore) {
      triggers.push({
        id: this.generateTriggerId(),
        triggeredAt: new Date().toISOString(),
        triggerType: 'score_increase',
        oldValue: item.metadata.originalScore,
        newValue: analysis.score,
        message: `Analysis score improved by ${scoreIncrease} points to ${analysis.score}/100`,
      });
    }

    // Bid threshold trigger
    if (
      vehicle.currentBid <= item.criteria.maxPrice &&
      item.metadata.originalPrice > item.criteria.maxPrice
    ) {
      triggers.push({
        id: this.generateTriggerId(),
        triggeredAt: new Date().toISOString(),
        triggerType: 'bid_threshold',
        oldValue: item.metadata.originalPrice,
        newValue: vehicle.currentBid,
        message: `Vehicle now within budget: $${vehicle.currentBid.toLocaleString()} ≤ $${item.criteria.maxPrice.toLocaleString()}`,
      });
    }

    // Status change trigger (if vehicle status changed)
    if (vehicle.saleStatus !== 'active' && item.status === 'active') {
      triggers.push({
        id: this.generateTriggerId(),
        triggeredAt: new Date().toISOString(),
        triggerType: 'status_change',
        oldValue: 'active',
        newValue: vehicle.saleStatus,
        message: `Auction status changed to: ${vehicle.saleStatus}`,
      });
    }

    return triggers;
  }

  /**
   * Create alert from trigger
   */
  private createAlert(
    item: WatchlistItem,
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    trigger: WatchlistTrigger,
  ): WatchlistAlert {
    const urgency = this.calculateUrgency(item, vehicle, analysis, trigger);
    const actionRecommendations = this.generateActionRecommendations(
      item,
      vehicle,
      analysis,
      trigger,
    );
    const timeToAction = this.calculateTimeToAction(vehicle);

    return {
      id: this.generateAlertId(),
      watchlistItemId: item.id,
      vehicle,
      analysis,
      trigger,
      urgency,
      actionRecommendations,
      timeToAction,
    };
  }

  /**
   * Calculate alert urgency
   */
  private calculateUrgency(
    _item: WatchlistItem,
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    trigger: WatchlistTrigger,
  ): WatchlistAlert['urgency'] {
    const timeToEnd = this.calculateTimeToAction(vehicle);
    const _scoreRatio = analysis.score / 100;
    const priceRatio = vehicle.currentBid / vehicle.estimatedValue;

    // Critical: High score, low price, ending soon
    if (
      analysis.score >= 80 &&
      priceRatio <= 0.7 &&
      timeToEnd !== undefined &&
      timeToEnd < 3600000
    ) {
      // 1 hour
      return 'critical';
    }

    // High: Good score and (significant price drop OR ending soon)
    if (
      analysis.score >= 70 &&
      (trigger.triggerType === 'price_drop' ||
        (timeToEnd !== undefined && timeToEnd < 86400000))
    ) {
      // 24 hours
      return 'high';
    }

    // Medium: Decent score or within budget
    if (analysis.score >= 60 || trigger.triggerType === 'bid_threshold') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate action recommendations
   */
  private generateActionRecommendations(
    _item: WatchlistItem,
    vehicle: CopartVehicle,
    analysis: AuctionAnalysis,
    trigger: WatchlistTrigger,
  ): string[] {
    const recommendations: string[] = [];

    if (trigger.triggerType === 'price_drop') {
      recommendations.push(
        'Consider placing a bid - price has dropped significantly',
      );
      recommendations.push(
        'Review updated market analysis and risk assessment',
      );
    }

    if (trigger.triggerType === 'score_increase') {
      recommendations.push(
        'Analysis confidence has improved - reassess bidding strategy',
      );
      recommendations.push('Check for new information or resolved concerns');
    }

    if (trigger.triggerType === 'bid_threshold') {
      recommendations.push('Vehicle is now within your budget range');
      recommendations.push('Prepare bid documentation and financing');
    }

    if (analysis.score >= 80) {
      recommendations.push(
        'HIGH PRIORITY: Strong buy signal - consider immediate action',
      );
    }

    if (vehicle.currentBid < vehicle.estimatedValue * 0.8) {
      recommendations.push(
        'Good value opportunity - current bid below 80% of estimated value',
      );
    }

    const timeToEnd = this.calculateTimeToAction(vehicle);
    if (timeToEnd !== undefined && timeToEnd < 3600000) {
      // 1 hour
      recommendations.push('⚠️ URGENT: Auction ending within 1 hour');
    } else if (timeToEnd !== undefined && timeToEnd < 86400000) {
      // 24 hours
      recommendations.push(
        'Auction ending within 24 hours - prepare for final decision',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor for further developments');
    }

    return recommendations;
  }

  /**
   * Calculate time until auction ends
   */
  private calculateTimeToAction(vehicle: CopartVehicle): number | undefined {
    if (!vehicle.auctionEndTime) return undefined;

    const endTime = new Date(vehicle.auctionEndTime).getTime();
    const now = Date.now();

    return Math.max(0, endTime - now);
  }

  /**
   * Check if vehicle status has changed (sold, expired, etc.)
   */
  private async checkVehicleStatus(item: WatchlistItem): Promise<void> {
    // In a real implementation, this might check external APIs or mark as "lost track"
    this.logger.debug(
      {
        watchlistId: item.id,
        vehicleId: item.vehicleId,
      },
      'Vehicle not found in current run - may be sold or expired',
    );

    // Update status if not seen for multiple runs
    item.status = 'expired';
    item.updatedAt = new Date().toISOString();
    await this.updateWatchlistItem(item);
  }

  /**
   * Get active watchlist items
   */
  getActiveWatchlistItems(): WatchlistItem[] {
    // This would query the database for active watchlist items
    // For now, returning empty array - would need database schema extension
    return [];
  }

  /**
   * Store watchlist item
   */
  private storeWatchlistItem(item: WatchlistItem): void {
    // Store in database (would need schema extension)
    this.logger.info({ watchlistId: item.id }, 'Stored watchlist item');
  }

  /**
   * Update watchlist item
   */
  private updateWatchlistItem(item: WatchlistItem): void {
    // Update in database
    this.logger.debug({ watchlistId: item.id }, 'Updated watchlist item');
  }

  /**
   * Remove from watchlist
   */
  removeFromWatchlist(watchlistId: string): void {
    // Remove from database
    this.logger.info({ watchlistId }, 'Removed from watchlist');
  }

  /**
   * Get watchlist summary
   */
  getWatchlistSummary(): {
    totalItems: number;
    activeItems: number;
    triggeredItems: number;
    recentAlerts: number;
  } {
    // Return summary stats
    return {
      totalItems: 0,
      activeItems: 0,
      triggeredItems: 0,
      recentAlerts: 0,
    };
  }

  // Helper methods for ID generation
  private generateWatchlistId(): string {
    return `watchlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateTriggerId(): string {
    return `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
