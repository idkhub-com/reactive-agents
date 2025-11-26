import type { SideBarDataSchema } from '@client/types/ui/side-bar';
import { SkillEventType } from '@shared/types/data';
import { BookOpenIcon, CableIcon, SettingsIcon } from 'lucide-react';

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
      icon: CableIcon,
      items: [
        {
          title: 'Providers & Models',
          url: '/ai-providers',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: SettingsIcon,
      items: [
        {
          title: 'System Settings',
          url: '/settings',
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

export const eventColors: Record<SkillEventType, string> = {
  [SkillEventType.MODEL_ADDED]: 'rgba(34, 197, 94, 0.6)', // green
  [SkillEventType.MODEL_REMOVED]: 'rgba(239, 68, 68, 0.6)', // red
  [SkillEventType.EVALUATION_ADDED]: 'rgba(34, 197, 94, 0.6)', // green
  [SkillEventType.EVALUATION_REMOVED]: 'rgba(239, 68, 68, 0.6)', // red
  [SkillEventType.EVALUATION_REGENERATED]: 'rgba(168, 85, 247, 0.6)', // purple
  [SkillEventType.PARTITION_RESET]: 'rgba(251, 146, 60, 0.6)', // orange
  [SkillEventType.DESCRIPTION_UPDATED]: 'rgba(6, 182, 212, 0.6)', // cyan
  [SkillEventType.PARTITIONS_RECLUSTERED]: 'rgba(99, 102, 241, 0.6)', // indigo
  [SkillEventType.OPTIMIZATION_ENABLED]: 'rgba(16, 185, 129, 0.6)', // emerald
  [SkillEventType.OPTIMIZATION_DISABLED]: 'rgba(100, 116, 139, 0.6)', // slate
  [SkillEventType.CLUSTERS_UPDATED]: 'rgba(168, 85, 247, 0.6)', // purple - automatic reclustering
  [SkillEventType.CONTEXT_GENERATED]: 'rgba(251, 191, 36, 0.6)', // amber - context generation
  [SkillEventType.REFLECTION]: 'rgba(59, 130, 246, 0.6)', // blue
};

export const eventLabels: Record<SkillEventType, string> = {
  [SkillEventType.MODEL_ADDED]: 'Model Added',
  [SkillEventType.MODEL_REMOVED]: 'Model Removed',
  [SkillEventType.EVALUATION_ADDED]: 'Eval Added',
  [SkillEventType.EVALUATION_REMOVED]: 'Eval Removed',
  [SkillEventType.EVALUATION_REGENERATED]: 'Eval Regen',
  [SkillEventType.PARTITION_RESET]: 'Partition Reset',
  [SkillEventType.DESCRIPTION_UPDATED]: 'Description',
  [SkillEventType.PARTITIONS_RECLUSTERED]: 'Recluster',
  [SkillEventType.OPTIMIZATION_ENABLED]: 'Opt On',
  [SkillEventType.OPTIMIZATION_DISABLED]: 'Opt Off',
  [SkillEventType.CLUSTERS_UPDATED]: 'Partition Opt',
  [SkillEventType.CONTEXT_GENERATED]: 'Context Gen',
  [SkillEventType.REFLECTION]: 'Prompt Opt',
};
