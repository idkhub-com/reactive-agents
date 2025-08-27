# Auction Agent Integration Guide

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   - Edit `examples/auction-agent/.env` with your API keys
   - At minimum, set `OPENAI_API_KEY` for AI analysis

3. **Run the auction agent**:
   ```bash
   # Basic run
   pnpm auction-agent
   
   # Development mode (auto-reload)
   pnpm auction-agent:dev
   
   # Scheduler management
   pnpm auction-agent:scheduler
   
   # Chat-like interactive mode (NEW!)
   pnpm auction-agent:chat
   ```

## Available Scripts

- `pnpm auction-agent` - Run the auction agent once
- `pnpm auction-agent:dev` - Run in development mode with auto-reload
- `pnpm auction-agent:scheduler` - Manage scheduled runs and notifications
- `pnpm auction-agent:chat` - **NEW!** Chat-like interactive mode for real-time car selection assistance

## Chat Agent Features

The new chat-like interface (`pnpm auction-agent:chat`) provides:

- **Natural Language Search**: "Find me a Honda Civic under $20,000"
- **Real-time Car Selection**: Get instant recommendations and comparisons
- **Conversational Interface**: Ask questions and get detailed responses
- **Dynamic Criteria Updates**: Change search parameters mid-conversation
- **Vehicle Comparison**: Compare multiple cars side-by-side
- **Budget Management**: Set and adjust your budget in real-time
- **Location-based Search**: "Find cars in the Bay Area"
- **Smart Recommendations**: Get AI-powered buying advice

### Example Chat Interactions:
```
You: Find me affordable cars under $5000 for flipping in the Bay Area
Assistant: I found 3 vehicles matching your criteria...

You: Compare the top 2 vehicles
Assistant: Here's a detailed comparison...

You: What do you recommend?
Assistant: Based on my analysis, I recommend...
```

## Configuration

The auction agent uses environment variables for configuration. Key settings:

- `OPENAI_API_KEY` - Required for AI analysis
- `IDK_ENABLE_PERSISTENCE` - Enable SQLite database (set to `true`)
- `IDK_INTERACTIVE` - Interactive mode (set to `false` for automated runs)

## Testing

Run a quick test:
```bash
IDK_INTERACTIVE=false pnpm auction-agent
```

This should find 2 vehicles and complete analysis without user interaction.

## Documentation

See `examples/auction-agent/README.md` for complete documentation.
