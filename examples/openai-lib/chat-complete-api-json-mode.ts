import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'reactive-agents',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calendar_event_planner',
  skill_name: 'third_person_view',
};

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

const userMessage1 = 'Alice and Bob are going to a science fair on Friday.';
logger.printWithHeader('User', userMessage1);

const response1 = await client
  .withOptions({
    defaultHeaders: {
      'ra-config': JSON.stringify(raConfig),
    },
  })
  .chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Extract the event information.' },
      {
        role: 'user',
        content: userMessage1,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'event',
        strict: true,
        schema: z.toJSONSchema(CalendarEvent),
      },
    },
  });

let content = response1.choices[0]?.message?.content || '{}';

// Handle Anthropic-style JSON mode responses
// Anthropic may return just the tool name or include it in the content
if (typeof content === 'string' && content.includes('__json_output')) {
  // Try to extract JSON after "__json_output" (with optional newline)
  const jsonMatch = content.match(/__json_output\s*\n?\s*(\{[\s\S]*\})/);
  const jsonBody = jsonMatch?.[1];
  if (jsonBody) {
    content = jsonBody.trim();
  }
}

// If content is just the tool name, try to extract from tool_calls
if (content === '__json_output' && response1.choices[0]?.message?.tool_calls) {
  const jsonToolCall = response1.choices[0].message.tool_calls.find(
    (tc: OpenAI.ChatCompletionMessageToolCall) =>
      'function' in tc && tc.function?.name === '__json_output',
  );
  if (
    jsonToolCall &&
    'function' in jsonToolCall &&
    jsonToolCall.function?.arguments
  ) {
    content = jsonToolCall.function.arguments;
  }
}

const agentResponse = JSON.parse(content);
logger.printWithHeader('Agent Response', JSON.stringify(agentResponse));
