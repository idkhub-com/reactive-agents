/**
 * Ollama Carpenter Agent Test
 *
 * Tests the carpenter agent with tool_knowledge skill through IDK Hub.
 * This example makes multiple requests to generate logs in the system.
 *
 * Requirements:
 * - Development server running on http://localhost:3000
 * - Ollama running locally on http://localhost:11434
 * - Model llama3.2:latest available
 * - Agent "carpenter" created with skill "tool_knowledge" using Ollama model
 * - Ollama API key configured (without actual key for local hosting)
 */

// Configuration
const IDKHUB_URL = 'http://localhost:3000/v1';
const AUTH_TOKEN = 'idk';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make a chat completion request to the carpenter agent through IDK Hub
 */
async function testCarpenterAgent(
  question: string,
  conversationHistory: ChatMessage[] = [],
): Promise<ChatResponse> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a helpful carpenter assistant with extensive knowledge about tools and woodworking.',
    },
    ...conversationHistory,
    {
      role: 'user',
      content: question,
    },
  ];

  const requestBody: ChatRequest = {
    model: 'llama3.2:latest',
    messages,
    temperature: 0.7,
    max_tokens: 200,
    stream: false,
  };

  // IDK Hub configuration - this tells the system to use the carpenter agent with tool_knowledge skill
  // Using optimization: 'auto' to enable clusters and evaluations
  const idkConfig = {
    agent_name: 'carpenter',
    skill_name: 'tool_knowledge',
    targets: [
      {
        optimization: 'auto',
      },
    ],
  };

  console.log(`\n🚀 Sending request to carpenter agent via IDK Hub...`);
  console.log(`📝 Question: ${question}`);
  console.log(`🔧 Agent: carpenter, Skill: tool_knowledge`);

  const response = await fetch(`${IDKHUB_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      'x-idk-config': JSON.stringify(idkConfig),
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${errorText}`,
    );
  }

  const data = (await response.json()) as ChatResponse;

  console.log(`✅ Response received (ID: ${data.id})`);
  console.log(`💬 Answer: ${data.choices[0].message.content}`);
  if (data.usage) {
    console.log(
      `📊 Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`,
    );
  }

  return data;
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  console.log('============================================================');
  console.log('🔨 CARPENTER AGENT TEST WITH OLLAMA');
  console.log('============================================================');
  console.log('Agent: carpenter');
  console.log('Skill: tool_knowledge');
  console.log('Model: llama3.2:latest');
  console.log('============================================================\n');

  // Check if Ollama is running
  console.log('🔍 Checking Ollama status...');
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = (await response.json()) as {
        models?: Array<{ name: string }>;
      };
      console.log('✅ Ollama is running');
      console.log(
        '📋 Available models:',
        data.models?.map((m) => m.name).join(', ') || 'None',
      );
    }
  } catch {
    console.log('❌ Ollama is not running or not accessible');
    console.log('Please start Ollama and try again.');
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 1: Basic tool knowledge question');
  console.log('='.repeat(60));

  const test1 = await testCarpenterAgent(
    'What is a circular saw and what is it commonly used for?',
  );

  // Wait a bit between requests to make logs easier to read
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 2: Specific tool comparison');
  console.log('='.repeat(60));

  const test2 = await testCarpenterAgent(
    'What is the difference between a miter saw and a table saw?',
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 3: Tool safety and best practices');
  console.log('='.repeat(60));

  const test3 = await testCarpenterAgent(
    'What are the most important safety considerations when using power tools?',
  );

  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST 4: Conversational follow-up (with context)');
  console.log('='.repeat(60));

  const conversationHistory: ChatMessage[] = [
    {
      role: 'user',
      content: 'What is a circular saw and what is it commonly used for?',
    },
    {
      role: 'assistant',
      content: test1.choices[0].message.content,
    },
  ];

  const test4 = await testCarpenterAgent(
    'Can you recommend a good brand for beginners?',
    conversationHistory,
  );

  // Summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total requests: 4`);
  console.log(`✅ All tests passed successfully`);
  console.log('\n📝 Log IDs generated:');
  console.log(`  1. ${test1.id}`);
  console.log(`  2. ${test2.id}`);
  console.log(`  3. ${test3.id}`);
  console.log(`  4. ${test4.id}`);

  if (test1.usage && test2.usage && test3.usage && test4.usage) {
    const totalTokens =
      test1.usage.total_tokens +
      test2.usage.total_tokens +
      test3.usage.total_tokens +
      test4.usage.total_tokens;
    console.log(`\n📊 Total tokens used: ${totalTokens}`);
  }

  console.log(
    '\n💡 TIP: Check your development server terminal to see request logs',
  );
  console.log(
    '💡 TIP: Go to http://localhost:3000/logs to view all carpenter agent logs',
  );
  console.log('💡 TIP: Filter by agent "carpenter" and skill "tool_knowledge"');
  console.log('='.repeat(60));
}

// Run the test
main().catch(console.error);
