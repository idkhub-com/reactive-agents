#!/usr/bin/env tsx
import 'dotenv/config';
import pino from 'pino';
import { z } from 'zod';
import { runTools, type ToolConfig, type ToolResults } from './tools';

/**
 * Simplified Copart Auction Agent for Chat Integration
 *
 * This is a streamlined version of the main auction agent designed
 * to work with the chat interface.
 */

// Configuration
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const IDKHUB_URL = process.env.IDKHUB_URL || 'http://localhost:3000/v1';
const AUTH_TOKEN = process.env.IDKHUB_AUTH_TOKEN || 'idk';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Types
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
  recommendation: 'buy' | 'monitor' | 'pass';
}

// Validation schemas (unused but kept for future validation)
const _CopartVehicleSchema = z.object({
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

const _SearchCriteriaSchema = z.object({
  makes: z.array(z.string()),
  models: z.array(z.string()),
  yearRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  maxMileage: z.number(),
  maxDamage: z.string(),
  maxPrice: z.number(),
  locations: z.array(z.string()),
  keywords: z.array(z.string()),
});

export class CopartAuctionAgent {
  private searchCriteria: SearchCriteria;

  constructor(initialCriteria: Partial<SearchCriteria>) {
    // Set default criteria
    this.searchCriteria = {
      makes: initialCriteria.makes || ['Toyota', 'Honda', 'Ford'],
      models: initialCriteria.models || [],
      yearRange: initialCriteria.yearRange || { min: 2015, max: 2023 },
      maxMileage: initialCriteria.maxMileage || 100000,
      maxDamage: initialCriteria.maxDamage || 'minor',
      maxPrice: initialCriteria.maxPrice || 25000,
      locations: initialCriteria.locations || [
        'Los Angeles',
        'Miami',
        'New York',
      ],
      keywords: initialCriteria.keywords || [],
    };

    // Note: Database functionality can be added later if needed
  }

  /**
   * Update search criteria
   */
  updateSearchCriteria(newCriteria: Partial<SearchCriteria>): void {
    this.searchCriteria = { ...this.searchCriteria, ...newCriteria };
    logger.info({ criteria: this.searchCriteria }, 'Updated search criteria');
  }

  /**
   * Get current search criteria
   */
  getSearchCriteria(): SearchCriteria {
    return { ...this.searchCriteria };
  }

  /**
   * Scrape vehicles from Copart (mock data for now)
   */
  scrapeVehicles(): CopartVehicle[] {
    logger.info(
      { criteria: this.searchCriteria },
      'Scraping vehicles with criteria',
    );

    // For now, return mock data
    // In a real implementation, this would scrape from Copart
    const mockVehicles: CopartVehicle[] = [
      {
        id: '1',
        title: '2019 Honda Civic LX',
        year: 2019,
        make: 'Honda',
        model: 'Civic',
        vin: '2HGFC2F59KH123456',
        mileage: 45000,
        damage: 'minor',
        currentBid: 18500,
        estimatedValue: 22000,
        auctionEndTime: '2025-09-10T15:00:00Z',
        location: 'Los Angeles, CA',
        images: ['https://example.com/image1.jpg'],
        description: 'Clean title, minor front end damage',
        lotNumber: '12345',
        saleStatus: 'active',
      },
      {
        id: '2',
        title: '2020 Toyota Camry LE',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        vin: '4T1C11AK5LU123456',
        mileage: 38000,
        damage: 'none',
        currentBid: 22500,
        estimatedValue: 26000,
        auctionEndTime: '2025-09-11T14:30:00Z',
        location: 'Miami, FL',
        images: ['https://example.com/image2.jpg'],
        description: 'No damage, excellent condition',
        lotNumber: '12346',
        saleStatus: 'active',
      },
      {
        id: '3',
        title: '2018 Ford F-150 XLT',
        year: 2018,
        make: 'Ford',
        model: 'F-150',
        vin: '1FTFW1ET5DFC12345',
        mileage: 65000,
        damage: 'moderate',
        currentBid: 32000,
        estimatedValue: 35000,
        auctionEndTime: '2025-09-12T16:00:00Z',
        location: 'New York, NY',
        images: ['https://example.com/image3.jpg'],
        description: 'Moderate rear damage, runs well',
        lotNumber: '12347',
        saleStatus: 'active',
      },
    ];

    // Filter based on search criteria
    return mockVehicles.filter((vehicle) => this.matchesCriteria(vehicle));
  }

  /**
   * Filter vehicles based on search criteria
   */
  filterVehicles(vehicles: CopartVehicle[]): CopartVehicle[] {
    return vehicles.filter((vehicle) => this.matchesCriteria(vehicle));
  }

  /**
   * Check if vehicle matches search criteria
   */
  private matchesCriteria(vehicle: CopartVehicle): boolean {
    // Check makes
    if (
      this.searchCriteria.makes.length > 0 &&
      !this.searchCriteria.makes.some((make) =>
        vehicle.make.toLowerCase().includes(make.toLowerCase()),
      )
    ) {
      return false;
    }

    // Check models
    if (
      this.searchCriteria.models.length > 0 &&
      !this.searchCriteria.models.some((model) =>
        vehicle.model.toLowerCase().includes(model.toLowerCase()),
      )
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

    // Check locations
    if (
      this.searchCriteria.locations.length > 0 &&
      !this.searchCriteria.locations.some((location) =>
        vehicle.location.toLowerCase().includes(location.toLowerCase()),
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Analyze vehicles
   */
  async analyzeVehicles(vehicles: CopartVehicle[]): Promise<AuctionAnalysis[]> {
    logger.info(`Analyzing ${vehicles.length} vehicles`);

    const analyses: AuctionAnalysis[] = [];

    for (const vehicle of vehicles) {
      try {
        // Run tools if enabled
        let toolResults: ToolResults | undefined;
        if (
          process.env.IDK_ENRICH_VIN === 'true' ||
          process.env.IDK_ENRICH_COMPS === 'true' ||
          process.env.IDK_ENRICH_RISK === 'true'
        ) {
          const toolConfig: ToolConfig = {
            enableVinDecode: process.env.IDK_ENRICH_VIN === 'true',
            enableMarketComps: process.env.IDK_ENRICH_COMPS === 'true',
            enableRiskAssessment: process.env.IDK_ENRICH_RISK === 'true',
            toolTimeoutMs: parseInt(process.env.IDK_TOOL_TIMEOUT_MS || '10000'),
          };

          toolResults = await runTools(vehicle, toolConfig, logger);
          vehicle.toolResults = toolResults;
        }

        // Analyze vehicle
        const analysis = await this.analyzeSingleVehicle(vehicle);
        analyses.push(analysis);
      } catch (error) {
        logger.error(
          { vehicleId: vehicle.id, error },
          'Error analyzing vehicle',
        );
        // Create basic analysis as fallback
        const basicAnalysis = this.createBasicAnalysis(vehicle);
        analyses.push(basicAnalysis);
      }
    }

    return analyses;
  }

  /**
   * Analyze a single vehicle
   */
  private async analyzeSingleVehicle(
    vehicle: CopartVehicle,
  ): Promise<AuctionAnalysis> {
    if (OPENAI_API_KEY) {
      try {
        return await this.analyzeWithAI(vehicle);
      } catch (error) {
        logger.error({ error }, 'AI analysis failed, using heuristic');
        return this.createBasicAnalysis(vehicle);
      }
    } else {
      return this.createBasicAnalysis(vehicle);
    }
  }

  /**
   * Analyze vehicle using AI
   */
  private async analyzeWithAI(
    vehicle: CopartVehicle,
  ): Promise<AuctionAnalysis> {
    const prompt = this.buildAnalysisPrompt(vehicle);

    const response = await fetch(`${IDKHUB_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.IDK_MODEL || 'gpt-4',
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
        max_tokens: parseInt(process.env.IDK_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.IDK_TEMPERATURE || '0.3'),
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return this.parseAnalysisResponse(data, vehicle);
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(vehicle: CopartVehicle): string {
    let prompt = `Analyze this vehicle for auction potential:

Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}
Current Bid: $${vehicle.currentBid.toLocaleString()}
Mileage: ${vehicle.mileage.toLocaleString()} miles
Damage: ${vehicle.damage}
Location: ${vehicle.location}
VIN: ${vehicle.vin}
Description: ${vehicle.description}

`;

    if (vehicle.toolResults) {
      prompt += `Additional Data:
${JSON.stringify(vehicle.toolResults, null, 2)}
`;
    }

    prompt += `
Provide analysis in this JSON format:
{
  "score": 0-100,
  "reasoning": "explanation",
  "marketComparison": {
    "averagePrice": number,
    "priceDifference": number,
    "marketTrend": "above|below|average"
  },
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": ["factor1", "factor2"]
  },
  "recommendation": "buy|monitor|pass"
}`;

    return prompt;
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(
    data: { choices: Array<{ message: { content: string } }> },
    vehicle: CopartVehicle,
  ): AuctionAnalysis {
    try {
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          vehicle,
          score: analysis.score || 50,
          reasoning: analysis.reasoning || 'AI analysis completed',
          marketComparison: analysis.marketComparison || {
            averagePrice: vehicle.estimatedValue,
            priceDifference: vehicle.estimatedValue - vehicle.currentBid,
            marketTrend: 'average' as const,
          },
          riskAssessment: analysis.riskAssessment || {
            level: 'medium' as const,
            factors: ['Unknown risk factors'],
          },
          recommendation: analysis.recommendation || ('monitor' as const),
        };
      }
    } catch (error) {
      logger.error({ error }, 'Error parsing AI response');
    }

    // Fallback to basic analysis
    return this.createBasicAnalysis(vehicle);
  }

  /**
   * Create basic analysis without AI
   */
  private createBasicAnalysis(vehicle: CopartVehicle): AuctionAnalysis {
    // Simple heuristic scoring
    let score = 50;
    const factors: string[] = [];
    let recommendation: 'buy' | 'monitor' | 'pass' = 'monitor';

    // Price factor
    const priceRatio = vehicle.currentBid / vehicle.estimatedValue;
    if (priceRatio < 0.8) {
      score += 20;
      factors.push('Good price relative to estimated value');
    } else if (priceRatio > 1.1) {
      score -= 20;
      factors.push('Price above estimated value');
    }

    // Mileage factor
    const age = new Date().getFullYear() - vehicle.year;
    const avgMilesPerYear = vehicle.mileage / Math.max(age, 1);
    if (avgMilesPerYear < 10000) {
      score += 15;
      factors.push('Low annual mileage');
    } else if (avgMilesPerYear > 20000) {
      score -= 15;
      factors.push('High annual mileage');
    }

    // Damage factor
    if (vehicle.damage === 'none') {
      score += 10;
      factors.push('No damage reported');
    } else if (vehicle.damage === 'minor') {
      score += 5;
      factors.push('Minor damage only');
    } else if (vehicle.damage === 'moderate') {
      score -= 10;
      factors.push('Moderate damage');
    } else if (vehicle.damage === 'severe') {
      score -= 25;
      factors.push('Severe damage');
    }

    // Age factor
    if (vehicle.year >= 2020) {
      score += 10;
      factors.push('Recent model year');
    } else if (vehicle.year < 2015) {
      score -= 10;
      factors.push('Older model year');
    }

    // Determine recommendation
    if (score >= 70) {
      recommendation = 'buy';
    } else if (score >= 40) {
      recommendation = 'monitor';
    } else {
      recommendation = 'pass';
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (score >= 70 && vehicle.damage === 'none') {
      riskLevel = 'low';
    } else if (score < 40 || vehicle.damage === 'severe') {
      riskLevel = 'high';
    }

    return {
      vehicle,
      score: Math.max(0, Math.min(100, score)),
      reasoning: `Heuristic analysis: ${factors.join(', ')}`,
      marketComparison: {
        averagePrice: vehicle.estimatedValue,
        priceDifference: vehicle.estimatedValue - vehicle.currentBid,
        marketTrend:
          priceRatio < 0.9 ? 'below' : priceRatio > 1.1 ? 'above' : 'average',
      },
      riskAssessment: {
        level: riskLevel,
        factors,
      },
      recommendation,
    };
  }
}

export type { CopartVehicle, SearchCriteria, AuctionAnalysis };
