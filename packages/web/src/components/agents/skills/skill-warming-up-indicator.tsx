import { Badge } from '@client/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import type { Skill } from '@shared/types/data';
import { Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';

interface SkillWarmingUpIndicatorProps {
  skill: Skill;
  /** The size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Which side the tooltip should appear on */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  /** Whether to show as a badge or just an icon */
  variant?: 'icon' | 'badge';
}

/**
 * Displays an indicator when a skill is in the warming up phase
 * (evaluations_regenerated_at is null, meaning it needs at least 5 logs).
 * Shows nothing when the skill has completed the initial warm up.
 */
export function SkillWarmingUpIndicator({
  skill,
  size = 'sm',
  tooltipSide = 'right',
  variant = 'icon',
}: SkillWarmingUpIndicatorProps): ReactElement | null {
  // Only show when evaluations have not been regenerated yet
  if (skill.evaluations_regenerated_at !== null) return null;

  const iconSizeClass = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
  }[size];

  if (variant === 'badge') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900 border-blue-200 dark:border-blue-800">
            <Loader2 className={`${iconSizeClass} animate-spin`} />
            Warming Up
          </Badge>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs py-2">
          <WarmingUpTooltipContent />
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <Loader2
            className={`${iconSizeClass} text-blue-800 dark:text-blue-200 animate-spin`}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="max-w-xs py-2">
        <WarmingUpTooltipContent />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Reusable tooltip content for warming up indicators
 */
function WarmingUpTooltipContent(): ReactElement {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold m-0">Skill warming up</p>
      <p className="text-xs m-0">
        This skill needs at least 5 logs to produce the initial system prompts
        and evaluations. Send some requests to the skill to warm it up.
      </p>
    </div>
  );
}
