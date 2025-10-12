import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

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
  agent_name: 'carpenter',
  skill_name: 'cut',
};

// Array of diverse rod cutting scenarios
// Each scenario has a rod length and requested pieces that don't exceed the total length
const rodCuttingScenarios = [
  {
    rodLength: 100,
    requestedSizes: [25, 30, 15, 20],
    unit: 'cm',
    purpose: 'furniture legs',
  },
  {
    rodLength: 240,
    requestedSizes: [60, 45, 30, 50, 25],
    unit: 'cm',
    purpose: 'shelf brackets',
  },
  {
    rodLength: 144,
    requestedSizes: [36, 24, 18, 30, 20],
    unit: 'inches',
    purpose: 'picture frames',
  },
  {
    rodLength: 300,
    requestedSizes: [75, 50, 60, 40, 35],
    unit: 'cm',
    purpose: 'table components',
  },
  {
    rodLength: 96,
    requestedSizes: [24, 18, 12, 16, 14],
    unit: 'inches',
    purpose: 'decorative trim',
  },
  {
    rodLength: 200,
    requestedSizes: [45, 35, 50, 30, 25],
    unit: 'cm',
    purpose: 'garden stakes',
  },
  {
    rodLength: 180,
    requestedSizes: [40, 35, 30, 25, 20],
    unit: 'cm',
    purpose: 'bookshelf dividers',
  },
  {
    rodLength: 120,
    requestedSizes: [30, 25, 20, 15, 15],
    unit: 'inches',
    purpose: 'handrail sections',
  },
  {
    rodLength: 250,
    requestedSizes: [60, 55, 50, 40, 30],
    unit: 'cm',
    purpose: 'fence posts',
  },
  {
    rodLength: 72,
    requestedSizes: [18, 15, 12, 10, 9],
    unit: 'inches',
    purpose: 'craft sticks',
  },
  {
    rodLength: 150,
    requestedSizes: [35, 30, 25, 20, 20],
    unit: 'cm',
    purpose: 'ladder rungs',
  },
  {
    rodLength: 108,
    requestedSizes: [27, 24, 18, 15, 12],
    unit: 'inches',
    purpose: 'cabinet supports',
  },
  {
    rodLength: 320,
    requestedSizes: [80, 70, 60, 50, 40],
    unit: 'cm',
    purpose: 'workbench parts',
  },
  {
    rodLength: 84,
    requestedSizes: [21, 18, 15, 12, 10],
    unit: 'inches',
    purpose: 'dowel rods',
  },
  {
    rodLength: 210,
    requestedSizes: [50, 45, 40, 35, 25],
    unit: 'cm',
    purpose: 'planter box sides',
  },
  {
    rodLength: 156,
    requestedSizes: [39, 36, 30, 24, 18],
    unit: 'inches',
    purpose: 'molding pieces',
  },
  {
    rodLength: 280,
    requestedSizes: [70, 65, 55, 45, 30],
    unit: 'cm',
    purpose: 'bed frame slats',
  },
  {
    rodLength: 60,
    requestedSizes: [15, 12, 10, 8, 7],
    unit: 'inches',
    purpose: 'tool handles',
  },
  {
    rodLength: 192,
    requestedSizes: [48, 42, 36, 30, 24],
    unit: 'inches',
    purpose: 'stair treads',
  },
  {
    rodLength: 270,
    requestedSizes: [65, 60, 50, 45, 35],
    unit: 'cm',
    purpose: 'window frames',
  },
  {
    rodLength: 132,
    requestedSizes: [33, 30, 24, 18, 15],
    unit: 'inches',
    purpose: 'drawer slides',
  },
  {
    rodLength: 225,
    requestedSizes: [55, 50, 45, 35, 25],
    unit: 'cm',
    purpose: 'coat rack bars',
  },
  {
    rodLength: 90,
    requestedSizes: [22, 20, 16, 12, 10],
    unit: 'inches',
    purpose: 'cutting boards',
  },
  {
    rodLength: 165,
    requestedSizes: [40, 35, 30, 25, 20],
    unit: 'cm',
    purpose: 'trellis pieces',
  },
  {
    rodLength: 288,
    requestedSizes: [72, 66, 54, 48, 36],
    unit: 'inches',
    purpose: 'deck railing',
  },
  {
    rodLength: 195,
    requestedSizes: [48, 42, 38, 32, 25],
    unit: 'cm',
    purpose: 'pergola beams',
  },
  {
    rodLength: 168,
    requestedSizes: [42, 36, 30, 24, 20],
    unit: 'inches',
    purpose: 'bench slats',
  },
  {
    rodLength: 340,
    requestedSizes: [85, 75, 65, 55, 40],
    unit: 'cm',
    purpose: 'door frame pieces',
  },
  {
    rodLength: 78,
    requestedSizes: [19, 17, 14, 11, 9],
    unit: 'inches',
    purpose: 'jewelry box parts',
  },
  {
    rodLength: 260,
    requestedSizes: [65, 58, 52, 45, 30],
    unit: 'cm',
    purpose: 'balcony rails',
  },
  {
    rodLength: 216,
    requestedSizes: [54, 48, 42, 36, 24],
    unit: 'inches',
    purpose: 'closet rods',
  },
  {
    rodLength: 175,
    requestedSizes: [43, 38, 34, 28, 22],
    unit: 'cm',
    purpose: 'mirror frames',
  },
  {
    rodLength: 144,
    requestedSizes: [36, 32, 28, 22, 16],
    unit: 'inches',
    purpose: 'floating shelves',
  },
  {
    rodLength: 310,
    requestedSizes: [77, 70, 62, 52, 38],
    unit: 'cm',
    purpose: 'arbor posts',
  },
  {
    rodLength: 102,
    requestedSizes: [25, 22, 19, 15, 12],
    unit: 'inches',
    purpose: 'spice rack tiers',
  },
  {
    rodLength: 235,
    requestedSizes: [58, 52, 46, 39, 28],
    unit: 'cm',
    purpose: 'banister sections',
  },
  {
    rodLength: 204,
    requestedSizes: [51, 45, 39, 33, 24],
    unit: 'inches',
    purpose: 'headboard slats',
  },
  {
    rodLength: 290,
    requestedSizes: [72, 65, 58, 48, 35],
    unit: 'cm',
    purpose: 'gate components',
  },
  {
    rodLength: 126,
    requestedSizes: [31, 28, 24, 19, 15],
    unit: 'inches',
    purpose: 'wine rack bars',
  },
  {
    rodLength: 185,
    requestedSizes: [46, 41, 36, 30, 22],
    unit: 'cm',
    purpose: 'bunk bed supports',
  },
  {
    rodLength: 240,
    requestedSizes: [60, 54, 48, 40, 28],
    unit: 'inches',
    purpose: 'porch columns',
  },
  {
    rodLength: 155,
    requestedSizes: [38, 34, 29, 25, 19],
    unit: 'cm',
    purpose: 'towel bars',
  },
  {
    rodLength: 276,
    requestedSizes: [69, 62, 55, 46, 33],
    unit: 'inches',
    purpose: 'countertop supports',
  },
  {
    rodLength: 220,
    requestedSizes: [55, 49, 43, 37, 26],
    unit: 'cm',
    purpose: 'cabinet frames',
  },
  {
    rodLength: 162,
    requestedSizes: [40, 36, 31, 26, 19],
    unit: 'inches',
    purpose: 'pot rack hooks',
  },
  {
    rodLength: 305,
    requestedSizes: [76, 68, 61, 51, 38],
    unit: 'cm',
    purpose: 'greenhouse frame',
  },
  {
    rodLength: 114,
    requestedSizes: [28, 25, 21, 17, 13],
    unit: 'inches',
    purpose: 'magazine rack dividers',
  },
  {
    rodLength: 245,
    requestedSizes: [61, 55, 48, 41, 30],
    unit: 'cm',
    purpose: 'playground equipment',
  },
  {
    rodLength: 198,
    requestedSizes: [49, 44, 38, 32, 24],
    unit: 'inches',
    purpose: 'shoe rack tiers',
  },
  {
    rodLength: 265,
    requestedSizes: [66, 59, 52, 44, 33],
    unit: 'cm',
    purpose: 'deck stairs',
  },
];

// Number of random inputs to process
const N_INPUTS = 10;

// Function to get random elements from array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get random inputs to process
const selectedInputs = getRandomElements(rodCuttingScenarios, N_INPUTS);

logger.printWithHeader(
  'Processing',
  `${N_INPUTS} random rod cutting scenarios`,
);

// Process each selected input
for (let i = 0; i < selectedInputs.length; i++) {
  const scenario = selectedInputs[i];

  logger.printWithHeader(`Input ${i + 1}`, JSON.stringify(scenario, null, 2));

  const totalRequested = scenario.requestedSizes.reduce((a, b) => a + b, 0);
  const leftover = scenario.rodLength - totalRequested;

  logger.printWithHeader(
    `Scenario ${i + 1} Details`,
    `Total requested: ${totalRequested} ${scenario.unit}, Leftover: ${leftover} ${scenario.unit}`,
  );

  const response = await client
    .withOptions({
      defaultHeaders: {
        'x-idk-config': JSON.stringify(idkhubConfig),
      },
    })
    .responses.create({
      model: 'x',
      input: [
        {
          role: 'user',
          content: `I need to cut a rod of wood with length ${scenario.rodLength} ${scenario.unit} into the following pieces for ${scenario.purpose}: ${scenario.requestedSizes.join(', ')} ${scenario.unit}. Please help me determine the optimal cutting plan.`,
        },
      ],
    });

  const agentResponse = response.output_text;
  logger.printWithHeader(`Response ${i + 1}`, agentResponse);

  // Add a small delay between requests to be respectful to the API
  if (i < selectedInputs.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
