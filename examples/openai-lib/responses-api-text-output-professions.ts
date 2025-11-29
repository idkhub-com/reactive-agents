import OpenAI from 'openai';
import 'dotenv/config';
import logger from '@shared/console-logging';

const client = new OpenAI({
  // This is the API key to Reactive Agents
  // You can use a custom key by setting it as the value of BEARER_TOKEN in your .env file (restart server after saving)
  apiKey: process.env.BEARER_TOKEN ?? '',
  baseURL: 'http://localhost:3000/v1',
});

const raConfig = {
  agent_name: 'sales_agent',
  skill_name: 'outreach',
};

// Array of diverse people and their professions (each group has 6+ people)
const professionalProfiles = [
  [
    {
      name: 'Dr. Amara Okafor',
      profession: 'Neurosurgeon',
      yearsExperience: 15,
      location: 'Lagos, Nigeria',
    },
    {
      name: 'Hiroshi Tanaka',
      profession: 'Software Engineer',
      yearsExperience: 8,
      location: 'Tokyo, Japan',
    },
    {
      name: 'Sofia Rodríguez',
      profession: 'Data Scientist',
      yearsExperience: 6,
      location: 'Barcelona, Spain',
    },
    {
      name: 'Fatima Al-Rashid',
      profession: 'Architect',
      yearsExperience: 12,
      location: 'Dubai, UAE',
    },
    {
      name: 'Jamal Washington',
      profession: 'Civil Rights Attorney',
      yearsExperience: 20,
      location: 'Atlanta, USA',
    },
    {
      name: 'Priya Patel',
      profession: 'Pediatrician',
      yearsExperience: 10,
      location: 'Mumbai, India',
    },
  ],
  [
    {
      name: 'Lars Eriksson',
      profession: 'Marine Biologist',
      yearsExperience: 7,
      location: 'Stockholm, Sweden',
    },
    {
      name: 'Mei Chen',
      profession: 'Chef',
      yearsExperience: 18,
      location: 'Hong Kong',
    },
    {
      name: 'Carlos Mendoza',
      profession: 'Environmental Scientist',
      yearsExperience: 9,
      location: 'Mexico City, Mexico',
    },
    {
      name: 'Aisha Mohammed',
      profession: 'Human Rights Activist',
      yearsExperience: 14,
      location: 'Cairo, Egypt',
    },
    {
      name: 'Ivan Petrov',
      profession: 'Classical Pianist',
      yearsExperience: 25,
      location: 'Moscow, Russia',
    },
    {
      name: 'Keiko Yamamoto',
      profession: 'Fashion Designer',
      yearsExperience: 11,
      location: 'Osaka, Japan',
    },
  ],
  [
    {
      name: 'Marcus Johnson',
      profession: 'NBA Basketball Player',
      yearsExperience: 5,
      location: 'Los Angeles, USA',
    },
    {
      name: 'Ingrid Larsen',
      profession: 'Climate Researcher',
      yearsExperience: 13,
      location: 'Copenhagen, Denmark',
    },
    {
      name: 'Raj Sharma',
      profession: 'Investment Banker',
      yearsExperience: 16,
      location: 'Singapore',
    },
    {
      name: 'Elena Popescu',
      profession: 'Veterinarian',
      yearsExperience: 8,
      location: 'Bucharest, Romania',
    },
    {
      name: 'Omar Hassan',
      profession: 'Photojournalist',
      yearsExperience: 12,
      location: 'Beirut, Lebanon',
    },
    {
      name: 'Ngozi Adebayo',
      profession: 'Tech Entrepreneur',
      yearsExperience: 7,
      location: 'Accra, Ghana',
    },
  ],
  [
    {
      name: 'Yuki Sato',
      profession: 'Robotics Engineer',
      yearsExperience: 9,
      location: 'Seoul, South Korea',
    },
    {
      name: 'Isabella Rossi',
      profession: 'Opera Singer',
      yearsExperience: 15,
      location: 'Milan, Italy',
    },
    {
      name: 'Ahmed El-Amin',
      profession: 'Aerospace Engineer',
      yearsExperience: 11,
      location: 'Riyadh, Saudi Arabia',
    },
    {
      name: 'Léa Dubois',
      profession: 'Sommelier',
      yearsExperience: 8,
      location: 'Bordeaux, France',
    },
    {
      name: 'Thabo Nkosi',
      profession: 'Wildlife Conservationist',
      yearsExperience: 14,
      location: 'Johannesburg, South Africa',
    },
    {
      name: 'Yasmin Al-Farsi',
      profession: 'Cybersecurity Analyst',
      yearsExperience: 6,
      location: 'Muscat, Oman',
    },
  ],
  [
    {
      name: 'Diego Silva',
      profession: 'Professional Footballer',
      yearsExperience: 10,
      location: 'São Paulo, Brazil',
    },
    {
      name: 'Yara Khalil',
      profession: 'Documentary Filmmaker',
      yearsExperience: 9,
      location: 'Amman, Jordan',
    },
    {
      name: 'Sven Andersson',
      profession: 'Renewable Energy Consultant',
      yearsExperience: 12,
      location: 'Oslo, Norway',
    },
    {
      name: 'Lakshmi Reddy',
      profession: 'Quantum Physicist',
      yearsExperience: 16,
      location: 'Bangalore, India',
    },
    {
      name: 'Layla Haddad',
      profession: 'Humanitarian Aid Coordinator',
      yearsExperience: 12,
      location: 'Ramallah, Palestine',
    },
    {
      name: 'Jin Park',
      profession: 'Video Game Developer',
      yearsExperience: 7,
      location: 'Busan, South Korea',
    },
  ],
  [
    {
      name: 'Anastasia Volkov',
      profession: 'Ballet Dancer',
      yearsExperience: 13,
      location: 'St. Petersburg, Russia',
    },
    {
      name: 'Mohammed Aziz',
      profession: 'Cardiac Surgeon',
      yearsExperience: 19,
      location: 'Karachi, Pakistan',
    },
    {
      name: 'Chiara Bianchi',
      profession: 'Art Curator',
      yearsExperience: 10,
      location: 'Florence, Italy',
    },
    {
      name: 'Kwame Mensah',
      profession: 'Financial Advisor',
      yearsExperience: 15,
      location: 'London, UK',
    },
    {
      name: 'Zara Ahmed',
      profession: 'Investigative Journalist',
      yearsExperience: 8,
      location: 'Islamabad, Pakistan',
    },
    {
      name: 'Mateo López',
      profession: 'Agricultural Scientist',
      yearsExperience: 11,
      location: 'Lima, Peru',
    },
  ],
  [
    {
      name: 'Freya Nielsen',
      profession: 'Midwife',
      yearsExperience: 14,
      location: 'Reykjavik, Iceland',
    },
    {
      name: 'Tariq Ibrahim',
      profession: 'Urban Planner',
      yearsExperience: 9,
      location: 'Nairobi, Kenya',
    },
    {
      name: 'Sakura Ito',
      profession: 'Manga Artist',
      yearsExperience: 6,
      location: 'Kyoto, Japan',
    },
    {
      name: 'Rafael Oliveira',
      profession: 'Epidemiologist',
      yearsExperience: 12,
      location: 'Lisbon, Portugal',
    },
    {
      name: 'Amina Diop',
      profession: 'Educational Psychologist',
      yearsExperience: 10,
      location: 'Dakar, Senegal',
    },
    {
      name: 'Dimitri Papadopoulos',
      profession: 'Shipping Magnate',
      yearsExperience: 22,
      location: 'Athens, Greece',
    },
  ],
  [
    {
      name: 'Luna Reyes',
      profession: 'Volcanologist',
      yearsExperience: 8,
      location: 'Manila, Philippines',
    },
    {
      name: 'Elias Müller',
      profession: 'Pharmaceutical Researcher',
      yearsExperience: 13,
      location: 'Zurich, Switzerland',
    },
    {
      name: 'Aaliyah Brown',
      profession: 'Broadway Actress',
      yearsExperience: 9,
      location: 'New York, USA',
    },
    {
      name: 'Arjun Singh',
      profession: 'Blockchain Developer',
      yearsExperience: 5,
      location: 'Pune, India',
    },
    {
      name: 'Malik Johnson',
      profession: 'Jazz Saxophonist',
      yearsExperience: 17,
      location: 'New Orleans, USA',
    },
    {
      name: 'Nadia Ivanova',
      profession: 'Space Scientist',
      yearsExperience: 11,
      location: 'Moscow, Russia',
    },
  ],
  [
    {
      name: 'Xavier Beaumont',
      profession: 'Chocolatier',
      yearsExperience: 14,
      location: 'Brussels, Belgium',
    },
    {
      name: 'Zainab Hussein',
      profession: 'International Diplomat',
      yearsExperience: 18,
      location: 'Geneva, Switzerland',
    },
    {
      name: 'Kenji Nakamura',
      profession: 'Automotive Engineer',
      yearsExperience: 12,
      location: 'Nagoya, Japan',
    },
    {
      name: 'Catalina Morales',
      profession: 'Marine Conservation Biologist',
      yearsExperience: 10,
      location: 'Cartagena, Colombia',
    },
    {
      name: 'Oluwaseun Adeleke',
      profession: 'Fintech CEO',
      yearsExperience: 8,
      location: 'Nairobi, Kenya',
    },
    {
      name: 'Emilia Kowalski',
      profession: 'Film Director',
      yearsExperience: 15,
      location: 'Warsaw, Poland',
    },
  ],
  [
    {
      name: 'Hassan Mahmoud',
      profession: 'Orthopedic Surgeon',
      yearsExperience: 21,
      location: 'Dubai, UAE',
    },
    {
      name: 'Ines Silva',
      profession: 'Forensic Psychologist',
      yearsExperience: 9,
      location: 'Lisbon, Portugal',
    },
    {
      name: 'Wei Zhang',
      profession: 'AI Research Scientist',
      yearsExperience: 7,
      location: 'Beijing, China',
    },
    {
      name: 'Gabrielle Fontaine',
      profession: 'Pastry Chef',
      yearsExperience: 12,
      location: 'Paris, France',
    },
    {
      name: 'Tobias Schmidt',
      profession: 'Industrial Designer',
      yearsExperience: 10,
      location: 'Munich, Germany',
    },
    {
      name: 'Ayesha Karim',
      profession: 'Mobile App Developer',
      yearsExperience: 6,
      location: 'Dhaka, Bangladesh',
    },
  ],
];

// Number of random inputs to process
const N_INPUTS = 10;

// Function to get random elements from array
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get random inputs to process
const selectedInputs = getRandomElements(professionalProfiles, N_INPUTS);

logger.printWithHeader(
  'Processing',
  `${N_INPUTS} random professional profiles`,
);

// Process each selected input
for (let i = 0; i < selectedInputs.length; i++) {
  const profileData = selectedInputs[i];

  logger.printWithHeader(
    `Input ${i + 1}`,
    JSON.stringify(profileData, null, 2),
  );

  const response = await client
    .withOptions({
      defaultHeaders: {
        'ra-config': JSON.stringify(raConfig),
      },
    })
    .responses.create({
      model: 'x',
      input: [
        {
          role: 'user',
          content: `Pick the best potential customers from the list ${JSON.stringify(profileData)}`,
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
