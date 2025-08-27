#!/usr/bin/env tsx
import 'dotenv/config';
import pino from 'pino';
import prompts from 'prompts';
import {
  type AuctionAnalysis,
  CopartAuctionAgent,
  type SearchCriteria,
} from './copart-agent';

/**
 * Chat-like Auction Agent
 *
 * A conversational interface for the Copart auction agent that allows real-time
 * interaction, car selection assistance, and dynamic search criteria updates.
 */

// Configuration
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const IDKHUB_URL = process.env.IDKHUB_URL || 'http://localhost:3000/v1';
const AUTH_TOKEN = process.env.IDKHUB_AUTH_TOKEN || 'idk';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    vehicles?: AuctionAnalysis[];
    searchCriteria?: SearchCriteria;
    action?: string;
  };
}

interface ConversationContext {
  messages: ChatMessage[];
  currentSearchCriteria: SearchCriteria | null;
  lastSearchResults: AuctionAnalysis[];
  userPreferences: {
    budget?: number;
    preferredMakes?: string[];
    maxMileage?: number;
    riskTolerance?: 'low' | 'medium' | 'high';
  };
  sessionId: string;
}

interface ChatAgentConfig {
  enableRealTimeSearch: boolean;
  maxConversationHistory: number;
  autoSearchOnCriteriaChange: boolean;
  enableVehicleComparison: boolean;
}

interface ChatResponse {
  content: string;
  metadata?: {
    vehicles?: AuctionAnalysis[];
    searchCriteria?: SearchCriteria;
    action?: string;
    budget?: number;
  };
}

class ChatAuctionAgent {
  private context: ConversationContext;
  private config: ChatAgentConfig;
  private auctionAgent: CopartAuctionAgent;

  constructor(
    config: ChatAgentConfig = {
      enableRealTimeSearch: true,
      maxConversationHistory: 50,
      autoSearchOnCriteriaChange: true,
      enableVehicleComparison: true,
    },
  ) {
    this.config = config;
    this.context = {
      messages: [],
      currentSearchCriteria: null,
      lastSearchResults: [],
      userPreferences: {},
      sessionId: `chat-${Date.now()}`,
    };

    // Initialize auction agent with default criteria
    this.auctionAgent = new CopartAuctionAgent({
      makes: ['Toyota', 'Honda', 'Ford'],
      models: [],
      yearRange: { min: 2015, max: 2023 },
      maxMileage: 100000,
      maxDamage: 'minor',
      maxPrice: 25000,
      locations: ['Los Angeles', 'Miami', 'New York'],
      keywords: [],
    });

    // Note: Database functionality can be added later if needed
  }

  /**
   * Start the chat session
   */
  async startChat(): Promise<void> {
    console.log('🚗 Welcome to your AI Car Auction Assistant!');
    console.log('=============================================\n');
    console.log(
      "I can help you find the perfect car at auction. Here's what I can do:",
    );
    console.log('• Search for cars based on your criteria');
    console.log('• Analyze vehicle data and provide recommendations');
    console.log('• Compare multiple vehicles');
    console.log('• Track price trends and market insights');
    console.log('• Help you make informed bidding decisions\n');

    // Add system message
    this.addMessage(
      'system',
      'You are a helpful car auction assistant. Help the user find the perfect car based on their needs and preferences.',
    );

    // Start conversation loop
    await this.conversationLoop();
  }

  /**
   * Main conversation loop
   */
  private async conversationLoop(): Promise<void> {
    while (true) {
      try {
        const { message } = await prompts({
          type: 'text',
          name: 'message',
          message: 'You:',
          validate: (value: string) =>
            value.trim().length > 0 || 'Please enter a message',
        });

        if (!message) break;

        // Add user message
        this.addMessage('user', message);

        // Process the message and generate response
        const response = await this.processMessage(message);

        // Add assistant response
        this.addMessage('assistant', response.content, response.metadata);

        // Display response
        console.log(`\n🤖 Assistant: ${response.content}\n`);

        // Check for special commands
        if (
          message.toLowerCase().includes('quit') ||
          message.toLowerCase().includes('exit')
        ) {
          console.log('👋 Thanks for using the AI Car Auction Assistant!');
          break;
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('User force closed')
        ) {
          console.log('\n👋 Goodbye!');
          break;
        }
        console.error('Error in conversation:', error);
        console.log("Let's try again...\n");
      }
    }
  }

  /**
   * Process user message and generate response
   */
  private async processMessage(message: string): Promise<ChatResponse> {
    const lowerMessage = message.toLowerCase();

    // Handle different types of requests
    if (
      lowerMessage.includes('search') ||
      lowerMessage.includes('find') ||
      lowerMessage.includes('look for')
    ) {
      return await this.handleSearchRequest(message);
    } else if (
      lowerMessage.includes('compare') ||
      lowerMessage.includes('vs') ||
      lowerMessage.includes('versus')
    ) {
      return await this.handleComparisonRequest(message);
    } else if (
      lowerMessage.includes('budget') ||
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost')
    ) {
      return await this.handleBudgetRequest(message);
    } else if (
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('suggest') ||
      lowerMessage.includes('advice')
    ) {
      return await this.handleRecommendationRequest(message);
    } else if (
      lowerMessage.includes('show') ||
      lowerMessage.includes('list') ||
      lowerMessage.includes('display')
    ) {
      return await this.handleShowRequest(message);
    } else if (
      lowerMessage.includes('help') ||
      lowerMessage.includes('what can you do')
    ) {
      return await this.handleHelpRequest();
    } else {
      return await this.handleGeneralQuery(message);
    }
  }

  /**
   * Handle search requests
   */
  private async handleSearchRequest(message: string): Promise<ChatResponse> {
    try {
      // Extract search criteria from message using AI or simple parsing
      let searchCriteria = await this.extractSearchCriteria(message);

      // Fallback to simple parsing if AI is not available
      if (!searchCriteria && !OPENAI_API_KEY) {
        searchCriteria = this.simpleCriteriaExtraction(message);
      }

      if (searchCriteria) {
        // Update auction agent criteria
        this.auctionAgent.updateSearchCriteria(searchCriteria);
        this.context.currentSearchCriteria = searchCriteria as SearchCriteria;

        // Perform search
        console.log('🔍 Searching for vehicles...');
        const vehicles = await this.auctionAgent.scrapeVehicles();
        const filteredVehicles =
          await this.auctionAgent.filterVehicles(vehicles);

        if (filteredVehicles.length === 0) {
          return {
            content:
              "I couldn't find any vehicles matching your criteria. Would you like to adjust your search parameters?",
            metadata: {
              searchCriteria: searchCriteria as SearchCriteria,
              vehicles: [],
            },
          };
        }

        // Analyze vehicles
        console.log('🧠 Analyzing vehicles...');
        const analyses =
          await this.auctionAgent.analyzeVehicles(filteredVehicles);

        this.context.lastSearchResults = analyses;

        // Generate summary
        const summary = this.generateSearchSummary(analyses);

        return {
          content: summary,
          metadata: {
            searchCriteria: searchCriteria as SearchCriteria,
            vehicles: analyses,
          },
        };
      } else {
        return {
          content:
            "I'd be happy to help you search for cars! Could you tell me more about what you're looking for? For example: 'Find me a Honda Civic under $20,000' or 'Search for BMWs from 2018-2022'.",
        };
      }
    } catch (error) {
      logger.error({ err: error }, 'Error in search request');
      return {
        content:
          'I encountered an error while searching. Let me try again or you can refine your search criteria.',
      };
    }
  }

  /**
   * Handle comparison requests
   */
  private handleComparisonRequest(message: string): ChatResponse {
    if (this.context.lastSearchResults.length < 2) {
      return {
        content:
          "I need at least 2 vehicles to compare. Please search for some vehicles first, or let me know which specific vehicles you'd like to compare.",
      };
    }

    try {
      // Extract vehicle identifiers from message
      const vehicleIds = this.extractVehicleIds(message);
      const vehiclesToCompare =
        vehicleIds.length > 0
          ? this.context.lastSearchResults.filter((v) =>
              vehicleIds.includes(v.vehicle.id),
            )
          : this.context.lastSearchResults.slice(0, 2);

      if (vehiclesToCompare.length < 2) {
        return {
          content:
            "I couldn't find the specific vehicles you mentioned. Here's a comparison of the top 2 vehicles from your last search:",
          metadata: { vehicles: this.context.lastSearchResults.slice(0, 2) },
        };
      }

      const comparison = this.generateVehicleComparison(vehiclesToCompare);

      return {
        content: comparison,
        metadata: { vehicles: vehiclesToCompare, action: 'comparison' },
      };
    } catch (error) {
      logger.error({ err: error }, 'Error in comparison request');
      return {
        content:
          'I had trouble comparing those vehicles. Let me show you the top vehicles from your last search instead.',
      };
    }
  }

  /**
   * Handle budget-related requests
   */
  private handleBudgetRequest(message: string): ChatResponse {
    // Extract budget from message
    const budgetMatch = message.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const budget = budgetMatch
      ? parseFloat(budgetMatch[1].replace(/,/g, ''))
      : null;

    if (budget) {
      this.context.userPreferences.budget = budget;

      // Update search criteria if we have current criteria
      if (this.context.currentSearchCriteria) {
        this.context.currentSearchCriteria.maxPrice = budget;
        this.auctionAgent.updateSearchCriteria(
          this.context.currentSearchCriteria,
        );
      }

      return {
        content: `Got it! I've set your budget to $${budget.toLocaleString()}. I'll make sure to only show you vehicles within this price range. Would you like me to search for vehicles now?`,
        metadata: { budget, action: 'budget_update' },
      };
    } else {
      return {
        content:
          "I'd be happy to help with your budget! Please tell me your maximum budget, for example: 'My budget is $25,000' or 'I can spend up to $30,000'.",
      };
    }
  }

  /**
   * Handle recommendation requests
   */
  private handleRecommendationRequest(_message: string): ChatResponse {
    if (this.context.lastSearchResults.length === 0) {
      return {
        content:
          "I'd be happy to give you recommendations! First, let me search for some vehicles based on your preferences. What kind of car are you looking for?",
      };
    }

    // Find best recommendations from last search
    const recommendations = this.context.lastSearchResults
      .filter((a) => a.recommendation === 'buy')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (recommendations.length === 0) {
      return {
        content:
          "Based on my analysis, I don't have any strong buy recommendations from your last search. The vehicles I found either have high risk factors or aren't great deals. Would you like me to search with different criteria?",
      };
    }

    const recommendationText = this.generateRecommendationText(recommendations);

    return {
      content: recommendationText,
      metadata: { vehicles: recommendations, action: 'recommendation' },
    };
  }

  /**
   * Handle show/display requests
   */
  private handleShowRequest(_message: string): ChatResponse {
    if (this.context.lastSearchResults.length === 0) {
      return {
        content:
          "I don't have any search results to show yet. Let me search for some vehicles first! What kind of car are you looking for?",
      };
    }

    const showText = this.generateShowText(this.context.lastSearchResults);

    return {
      content: showText,
      metadata: { vehicles: this.context.lastSearchResults, action: 'show' },
    };
  }

  /**
   * Handle help requests
   */
  private handleHelpRequest(): ChatResponse {
    const helpText = `Here's what I can help you with:

🔍 **Searching for cars**: "Find me a Honda Civic under $20,000" or "Search for BMWs from 2018-2022"

💰 **Setting budget**: "My budget is $25,000" or "I can spend up to $30,000"

📊 **Comparing vehicles**: "Compare these cars" or "Show me the differences between vehicle A and B"

💡 **Getting recommendations**: "What do you recommend?" or "Which car should I buy?"

📋 **Viewing results**: "Show me the results" or "List all vehicles"

🎯 **Specific criteria**: You can specify makes, models, years, mileage, price, location, and more!

Just tell me what you're looking for in natural language, and I'll help you find the perfect car!`;

    return { content: helpText, metadata: { action: 'help' } };
  }

  /**
   * Handle general queries using AI or fallback
   */
  private async handleGeneralQuery(message: string): Promise<ChatResponse> {
    if (OPENAI_API_KEY) {
      try {
        const response = await this.callAI(message);
        return { content: response };
      } catch (error) {
        logger.error({ err: error }, 'Error in AI query');
      }
    }

    // Fallback response without AI
    return {
      content:
        "I'm not sure how to help with that. Could you be more specific? For example, you can ask me to search for cars, compare vehicles, or give recommendations. You can also try: 'Find me a Honda under $20,000' or 'Show me the results'.",
    };
  }

  /**
   * Simple criteria extraction without AI
   */
  private simpleCriteriaExtraction(
    message: string,
  ): Partial<SearchCriteria> | null {
    const criteria: Partial<SearchCriteria> = {};
    const lowerMessage = message.toLowerCase();

    // Extract budget/price
    const priceMatch = lowerMessage.match(
      /(?:under|below|less than|max|budget).*?\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/,
    );
    if (priceMatch) {
      criteria.maxPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    }

    // Extract makes
    const makes = [
      'honda',
      'toyota',
      'ford',
      'bmw',
      'mercedes',
      'audi',
      'nissan',
      'hyundai',
      'kia',
      'mazda',
      'subaru',
      'volkswagen',
    ];
    const foundMakes = makes.filter((make) => lowerMessage.includes(make));
    if (foundMakes.length > 0) {
      criteria.makes = foundMakes.map(
        (make) => make.charAt(0).toUpperCase() + make.slice(1),
      );
    }

    // Extract models
    const models = [
      'civic',
      'camry',
      'accord',
      'corolla',
      'f-150',
      'silverado',
      'ram',
      'pilot',
      'highlander',
      'rav4',
      'cr-v',
      'explorer',
    ];
    const foundModels = models.filter((model) => lowerMessage.includes(model));
    if (foundModels.length > 0) {
      criteria.models = foundModels.map(
        (model) => model.charAt(0).toUpperCase() + model.slice(1),
      );
    }

    // Extract year range
    const yearMatch = lowerMessage.match(/(\d{4})[-\s]*(\d{4})?/);
    if (yearMatch) {
      const startYear = parseInt(yearMatch[1]);
      const endYear = yearMatch[2] ? parseInt(yearMatch[2]) : startYear;
      criteria.yearRange = { min: startYear, max: endYear };
    }

    // Extract mileage
    const mileageMatch = lowerMessage.match(
      /(\d+(?:,\d{3})*)\s*(?:k|thousand|miles?)/,
    );
    if (mileageMatch) {
      criteria.maxMileage = parseInt(mileageMatch[1].replace(/,/g, '')) * 1000;
    }

    // Extract location
    if (
      lowerMessage.includes('bay area') ||
      lowerMessage.includes('california') ||
      lowerMessage.includes('ca')
    ) {
      criteria.locations = ['San Francisco', 'Oakland', 'San Jose'];
    }

    return Object.keys(criteria).length > 0 ? criteria : null;
  }

  /**
   * Extract search criteria from natural language
   */
  private async extractSearchCriteria(
    message: string,
  ): Promise<Partial<SearchCriteria> | null> {
    try {
      const prompt = `Extract car search criteria from this message: "${message}"

Return a JSON object with these fields (use null for unspecified):
- makes: array of car makes (e.g., ["Honda", "Toyota"])
- models: array of specific models (e.g., ["Civic", "Camry"])
- yearRange: {min: number, max: number}
- maxMileage: number
- maxPrice: number
- locations: array of locations
- keywords: array of keywords

Examples:
"Find me a Honda Civic under $20,000" -> {"makes":["Honda"],"models":["Civic"],"maxPrice":20000}
"Search for BMWs from 2018-2022" -> {"makes":["BMW"],"yearRange":{"min":2018,"max":2022}}
"Toyota or Honda under 50k miles" -> {"makes":["Toyota","Honda"],"maxMileage":50000}`;

      const response = await this.callAI(prompt);

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      logger.error({ err: error }, 'Error extracting search criteria');
      return null;
    }
  }

  /**
   * Call AI API
   */
  private async callAI(message: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      return 'I need an OpenAI API key to provide AI-powered responses. Please set OPENAI_API_KEY in your environment.';
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful car auction assistant. Provide concise, helpful responses about car auctions and vehicle selection.',
      },
      ...this.context.messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    const response = await fetch(`${IDKHUB_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.IDK_MODEL || 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  }

  /**
   * Add message to conversation history
   */
  private addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: {
      vehicles?: AuctionAnalysis[];
      searchCriteria?: SearchCriteria;
      action?: string;
      budget?: number;
    },
  ): void {
    this.context.messages.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });

    // Trim conversation history if too long
    if (this.context.messages.length > this.config.maxConversationHistory) {
      this.context.messages = this.context.messages.slice(
        -this.config.maxConversationHistory,
      );
    }
  }

  /**
   * Generate search summary
   */
  private generateSearchSummary(analyses: AuctionAnalysis[]): string {
    const total = analyses.length;
    const buyRecommendations = analyses.filter(
      (a) => a.recommendation === 'buy',
    ).length;
    const avgScore = analyses.reduce((sum, a) => sum + a.score, 0) / total;
    const avgPrice =
      analyses.reduce((sum, a) => sum + a.vehicle.currentBid, 0) / total;

    let summary = `I found ${total} vehicles matching your criteria:\n\n`;

    if (buyRecommendations > 0) {
      summary += `🎯 **${buyRecommendations} strong buy recommendations** (score > 70)\n`;
    }

    summary += `📊 Average opportunity score: ${avgScore.toFixed(1)}/100\n`;
    summary += `💰 Average current bid: $${avgPrice.toLocaleString()}\n\n`;

    // Show top 3 vehicles
    const topVehicles = analyses.sort((a, b) => b.score - a.score).slice(0, 3);

    summary += `🏆 **Top Opportunities:**\n`;
    topVehicles.forEach((analysis, index) => {
      const v = analysis.vehicle;
      summary += `${index + 1}. **${v.year} ${v.make} ${v.model}** - $${v.currentBid.toLocaleString()}\n`;
      summary += `   Score: ${analysis.score}/100 | ${analysis.recommendation.toUpperCase()}\n`;
      summary += `   ${v.mileage.toLocaleString()} miles | ${v.location}\n\n`;
    });

    summary += `\n💡 You can ask me to:\n`;
    summary += `• Compare specific vehicles\n`;
    summary += `• Get detailed recommendations\n`;
    summary += `• Adjust your search criteria\n`;
    summary += `• Show more details about any vehicle`;

    return summary;
  }

  /**
   * Generate vehicle comparison
   */
  private generateVehicleComparison(vehicles: AuctionAnalysis[]): string {
    let comparison = `📊 **Vehicle Comparison**\n\n`;

    vehicles.forEach((analysis, index) => {
      const v = analysis.vehicle;
      comparison += `**${index + 1}. ${v.year} ${v.make} ${v.model}**\n`;
      comparison += `💰 Price: $${v.currentBid.toLocaleString()}\n`;
      comparison += `📏 Mileage: ${v.mileage.toLocaleString()} miles\n`;
      comparison += `📍 Location: ${v.location}\n`;
      comparison += `🎯 Score: ${analysis.score}/100 (${analysis.recommendation})\n`;
      comparison += `⚠️ Risk: ${analysis.riskAssessment.level}\n`;
      comparison += `💭 Analysis: ${analysis.reasoning}\n\n`;
    });

    // Add recommendation
    const bestVehicle = vehicles.reduce((best, current) =>
      current.score > best.score ? current : best,
    );

    comparison += `🏆 **My Recommendation:**\n`;
    comparison += `The **${bestVehicle.vehicle.year} ${bestVehicle.vehicle.make} ${bestVehicle.vehicle.model}** `;
    comparison += `offers the best value with a score of ${bestVehicle.score}/100. `;
    comparison += `${bestVehicle.reasoning}`;

    return comparison;
  }

  /**
   * Generate recommendation text
   */
  private generateRecommendationText(
    recommendations: AuctionAnalysis[],
  ): string {
    let text = `💡 **My Top Recommendations:**\n\n`;

    recommendations.forEach((rec, index) => {
      const v = rec.vehicle;
      text += `**${index + 1}. ${v.year} ${v.make} ${v.model}** - Score: ${rec.score}/100\n`;
      text += `💰 Current Bid: $${v.currentBid.toLocaleString()}\n`;
      text += `📏 Mileage: ${v.mileage.toLocaleString()} miles\n`;
      text += `📍 Location: ${v.location}\n`;
      text += `💭 Why I recommend it: ${rec.reasoning}\n\n`;
    });

    text += `🎯 **My Advice:**\n`;
    text += `These vehicles offer the best combination of value, condition, and market opportunity. `;
    text += `Consider your budget and risk tolerance when making your final decision.`;

    return text;
  }

  /**
   * Generate show text
   */
  private generateShowText(vehicles: AuctionAnalysis[]): string {
    let text = `📋 **All Search Results (${vehicles.length} vehicles):**\n\n`;

    vehicles.forEach((analysis, index) => {
      const v = analysis.vehicle;
      text += `**${index + 1}. ${v.year} ${v.make} ${v.model}**\n`;
      text += `💰 $${v.currentBid.toLocaleString()} | 📏 ${v.mileage.toLocaleString()} miles\n`;
      text += `🎯 ${analysis.score}/100 | ${analysis.recommendation.toUpperCase()}\n`;
      text += `📍 ${v.location} | ⚠️ ${analysis.riskAssessment.level} risk\n\n`;
    });

    return text;
  }

  /**
   * Extract vehicle IDs from message
   */
  private extractVehicleIds(message: string): string[] {
    // Simple extraction - look for numbers that might be vehicle indices
    const matches = message.match(/\b(\d+)\b/g);
    return matches ? matches.map((m) => m) : [];
  }
}

// Main execution
async function main() {
  try {
    const chatAgent = new ChatAuctionAgent();
    await chatAgent.startChat();
  } catch (error) {
    console.error('Error starting chat agent:', error);
    process.exit(1);
  }
}

// Run if called directly
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes('chat-agent')
) {
  main();
}

export { ChatAuctionAgent };
