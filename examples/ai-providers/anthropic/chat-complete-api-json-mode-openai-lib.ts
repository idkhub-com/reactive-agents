import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { z } from 'zod';

if (!process.env.ANTHROPIC_API_KEY) {
  logger.error('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const client = new OpenAI({
  // This is the API key to IDKHub
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
  targets: [
    {
      provider: 'anthropic',
      model: 'claude-opus-4-1',
      api_key: process.env.ANTHROPIC_API_KEY,
    },
  ],
  agent_name: 'Calendar Event Planner',
  skill_name: 'Third Person View',
};

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

type CalendarEvent = z.infer<typeof CalendarEvent>;

const userMessage = 'Alice and Bob are going to a science fair on Friday.';
logger.printWithHeader('User', userMessage);

// Generate JSON schema from Zod for the system prompt
const jsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'name of the event' },
    date: { type: 'string', description: 'date of the event' },
    participants: {
      type: 'array',
      items: { type: 'string' },
      description: 'array of participant names',
    },
  },
  required: ['name', 'date', 'participants'],
};

const response = await client
  .withOptions({
    defaultHeaders: {
      'x-idk-config': JSON.stringify(idkhubConfig),
    },
  })
  .chat.completions.create({
    model: 'claude-opus-4-1',
    messages: [
      {
        role: 'system',
        content: `Extract the event information from the user's message and return it as a valid JSON object that matches this exact schema:

${JSON.stringify(jsonSchema, null, 2)}

Important:
- Return ONLY valid JSON, no additional text or formatting
- All required fields must be present
- Use appropriate string values for date (e.g., "Friday", "2025-01-17", etc.)
- Participants should be an array of individual names`,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

const responseContent = response.choices[0]?.message?.content || '{}';
logger.printWithHeader('Raw Response', responseContent);

try {
  // Parse the JSON response
  const parsedResponse = JSON.parse(responseContent);

  // Validate against the Zod schema
  const validatedEvent: CalendarEvent = CalendarEvent.parse(parsedResponse);

  logger.printWithHeader(
    'Validated Calendar Event',
    JSON.stringify(validatedEvent, null, 2),
  );

  // Log individual fields for verification
  logger.printWithHeader('Event Name', validatedEvent.name);
  logger.printWithHeader('Event Date', validatedEvent.date);
  logger.printWithHeader(
    'Participants',
    validatedEvent.participants.join(', '),
  );
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('Zod validation failed:', error.issues);
    logger.printWithHeader(
      'Validation Errors',
      JSON.stringify(error.issues, null, 2),
    );
  } else {
    logger.error('Failed to parse response as JSON:', error);
  }
  logger.printWithHeader('Raw Response Content', responseContent);
}
