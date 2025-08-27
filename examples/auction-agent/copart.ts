#!/usr/bin/env tsx
import 'dotenv/config';
import pino from 'pino';
import prompts from 'prompts';
import { z } from 'zod';
import {
  type ActuationConfig,
  type ActuationResult,
  AuctionActuator,
} from './actuation/actuator';
import { config } from './config';
import { AuctionDatabase } from './storage/database';
import { runTools, type ToolConfig, type ToolResults } from './tools';

/**
 * Copart Car Auction Monitoring AI Agent
 *
 * This AI agent monitors Copart car auctions for specific criteria and provides
 * intelligent analysis and notifications about potential opportunities.
 *
 * Features:
 * - Web scraping of Copart auction listings
 * - AI-powered analysis of auction data
 * - Customizable search criteria and filters
 * - Price trend analysis and market insights
 * - Automated notifications for matching vehicles
 * - Data export and reporting capabilities
 */

// Define a simplified type for our use case to avoid import issues
interface ChatCompletionResponseBody {
  object: string;
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
}

// Configuration
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const CRITERIA_STORE = process.env.IDK_CRITERIA_STORE || '.last-criteria.json';
const IDKHUB_URL = process.env.IDKHUB_URL || 'http://localhost:3000/v1';
const AUTH_TOKEN = process.env.IDKHUB_AUTH_TOKEN || 'idk';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Types for auction data
interface CopartVehicle {
  id: string;
  title: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  mileage: number;
  damage: string;
  currentBid: number;
  estimatedValue: number;
  auctionEndTime: string;
  location: string;
  images: string[];
  description: string;
  lotNumber: string;
  saleStatus: 'upcoming' | 'active' | 'sold' | 'cancelled';
  toolResults?: ToolResults;
}

interface SearchCriteria {
  makes: string[];
  models: string[];
  yearRange: { min: number; max: number };
  maxMileage: number;
  maxDamage: string;
  maxPrice: number;
  locations: string[];
  keywords: string[];
}

// Validation schemas
const CopartVehicleSchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number(),
  make: z.string(),
  model: z.string(),
  vin: z.string(),
  mileage: z.number(),
  damage: z.string(),
  currentBid: z.number(),
  estimatedValue: z.number(),
  auctionEndTime: z.string(),
  location: z.string(),
  images: z.array(z.string()),
  description: z.string(),
  lotNumber: z.string(),
  saleStatus: z.enum(['upcoming', 'active', 'sold', 'cancelled']),
  toolResults: z.any().optional(),
});

const SearchCriteriaSchema = z.object({
  makes: z.array(z.string()),
  models: z.array(z.string()),
  yearRange: z.object({ min: z.number(), max: z.number() }),
  maxMileage: z.number().min(0),
  maxDamage: z.string(),
  maxPrice: z.number().min(0),
  locations: z.array(z.string()),
  keywords: z.array(z.string()),
});

const AuctionAnalysisJsonSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  marketComparison: z.object({
    averagePrice: z.number(),
    priceDifference: z.number(),
    marketTrend: z.enum(['above', 'below', 'average']),
  }),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
  }),
  recommendation: z.enum(['buy', 'pass', 'monitor']),
});

const AuctionAnalysisSchema = z.object({
  vehicle: CopartVehicleSchema,
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  marketComparison: z.object({
    averagePrice: z.number(),
    priceDifference: z.number(),
    marketTrend: z.enum(['above', 'below', 'average']),
  }),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
  }),
  recommendation: z.enum(['buy', 'pass', 'monitor']),
});

const ExportDataSchema = z.object({
  searchCriteria: SearchCriteriaSchema,
  vehicles: z.array(CopartVehicleSchema),
  analysis: z.array(AuctionAnalysisSchema),
  timestamp: z.string(),
});

interface AuctionAnalysis {
  vehicle: CopartVehicle;
  score: number;
  reasoning: string;
  marketComparison: {
    averagePrice: number;
    priceDifference: number;
    marketTrend: 'above' | 'below' | 'average';
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  recommendation: 'buy' | 'pass' | 'monitor';
}

class CopartAuctionAgent {
  private searchCriteria: SearchCriteria;
  public vehicles: CopartVehicle[] = [];
  private analysisResults: AuctionAnalysis[] = [];
  private db?: AuctionDatabase;
  private currentRunId?: string;
  private actuator?: AuctionActuator;

  constructor(criteria: Partial<SearchCriteria> = {}) {
    this.searchCriteria = {
      makes: criteria.makes || [
        'Toyota',
        'Honda',
        'Ford',
        'Chevrolet',
        'Nissan',
      ],
      models: criteria.models || [],
      yearRange: criteria.yearRange || { min: 2010, max: 2024 },
      maxMileage: criteria.maxMileage || 150000,
      maxDamage: criteria.maxDamage || 'minor',
      maxPrice: criteria.maxPrice || 50000,
      locations: criteria.locations || [],
      keywords: criteria.keywords || [],
    };

    const parsed = SearchCriteriaSchema.safeParse(this.searchCriteria);
    if (!parsed.success) {
      throw new Error(`Invalid search criteria: ${parsed.error.message}`);
    }
    this.searchCriteria = parsed.data as SearchCriteria;

    // Initialize database if persistence is enabled
    if (
      (process.env.IDK_ENABLE_PERSISTENCE || 'false').toLowerCase() === 'true'
    ) {
      try {
        const dbPath = process.env.IDK_DB_PATH || './auction-agent.db';
        this.db = new AuctionDatabase(dbPath, logger);
        logger.info('Database persistence enabled');
      } catch (error) {
        logger.warn(
          { err: error },
          'Failed to initialize database; running without persistence',
        );
        this.db = undefined;
      }
    }

    // Initialize actuation system if enabled and database available
    if (
      (process.env.IDK_ENABLE_ACTUATION || 'true').toLowerCase() === 'true' &&
      this.db
    ) {
      try {
        const actuationConfig: Partial<ActuationConfig> = {
          enableWatchlist:
            (process.env.IDK_ENABLE_WATCHLIST || 'true').toLowerCase() ===
            'true',
          enableBiddingAdvisor:
            (process.env.IDK_ENABLE_BIDDING_ADVISOR || 'true').toLowerCase() ===
            'true',
          enablePortfolioTracking:
            (process.env.IDK_ENABLE_PORTFOLIO || 'true').toLowerCase() ===
            'true',
          enableAdvancedNotifications:
            (
              process.env.IDK_ENABLE_ADVANCED_NOTIFICATIONS || 'true'
            ).toLowerCase() === 'true',
          riskTolerance: (process.env.IDK_RISK_TOLERANCE || 'moderate') as
            | 'conservative'
            | 'moderate'
            | 'aggressive',
          maxConcurrentActions: Number(
            process.env.IDK_MAX_CONCURRENT_ACTIONS || 10,
          ),
        };

        this.actuator = new AuctionActuator(this.db, logger, actuationConfig);
        logger.info('Advanced actuation system enabled');
      } catch (error) {
        logger.warn(
          { err: error },
          'Failed to initialize actuation system; running without advanced features',
        );
        this.actuator = undefined;
      }
    }
  }

  private async enrichVehicles(
    vehicles: CopartVehicle[],
  ): Promise<CopartVehicle[]> {
    const toolConfig: ToolConfig = {
      enableVinDecode:
        (process.env.IDK_ENRICH_VIN || 'true').toLowerCase() === 'true',
      enableMarketComps:
        (process.env.IDK_ENRICH_COMPS || 'true').toLowerCase() === 'true',
      enableRiskAssessment:
        (process.env.IDK_ENRICH_RISK || 'true').toLowerCase() === 'true',
      toolTimeoutMs: Number(process.env.IDK_TOOL_TIMEOUT_MS || 10000),
    };

    const enriched: CopartVehicle[] = [];
    for (const v of vehicles) {
      try {
        const toolResults = await runTools(v, toolConfig, logger);
        enriched.push({ ...v, toolResults });
      } catch (err) {
        logger.warn({ err, vehicleId: v.id }, 'Tool enrichment failed');
        enriched.push(v);
      }
    }
    return enriched;
  }

  /**
   * Start a new run and initialize tracking
   */
  startRun(): string {
    if (this.db) {
      const useRealScraper =
        (process.env.COPART_REAL_SCRAPER || 'false').toLowerCase() === 'true';
      this.currentRunId = this.db.startRun(
        this.searchCriteria,
        useRealScraper ? 'real' : 'mock',
      );
      return this.currentRunId;
    }
    return 'no-persistence';
  }

  /**
   * Scrape Copart auction data
   */
  async scrapeAuctions(): Promise<CopartVehicle[]> {
    console.log('🔍 Scraping Copart auctions...');
    const useRealScraper =
      (process.env.COPART_REAL_SCRAPER || 'false').toLowerCase() === 'true';

    try {
      if (useRealScraper) {
        const { scrapeCopartListings } = await import(
          './scraper/copart-scraper'
        );
        const scraped = await scrapeCopartListings(this.searchCriteria, logger);
        if (scraped.length > 0) {
          this.vehicles = await this.enrichVehicles(scraped);
        } else {
          logger.warn('Real scraper returned 0 vehicles; using mock data');
          this.vehicles = await this.enrichVehicles(getMockVehicles());
        }
      } else {
        this.vehicles = await this.enrichVehicles(getMockVehicles());
      }

      // Store vehicles in database if persistence enabled
      if (this.db && this.currentRunId) {
        this.db.upsertVehicles(this.currentRunId, this.vehicles);
      }

      console.log(`✅ Found ${this.vehicles.length} vehicles`);
      return this.vehicles;
    } catch (error) {
      logger.error({ err: error }, 'Error scraping auctions');
      if (this.db && this.currentRunId) {
        this.db.failRun(this.currentRunId, String(error));
      }
      throw error;
    }
  }

  /**
   * Analyze vehicles using AI
   */
  async analyzeVehicles(): Promise<AuctionAnalysis[]> {
    console.log('🤖 Analyzing vehicles with AI...');

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key required for AI analysis');
    }

    // Start with heuristic analyses for all vehicles
    const analyses: AuctionAnalysis[] = this.vehicles.map((v) =>
      this.createBasicAnalysis(v),
    );

    // Pre-score with heuristic and take top-N for LLM to control cost
    const preScored = [...this.vehicles]
      .map((v) => ({ v, score: this.createBasicAnalysis(v).score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, config.llmAnalyzeTopN))
      .map((x) => x.v);

    const idToIndex = new Map(this.vehicles.map((v, i) => [v.id, i] as const));

    for (const vehicle of preScored) {
      try {
        const analysis = await this.analyzeSingleVehicleWithRetry(vehicle);
        const idx = idToIndex.get(vehicle.id);
        if (idx !== undefined) analyses[idx] = analysis;
      } catch (error) {
        logger.warn(
          { err: error, vehicleId: vehicle.id },
          'LLM analysis failed; keeping heuristic analysis',
        );
      }
    }

    this.analysisResults = analyses;

    // Store analyses in database if persistence enabled
    if (this.db && this.currentRunId) {
      this.db.storeAnalyses(this.currentRunId, analyses, 'llm', config.model);
    }

    console.log(
      `✅ Analyzed ${preScored.length} vehicles with LLM (others heuristic)`,
    );
    return analyses;
  }

  /**
   * Analyze a single vehicle using OpenAI
   */
  private async analyzeSingleVehicle(
    vehicle: CopartVehicle,
  ): Promise<AuctionAnalysis> {
    const prompt = this.buildAnalysisPrompt(vehicle);

    try {
      const response = await fetch(`${IDKHUB_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert car auction analyst. Analyze the vehicle data and provide insights.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!this.isValidChatCompletionResponse(data)) {
        throw new Error('Invalid API response format');
      }

      const analysis = this.parseAnalysisResponse(data, vehicle);
      return analysis;
    } catch (error) {
      logger.error({ err: error }, 'Error in AI analysis');
      // Fallback to basic analysis
      return this.createBasicAnalysis(vehicle);
    }
  }

  private async analyzeSingleVehicleWithRetry(
    vehicle: CopartVehicle,
  ): Promise<AuctionAnalysis> {
    const maxRetries = Number(process.env.IDK_LLM_MAX_RETRIES || 2);
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt <= maxRetries) {
      try {
        return await this.analyzeSingleVehicle(vehicle);
      } catch (err) {
        lastError = err;
        const delayMs = Math.min(2000 * 2 ** attempt, 8000);
        await new Promise((res) => setTimeout(res, delayMs));
        attempt += 1;
      }
    }
    logger.error(
      { err: lastError, vehicleId: vehicle.id },
      'Failed LLM analysis after retries; using heuristic',
    );
    return this.createBasicAnalysis(vehicle);
  }

  /**
   * Build prompt for AI analysis
   */
  private buildAnalysisPrompt(vehicle: CopartVehicle): string {
    return `
Analyze this vehicle for auction potential:

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
VIN: ${vehicle.vin}
Mileage: ${vehicle.mileage.toLocaleString()}
Current Bid: $${vehicle.currentBid.toLocaleString()}
Estimated Value: $${vehicle.estimatedValue.toLocaleString()}
Damage: ${vehicle.damage}
Location: ${vehicle.location}
Description: ${vehicle.description}

Tool Analysis Results:
${this.formatToolResults(vehicle.toolResults)}

Search Criteria:
- Makes: ${this.searchCriteria.makes.join(', ')}
- Year Range: ${this.searchCriteria.yearRange.min}-${this.searchCriteria.yearRange.max}
- Max Mileage: ${this.searchCriteria.maxMileage.toLocaleString()}
- Max Price: $${this.searchCriteria.maxPrice.toLocaleString()}

Provide analysis in this JSON format:
{
  "score": 85,
  "reasoning": "Good value for money, low mileage, popular model",
  "marketComparison": {
    "averagePrice": 16000,
    "priceDifference": -4000,
    "marketTrend": "below"
  },
  "riskAssessment": {
    "level": "low",
    "factors": ["Clean title", "Low mileage", "Popular model"]
  },
  "recommendation": "buy"
}
`;
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAnalysisResponse(
    data: ChatCompletionResponseBody,
    vehicle: CopartVehicle,
  ): AuctionAnalysis {
    try {
      const content = (data.choices[0]?.message as Record<string, unknown>)
        ?.content;
      if (!content) {
        throw new Error('No content in AI response');
      }

      // Extract JSON from response
      const jsonMatch = (content as string).match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = AuctionAnalysisJsonSchema.safeParse(parsed);
      if (!validated.success) {
        logger.warn(
          { err: validated.error.message },
          'Invalid AI analysis schema; using basic analysis fallback',
        );
        return this.createBasicAnalysis(vehicle);
      }

      const v = validated.data;
      return {
        vehicle,
        score: v.score,
        reasoning: v.reasoning,
        marketComparison: {
          averagePrice: v.marketComparison.averagePrice,
          priceDifference: v.marketComparison.priceDifference,
          marketTrend: v.marketComparison.marketTrend,
        },
        riskAssessment: {
          level: v.riskAssessment.level,
          factors: v.riskAssessment.factors,
        },
        recommendation: v.recommendation,
      };
    } catch (error) {
      logger.error({ err: error }, 'Error parsing AI response');
      return this.createBasicAnalysis(vehicle);
    }
  }

  /**
   * Create basic analysis when AI fails
   */
  private createBasicAnalysis(vehicle: CopartVehicle): AuctionAnalysis {
    // Use tool results if available, otherwise fallback to simple heuristics
    const marketComps = vehicle.toolResults?.marketComps;
    const riskAssessment = vehicle.toolResults?.riskAssessment;

    const priceDifference = marketComps
      ? marketComps.averagePrice - vehicle.currentBid
      : vehicle.estimatedValue - vehicle.currentBid;

    let score = Math.max(
      0,
      Math.min(
        100,
        (priceDifference /
          (marketComps?.averagePrice || vehicle.estimatedValue)) *
          100 +
          (vehicle.year - 2000) / 2 +
          (200000 - vehicle.mileage) / 2000,
      ),
    );

    // Apply risk adjustment
    if (riskAssessment) {
      const riskPenalty = riskAssessment.score * 0.3; // 30% weight to risk
      score = Math.max(0, score - riskPenalty);
    }

    const finalScore = Math.round(score);

    let reasoning = 'Analysis based on price difference, age, and mileage';
    if (marketComps) {
      reasoning += ` | Market: ${marketComps.source} (${marketComps.confidence}% conf)`;
    }
    if (riskAssessment) {
      reasoning += ` | Risk: ${riskAssessment.level} (${riskAssessment.score}/100)`;
    }

    return {
      vehicle,
      score: finalScore,
      reasoning,
      marketComparison: {
        averagePrice: marketComps?.averagePrice || vehicle.estimatedValue,
        priceDifference,
        marketTrend:
          marketComps?.marketTrend || (priceDifference > 0 ? 'below' : 'above'),
      },
      riskAssessment: {
        level:
          riskAssessment?.level ||
          (vehicle.damage === 'none' ? 'low' : 'medium'),
        factors: riskAssessment?.factors || [
          vehicle.damage === 'none' ? 'No damage' : `Damage: ${vehicle.damage}`,
        ],
      },
      recommendation:
        finalScore > 70 ? 'buy' : finalScore > 50 ? 'monitor' : 'pass',
    };
  }

  /**
   * Filter vehicles based on search criteria
   */
  filterVehicles(): CopartVehicle[] {
    return this.vehicles.filter((vehicle) => {
      // Check make
      if (
        this.searchCriteria.makes.length > 0 &&
        !this.searchCriteria.makes.includes(vehicle.make)
      ) {
        return false;
      }

      // Check year range
      if (
        vehicle.year < this.searchCriteria.yearRange.min ||
        vehicle.year > this.searchCriteria.yearRange.max
      ) {
        return false;
      }

      // Check mileage
      if (vehicle.mileage > this.searchCriteria.maxMileage) {
        return false;
      }

      // Check price
      if (vehicle.currentBid > this.searchCriteria.maxPrice) {
        return false;
      }

      // Check location
      if (
        this.searchCriteria.locations.length > 0 &&
        !this.searchCriteria.locations.some((loc) =>
          vehicle.location.toLowerCase().includes(loc.toLowerCase()),
        )
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get top recommendations
   */
  getTopRecommendations(limit = 5): AuctionAnalysis[] {
    return this.analysisResults
      .filter((analysis) => analysis.recommendation === 'buy')
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generate market insights report
   */
  generateMarketReport(): string {
    if (this.analysisResults.length === 0) {
      return 'No analysis data available';
    }

    const totalVehicles = this.analysisResults.length;
    const buyRecommendations = this.analysisResults.filter(
      (a) => a.recommendation === 'buy',
    ).length;
    const averageScore =
      this.analysisResults.reduce((sum, a) => sum + a.score, 0) / totalVehicles;
    const averagePrice =
      this.analysisResults.reduce((sum, a) => sum + a.vehicle.currentBid, 0) /
      totalVehicles;

    return `
🚗 Copart Auction Market Report
================================

📊 Summary:
- Total Vehicles Analyzed: ${totalVehicles}
- Buy Recommendations: ${buyRecommendations} (${Math.round((buyRecommendations / totalVehicles) * 100)}%)
- Average Score: ${Math.round(averageScore)}/100
- Average Current Bid: $${Math.round(averagePrice).toLocaleString()}

🏆 Top Opportunities:
${this.getTopRecommendations(3)
  .map(
    (analysis, i) =>
      `${i + 1}. ${analysis.vehicle.year} ${analysis.vehicle.make} ${analysis.vehicle.model} - Score: ${analysis.score}/100`,
  )
  .join('\n')}

⚠️ Risk Assessment:
- Low Risk: ${this.analysisResults.filter((a) => a.riskAssessment.level === 'low').length}
- Medium Risk: ${this.analysisResults.filter((a) => a.riskAssessment.level === 'medium').length}
- High Risk: ${this.analysisResults.filter((a) => a.riskAssessment.level === 'high').length}
`;
  }

  /**
   * Export data to JSON
   */
  exportData(): string {
    const payload = {
      searchCriteria: this.searchCriteria,
      vehicles: this.vehicles,
      analysis: this.analysisResults,
      timestamp: new Date().toISOString(),
    };

    const validated = ExportDataSchema.safeParse(payload);
    if (!validated.success) {
      logger.error(
        { err: validated.error.message },
        'Export data failed validation; writing unvalidated payload',
      );
      return JSON.stringify(payload, null, 2);
    }
    return JSON.stringify(validated.data, null, 2);
  }

  /**
   * Type guard for API response validation
   */
  private isValidChatCompletionResponse(
    data: unknown,
  ): data is ChatCompletionResponseBody {
    if (!data || typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;
    return (
      obj.object === 'chat.completion' &&
      typeof obj.id === 'string' &&
      Array.isArray(obj.choices) &&
      obj.choices.length > 0
    );
  }

  /**
   * Format tool results for LLM prompt
   */
  private formatToolResults(toolResults?: ToolResults): string {
    if (!toolResults) return '- No tool analysis available';

    const parts: string[] = [];

    if (toolResults.vinDetails) {
      const important = [
        'Make',
        'Model',
        'Body Class',
        'Engine Number of Cylinders',
        'Drive Type',
      ];
      const vinInfo = important
        .map((key) => toolResults.vinDetails?.[key])
        .filter(Boolean)
        .join(', ');
      if (vinInfo) parts.push(`- VIN Details: ${vinInfo}`);
    }

    if (toolResults.marketComps) {
      const mc = toolResults.marketComps;
      parts.push(
        `- Market Value: $${mc.averagePrice.toLocaleString()} (${mc.source}, ${mc.confidence}% confidence)`,
      );
      parts.push(
        `- Price Range: $${mc.priceRange.min.toLocaleString()} - $${mc.priceRange.max.toLocaleString()}`,
      );
      parts.push(
        `- Market Trend: Current bid is ${mc.marketTrend} market average`,
      );
    }

    if (toolResults.riskAssessment) {
      const ra = toolResults.riskAssessment;
      parts.push(`- Risk Level: ${ra.level.toUpperCase()} (${ra.score}/100)`);
      if (ra.factors.length > 0) {
        parts.push(`- Risk Factors: ${ra.factors.slice(0, 3).join(', ')}`);
      }
      if (ra.warnings.length > 0) {
        parts.push(`- Warnings: ${ra.warnings.slice(0, 2).join('; ')}`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : '- No tool analysis available';
  }

  /**
   * Complete the current run and finalize tracking
   */
  completeRun(exportPath?: string, durationMs?: number): void {
    if (this.db && this.currentRunId) {
      const llmCount = this.analysisResults.length; // Simplified - all analyses use same method
      this.db.completeRun(
        this.currentRunId,
        this.vehicles.length,
        this.analysisResults.length,
        llmCount,
        exportPath,
        durationMs,
      );
    }
  }

  /**
   * Create heuristic analyses and store them
   */
  createHeuristicAnalyses(): AuctionAnalysis[] {
    const analyses = this.vehicles.map((v) => this.createBasicAnalysis(v));
    this.analysisResults = analyses;

    // Store heuristic analyses in database if persistence enabled
    if (this.db && this.currentRunId) {
      this.db.storeAnalyses(this.currentRunId, analyses, 'heuristic');
    }

    return analyses;
  }

  /**
   * Process advanced actuation (watchlists, bidding, portfolio)
   */
  async processActuation(): Promise<ActuationResult | null> {
    if (!this.actuator || !this.currentRunId) {
      logger.debug('Actuation system not available or no active run');
      return null;
    }

    logger.info('Processing advanced actuation...');

    try {
      const result = await this.actuator.processActuation(
        this.vehicles,
        this.analysisResults,
        this.currentRunId,
      );

      logger.info(
        {
          alertsGenerated: result.watchlistAlerts.length,
          bidRecommendations: result.bidRecommendations.length,
          criticalActions: result.executionSummary.criticalActions,
          notificationsSent: result.notificationsSent,
        },
        'Completed actuation processing',
      );

      return result;
    } catch (error) {
      logger.error({ err: error }, 'Failed actuation processing');
      return null;
    }
  }

  /**
   * Get historical data for reporting
   */
  getHistoricalData() {
    if (!this.db) return null;

    return {
      recentRuns: this.db.getRecentRuns(10),
      topPerformers: this.db.getTopPerformers(20),
      priceAlerts: this.db.getPriceAlerts(5000), // $5k+ price drops
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Main execution function
async function main() {
  const startTime = Date.now();
  let agent: CopartAuctionAgent | null = null;

  try {
    console.log('🚗 Starting Copart Auction Monitoring Agent...\n');

    // Gather criteria interactively when in TTY; otherwise use defaults/env
    const isTTY = process.stdout.isTTY && process.stdin.isTTY;
    const defaultCriteria: Partial<SearchCriteria> = {
      makes: ['Toyota', 'Honda', 'Ford'],
      yearRange: { min: 2015, max: 2023 },
      maxMileage: 100000,
      maxPrice: 25000,
      locations: ['Los Angeles', 'Miami', 'New York'],
      keywords: [],
    };

    const lastSaved = await loadLastCriteria();
    let finalCriteria: Partial<SearchCriteria> = lastSaved || defaultCriteria;

    if (isTTY && (process.env.IDK_INTERACTIVE ?? 'true') !== 'false') {
      console.log(
        "🧩 Let's customize your search. Press enter to accept defaults.",
      );

      // Choose a preset or continue with last/default
      const presetChoice = await prompts({
        type: 'select',
        name: 'preset',
        message: 'Choose a preset (or Custom to specify everything):',
        choices: [
          { title: 'Use last saved', value: 'last' },
          { title: 'Economy Sedans', value: 'economy' },
          { title: 'SUVs', value: 'suvs' },
          { title: 'EVs (Electric Vehicles)', value: 'evs' },
          { title: 'Trucks', value: 'trucks' },
          { title: 'Luxury', value: 'luxury' },
          { title: 'Custom', value: 'custom' },
        ],
        initial: 0,
      });

      const baseCriteria: Partial<SearchCriteria> =
        presetChoice.preset === 'last' && lastSaved
          ? lastSaved
          : presetChoice.preset &&
              presetChoice.preset !== 'custom' &&
              presetChoice.preset !== 'last'
            ? { ...defaultCriteria, ...getPresetCriteria(presetChoice.preset) }
            : lastSaved || defaultCriteria;

      const responses = await prompts(
        [
          {
            type: 'text',
            name: 'makes',
            message: 'Makes (comma-separated)',
            initial: (baseCriteria.makes || []).join(', '),
          },
          {
            type: 'text',
            name: 'models',
            message: 'Models (comma-separated)',
            initial: (baseCriteria.models || []).join(', '),
          },
          {
            type: 'number',
            name: 'yearMin',
            message: 'Minimum year',
            initial: baseCriteria.yearRange?.min ?? 2010,
          },
          {
            type: 'number',
            name: 'yearMax',
            message: 'Maximum year',
            initial: baseCriteria.yearRange?.max ?? 2024,
          },
          {
            type: 'number',
            name: 'maxMileage',
            message: 'Max mileage',
            initial: baseCriteria.maxMileage ?? 150000,
          },
          {
            type: 'number',
            name: 'maxPrice',
            message: 'Max price (USD)',
            initial: baseCriteria.maxPrice ?? 50000,
          },
          {
            type: 'text',
            name: 'locations',
            message: 'Locations (comma-separated)',
            initial: (baseCriteria.locations || []).join(', '),
          },
          {
            type: 'text',
            name: 'keywords',
            message: 'Keywords (comma-separated)',
            initial: (baseCriteria.keywords || []).join(', '),
          },
        ],
        { onCancel: () => ({}) },
      );

      finalCriteria = {
        makes: splitCsv(
          responses.makes,
          baseCriteria.makes || defaultCriteria.makes,
        ),
        models: splitCsv(responses.models, []),
        yearRange: {
          min: Number.isFinite(responses.yearMin)
            ? responses.yearMin
            : (baseCriteria.yearRange?.min ??
              defaultCriteria.yearRange?.min ??
              2010),
          max: Number.isFinite(responses.yearMax)
            ? responses.yearMax
            : (baseCriteria.yearRange?.max ??
              defaultCriteria.yearRange?.max ??
              2024),
        },
        maxMileage: Number.isFinite(responses.maxMileage)
          ? responses.maxMileage
          : (baseCriteria.maxMileage ?? defaultCriteria.maxMileage ?? 150000),
        maxPrice: Number.isFinite(responses.maxPrice)
          ? responses.maxPrice
          : (baseCriteria.maxPrice ?? defaultCriteria.maxPrice ?? 50000),
        locations: splitCsv(
          responses.locations,
          baseCriteria.locations || defaultCriteria.locations,
        ),
        keywords: splitCsv(responses.keywords, []),
      };

      const saveChoice = await prompts({
        type: 'confirm',
        name: 'save',
        message: 'Save these criteria as your default for next time?',
        initial: true,
      });
      if (saveChoice.save) {
        await saveLastCriteria(finalCriteria);
        console.log(`💾 Saved defaults to ${CRITERIA_STORE}`);
      }
    }

    // Initialize agent with chosen criteria
    agent = new CopartAuctionAgent(finalCriteria);
    const _runId = agent.startRun();

    // Scrape auction data
    console.log('Step 1: Scraping auctions...');
    await agent.scrapeAuctions();

    // Filter vehicles
    console.log('Step 2: Filtering vehicles...');
    const filteredVehicles = agent.filterVehicles();
    console.log(
      `📋 Filtered to ${filteredVehicles.length} vehicles matching criteria\n`,
    );

    // Step 3: AI analysis if available; else fallback to heuristic
    if (OPENAI_API_KEY) {
      console.log('Step 3: Analyzing vehicles with AI...');
      await agent.analyzeVehicles();
    } else {
      console.log('Step 3: Skipping AI analysis (no API key)...');
      console.log('Step 4: Creating basic analysis...');
      agent.createHeuristicAnalyses();
    }

    // Advanced actuation processing
    console.log('Step 5: Processing advanced actuation...');
    const actuationResult = await agent.processActuation();

    // Generate and display report
    console.log('Step 6: Generating report...');
    const report = agent.generateMarketReport();
    console.log(report);

    // Show actuation insights if available
    if (actuationResult) {
      console.log('\n🤖 Advanced AI Agent Insights:');
      console.log(
        `📊 Watchlist Alerts: ${actuationResult.watchlistAlerts.length}`,
      );
      console.log(
        `💰 Bid Recommendations: ${actuationResult.bidRecommendations.length}`,
      );
      console.log(
        `🚨 Critical Actions: ${actuationResult.executionSummary.criticalActions}`,
      );
      console.log(
        `📱 Notifications Sent: ${actuationResult.notificationsSent}`,
      );

      if (actuationResult.actionsSuggested.length > 0) {
        console.log('\n🎯 AI-Suggested Actions:');
        actuationResult.actionsSuggested.slice(0, 3).forEach((action, i) => {
          console.log(`  ${i + 1}. ${action}`);
        });
      }

      if (actuationResult.portfolioReport) {
        const portfolio = actuationResult.portfolioReport;
        console.log('\n📈 Portfolio Insights:');
        console.log(
          `  • Total Investment: $${portfolio.metrics.totalInvestment.toLocaleString()}`,
        );
        console.log(
          `  • Average ROI: ${portfolio.metrics.averageROI.toFixed(1)}%`,
        );
        console.log(
          `  • Risk Score: ${portfolio.metrics.riskScore.toFixed(1)}/100`,
        );
        console.log(
          `  • Active Items: ${portfolio.metrics.activeWatchlistItems}`,
        );
      }
    }

    // Show top recommendations
    const topRecommendations = agent.getTopRecommendations();
    if (topRecommendations.length > 0) {
      console.log('\n🎯 Top Recommendations:');
      topRecommendations.forEach((analysis, i) => {
        const vehicle = analysis.vehicle;
        console.log(
          `${i + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        );
        console.log(
          `   Score: ${analysis.score}/100 | Current Bid: $${vehicle.currentBid.toLocaleString()}`,
        );
        console.log(`   Reasoning: ${analysis.reasoning}`);
        console.log('');
      });
    }

    // Export data
    const exportData = agent.exportData();
    const exportPath = `copart-analysis-${new Date().toISOString().split('T')[0]}.json`;

    // Write to file
    const fs = await import('node:fs/promises');
    await fs.writeFile(exportPath, exportData, 'utf8');

    console.log(`💾 Data exported to: ${exportPath}`);
    console.log(`📊 Export size: ${(exportData.length / 1024).toFixed(2)} KB`);

    // Complete the run tracking
    const duration = Date.now() - startTime;
    agent.completeRun(exportPath, duration);

    // Show historical insights if available
    const historical = agent.getHistoricalData();
    if (historical && historical.recentRuns.length > 1) {
      console.log('\n📈 Historical Insights:');
      console.log(`- Total runs tracked: ${historical.recentRuns.length}`);
      console.log(
        `- Top performers: ${historical.topPerformers.length} vehicles with "buy" recommendations`,
      );
      if (historical.priceAlerts.length > 0) {
        console.log(
          `- Price alerts: ${historical.priceAlerts.length} vehicles with significant price drops`,
        );
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Error in main execution');
    if (agent) {
      const duration = Date.now() - startTime;
      agent.completeRun(undefined, duration);
    }
    process.exit(1);
  } finally {
    if (agent) {
      agent.close();
    }
  }
}

// Run if called directly
const isMainModule = process.argv[1]?.endsWith('copart.ts');
if (isMainModule) {
  main().catch((err) => logger.error({ err }, 'Unhandled error in main'));
}

export {
  CopartAuctionAgent,
  type CopartVehicle,
  type SearchCriteria,
  type AuctionAnalysis,
};

function splitCsv(input: unknown, fallback: string[] | undefined): string[] {
  if (typeof input !== 'string') return fallback || [];
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadLastCriteria(): Promise<Partial<SearchCriteria> | null> {
  try {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(CRITERIA_STORE, 'utf8');
    const data = JSON.parse(content);
    normalizePartialCriteria(data);
    const parsed = SearchCriteriaSchema.partial().safeParse(data);
    if (parsed.success) return parsed.data as Partial<SearchCriteria>;
    return null;
  } catch {
    return null;
  }
}

async function saveLastCriteria(
  criteria: Partial<SearchCriteria>,
): Promise<void> {
  const fs = await import('node:fs/promises');
  const toSave = JSON.stringify(criteria, null, 2);
  await fs.writeFile(CRITERIA_STORE, toSave, 'utf8');
}

function normalizePartialCriteria(obj: Record<string, unknown>): void {
  if (!obj || typeof obj !== 'object') return;
  const toArray = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.map(String)
      : typeof v === 'string'
        ? splitCsv(v, [])
        : [];
  const toNum = (v: unknown, def = 0): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : def;
  };

  if ('makes' in obj) obj.makes = toArray(obj.makes);
  if ('models' in obj) obj.models = toArray(obj.models);
  if ('locations' in obj) obj.locations = toArray(obj.locations);
  if ('keywords' in obj) obj.keywords = toArray(obj.keywords);
  if ('maxMileage' in obj)
    obj.maxMileage = Math.max(0, toNum(obj.maxMileage, 150000));
  if ('maxPrice' in obj) obj.maxPrice = Math.max(0, toNum(obj.maxPrice, 50000));
  if ('yearRange' in obj) {
    const yr = (obj.yearRange as Record<string, unknown>) || {};
    const min = toNum(yr.min, 2010);
    const max = toNum(yr.max, 2024);
    obj.yearRange = { min: Math.min(min, max), max: Math.max(min, max) };
  }
  if ('maxDamage' in obj && typeof obj.maxDamage !== 'string')
    obj.maxDamage = String(obj.maxDamage || 'minor');
}

function getMockVehicles(): CopartVehicle[] {
  return [
    {
      id: '1',
      title: '2018 Toyota Camry',
      year: 2018,
      make: 'Toyota',
      model: 'Camry',
      vin: '4T1B11HK5JU123456',
      mileage: 45000,
      damage: 'minor',
      currentBid: 12000,
      estimatedValue: 18000,
      auctionEndTime: new Date(Date.now() + 86400000).toISOString(),
      location: 'Los Angeles, CA',
      images: ['https://example.com/camry1.jpg'],
      description: 'Clean title, minor front end damage, runs great',
      lotNumber: 'L123456',
      saleStatus: 'active',
    },
    {
      id: '2',
      title: '2015 Honda Civic',
      year: 2015,
      make: 'Honda',
      model: 'Civic',
      vin: '2HGFB2F54FH123456',
      mileage: 78000,
      damage: 'none',
      currentBid: 9500,
      estimatedValue: 14000,
      auctionEndTime: new Date(Date.now() + 172800000).toISOString(),
      location: 'Miami, FL',
      images: ['https://example.com/civic1.jpg'],
      description: 'Clean title, no damage, excellent condition',
      lotNumber: 'L123457',
      saleStatus: 'upcoming',
    },
  ];
}

function getPresetCriteria(preset: string): Partial<SearchCriteria> {
  switch (preset) {
    case 'economy':
      return {
        makes: ['Toyota', 'Honda', 'Hyundai', 'Kia', 'Nissan'],
        models: [],
        yearRange: { min: 2016, max: 2024 },
        maxMileage: 120000,
        maxPrice: 20000,
        keywords: ['clean title', 'no damage'],
      };
    case 'suvs':
      return {
        makes: ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Subaru'],
        models: [],
        yearRange: { min: 2015, max: 2024 },
        maxMileage: 130000,
        maxPrice: 30000,
        keywords: ['awd', '4wd'],
      };
    case 'evs':
      return {
        makes: ['Tesla', 'Chevrolet', 'Nissan', 'Ford', 'Hyundai', 'Kia'],
        models: ['Model 3', 'Model Y', 'Bolt', 'Leaf'],
        yearRange: { min: 2017, max: 2024 },
        maxMileage: 100000,
        maxPrice: 35000,
        keywords: ['battery', 'electric'],
      };
    case 'trucks':
      return {
        makes: ['Ford', 'Chevrolet', 'Ram', 'Toyota'],
        models: [],
        yearRange: { min: 2013, max: 2024 },
        maxMileage: 160000,
        maxPrice: 35000,
        keywords: ['4x4', 'crew cab'],
      };
    case 'luxury':
      return {
        makes: ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus'],
        models: [],
        yearRange: { min: 2016, max: 2024 },
        maxMileage: 100000,
        maxPrice: 45000,
        keywords: [],
      };
    default:
      return {};
  }
}
