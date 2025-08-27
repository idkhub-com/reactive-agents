/**
 * Configuration template for Copart Auction Agent
 *
 * Copy this file to `config.ts` and update the values as needed.
 */

export const config = {
  // OpenAI API Key (required for AI analysis)
  openaiApiKey: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',

  // IDKHub Configuration
  idkhubUrl: process.env.IDKHUB_URL || 'http://localhost:3000/v1',
  idkhubAuthToken: process.env.IDKHUB_AUTH_TOKEN || 'idk',

  // Default search criteria
  defaultSearchCriteria: {
    makes: ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan'],
    yearRange: { min: 2015, max: 2023 },
    maxMileage: 100000,
    maxPrice: 25000,
    locations: ['Los Angeles', 'Miami', 'New York'],
    keywords: [],
  },

  // Web scraping settings
  scraping: {
    delay: 2000, // milliseconds between requests
    maxRetries: 3,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timeout: 30000,
  },

  // AI analysis settings
  ai: {
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.3,
    timeout: 30000,
  },

  // Notification settings
  notifications: {
    email: {
      enabled: false,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: process.env.SMTP_USER || 'your_email@gmail.com',
        pass: process.env.SMTP_PASS || 'your_app_password',
      },
    },
    sms: {
      enabled: false,
      provider: 'twilio', // or other SMS providers
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
  },

  // Data export settings
  export: {
    format: 'json', // 'json' | 'csv' | 'xlsx'
    includeImages: false,
    includeAnalysis: true,
    autoExport: true,
  },
};

// Environment-specific overrides
export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return {
      ...config,
      scraping: {
        ...config.scraping,
        delay: 5000, // Slower scraping in production
        maxRetries: 5,
      },
    };
  }

  return config;
};
