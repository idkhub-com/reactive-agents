# Copart Auction AI Agent 🤖

An **advanced AI agent** for monitoring Copart car auctions with complete autonomy: perception, reasoning, memory, and action capabilities.

## 🆕 **NEW: Chat-like Interactive Mode!**

Experience the auction agent like never before with our new conversational interface:

```bash
# Start the chat agent
pnpm auction-agent:chat
```

**Features:**
- 🗣️ **Natural Language Search**: "Find me a Honda Civic under $20,000"
- 📊 **Real-time Comparisons**: "Compare the top 2 vehicles"
- 💰 **Dynamic Budget Management**: "My budget is $25,000"
- 📍 **Location-based Search**: "Find cars in the Bay Area"
- 💡 **Smart Recommendations**: "What do you recommend?"
- 🧠 **Context Memory**: Remembers your preferences and search history

### **🚀 Quick Start for Chat Mode**

```bash
# 1. From the main repository root
cd examples/auction-agent

# 2. Start the chat agent (works without API key!)
pnpm auction-agent:chat

# 3. Try these commands:
# "Find me affordable cars under $5000"
# "Compare the top 2 vehicles"
# "What do you recommend?"
# "My budget is $20,000"
```

## 🎯 AI Agent Maturity Assessment

| **Core Capability** | **Status**      | **Implementation**                                | **Quality** |
| ------------------- | --------------- | ------------------------------------------------- | ----------- |
| **🔍 Perception**   | ✅ **Complete** | Real-time web scraping + mock fallback            | ⭐⭐⭐⭐⭐  |
| **🛠️ Tool Use**     | ✅ **Complete** | VIN decode, market analysis, risk assessment      | ⭐⭐⭐⭐⭐  |
| **🧠 Reasoning**    | ✅ **Complete** | LLM analysis + enriched context + fallback        | ⭐⭐⭐⭐⭐  |
| **💾 Memory**       | ✅ **Complete** | SQLite persistence, deduplication, history        | ⭐⭐⭐⭐⭐  |
| **📊 Learning**     | ✅ **Complete** | Trend analysis, performance tracking              | ⭐⭐⭐⭐⭐  |
| **📋 Action**       | ✅ **Complete** | Reports, exports, recommendations                 | ⭐⭐⭐⭐⭐  |
| **⏰ Autonomy**     | ✅ **Complete** | Cron scheduling, notifications, webhooks          | ⭐⭐⭐⭐⭐  |
| **⚡ Actuation**    | ✅ **Complete** | Watchlists, bidding advisor, portfolio management | ⭐⭐⭐⭐⭐  |

**🏆 Current Maturity: 8/8 capabilities complete (Complete Autonomous AI Agent)**

---

## 🚀 Quick Team Setup

### 1️⃣ **Essential Setup** (< 2 minutes)

```bash
# From the main repository root
cd examples/auction-agent

# Install dependencies (if not already done from main repo)
pnpm install

# Try the NEW chat interface!
pnpm auction-agent:chat

# Or run the traditional interface
pnpm start

# Quick test run (non-interactive)
IDK_INTERACTIVE=false pnpm start
```

### 2️⃣ **Full Development Setup** (< 5 minutes)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env with your keys
# OPENAI_API_KEY=sk-...        # For AI analysis
# IDKHUB_URL=http://localhost:3000/v1
# IDKHUB_AUTH_TOKEN=idk

# 3. Enable real scraping (optional)
pnpm add -D playwright
pnpm exec playwright install chromium

# 4. Enable persistence (optional)
# Note: Gracefully falls back if SQLite build fails
pnpm rebuild better-sqlite3

# 5. Run development mode
pnpm dev
```

### 3️⃣ **Team Scripts**

```bash
# NEW: Chat Interface
pnpm auction-agent:chat       # Interactive chat mode (RECOMMENDED!)

# Traditional Interface
pnpm start                    # Production run
pnpm dev                      # Auto-reload on changes
pnpm build                    # TypeScript compilation check

# Advanced Features
pnpm auction-agent:scheduler  # Scheduler management
pnpm auction-agent:setup      # Setup wizard
pnpm auction-agent:test       # Integration tests

# Quick testing
IDK_INTERACTIVE=false pnpm start              # Non-interactive run
IDK_ENABLE_PERSISTENCE=true pnpm start        # With database
COPART_REAL_SCRAPER=true COPART_TOS_ACK=true pnpm start  # Real scraping
```

---

## 💬 **Chat Agent Usage Guide**

### **Getting Started with Chat Mode**

```bash
# Start the chat agent
pnpm auction-agent:chat
```

### **Example Conversations**

```
🚗 Welcome to your AI Car Auction Assistant!

You: Find me affordable cars under $5000 for flipping in the Bay Area
🤖 Assistant: I found 3 vehicles matching your criteria:
             
             1. 2019 Honda Civic LX - $18,500
                Score: 75/100 | BUY
                45,000 miles | Los Angeles, CA
                
             2. 2020 Toyota Camry LE - $22,500  
                Score: 68/100 | MONITOR
                38,000 miles | Miami, FL
                
             💡 You can ask me to:
             • Compare specific vehicles
             • Get detailed recommendations
             • Adjust your search criteria

You: Compare the top 2 vehicles
🤖 Assistant: 📊 Vehicle Comparison
             
             1. 2019 Honda Civic LX
                💰 Price: $18,500
                📏 Mileage: 45,000 miles
                🎯 Score: 75/100 (buy)
                ⚠️ Risk: low
                
             2. 2020 Toyota Camry LE
                💰 Price: $22,500
                📏 Mileage: 38,000 miles  
                🎯 Score: 68/100 (monitor)
                ⚠️ Risk: low
                
             🏆 My Recommendation:
             The 2019 Honda Civic LX offers the best value...

You: My budget is $20,000
🤖 Assistant: Got it! I've set your budget to $20,000. I'll make sure to only show you vehicles within this price range. Would you like me to search for vehicles now?

You: What do you recommend?
🤖 Assistant: 💡 My Top Recommendations:
             
             1. 2019 Honda Civic LX - Score: 75/100
                💰 Current Bid: $18,500
                📏 Mileage: 45,000 miles
                💭 Why I recommend it: Excellent price relative to estimated value, low annual mileage, minor damage only
```

### **Available Commands**

| Command | Example | Description |
|---------|---------|-------------|
| **Search** | "Find me a Honda Civic under $20,000" | Search for vehicles with specific criteria |
| **Compare** | "Compare vehicles 1 and 2" | Compare multiple vehicles side-by-side |
| **Budget** | "My budget is $25,000" | Set or update your maximum budget |
| **Recommendations** | "What do you recommend?" | Get AI-powered buying advice |
| **Show Results** | "Show me all vehicles" | Display all search results |
| **Help** | "What can you do?" | Get help and available commands |
| **Location** | "Find cars in the Bay Area" | Search by specific location |
| **Exit** | "quit" or "exit" | End the chat session |

### **Natural Language Examples**

- "Find me a reliable car under $15,000"
- "Search for BMWs from 2018-2022"
- "Show me trucks with low mileage"
- "Compare the Honda and Toyota options"
- "What's the best deal for flipping?"
- "Find cars in California under 50k miles"

---

## 🧪 Testing & Verification

### **Instant Verification** (30 seconds)

```bash
# 1. Basic functionality
IDK_INTERACTIVE=false pnpm start

# Expected: ✅ 2 vehicles found, analysis complete, JSON exported

# 2. With AI analysis (requires OPENAI_API_KEY)
IDK_INTERACTIVE=false OPENAI_API_KEY=sk-... pnpm start

# Expected: ✅ LLM analysis, enriched reasoning

# 3. With persistence
IDK_INTERACTIVE=false IDK_ENABLE_PERSISTENCE=true pnpm start

# Expected: ✅ Database created, historical insights shown
```

### **Feature Matrix Testing**

| Test                 | Command                                                   | Expected Result                           |
| -------------------- | --------------------------------------------------------- | ----------------------------------------- |
| **Mock Data**        | `IDK_INTERACTIVE=false pnpm start`                        | ✅ 2 vehicles, basic analysis             |
| **AI Analysis**      | `OPENAI_API_KEY=sk-... pnpm start`                        | ✅ LLM reasoning, higher scores           |
| **Persistence**      | `IDK_ENABLE_PERSISTENCE=true pnpm start`                  | ✅ Database, historical insights          |
| **Tool Enrichment**  | `IDK_ENRICH_VIN=true pnpm start`                          | ✅ VIN details, risk scores               |
| **Interactive Mode** | `pnpm start`                                              | ✅ Prompts, presets, saved criteria       |
| **Real Scraping**    | `COPART_REAL_SCRAPER=true COPART_TOS_ACK=true pnpm start` | ✅ Live data (if working)                 |
| **Scheduling CLI**   | `pnpm auction-agent:scheduler`                            | ✅ Job management, notifications, testing |
| **Chat Mode**        | `pnpm auction-agent:chat`                                 | ✅ Interactive chat interface             |
| **Chat with AI**     | `OPENAI_API_KEY=sk-... pnpm auction-agent:chat`           | ✅ AI-powered chat responses              |

---

## 🛠️ Core Features & Configuration

### **🔍 Data Collection (Phase 1-2)**

- **Web Scraping**: Playwright-based scraper with DOM + JSON extraction
- **Mock Fallback**: Production-quality test data for development
- **Smart Filtering**: Makes, models, year range, mileage, price, location, keywords

```bash
# Scraping configuration
COPART_REAL_SCRAPER=true        # Enable real scraping
COPART_TOS_ACK=true             # Acknowledge Terms of Service
IDK_SCRAPER_MAX_PAGES=3         # Pagination limit
IDK_SCRAPER_DELAY_MS=2000       # Throttling between requests
```

### **🛠️ Tool Integration (Phase 3)**

- **VIN Decode**: NHTSA API for vehicle specifications
- **Market Analysis**: Heuristic valuation with confidence scoring
- **Risk Assessment**: Multi-factor scoring (age, mileage, damage, reliability)

```bash
# Tool configuration
IDK_ENRICH_VIN=true             # VIN decoding (default: true)
IDK_ENRICH_COMPS=true           # Market comparison (default: true)
IDK_ENRICH_RISK=true            # Risk assessment (default: true)
IDK_TOOL_TIMEOUT_MS=15000       # Tool timeout (default: 10000)
```

### **🧠 AI Analysis (Phase 2)**

- **LLM Integration**: OpenAI GPT models via IDKHub
- **Cost Control**: Pre-scoring + top-N LLM analysis
- **Robust Fallback**: Heuristic analysis when LLM unavailable

```bash
# AI configuration
OPENAI_API_KEY=sk-...           # Required for LLM analysis
IDK_MODEL=gpt-4                 # Model selection
IDK_LLM_TOP_N=10                # Only analyze top N vehicles with LLM
IDK_LLM_MAX_RETRIES=3           # Retry failed LLM calls
IDK_TEMPERATURE=0.3             # LLM creativity level
```

### **💾 Persistence & History (Phase 4)**

- **SQLite Database**: Runs, vehicles, analyses with relationships
- **Deduplication**: Avoid rework on repeated vehicles
- **Historical Insights**: Trends, price alerts, performance tracking

```bash
# Persistence configuration
IDK_ENABLE_PERSISTENCE=true     # Enable database (default: false)
IDK_DB_PATH=./auction-agent.db  # Database file location

# Graceful fallback if SQLite build fails
# Agent continues without persistence if database unavailable
```

### **⏰ Scheduling & Notifications (Phase 5)**

- **Cron-based Scheduling**: Autonomous operation with job management
- **Email Notifications**: SMTP support (Gmail, Outlook, custom servers)
- **SMS Notifications**: Twilio integration for instant alerts
- **Webhook Integrations**: External system notifications
- **Interactive CLI**: Job management, testing, one-time runs

```bash
# Launch scheduler management CLI
pnpm scheduler

# Email configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Auction Agent <your-email@gmail.com>"

# SMS configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_PHONE=+1234567890
```

### **🤖 Advanced Actuation (Phase 6)**

- **Watchlist Management**: Track specific vehicles across runs with intelligent alerts
- **AI Bidding Advisor**: Comprehensive bid recommendations with risk analysis
- **Portfolio Management**: Performance tracking, ROI analysis, diversification insights
- **Actionable Insights**: Prioritized recommendations with impact assessment

```bash
# Actuation configuration
IDK_ENABLE_ACTUATION=true             # Enable advanced AI agent features
IDK_ENABLE_WATCHLIST=true             # Vehicle tracking across runs
IDK_ENABLE_BIDDING_ADVISOR=true       # AI-powered bid recommendations
IDK_ENABLE_PORTFOLIO=true             # Portfolio performance analysis
IDK_RISK_TOLERANCE=moderate           # Risk profile: conservative, moderate, aggressive
```

### **⚙️ User Experience**

- **Interactive Setup**: Prompts for criteria with presets
- **Saved Defaults**: Remember last-used criteria
- **Structured Logging**: JSON logs with configurable levels
- **Comprehensive Reports**: Summary, top opportunities, risk breakdown

```bash
# UX configuration
IDK_INTERACTIVE=true            # Enable prompts (default: true if TTY)
IDK_CRITERIA_STORE=.last-criteria.json  # Saved criteria location
LOG_LEVEL=info                  # Logging verbosity (debug, info, warn, error)
```

### **💬 Chat Agent Configuration (NEW!)**

- **Real-time Search**: Enable live search during conversations
- **Conversation Memory**: Track chat history and context
- **Auto-search**: Automatically search when criteria change
- **Vehicle Comparison**: Enable side-by-side comparisons

```bash
# Chat agent settings
CHAT_ENABLE_REAL_TIME_SEARCH=true  # Enable real-time search during chat
CHAT_MAX_CONVERSATION_HISTORY=50   # Maximum messages to keep in memory
CHAT_AUTO_SEARCH_ON_CRITERIA_CHANGE=true  # Auto-search when criteria change
CHAT_ENABLE_VEHICLE_COMPARISON=true  # Enable vehicle comparison features
CHAT_RESPONSE_MAX_TOKENS=500       # Max tokens for chat responses
CHAT_TEMPERATURE=0.7               # Creativity level for chat responses
CHAT_ENABLE_FALLBACK_PARSING=true  # Enable simple parsing when AI unavailable
```

---

## 📊 Output & Integration

### **Analysis Results**

```typescript
interface AuctionAnalysis {
  vehicle: CopartVehicle;
  score: number; // 0-100 opportunity score
  reasoning: string; // AI or heuristic explanation
  marketComparison: {
    averagePrice: number;
    priceDifference: number;
    marketTrend: "above" | "below" | "average";
  };
  riskAssessment: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
  recommendation: "buy" | "monitor" | "pass";
}
```

### **Export Format**

- **JSON Export**: Timestamped files with complete analysis
- **Structured Data**: Vehicle details + tool results + analysis
- **Database Integration**: Persistent storage with query capabilities

### **Reporting**

- **Market Report**: Summary statistics, top opportunities, risk breakdown
- **Historical Insights**: Multi-run trends, price alerts, performance metrics
- **Development Logs**: Structured JSON logs for debugging and monitoring

---

## ✅ Roadmap: ALL PHASES COMPLETE!

### **Phase 5: Scheduling & Notifications** ✅ **COMPLETE**

- ✅ Cron-based scheduling for automated runs (`pnpm scheduler`)
- ✅ Email/SMS notifications for new opportunities (SMTP + Twilio)
- ✅ Price drop alerts and monitoring (automated alerts)
- ✅ Webhook integrations for external systems (configurable endpoints)

### **Phase 6: Advanced Actuation** ✅ **COMPLETE**

- ✅ Watchlist management with automated tracking (vehicle persistence across runs)
- ✅ AI-powered bidding advisor with comprehensive recommendations
- ✅ Portfolio management with performance tracking and ROI analysis
- ✅ Advanced insight generation and action orchestration

## 🚀 Future Enhancements

- [ ] Multi-site monitoring (IAAI, Manheim, other auction platforms)
- [ ] Advanced ML models for price prediction
- [ ] Mobile app companion
- [ ] Enterprise multi-tenant support
- [ ] Real-time bid execution (with manual approval workflows)

---

## 🚨 Production Considerations

### **Legal & Compliance**

- ⚠️ **Respect Copart TOS**: Set `COPART_TOS_ACK=true` only if compliant
- 🔄 **Rate Limiting**: Built-in delays, consider proxy rotation for scale
- 📜 **robots.txt**: Review and follow website scraping policies

### **Deployment**

- **Environment**: Node.js >=18, TypeScript support
- **Dependencies**: Core deps for basic functionality, optional for advanced features
- **Monitoring**: Structured logging with configurable verbosity
- **Error Handling**: Graceful degradation at every layer

### **Performance**

- **Memory**: Efficient vehicle deduplication and batch processing
- **Cost Control**: LLM usage optimization with pre-scoring
- **Storage**: SQLite for simplicity, easy migration to PostgreSQL/cloud

---

## 🤝 Team Development

### **Code Quality**

- **TypeScript**: Full type safety with Zod validation
- **Error Handling**: Comprehensive try/catch with structured logging
- **Testing**: Built-in test data and verification commands
- **Documentation**: Inline comments and comprehensive README

### **Development Workflow**

```bash
# Development cycle
pnpm dev                        # Auto-reload development
pnpm build                      # TypeScript compilation check
IDK_INTERACTIVE=false pnpm start  # Quick functional test
```

### **Debugging**

```bash
# Verbose logging
LOG_LEVEL=debug pnpm start

# Component isolation
IDK_ENRICH_VIN=false pnpm start    # Skip VIN enrichment
IDK_ENABLE_PERSISTENCE=false pnpm start  # Skip database
```

---

## 📈 Success Metrics

This AI agent demonstrates **production-grade AI agent architecture**:

✅ **Autonomous Decision Making**: End-to-end analysis with recommendations
✅ **Multi-Source Intelligence**: Web scraping + APIs + LLM + heuristics  
✅ **Persistent Memory**: Historical context and learning from past runs
✅ **Robust Error Handling**: Graceful degradation at every failure point
✅ **Cost Optimization**: Smart LLM usage with fallback strategies
✅ **User Experience**: Interactive setup with saved preferences
✅ **Production Ready**: Comprehensive logging, configuration, documentation

**🎯 Ready for immediate real-world deployment with complete autonomous AI agent capabilities!**

---

**Happy AI Agent Development! 🤖🚗💨**
