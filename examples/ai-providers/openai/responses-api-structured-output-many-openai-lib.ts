import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';
import { makeParseableTextFormat } from 'openai/lib/parser.mjs';
import { type ZodType, z } from 'zod';

// Custom zodTextFormat to make it work with zod v4
export function zodTextFormat<ZodInput extends ZodType>(
  zodObject: ZodInput,
  name: string,
) {
  return makeParseableTextFormat(
    {
      type: 'json_schema',
      name,
      strict: true,
      schema: z.toJSONSchema(zodObject),
    },
    (content) => zodObject.parse(JSON.parse(content)),
  );
}

if (!process.env.OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const client = new OpenAI({
  // This is the API key to IDKHub
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'idk',
  baseURL: 'http://localhost:3000/v1',
});

const idkhubConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calendar_event_planner',
  skill_name: 'generate',
};

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

// Array of 30 diverse event-related text inputs
const eventInputs = [
  'Alice and Bob are going to a science fair on Friday.',
  'The team meeting is scheduled for Monday at 2 PM with John, Sarah, and Mike.',
  'Birthday party for Emma next Saturday at 6 PM. Tom and Lisa will be there.',
  'Wedding ceremony on June 15th with the bride, groom, and 150 guests.',
  'Conference call with the marketing team this Thursday at 10 AM.',
  'Book club meeting tomorrow evening with Rachel, David, and Helen.',
  'Graduation ceremony next month featuring Alex and his family.',
  'Dinner reservation for Friday night with Maria and Carlos.',
  'Workshop on machine learning next Tuesday with Dr. Smith and students.',
  'Soccer game this weekend with the local team and visiting players.',
  'Art exhibition opening on March 20th with the curator and artists.',
  'Cooking class next Wednesday with Chef Johnson and 12 participants.',
  'Movie night planned for Sunday with friends Jake, Amy, and Ben.',
  'Client presentation on Monday morning with the sales team and prospects.',
  'Yoga retreat this weekend with instructor Maya and 20 attendees.',
  'Christmas party in December with all office staff and their families.',
  'Hiking trip next month with outdoor club members and guides.',
  'Piano recital on Thursday evening featuring young musicians and parents.',
  'Business lunch tomorrow with potential investors and the CEO.',
  'Garden party next Saturday afternoon with neighbors and relatives.',
  'Tech conference in Silicon Valley next week with industry leaders.',
  'Baby shower for Jessica next Sunday with close friends and family.',
  'Charity fundraiser gala on Friday night with donors and volunteers.',
  'Language exchange meetup this Tuesday with native speakers and learners.',
  'Photography workshop next weekend with professional photographer and enthusiasts.',
  'Board game night this Thursday with regular players and newcomers.',
  'Wine tasting event next Friday with sommelier and wine enthusiasts.',
  'Marathon race on Sunday morning with runners and support crew.',
  'Academic symposium next month with researchers and graduate students.',
  'New product launch event next Tuesday with press and stakeholders.',
];

// Number of random inputs to process
const N_INPUTS = 5;

// Function to get random elements from array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get random inputs to process
const selectedInputs = getRandomElements(eventInputs, N_INPUTS);

logger.printWithHeader('Processing', `${N_INPUTS} random event inputs`);

// Process each selected input
for (let i = 0; i < selectedInputs.length; i++) {
  const userMessage = selectedInputs[i];

  logger.printWithHeader(`Input ${i + 1}`, userMessage);

  const response = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .responses.parse({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: 'Extract the event information.' },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      text: {
        // This is a custom zodTextFormat to make it work with zod v4
        format: zodTextFormat(CalendarEvent, 'event'),
      },
    });

  const agentResponse = response.output_parsed;
  logger.printWithHeader(
    `Response ${i + 1}`,
    JSON.stringify(agentResponse, null, 2),
  );

  // Add a small delay between requests to be respectful to the API
  if (i < selectedInputs.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
