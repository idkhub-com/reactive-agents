# Reactive Agents

> Automatically optimize your AI agents based on performance with OpenAI API compatibility.

## What is Reactive Agents?

Reactive Agents is a self-optimizing AI agent platform that automatically improves your agents by adjusting hyperparameters and system prompts based on their performance. Simply point your existing application to Reactive Agents instead of your AI provider, and it handles the optimization for you.

**Key Features:**
- 🔄 **Automatic optimization** - Continuously improves agents based on real-world performance
- 🎯 **Smart tuning** - Adjusts LLM hyperparameters and system prompts automatically
- 🔌 **OpenAI API compatible** - Works as a drop-in replacement for applications using the OpenAI API
- 🌐 **Multi-provider support** - Route to OpenAI, Anthropic, Google, and other providers
- 📊 **Performance tracking** - Monitor agent performance and improvements over time

**How it works:**
1. Change your API URL from `api.openai.com` to your Reactive Agents instance
2. Reactive Agents proxies requests to your chosen AI provider
3. Performance is tracked and agents are automatically optimized
4. Your application benefits from continuously improving AI agents

---

## 🚦 Getting Started

**Quick Start:**

1. Create a `.env` file:
   ```bash
   OPENAI_API_KEY=your-openai-key
   ```

2. Start the application:
   ```bash
   docker-compose up
   ```

That's it! The application will be available at `http://localhost:3000`.

**What's included:**
- Complete backend infrastructure
- Reactive Agents application
- All necessary setup handled automatically

---

### Production Deployment

> [!WARNING]
> **Experimental Project** - Reactive Agents is currently in active development and is **not production-ready**. We are working on critical features including authorization, performance optimizations, and stability improvements. Use this project for experimentation and development only.

For future production deployment guides and best practices, visit our [documentation](https://reactiveagents.ai).

---

## 🔑 Default Password

```
reactive-agents
```

---

## 📖 Examples

Check out the [examples/](examples/) directory for sample implementations showing how to integrate Reactive Agents with your applications.

---

## 📚 Learn More

- **[Documentation](https://reactiveagents.ai)** - Complete guides and API reference
- [Contributing Guide](CONTRIBUTING.md)
- [Notice](NOTICE)

---

<p align="center">
  <b>Made with ❤️ by the Reactive Agents team</b>
</p>
