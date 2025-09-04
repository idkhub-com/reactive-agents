# 🚀 IDK

> A platform for training and deploying LLMs.

---

<p align="center">
  <img src="./.github/assets/supabase.svg" alt="Supabase Logo" title="Supabase" height="40"/>
  <span style="font-size:2rem;vertical-align:middle;">&nbsp; + &nbsp;</span>
  <img src="./.github/assets/biome.svg" alt="Biome Logo" title="Biome" height="40"/>
</p>
<p align="center"><em>Powered by Supabase &amp; Biome</em></p>

<p align="center">
  <a href="https://supabase.com/"> <img src="https://img.shields.io/badge/Powered%20by-Supabase-3ECF8E?logo=supabase&logoColor=white" alt="Supabase Badge"/> </a>

  <a href="https://biomejs.dev/"> <img src="https://img.shields.io/badge/Code%20Style-Biome-1B1F23?logo=biome&logoColor=white" alt="Biome Badge"/> </a>

  <a href="https://pnpm.io/"> <img src="https://img.shields.io/badge/Package%20Manager-pnpm-F69220?logo=pnpm&logoColor=white" alt="pnpm Badge"/> </a>

</p>

---

## 🛠️ Tech Stack

- **[Biome](https://biomejs.dev/)** &nbsp;:art: — Code formatting and linting
- **[Supabase](https://supabase.com/)** &nbsp;:elephant: — Backend database & authentication
- **pnpm** &nbsp;:package: — Fast, disk space efficient package manager

---

## 🚦 Getting Started

### 1️⃣ Install Supabase CLI
- Follow the [Supabase CLI Installation Guide](https://supabase.com/docs/guides/cli) for your platform.

### 2️⃣ Start Supabase
```sh
supabase start
```

### 3️⃣ Install Dependencies
```sh
pnpm install
```

### 4️⃣ Start the Development Server
```sh
pnpm dev
```

### 5️⃣ Run Examples
Run any of the examples in the `examples` directory with the following command:

```sh
pnpm tsx ./path/to/example.ts
```
---

## 🔑 Default Password

```
idk
```

---

## 📝 AI Providers Status

### Chat Completion API

***Streaming mode not yet implemented***

| AI Provider      | Messages | Tool Calls | JSON Output | Structured Output | MCP Servers |
| ---------------- | -------- | ---------- | ----------- | ----------------- | ------------- |
| Azure AI Foundry | ✅       | ✅         | ✅          | ✅                | ⬛            |
| Azure OpenAI     | ✅       | ✅         | ✅          | ✅                | ⬛            |
| OpenAI           | ✅       | ✅         | ✅          | ✅                | ⬛            |
| Gemini (Google)  | ✅       | ✅         | ✅          | ⬛                | ⬛            |
| XAI              | ✅       | ✅         | ✅          | ✅                | ⬛            |

### Responses API

***Streaming mode not yet implemented***

| AI Provider      | Messages | Tool Calls | JSON Output | Structured Output | MCP Servers |
| ---------------- | -------- | ---------- | ----------- | ----------------- | ------------- |
| Azure AI Foundry | ✅       | ✅         | ✅          | ✅                | ✅            |
| Azure OpenAI     | ✅       | ✅         | ✅          | ✅                | ✅            |
| OpenAI           | ✅       | ✅         | ✅          | ✅                | ✅            |
| Gemini (Google)  | 🔴       | 🔴         | 🔴          | 🔴                | 🔴            |
| XAI              | 🔴       | 🔴         | 🔴          | 🔴                | 🔴            |

- ✅: Supported
- ⬛: Not yet implemented
- 🔴: Not supported by the provider

## 📚 Learn More
- [Supabase Documentation](https://supabase.com/docs)
- [Biome Documentation](https://biomejs.dev/docs/)
- [pnpm Documentation](https://pnpm.io/motivation)
- [Contributing Guide](CONTRIBUTING.md)

---

## 💡 Inspiration

This project was inspired by the amazing work at [Portkey-AI/gateway](https://github.com/Portkey-AI/gateway), a blazing fast AI Gateway with integrated guardrails and support for 200+ LLMs.

We use MIT-licensed code from Portkey-AI/gateway in this project and gratefully acknowledge their contribution.

---

<p align="center">
  <b>Made with ❤️ by the IDK team</b>
</p>

---

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