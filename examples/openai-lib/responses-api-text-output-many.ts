import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? 'reactive-agents',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  targets: [{ optimization: 'auto' }],
  agent_name: 'calendar_event_planner',
  skill_name: 'describe',
};

// Array of diverse calendar event inputs (some with single events, some with multiple)
const eventInputs = [
  {
    name: 'Science Fair',
    date: 'Friday',
    participants: ['Alice Johnson', 'Bob Martinez'],
    location: 'Lincoln High School Gymnasium',
  },
  [
    {
      name: 'Team Meeting',
      date: 'Monday at 2 PM',
      participants: ['John Smith', 'Sarah Williams', 'Mike Davis'],
      location: 'Zoom',
    },
    {
      name: 'Client Presentation',
      date: 'Monday at 4 PM',
      participants: [
        'Rebecca Price',
        'William Brooks',
        'Catherine Ward',
        'Andrew Hughes',
      ],
      location: 'Conference Room B',
    },
  ],
  {
    name: 'Birthday Party',
    date: 'next Saturday at 6 PM',
    participants: ['Emma Thompson', 'Tom Anderson', 'Lisa Brown'],
    location: '456 Oak Street',
  },
  [
    {
      name: 'Wedding Ceremony',
      date: 'June 15th at 3 PM',
      participants: [
        'Jennifer Garcia',
        'Michael Rodriguez',
        'Susan Chen',
        'Thomas Wilson',
      ],
      location: "St. Mary's Church",
    },
    {
      name: 'Wedding Reception',
      date: 'June 15th at 6 PM',
      participants: [
        'Jennifer Garcia',
        'Michael Rodriguez',
        'David Lee',
        'Susan Chen',
        'Amanda Martinez',
        'Robert Thompson',
      ],
      location: 'Grand Ballroom Hotel',
    },
  ],
  {
    name: 'Conference Call',
    date: 'this Thursday at 10 AM',
    participants: ['Patricia Wilson', 'James Taylor', 'Linda Moore'],
    location: 'Google Meet',
  },
  {
    name: 'Book Club Meeting',
    date: 'tomorrow evening',
    participants: ['Rachel Green', 'David Miller', 'Helen Cooper'],
    location: 'Central Library',
  },
  [
    {
      name: 'Graduation Ceremony',
      date: 'next month at 10 AM',
      participants: ['Alex Turner', 'Margaret Hall', 'Robert Clark'],
      location: 'University Auditorium',
    },
    {
      name: 'Graduation Lunch',
      date: 'next month at 1 PM',
      participants: [
        'Alex Turner',
        'Margaret Hall',
        'Robert Clark',
        'Sarah Turner',
      ],
      location: 'Italian Garden Restaurant',
    },
    {
      name: 'Graduation Party',
      date: 'next month at 6 PM',
      participants: [
        'Alex Turner',
        'Margaret Hall',
        'Robert Clark',
        'Sarah Turner',
        'Kevin Martinez',
        'Emily Chen',
      ],
      location: '789 Maple Drive',
    },
  ],
  {
    name: 'Dinner Reservation',
    date: 'Friday night',
    participants: ['Maria Gonzalez', 'Carlos Rivera'],
    location: 'La Bella Vista Restaurant',
  },
  {
    name: 'Machine Learning Workshop',
    date: 'next Tuesday',
    participants: [
      'Dr. Smith',
      'Kevin Harris',
      'Amanda White',
      'Tyler Jackson',
    ],
    location: 'Zoom',
  },
  [
    {
      name: 'Soccer Game',
      date: 'this Saturday at 2 PM',
      participants: ['Marcus Phillips', 'Chris Evans', 'Brian Mitchell'],
      location: 'Riverside Sports Complex',
    },
    {
      name: 'Team Dinner',
      date: 'this Saturday at 7 PM',
      participants: [
        'Marcus Phillips',
        'Chris Evans',
        'Diego Sanchez',
        'Laura Bennett',
      ],
      location: 'Pizza Palace',
    },
  ],
  {
    name: 'Art Exhibition Opening',
    date: 'March 20th',
    participants: ['Victoria Bell', 'Nathan Foster', 'Sophia Turner'],
    location: 'Modern Art Gallery',
  },
  {
    name: 'Cooking Class',
    date: 'next Wednesday',
    participants: [
      'Chef Johnson',
      'Emily Parker',
      'Daniel Reed',
      'Grace Bennett',
    ],
    location: 'Culinary Institute Kitchen',
  },
  [
    {
      name: 'Movie Night',
      date: 'Sunday at 7 PM',
      participants: [
        'Jake Coleman',
        'Amy Russell',
        'Ben Murphy',
        'Chloe Martinez',
      ],
      location: '123 Pine Street',
    },
    {
      name: 'Late Night Snacks',
      date: 'Sunday at 10 PM',
      participants: ['Jake Coleman', 'Amy Russell'],
      location: '123 Pine Street',
    },
  ],
  {
    name: 'Yoga Retreat',
    date: 'this weekend',
    participants: ['Maya Peterson', 'Nicole Sanders', 'Olivia Foster'],
    location: 'Serenity Wellness Center',
  },
  [
    {
      name: 'Christmas Party',
      date: 'December 24th at 6 PM',
      participants: [
        'George Washington',
        'Elizabeth Roberts',
        'Frank Edwards',
        'Patricia Moore',
      ],
      location: 'Company Headquarters',
    },
    {
      name: 'Christmas Brunch',
      date: 'December 25th at 11 AM',
      participants: [
        'George Washington',
        'Elizabeth Roberts',
        'Dorothy King',
        'Samuel Harrison',
      ],
      location: '555 Cedar Avenue',
    },
  ],
  {
    name: 'Hiking Trip',
    date: 'next month',
    participants: [
      'Thomas Scott',
      'Jennifer Hill',
      'Kyle Baker',
      'Hannah Adams',
    ],
    location: 'Blue Ridge Mountain Trail',
  },
  {
    name: 'Piano Recital',
    date: 'Thursday evening',
    participants: [
      'Sophie Nelson',
      'Liam Carter',
      'Charlotte Ross',
      'Ethan Morgan',
    ],
    location: 'Music Academy Concert Hall',
  },
  [
    {
      name: 'Business Lunch',
      date: 'tomorrow at noon',
      participants: ['Richard Butler', 'Angela Powell', 'Steven Perry'],
      location: 'The Capital Grille',
    },
    {
      name: 'Follow-up Meeting',
      date: 'tomorrow at 3 PM',
      participants: ['Richard Butler', 'Angela Powell', 'Jennifer Walsh'],
      location: 'Google Meet',
    },
  ],
  {
    name: 'Garden Party',
    date: 'next Saturday afternoon',
    participants: ['Barbara Griffin', 'Timothy Coleman', 'Laura Patterson'],
    location: 'Botanical Gardens',
  },
  {
    name: 'Tech Conference',
    date: 'next week',
    participants: ['Mark Richardson', 'Samantha Howard', 'Jonathan Myers'],
    location: 'Silicon Valley Convention Center',
  },
  [
    {
      name: 'Baby Shower',
      date: 'next Sunday at 2 PM',
      participants: [
        'Jessica Henderson',
        'Ashley Cooper',
        'Brittany Wood',
        'Samantha Lee',
      ],
      location: '321 Elm Street',
    },
    {
      name: 'Baby Shower Games',
      date: 'next Sunday at 3 PM',
      participants: [
        'Jessica Henderson',
        'Ashley Cooper',
        'Megan Kelly',
        'Rachel Adams',
      ],
      location: '321 Elm Street',
    },
  ],
  {
    name: 'Charity Fundraiser Gala',
    date: 'Friday night',
    participants: ['Peter Harrison', 'Diane Fisher', 'Arthur Wallace'],
    location: 'Grand Hotel Ballroom',
  },
  {
    name: 'Language Exchange Meetup',
    date: 'this Tuesday',
    participants: [
      'Yuki Tanaka',
      'Pierre Dubois',
      'Fatima Hassan',
      'Juan Martinez',
    ],
    location: 'Zoom',
  },
  {
    name: 'Photography Workshop',
    date: 'next weekend',
    participants: [
      'Vincent Shaw',
      'Isabella Knight',
      'Mason Bryant',
      'Lily Stevens',
    ],
    location: 'Downtown Photography Studio',
  },
  [
    {
      name: 'Board Game Night',
      date: 'this Thursday at 7 PM',
      participants: [
        'Ryan Webb',
        'Chloe Jordan',
        'Brandon Stone',
        'Tyler Morgan',
      ],
      location: '999 Birch Lane',
    },
    {
      name: 'Pizza Delivery',
      date: 'this Thursday at 8 PM',
      participants: [
        'Ryan Webb',
        'Chloe Jordan',
        'Zoe Armstrong',
        'Madison Fisher',
      ],
      location: '999 Birch Lane',
    },
  ],
  {
    name: 'Wine Tasting Event',
    date: 'next Friday',
    participants: ['Gregory Palmer', 'Natalie Duncan', 'Raymond Pierce'],
    location: 'Vineyard Estate',
  },
  [
    {
      name: 'Marathon Race',
      date: 'Sunday morning at 7 AM',
      participants: [
        'Aaron Crawford',
        'Kayla Reynolds',
        'Eric Spencer',
        'Nicole Brooks',
      ],
      location: 'City Center Starting Line',
    },
    {
      name: 'Marathon Celebration',
      date: 'Sunday afternoon at 1 PM',
      participants: [
        'Aaron Crawford',
        'Kayla Reynolds',
        'Alexis Quinn',
        'Brandon Cole',
        'Emma Foster',
      ],
      location: 'Victory Park Pavilion',
    },
  ],
  {
    name: 'Academic Symposium',
    date: 'next month',
    participants: ['Dr. Martinez', 'Dr. Chen', 'Dr. Patel', 'Dr. Williams'],
    location: 'Google Meet',
  },
  {
    name: 'New Product Launch',
    date: 'next Tuesday',
    participants: ['Sandra Bishop', 'Matthew Graham', 'Kimberly Hayes'],
    location: 'Tech Hub Auditorium',
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
const selectedInputs = getRandomElements(eventInputs, N_INPUTS);

logger.printWithHeader('Processing', `${N_INPUTS} random event inputs`);

// Process each selected input
for (let i = 0; i < selectedInputs.length; i++) {
  const eventData = selectedInputs[i];

  logger.printWithHeader(`Input ${i + 1}`, JSON.stringify(eventData, null, 2));

  const response = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'user',
          content: JSON.stringify(eventData),
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
