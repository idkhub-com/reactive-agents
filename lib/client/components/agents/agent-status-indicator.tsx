import { Badge } from '@client/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useAgentUnreadySkills } from '@client/hooks/use-agent-unready-skills';
import { useAgentValidation } from '@client/hooks/use-agent-validation';
import type { Agent } from '@shared/types/data';
import { AlertCircle } from 'lucide-react';
import type { ReactElement } from 'react';

interface AgentStatusIndicatorProps {
  agent: Agent;
  /** The size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Which side the tooltip should appear on */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  /** Whether to show as a badge or just an icon */
  variant?: 'icon' | 'badge';
}

/**
 * Displays an indicator when an agent is not ready (missing skills or has unready skills).
 * Shows nothing when the agent is ready or loading.
 */
export function AgentStatusIndicator({
  agent,
  size = 'sm',
  tooltipSide = 'right',
  variant = 'icon',
}: AgentStatusIndicatorProps): ReactElement | null {
  const { isReady, missingRequirements, isLoading } = useAgentValidation(agent);
  const {
    hasUnreadySkills,
    unreadySkillsCount,
    isLoading: isLoadingUnreadySkills,
  } = useAgentUnreadySkills(agent);

  if (isLoading || isLoadingUnreadySkills) return null;

  // Show indicator if agent is missing skills OR has unready skills
  if (isReady && !hasUnreadySkills) return null;

  // Combine requirements
  const allRequirements = [...missingRequirements];
  if (hasUnreadySkills) {
    allRequirements.push(
      `${unreadySkillsCount} skill${unreadySkillsCount > 1 ? 's are' : ' is'} not ready (missing models or evaluations)`,
    );
  }

  const iconSizeClass = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
  }[size];

  if (variant === 'badge') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="gap-1.5 bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900 border-orange-200 dark:border-orange-800">
            <AlertCircle className={iconSizeClass} />
            Not Ready
          </Badge>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs py-2">
          <AgentStatusTooltipContent missingRequirements={allRequirements} />
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <AlertCircle
            className={`${iconSizeClass} text-orange-800 dark:text-orange-200`}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="max-w-xs py-2">
        <AgentStatusTooltipContent missingRequirements={allRequirements} />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Reusable tooltip content for agent status indicators
 */
function AgentStatusTooltipContent({
  missingRequirements,
}: {
  missingRequirements: string[];
}): ReactElement {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold m-0">Agent not ready</p>
      <ul className="text-xs list-disc pl-4 space-y-0.5">
        {missingRequirements.map((req) => (
          <li key={req}>{req}</li>
        ))}
      </ul>
    </div>
  );
}
