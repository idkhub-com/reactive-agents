# 🤖 Copart Auction AI Agent

A **production-ready autonomous AI agent** for monitoring Copart car auctions with complete AI agent capabilities.

## 🚀 Quick Start

```bash
# Navigate to the auction agent
cd examples/auction-agent

# Start the interactive chat agent (works without API key!)
pnpm auction-agent:chat

# Or run traditional analysis
pnpm auction-agent
```

## ✨ Key Features

- 🗣️ **Natural Language Search**: "Find me a Honda Civic under $20,000"
- 📊 **Real-time Comparisons**: Compare multiple vehicles side-by-side
- 🧠 **AI Analysis**: LLM-powered recommendations with fallback heuristics
- 💾 **Persistent Memory**: SQLite database with historical tracking
- ⏰ **Scheduling**: Automated monitoring with email/SMS notifications
- 🤖 **Complete Autonomy**: 8/8 core AI agent capabilities

## 🎯 AI Agent Capabilities

| **Core Capability** | **Status**      | **Implementation**                                |
| ------------------- | --------------- | ------------------------------------------------- |
| **🔍 Perception**   | ✅ **Complete** | Real-time web scraping + mock fallback            |
| **🛠️ Tool Use**     | ✅ **Complete** | VIN decode, market analysis, risk assessment      |
| **🧠 Reasoning**    | ✅ **Complete** | LLM analysis + enriched context + fallback        |
| **💾 Memory**       | ✅ **Complete** | SQLite persistence, deduplication, history        |
| **📊 Learning**     | ✅ **Complete** | Trend analysis, performance tracking              |
| **📋 Action**       | ✅ **Complete** | Reports, exports, recommendations                 |
| **⏰ Autonomy**     | ✅ **Complete** | Cron scheduling, notifications, webhooks          |
| **⚡ Actuation**    | ✅ **Complete** | Watchlists, bidding advisor, portfolio management |

## 🏗️ Architecture

The auction agent is built with a modular, production-ready architecture:

- **🤖 Core Agent**: Main orchestrator with AI reasoning
- **🌐 Web Scraper**: Real-time Copart data extraction
- **🛠️ Tools**: VIN decoding, market analysis, risk assessment
- **💾 Storage**: SQLite database with full persistence
- **⏰ Scheduler**: Automated monitoring and notifications
- **💬 Chat Interface**: Natural language interaction

## 📚 Documentation

For complete documentation, see [`examples/auction-agent/README.md`](examples/auction-agent/README.md).

## 🛠️ Tech Stack

- **TypeScript**: Strict type checking and modern JavaScript
- **Node.js**: Runtime environment
- **SQLite**: Lightweight database
- **OpenAI**: AI analysis capabilities
- **Playwright**: Web scraping
- **Biome**: Code quality and formatting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm package manager

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd idkhub

# Navigate to auction agent
cd examples/auction-agent

# Install dependencies
pnpm install

# Start the chat agent
pnpm auction-agent:chat
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Made with ❤️ by the Auction Agent team</b>
</p>