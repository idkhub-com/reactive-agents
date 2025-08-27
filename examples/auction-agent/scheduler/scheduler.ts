import * as cron from 'node-cron';
import type { Logger } from 'pino';
import type { AuctionAnalysis, CopartVehicle, SearchCriteria } from '../copart';
import { CopartAuctionAgent } from '../copart';
import { NotificationService } from './notifications';

export interface ScheduleConfig {
  cronPattern: string;
  searchCriteria: SearchCriteria;
  notifications: {
    enabled: boolean;
    minScore: number;
    priceDropThreshold: number;
    recipients: string[];
  };
  webhooks?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
}

export interface ScheduledRunResult {
  runId: string;
  timestamp: string;
  vehicleCount: number;
  analysisCount: number;
  buyRecommendations: number;
  priceAlerts: number;
  notificationsSent: number;
  success: boolean;
  error?: string;
  duration: number;
}

export class AuctionScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  public notificationService: NotificationService;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.notificationService = new NotificationService(logger);
  }

  /**
   * Schedule a recurring auction monitoring job
   */
  scheduleJob(jobId: string, config: ScheduleConfig): void {
    // Stop existing job if running
    this.stopJob(jobId);

    if (!cron.validate(config.cronPattern)) {
      throw new Error(`Invalid cron pattern: ${config.cronPattern}`);
    }

    const task = cron.schedule(config.cronPattern, async () => {
      await this.executeScheduledRun(jobId, config);
    });

    this.tasks.set(jobId, task);
    this.logger.info(
      { jobId, cronPattern: config.cronPattern },
      'Scheduled auction monitoring job',
    );
  }

  /**
   * Start a scheduled job
   */
  startJob(jobId: string): void {
    const task = this.tasks.get(jobId);
    if (!task) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Tasks start automatically when created with node-cron
    this.logger.info({ jobId }, 'Job is running according to schedule');
  }

  /**
   * Stop a scheduled job
   */
  stopJob(jobId: string): void {
    const task = this.tasks.get(jobId);
    if (task) {
      task.destroy(); // node-cron uses destroy to stop
      this.logger.info({ jobId }, 'Stopped scheduled job');
    }
  }

  /**
   * Remove a scheduled job completely
   */
  removeJob(jobId: string): void {
    const task = this.tasks.get(jobId);
    if (task) {
      task.destroy();
      this.tasks.delete(jobId);
      this.logger.info({ jobId }, 'Removed scheduled job');
    }
  }

  /**
   * Get status of all scheduled jobs
   */
  getJobStatus(): Array<{ jobId: string; running: boolean; nextRun?: Date }> {
    const status: Array<{ jobId: string; running: boolean; nextRun?: Date }> =
      [];

    for (const [jobId] of this.tasks) {
      status.push({
        jobId,
        running: true, // Simplified - assume running if in map
        // Note: node-cron doesn't expose runtime status easily
      });
    }

    return status;
  }

  /**
   * Execute a scheduled auction analysis run
   */
  private async executeScheduledRun(
    jobId: string,
    config: ScheduleConfig,
  ): Promise<ScheduledRunResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    this.logger.info({ jobId, timestamp }, 'Starting scheduled auction run');

    try {
      // Initialize agent with scheduled criteria
      const agent = new CopartAuctionAgent(config.searchCriteria);
      const runId = agent.startRun();

      // Execute the analysis pipeline
      await agent.scrapeAuctions();

      // Check if we should use AI analysis
      const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
      let analyses: AuctionAnalysis[];

      if (hasApiKey) {
        analyses = await agent.analyzeVehicles();
      } else {
        analyses = agent.createHeuristicAnalyses();
      }

      // Get historical data for alerts
      const historical = agent.getHistoricalData();

      // Filter for notable results
      const buyRecommendations = analyses.filter(
        (a) => a.recommendation === 'buy',
      );
      const highScoreVehicles = analyses.filter(
        (a) => a.score >= config.notifications.minScore,
      );
      const priceAlerts =
        historical?.priceAlerts?.filter(
          (alert: Record<string, unknown>) =>
            (alert.market_price_difference as number) >=
            config.notifications.priceDropThreshold,
        ) || [];

      // Send notifications if enabled and we have notable results
      let notificationsSent = 0;
      if (
        config.notifications.enabled &&
        (buyRecommendations.length > 0 || priceAlerts.length > 0)
      ) {
        notificationsSent = await this.sendNotifications(
          jobId,
          config.notifications,
          buyRecommendations,
          priceAlerts as Array<{
            vehicle: CopartVehicle;
            oldPrice: number;
            newPrice: number;
          }>,
          runId,
        );
      }

      // Send webhook if configured
      if (config.webhooks?.enabled) {
        await this.sendWebhook(config.webhooks, {
          jobId,
          runId,
          timestamp,
          vehicleCount: agent.vehicles.length,
          analysisCount: analyses.length,
          buyRecommendations: buyRecommendations.length,
          priceAlerts: priceAlerts.length,
          topVehicles: highScoreVehicles.slice(0, 5),
        });
      }

      // Complete the run
      const duration = Date.now() - startTime;
      agent.completeRun(undefined, duration);
      agent.close();

      const result: ScheduledRunResult = {
        runId,
        timestamp,
        vehicleCount: agent.vehicles.length,
        analysisCount: analyses.length,
        buyRecommendations: buyRecommendations.length,
        priceAlerts: priceAlerts.length,
        notificationsSent,
        success: true,
        duration,
      };

      this.logger.info({ jobId, result }, 'Completed scheduled auction run');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ScheduledRunResult = {
        runId: 'failed',
        timestamp,
        vehicleCount: 0,
        analysisCount: 0,
        buyRecommendations: 0,
        priceAlerts: 0,
        notificationsSent: 0,
        success: false,
        error: String(error),
        duration,
      };

      this.logger.error(
        { jobId, err: error, result },
        'Failed scheduled auction run',
      );

      // Send error notification if configured
      if (
        config.notifications.enabled &&
        config.notifications.recipients.length > 0
      ) {
        await this.notificationService.sendErrorNotification(
          config.notifications.recipients[0],
          jobId,
          String(error),
        );
      }

      return result;
    }
  }

  /**
   * Send notifications for notable auction results
   */
  private async sendNotifications(
    jobId: string,
    notificationConfig: ScheduleConfig['notifications'],
    buyRecommendations: AuctionAnalysis[],
    priceAlerts: Array<{
      vehicle: CopartVehicle;
      oldPrice: number;
      newPrice: number;
    }>,
    runId: string,
  ): Promise<number> {
    let sent = 0;

    for (const recipient of notificationConfig.recipients) {
      try {
        // Determine notification type (email vs SMS based on format)
        if (recipient.includes('@')) {
          // Email notification
          await this.notificationService.sendEmailNotification(
            recipient,
            'Auction Opportunities Found',
            this.formatEmailReport(
              jobId,
              buyRecommendations,
              priceAlerts,
              runId,
            ),
          );
        } else {
          // SMS notification (assume phone number)
          await this.notificationService.sendSMSNotification(
            recipient,
            this.formatSMSReport(buyRecommendations, priceAlerts),
          );
        }
        sent++;
      } catch (error) {
        this.logger.warn(
          { err: error, recipient },
          'Failed to send notification',
        );
      }
    }

    return sent;
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    webhookConfig: NonNullable<ScheduleConfig['webhooks']>,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhookConfig.headers,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook failed: ${response.status} ${response.statusText}`,
        );
      }

      this.logger.info({ url: webhookConfig.url }, 'Webhook sent successfully');
    } catch (error) {
      this.logger.error(
        { err: error, url: webhookConfig.url },
        'Failed to send webhook',
      );
    }
  }

  /**
   * Format email report for notifications
   */
  private formatEmailReport(
    jobId: string,
    buyRecommendations: AuctionAnalysis[],
    priceAlerts: Array<{
      vehicle: CopartVehicle;
      oldPrice: number;
      newPrice: number;
    }>,
    runId: string,
  ): string {
    const buyCount = buyRecommendations.length;
    const alertCount = priceAlerts.length;

    let html = `
      <h2>🚗 Auction Alert: ${buyCount} Buy Opportunities Found</h2>
      <p><strong>Job:</strong> ${jobId}<br>
      <strong>Run ID:</strong> ${runId}<br>
      <strong>Time:</strong> ${new Date().toLocaleString()}</p>
    `;

    if (buyRecommendations.length > 0) {
      html += '<h3>🏆 Top Buy Recommendations</h3><ul>';
      for (const analysis of buyRecommendations.slice(0, 5)) {
        html += `
          <li>
            <strong>${analysis.vehicle.year} ${analysis.vehicle.make} ${analysis.vehicle.model}</strong><br>
            Score: ${analysis.score}/100 | Current Bid: $${analysis.vehicle.currentBid.toLocaleString()}<br>
            ${analysis.reasoning}
          </li>
        `;
      }
      html += '</ul>';
    }

    if (priceAlerts.length > 0) {
      html += `<h3>💰 Price Alerts (${alertCount} significant drops)</h3>`;
      html +=
        '<p>Check the full report for details on vehicles with major price reductions.</p>';
    }

    html +=
      '<p><em>This is an automated notification from your Auction Monitoring Agent.</em></p>';

    return html;
  }

  /**
   * Format SMS report for notifications
   */
  private formatSMSReport(
    buyRecommendations: AuctionAnalysis[],
    priceAlerts: Array<{
      vehicle: CopartVehicle;
      oldPrice: number;
      newPrice: number;
    }>,
  ): string {
    const buyCount = buyRecommendations.length;
    const alertCount = priceAlerts.length;

    if (buyCount === 0 && alertCount === 0) {
      return '🚗 Auction Alert: No new opportunities found';
    }

    let message = `🚗 Auction Alert: ${buyCount} buy opportunities`;

    if (buyCount > 0) {
      const top = buyRecommendations[0];
      message += `\n\nTop: ${top.vehicle.year} ${top.vehicle.make} ${top.vehicle.model}`;
      message += `\nScore: ${top.score}/100 | Bid: $${top.vehicle.currentBid.toLocaleString()}`;
    }

    if (alertCount > 0) {
      message += `\n\n💰 ${alertCount} price alerts`;
    }

    return message;
  }

  /**
   * Run a one-time scheduled analysis (for testing)
   */
  runOnce(config: ScheduleConfig): Promise<ScheduledRunResult> {
    return this.executeScheduledRun('one-time', config);
  }

  /**
   * Cleanup all scheduled jobs
   */
  destroy(): void {
    for (const [jobId] of this.tasks) {
      this.removeJob(jobId);
    }
    this.logger.info('Destroyed auction scheduler');
  }
}
