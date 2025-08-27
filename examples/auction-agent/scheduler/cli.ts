#!/usr/bin/env tsx
import 'dotenv/config';
import pino from 'pino';
import prompts from 'prompts';
import type { SearchCriteria } from '../copart';
import type { ScheduleConfig } from './scheduler';
import { AuctionScheduler } from './scheduler';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

/**
 * CLI for managing scheduled auction monitoring jobs
 */
class SchedulerCLI {
  private scheduler: AuctionScheduler;

  constructor() {
    this.scheduler = new AuctionScheduler(logger);
  }

  async run(): Promise<void> {
    console.log('🤖 Auction Agent Scheduler\n');

    const action = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Create new scheduled job', value: 'create' },
        { title: 'List active jobs', value: 'list' },
        { title: 'Start/stop job', value: 'control' },
        { title: 'Test notifications', value: 'test' },
        { title: 'Run one-time analysis', value: 'once' },
        { title: 'Exit', value: 'exit' },
      ],
    });

    switch (action.action) {
      case 'create':
        await this.createJob();
        break;
      case 'list':
        await this.listJobs();
        break;
      case 'control':
        await this.controlJob();
        break;
      case 'test':
        await this.testNotifications();
        break;
      case 'once':
        await this.runOnce();
        break;
      case 'exit':
        console.log('👋 Goodbye!');
        return;
      default:
        console.log('Invalid action');
    }

    // Continue the loop
    await this.run();
  }

  private async createJob(): Promise<void> {
    console.log('\n📅 Creating Scheduled Job\n');

    // Get job ID
    const jobInfo = await prompts({
      type: 'text',
      name: 'jobId',
      message: 'Job ID (unique identifier):',
      initial: `auction-${Date.now()}`,
    });

    // Get schedule pattern
    const scheduleChoice = await prompts({
      type: 'select',
      name: 'schedule',
      message: 'How often should this run?',
      choices: [
        { title: 'Every hour', value: '0 * * * *' },
        { title: 'Every 6 hours', value: '0 */6 * * *' },
        { title: 'Twice daily (9 AM & 6 PM)', value: '0 9,18 * * *' },
        { title: 'Daily at 9 AM', value: '0 9 * * *' },
        { title: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
        { title: 'Custom cron pattern', value: 'custom' },
      ],
    });

    let cronPattern = scheduleChoice.schedule;
    if (cronPattern === 'custom') {
      const customCron = await prompts({
        type: 'text',
        name: 'pattern',
        message: 'Enter cron pattern (minute hour day month weekday):',
        validate: (value: string) => {
          const cron = require('node-cron');
          return cron.validate(value) ? true : 'Invalid cron pattern';
        },
      });
      cronPattern = customCron.pattern;
    }

    // Get search criteria
    const criteria = await this.getSearchCriteria();

    // Get notification settings
    const notifications = await this.getNotificationSettings();

    // Get webhook settings (optional)
    const webhookChoice = await prompts({
      type: 'confirm',
      name: 'enabled',
      message: 'Enable webhook notifications?',
      initial: false,
    });

    let webhooks:
      | { url?: string; enabled?: boolean; headers?: Record<string, string> }
      | undefined;
    if (webhookChoice.enabled) {
      const webhookInfo = await prompts([
        {
          type: 'text',
          name: 'url',
          message: 'Webhook URL:',
        },
        {
          type: 'text',
          name: 'headers',
          message: 'Custom headers (JSON format, optional):',
          initial: '{}',
        },
      ]);

      webhooks = {
        enabled: true,
        url: webhookInfo.url,
        headers: webhookInfo.headers
          ? JSON.parse(webhookInfo.headers)
          : undefined,
      };
    }

    const config: ScheduleConfig = {
      cronPattern,
      searchCriteria: criteria,
      notifications,
      webhooks: webhooks?.enabled
        ? {
            enabled: true,
            url: webhooks.url || '',
            headers: webhooks.headers,
          }
        : undefined,
    };

    try {
      this.scheduler.scheduleJob(jobInfo.jobId, config);

      const shouldStart = await prompts({
        type: 'confirm',
        name: 'start',
        message: 'Start this job now?',
        initial: true,
      });

      if (shouldStart.start) {
        this.scheduler.startJob(jobInfo.jobId);
        console.log(`✅ Job '${jobInfo.jobId}' created and started`);
        console.log(`📅 Schedule: ${cronPattern}`);
      } else {
        console.log(`✅ Job '${jobInfo.jobId}' created (not started)`);
      }
    } catch (error) {
      console.error('❌ Failed to create job:', error);
    }
  }

  private async getSearchCriteria(): Promise<SearchCriteria> {
    console.log('\n🔍 Search Criteria\n');

    const presets = {
      economy: {
        makes: ['Toyota', 'Honda', 'Nissan'],
        yearRange: { min: 2015, max: 2023 },
        maxMileage: 100000,
        maxPrice: 25000,
      },
      luxury: {
        makes: ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus'],
        yearRange: { min: 2018, max: 2023 },
        maxMileage: 60000,
        maxPrice: 50000,
      },
      trucks: {
        makes: ['Ford', 'Chevrolet', 'Ram', 'Toyota'],
        models: ['F-150', 'Silverado', '1500', 'Tacoma', 'Tundra'],
        yearRange: { min: 2016, max: 2023 },
        maxMileage: 80000,
        maxPrice: 40000,
      },
      custom: {},
    };

    const presetChoice = await prompts({
      type: 'select',
      name: 'preset',
      message: 'Choose a preset or customize:',
      choices: [
        { title: 'Economy cars (Toyota, Honda, Nissan)', value: 'economy' },
        { title: 'Luxury cars (BMW, Mercedes, Audi)', value: 'luxury' },
        { title: 'Trucks & SUVs', value: 'trucks' },
        { title: 'Custom criteria', value: 'custom' },
      ],
    });

    let criteria = presets[
      presetChoice.preset as keyof typeof presets
    ] as Partial<SearchCriteria>;

    if (presetChoice.preset === 'custom' || (await this.askToCustomize())) {
      const customization = await prompts([
        {
          type: 'text',
          name: 'makes',
          message: 'Vehicle makes (comma-separated):',
          initial: criteria.makes?.join(', ') || 'Toyota, Honda, Ford',
        },
        {
          type: 'text',
          name: 'models',
          message: 'Specific models (comma-separated, optional):',
          initial: criteria.models?.join(', ') || '',
        },
        {
          type: 'number',
          name: 'minYear',
          message: 'Minimum year:',
          initial: criteria.yearRange?.min || 2015,
        },
        {
          type: 'number',
          name: 'maxYear',
          message: 'Maximum year:',
          initial: criteria.yearRange?.max || 2023,
        },
        {
          type: 'number',
          name: 'maxMileage',
          message: 'Maximum mileage:',
          initial: criteria.maxMileage || 100000,
        },
        {
          type: 'number',
          name: 'maxPrice',
          message: 'Maximum price:',
          initial: criteria.maxPrice || 50000,
        },
      ]);

      criteria = {
        makes: customization.makes.split(',').map((s: string) => s.trim()),
        models: customization.models
          ? customization.models.split(',').map((s: string) => s.trim())
          : [],
        yearRange: { min: customization.minYear, max: customization.maxYear },
        maxMileage: customization.maxMileage,
        maxDamage: 'minor',
        maxPrice: customization.maxPrice,
        locations: [],
        keywords: [],
      };
    }

    return criteria as SearchCriteria;
  }

  private async getNotificationSettings() {
    console.log('\n📱 Notification Settings\n');

    const notificationChoice = await prompts({
      type: 'confirm',
      name: 'enabled',
      message: 'Enable notifications?',
      initial: true,
    });

    if (!notificationChoice.enabled) {
      return {
        enabled: false,
        minScore: 70,
        priceDropThreshold: 5000,
        recipients: [],
      };
    }

    const settings = await prompts([
      {
        type: 'number',
        name: 'minScore',
        message: 'Minimum score to notify (0-100):',
        initial: 70,
      },
      {
        type: 'number',
        name: 'priceDropThreshold',
        message: 'Price drop threshold for alerts ($):',
        initial: 5000,
      },
      {
        type: 'text',
        name: 'recipients',
        message: 'Recipients (email or phone, comma-separated):',
        validate: (value: string) =>
          value.trim() ? true : 'At least one recipient required',
      },
    ]);

    return {
      enabled: true,
      minScore: settings.minScore,
      priceDropThreshold: settings.priceDropThreshold,
      recipients: settings.recipients.split(',').map((s: string) => s.trim()),
    };
  }

  private async askToCustomize(): Promise<boolean> {
    const customize = await prompts({
      type: 'confirm',
      name: 'customize',
      message: 'Customize these criteria?',
      initial: false,
    });
    return customize.customize;
  }

  private listJobs(): void {
    const jobs = this.scheduler.getJobStatus();

    if (jobs.length === 0) {
      console.log('\n📭 No scheduled jobs found\n');
      return;
    }

    console.log('\n📋 Scheduled Jobs:\n');
    for (const job of jobs) {
      console.log(
        `• ${job.jobId} - ${job.running ? '🟢 Running' : '🔴 Stopped'}`,
      );
    }
    console.log('');
  }

  private async controlJob(): Promise<void> {
    const jobs = this.scheduler.getJobStatus();

    if (jobs.length === 0) {
      console.log('\n📭 No jobs to control\n');
      return;
    }

    const jobChoice = await prompts({
      type: 'select',
      name: 'jobId',
      message: 'Select job to control:',
      choices: jobs.map((job) => ({
        title: `${job.jobId} (${job.running ? 'Running' : 'Stopped'})`,
        value: job.jobId,
      })),
    });

    const selectedJob = jobs.find((j) => j.jobId === jobChoice.jobId);
    if (!selectedJob) return;

    const action = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        {
          title: selectedJob.running ? 'Stop job' : 'Start job',
          value: selectedJob.running ? 'stop' : 'start',
        },
        { title: 'Remove job completely', value: 'remove' },
      ],
    });

    try {
      switch (action.action) {
        case 'start':
          this.scheduler.startJob(jobChoice.jobId);
          console.log(`✅ Started job '${jobChoice.jobId}'`);
          break;
        case 'stop':
          this.scheduler.stopJob(jobChoice.jobId);
          console.log(`⏹️ Stopped job '${jobChoice.jobId}'`);
          break;
        case 'remove':
          this.scheduler.removeJob(jobChoice.jobId);
          console.log(`🗑️ Removed job '${jobChoice.jobId}'`);
          break;
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  private async testNotifications(): Promise<void> {
    console.log('\n🧪 Testing Notification Services\n');

    // Test email if configured
    const emailTest =
      await this.scheduler.notificationService.testEmailConfig();
    console.log(
      `📧 Email service: ${emailTest ? '✅ Working' : '❌ Not configured or failed'}`,
    );

    // Test SMS if configured
    const smsTest = await this.scheduler.notificationService.testSMSConfig();
    console.log(
      `📱 SMS service: ${smsTest ? '✅ Working' : '❌ Not configured or failed'}`,
    );

    if (emailTest || smsTest) {
      const sendTest = await prompts({
        type: 'confirm',
        name: 'send',
        message: 'Send a test notification?',
        initial: false,
      });

      if (sendTest.send) {
        const recipient = await prompts({
          type: 'text',
          name: 'to',
          message: 'Send test to (email or phone):',
          validate: (value: string) =>
            value.trim() ? true : 'Recipient required',
        });

        try {
          if (recipient.to.includes('@')) {
            await this.scheduler.notificationService.sendEmailNotification(
              recipient.to,
              'Test Auction Alert',
              '<h2>🧪 Test Notification</h2><p>Your auction monitoring notifications are working correctly!</p>',
            );
          } else {
            await this.scheduler.notificationService.sendSMSNotification(
              recipient.to,
              '🧪 Test: Your auction notifications are working!',
            );
          }
          console.log('✅ Test notification sent successfully');
        } catch (error) {
          console.error('❌ Test notification failed:', error);
        }
      }
    }
  }

  private async runOnce(): Promise<void> {
    console.log('\n🚀 One-time Analysis\n');

    const criteria = await this.getSearchCriteria();
    const notifications = await this.getNotificationSettings();

    const config: ScheduleConfig = {
      cronPattern: '* * * * *', // Not used for one-time
      searchCriteria: criteria,
      notifications,
    };

    console.log('\n⏳ Running auction analysis...\n');

    try {
      const result = await this.scheduler.runOnce(config);

      console.log('✅ Analysis Complete!\n');
      console.log('📊 Results:');
      console.log(`   • Vehicles found: ${result.vehicleCount}`);
      console.log(`   • Analyses: ${result.analysisCount}`);
      console.log(`   • Buy recommendations: ${result.buyRecommendations}`);
      console.log(`   • Price alerts: ${result.priceAlerts}`);
      console.log(`   • Notifications sent: ${result.notificationsSent}`);
      console.log(`   • Duration: ${result.duration}ms`);
      console.log(`   • Run ID: ${result.runId}\n`);
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    }
  }

  destroy(): void {
    this.scheduler.destroy();
  }
}

// Run CLI if called directly
const isMainModule = process.argv[1]?.endsWith('cli.ts');
if (isMainModule) {
  const cli = new SchedulerCLI();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    cli.destroy();
    process.exit(0);
  });

  cli.run().catch((err) => {
    logger.error({ err }, 'CLI error');
    process.exit(1);
  });
}
