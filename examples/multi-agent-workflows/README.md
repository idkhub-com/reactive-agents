# IDKHub Example: Multi-Agent Business Workflows

## Business Problem
Enterprises need to automate complex workflows that require multiple specialized AI agents working together - like research analysis, strategic planning, and content creation. Current solutions force you to manually orchestrate different AI services, leading to inconsistent outputs and integration headaches.

## Accuracy Challenges
- **Context Loss**: Information gets lost when passing data between separate AI services
- **Inconsistent Quality**: Different providers have varying output quality for specialized tasks
- **Manual Orchestration**: Hand-coding agent coordination introduces errors and complexity
- **No Validation**: No built-in quality gates between workflow stages

## How IDKHub Helps
- **Single API**: One unified interface for both simple chat and complex multi-agent workflows
- **Context Preservation**: Automatic context passing between specialized agents
- **Provider Flexibility**: Easy switching between 40+ AI providers for optimal results
- **Built-in Retry Logic**: Automatic error handling and retry strategies

## Run the Example

First, start the IDKHub server in one terminal:
```bash
pnpm install && pnpm dev
```

Then in another terminal, run the example:
```bash
export OPENAI_API_KEY="your-api-key" && pnpm exec tsx examples/multi-agent-workflows/multi-agent-workflow.ts
```

This demonstrates research analysis (3 agents), strategic planning (3 agents), and content creation (2 agents) working together with shared context.

## Expected Output
When running successfully, you should see:
- ✅ API key validation messages
- 📋 Research analysis workflow with 3 agents
- 🎯 Strategic planning workflow with 3 agents  
- 📝 Content creation workflow with 2 agents
- 📊 Summary of all workflow results

## Troubleshooting

**API Key Issues:**
- Make sure your API key is valid and has sufficient credits
- The system supports 40+ providers - use any valid API key format
- Check the console for API key format detection messages

**Connection Issues:**
- Ensure IDKHub server is running on `http://localhost:3000`
- Start server with `pnpm install && pnpm dev`
- Check for port conflicts or firewall issues

**Runtime Errors:**
- Install dependencies: `pnpm install`
- Run with proper environment: `export OPENAI_API_KEY="your-key"`
- For debugging, check the console output for detailed error messages

**Testing:**
- Run tests with: `pnpm exec vitest examples/multi-agent-workflows/multi-agent-workflow.test.ts`
- Tests verify input validation, API key handling, and type guards 