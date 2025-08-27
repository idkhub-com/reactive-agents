# 🚀 Team Setup Guide - Chat Agent

## Quick Start (2 minutes)

### 1. **From Main Repository**
```bash
# Navigate to auction agent
cd examples/auction-agent

# Start the chat agent immediately
pnpm auction-agent:chat
```

### 2. **Try These Commands**
```
You: Find me affordable cars under $5000
You: Compare the top 2 vehicles  
You: What do you recommend?
You: My budget is $20,000
You: Find cars in the Bay Area
You: Show me all results
You: help
You: quit
```

## What You Get

✅ **Works immediately** - No API keys required for basic functionality  
✅ **Natural language** - Talk to the agent like a human  
✅ **Real-time search** - Get instant vehicle recommendations  
✅ **Smart comparisons** - Compare multiple vehicles side-by-side  
✅ **Context memory** - Remembers your preferences  
✅ **Budget management** - Set and adjust your budget dynamically  

## Advanced Setup (Optional)

### Enable AI-Powered Responses
```bash
# Edit .env file
OPENAI_API_KEY=sk-your-api-key-here

# Restart chat agent
pnpm auction-agent:chat
```

### Enable Database Persistence
```bash
# Edit .env file  
IDK_ENABLE_PERSISTENCE=true

# Restart chat agent
pnpm auction-agent:chat
```

## Team Scripts

```bash
# Chat interface (RECOMMENDED)
pnpm auction-agent:chat

# Traditional interface
pnpm start

# Scheduler management
pnpm auction-agent:scheduler

# Setup wizard
pnpm auction-agent:setup

# Integration tests
pnpm auction-agent:test
```

## Example Workflow

1. **Start**: `pnpm auction-agent:chat`
2. **Search**: "Find me reliable cars under $15,000"
3. **Refine**: "My budget is actually $12,000"
4. **Compare**: "Compare vehicles 1 and 2"
5. **Decide**: "What do you recommend?"
6. **Exit**: "quit"

## Troubleshooting

**Chat agent won't start?**
- Make sure you're in the main repository root
- Run `pnpm install` first

**No AI responses?**
- Set `OPENAI_API_KEY` in `.env` file
- Or use basic functionality without AI

**Need help?**
- Type "help" in the chat
- See full README.md for detailed documentation

---

**Ready to find your perfect car? Start chatting! 🚗💬**
