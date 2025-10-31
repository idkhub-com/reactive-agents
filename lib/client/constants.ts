import type { SideBarDataSchema } from '@client/types/ui/side-bar';
import { micah } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
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
  user: {
    name: 'Reactive Agents User',
    email: '',
    avatar: `data:image/svg+xml;base64,${Buffer.from(
      createAvatar(micah, {
        seed: `${AVATAR_SEED}John Doe`,
        size: 32,
        backgroundColor: [
          'FFD1DC',
          'AEEEEE',
          'BDFCC9',
          'E6E6FA',
          'FFFFCC',
          'FFE5B4',
          'D8BFD8',
          'B0E0E6',
        ],
      }).toString(),
    ).toString('base64')}`,
  },
  teams: [],
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
    },
  ],
  projects: [],
};
