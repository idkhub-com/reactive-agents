import type { SideBarDataSchema } from '@client/types/ui/side-bar';
import { BookOpenIcon, KeyIcon } from 'lucide-react';

export const AVATAR_SEED = '';

/**
 * The URL of the client app.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * The URL of the API.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const ENVIRONMENT = process.env.NEXT_PUBLIC_ENV;

export const SideBarData: SideBarDataSchema = {
  sections: [
    {
      title: 'AI Providers & Models',
      url: '/ai-providers',
      icon: KeyIcon,
      items: [
        {
          title: 'Providers & Models',
          url: '/ai-providers',
        },
      ],
    },
    {
      title: 'Documentation',
      url: 'https://docs.reactiveagents.ai',
      icon: BookOpenIcon,
      external: true,
    },
  ],
  projects: [],
};
