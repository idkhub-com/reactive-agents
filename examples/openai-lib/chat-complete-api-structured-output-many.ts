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
  skill_name: 'generate',
};

const CalendarEvent = z.object({
  name: z.string(),
  date: z.string(),
  participants: z.array(z.string()),
});

// Array of 60 diverse event-related text inputs with varying complexity and perspectives
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
  // More complex and abstract examples
  'They say the gathering of minds happens next Wednesday, where Dr. Patterson and her colleagues will contemplate the nature of consciousness.',
  'One might observe that the celebration of existence, scheduled for the 23rd, shall unite the family patriarch with descendants both near and far.',
  'It has been whispered among the community that Thursday evening will witness an assembly of souls - Marcus, Elena, and the mysterious stranger from the north.',
  'The convergence is inevitable: August 12th marks when the board members, shareholders, and those who dare to dream will collide in purpose.',
  'From my perspective, the ritual unfolds every full moon, bringing together the practitioners, the curious onlookers like Jennifer, and the skeptics including Thomas.',
  'As I recall from the invitation, some sort of intellectual sparring match awaits us on Friday afternoon with Professor Zhao and the debate team.',
  'The universe conspires to bring us together next Tuesday morning - myself, the architect of this chaos, alongside brave volunteers who answered the call.',
  'Looking back from the future, that Monday in March will have been significant: when innovators, dreamers like Sarah Chen, and investors converged.',
  'In abstract terms, the temporal intersection occurs at dawn on Saturday, featuring representatives from various philosophical schools and Dr. Morrison.',
  'The prophecy speaks of a gathering on the winter solstice where elders, youth leaders including Kai, and the uncommitted shall debate our collective fate.',
  'Between you and me, something extraordinary happens next Thursday - the meeting of minds between revolutionaries, bureaucrats, and Carmen Rodriguez.',
  'According to the cosmic calendar, the alignment of energies takes place on the 15th with healers, skeptics such as Dr. Williams, and seekers of truth.',
  'One could argue that the symposium scheduled for autumn equinox represents more than a meeting - it embodies collaboration between rivals, allies like Prof. Anderson, and neutral observers.',
  'The documentation suggests a convergence point exists at 3 PM next Wednesday when stakeholders, including the enigmatic Ms. Blackwood, shall negotiate reality itself.',
  "If legends are to be believed, the ceremony unfolds under the blood moon with participants ranging from the devoted to the doubtful, including Father O'Brien.",
  'Perhaps it is destined that next Friday evening will see the collision of old guards, new blood like Jackson Lee, and those who exist between worlds.',
  'The manuscript indicates that on the seventh day of the seventh month, scholars, mystics including Ravi Patel, and the willfully ignorant will assemble.',
  "In layman's terms, something big goes down Tuesday afternoon with the usual suspects, some wild cards like Detective Morrison, and uninvited observers.",
  'Through the lens of retrospection, that gathering in late November involved key players, peripheral figures such as the Johnson twins, and accidental participants.',
  'The notice was cryptic but clear: rendezvous at midnight on Saturday with the inner circle, trusted associates like Dr. Kim, and necessary outsiders.',
  'Rumor has it that the event transcends mere social gathering - scheduled for next month, it promises to unite adversaries, mediators including Ambassador Chen, and silent witnesses.',
  'From a third-person omniscient viewpoint, the congregation materializes every quarter, bringing together the faithful, the wavering like Pastor Grace, and the lost.',
  'The invitation spoke in riddles about a Thursday encounter between those who know, those who suspect like Agent Rivera, and those blissfully unaware.',
  'Philosophically speaking, the meeting next week represents the intersection of past regrets and future hopes, attended by survivors, visionaries such as Maya Sterling, and the perpetually late.',
  'As told through oral tradition, the ritual gathering on harvest moon involves tribal elders, young warriors like Running Bear, and traders from distant lands.',
  'The subtext suggests that what happens on Friday the 13th goes beyond coincidence - uniting skeptics, believers including Sister Margaret, and agnostics.',
  'According to unnamed sources, the clandestine meeting next Tuesday brings together whistleblowers, journalists like Rebecca Stone, and those with much to hide.',
  'In symbolic terms, the spring equinox celebration represents renewal, gathering the broken, the healers such as Dr. Yuki Tanaka, and the eternally hopeful.',
  "Word on the street is that Monday's showdown involves the old crew, new recruits like Danny Martinez, and people who probably shouldn't be there.",
  'The ancient texts foretold a gathering at the turning of the age, uniting seers, scholars including Professor Ashford, and the deliberately ignorant.',
  "If you read between the lines of the memo, next Wednesday's summit isn't just about business - it's where titans, underdogs like startup founder Lisa Park, and vultures meet.",
  "The narrative arc suggests that the climactic gathering on New Year's Eve will feature protagonists, antagonists such as Victor Cross, and morally ambiguous wildcards.",
  'Through the grapevine, I heard the mixer on Saturday involves the elite, the aspiring like chef Marco Rossi, and people who crashed the party.',
  'Metaphorically, the workshop next Thursday represents a crucible where raw talent, experienced masters including sensei Takeshi, and the unteachable collide.',
  'The prophecy was vague yet specific: when three moons align in October, gather the wise, the reckless like Captain Steele, and the indifferent.',
  'As an outside observer, the scheduled intervention next week seems to involve family members, counselors such as Dr. Patricia Moore, and those in denial.',
  'The folklore describes a centennial gathering where generations meet - the eldest, the youngest like prodigy Emma Wright, and everyone suspended between.',
  'In corporate speak, the Q4 strategy session on Friday brings together C-suite executives, middle management including David Torres, and expendable consultants.',
  'The conspiracy theorists claim something significant happens next Tuesday when insiders, outsiders like investigative reporter Alex Quinn, and unwitting pawns converge.',
  'From an anthropological perspective, the ritual scheduled for the solstice unites the tribe, neighboring clans such as the River People led by Chief Nahko, and curious anthropologists.',
  "Between the official announcements and reality lies the truth: Monday's emergency session involves decision-makers, scapegoats like project manager Sam Foster, and silent observers.",
  'The psychological assessment suggests that group therapy next Wednesday serves multiple functions for attendees, facilitators including Dr. Bernard Lewis, and the resistant.',
  'Legend speaks of a tournament on the first frost where champions, challengers such as the undefeated Kenji Nakamura, and spectators determine the future.',
  'According to the underground network, the resistance meeting Thursday night brings together cell leaders, new recruits like code-named Phoenix, and potential infiltrators.',
  'The existential question remains: does the gathering next Friday create meaning, or merely bring together the searching, the found like spiritual guide Amara, and the perpetually lost?',
  'As documented in the fragmented records, the summit on July 4th involved diplomats, revolutionaries such as Commander Zhang, and those who would rewrite history.',
  'The invitation arrived in code: when shadows grow long on Saturday, assemble the keepers, the seekers like archaeologist Dr. Ramirez, and the destroyers.',
  'Through multiple timelines, the convergence point remains constant: next Monday when past selves, future echoes including the time-displaced Sophia, and present consciousnesses meet.',
  "The unspoken understanding is that Wednesday's gathering transcends its stated purpose, bringing together the genuine, the performers like entertainer Jules Fontaine, and the audience.",
  'From the void between certainty and doubt emerges the plan: Thursday evening unites the questioners, the answerers such as oracle Madame Zara, and those who reject both questions and answers.',
];

// Number of random inputs to process
const N_INPUTS = 60;

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

  const completion = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Extract the event information.' },
        {
          role: 'user',
          content: userMessage,
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

  const agentResponse = completion.choices[0]?.message.parsed;
  logger.printWithHeader(
    `Response ${i + 1}`,
    JSON.stringify(agentResponse, null, 2),
  );

  // Add a small delay between requests to be respectful to the API
  if (i < selectedInputs.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
