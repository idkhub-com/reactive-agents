#!/usr/bin/env node

/**
 * Auction Agent Integration Setup Script
 *
 * This script helps integrate the auction-agent example into the main IDKHub repository.
 * It sets up the environment, installs dependencies, and provides guidance for running the agent.
 */

import { execSync } from 'child_process';
import { copyFileSync, existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const auctionAgentDir = join(rootDir, 'examples', 'auction-agent');

console.log('🤖 IDKHub Auction Agent Integration Setup');
console.log('==========================================\n');

// Check if auction-agent directory exists
if (!existsSync(auctionAgentDir)) {
  console.error('❌ Auction agent directory not found at:', auctionAgentDir);
  console.error(
    'Please ensure the auction-agent folder is in examples/auction-agent/',
  );
  process.exit(1);
}

console.log('✅ Auction agent directory found');

// Check if .env file exists in auction-agent
const envExamplePath = join(auctionAgentDir, 'env.example');
const envPath = join(auctionAgentDir, '.env');

if (!existsSync(envPath) && existsSync(envExamplePath)) {
  console.log('📝 Creating .env file from template...');
  copyFileSync(envExamplePath, envPath);
  console.log('✅ Created .env file at:', envPath);
  console.log(
    '⚠️  Please edit the .env file with your API keys and configuration',
  );
} else if (existsSync(envPath)) {
  console.log('✅ .env file already exists');
} else {
  console.log('⚠️  No .env file found. You may need to create one manually.');
}

// Check if dependencies are installed
console.log('\n📦 Checking dependencies...');
try {
  execSync('pnpm list better-sqlite3', { stdio: 'pipe' });
  console.log('✅ Auction agent dependencies are installed');
} catch (error) {
  console.log('⚠️  Some auction agent dependencies may be missing');
  console.log('Run: pnpm install');
}

// Create a simple integration guide
const integrationGuide = `# Auction Agent Integration Guide

## Quick Start

1. **Install dependencies** (if not already done):
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Configure environment**:
   - Edit \`examples/auction-agent/.env\` with your API keys
   - At minimum, set \`OPENAI_API_KEY\` for AI analysis

3. **Run the auction agent**:
   \`\`\`bash
   # Basic run
   pnpm auction-agent
   
   # Development mode (auto-reload)
   pnpm auction-agent:dev
   
   # Scheduler management
   pnpm auction-agent:scheduler
   \`\`\`

## Available Scripts

- \`pnpm auction-agent\` - Run the auction agent once
- \`pnpm auction-agent:dev\` - Run in development mode with auto-reload
- \`pnpm auction-agent:scheduler\` - Manage scheduled runs and notifications

## Configuration

The auction agent uses environment variables for configuration. Key settings:

- \`OPENAI_API_KEY\` - Required for AI analysis
- \`IDK_ENABLE_PERSISTENCE\` - Enable SQLite database (set to \`true\`)
- \`IDK_INTERACTIVE\` - Interactive mode (set to \`false\` for automated runs)

## Testing

Run a quick test:
\`\`\`bash
IDK_INTERACTIVE=false pnpm auction-agent
\`\`\`

This should find 2 vehicles and complete analysis without user interaction.

## Documentation

See \`examples/auction-agent/README.md\` for complete documentation.
`;

writeFileSync(join(rootDir, 'AUCTION_AGENT_INTEGRATION.md'), integrationGuide);
console.log('✅ Created integration guide: AUCTION_AGENT_INTEGRATION.md');

console.log('\n🎉 Setup Complete!');
console.log('\nNext steps:');
console.log('1. Edit examples/auction-agent/.env with your API keys');
console.log('2. Run: pnpm auction-agent');
console.log('3. See AUCTION_AGENT_INTEGRATION.md for detailed instructions');
console.log('\nFor help, see examples/auction-agent/README.md');
