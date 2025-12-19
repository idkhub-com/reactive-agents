# Reactive Agents Language Tutor Agent

A simple language tutoring example that demonstrates Reactive Agents's unified AI provider architecture to provide intelligent language learning feedback.

## 🚀 Features

- **English Analysis**: Grammar and style feedback using Reactive Agents
- **Correctness Evaluation**: Boolean assessment with detailed explanations  
- **Input Sanitization**: Security validation and error handling
- **Parallel Processing**: Optional concurrent analysis for better performance
- **Results Export**: JSON output with timestamps for tracking progress
- **Example Data**: Test cases across proficiency levels

## 📋 Quick Start

### Prerequisites
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Configuration
```bash
# Required
OPENAI_API_KEY="sk-your-openai-key"

# Optional (defaults shown)
RA_URL="http://localhost:3000"
RA_AUTH_TOKEN="reactive-agents"
```

### Run Examples

**Sequential Analysis:**
```bash
pnpm exec tsx examples/language-tutor-agent/language-tutor.ts
```

**Parallel Processing (Faster):**
```bash
pnpm exec tsx examples/language-tutor-agent/language-tutor.ts --parallel
```

**Save Results to File:**
```bash
pnpm exec tsx examples/language-tutor-agent/language-tutor.ts --save
```

## 🧪 Testing

Run the test suite to verify functionality:
```bash
pnpm test examples/language-tutor-agent/
```

## 🏗️ Architecture

### File Structure
```
examples/language-tutor-agent/
├── language-tutor.ts          # Main workflow implementation
├── skills.ts                  # Language skill definitions
├── example-user-data.json     # Test cases and examples
├── language-tutor.test.ts     # Test suite
└── README.md                  # This documentation
```

### Core Components

#### 1. Language Skills (`skills.ts`)
Defines language expertise with system prompts and language codes.

#### 2. Simple Workflow
The system performs English analysis on any learner text:
- Takes learner input in any language
- Analyzes using English-based AI feedback
- Provides grammar and style corrections

#### 3. Reactive Agents Integration
- **Provider Abstraction**: Easy switching between AI providers
- **Retry Logic**: Automatic error recovery
- **Observability**: Full request tracing
- **Security**: Input validation and sanitization

## 📊 Usage Examples

### Basic Text Analysis
```typescript
import { multiLanguageTutorWorkflow } from './language-tutor';

// Analyze any text (gets English feedback)
await multiLanguageTutorWorkflow(
  "I goed to the store yesterday and buyed some bread."
);
```

### Correctness Evaluation
```typescript
import { evaluateLearnerText } from './language-tutor';

const result = await evaluateLearnerText(
  "I goed to the store yesterday.",
  "en"
);

console.log(result);
// { correct: false, explanation: "Use 'went' instead of 'goed'..." }
```

## 🔧 Configuration

### Reactive Agents Configuration
Each request uses Reactive Agents's configuration system:

```typescript
const config: ReactiveAgentsConfig = {
  agent_name: 'language-tutor',
  skill_name: 'english-analysis',
  strategy: { mode: 'single' },
  targets: [{
    provider: 'openai',
    api_key: process.env.OPENAI_API_KEY,
    weight: 1,
    retry: { attempts: 2 }
  }],
  trace_id: `language-tutor-${Date.now()}`
};
```

## 📈 Example Data

The example includes test cases in `example-user-data.json` with different languages and proficiency levels. Results can be saved to timestamped JSON files using the `--save` flag.

## 🐛 Troubleshooting

**API Key Errors:**
- Set your OpenAI API key in `.env.local`

**Network Failures:**
- Check Reactive Agents server is running and accessible

**Language Not Supported:**
- Use a supported language code (see `skills.ts`)

## 🙋‍♀️ Support

For questions and support:
1. Review the test files for usage examples
2. Consult the main Reactive Agents documentation
3. Open an issue in the Reactive Agents repository

---

*Built with ❤️ using Reactive Agents's unified AI provider system*
