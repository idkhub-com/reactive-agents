'use client';

import { Badge } from '@client/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useSettingsValidation } from '@client/hooks/use-settings-validation';
import { AlertCircle } from 'lucide-react';
import type { ReactElement } from 'react';

interface SettingsStatusIndicatorProps {
  /** The size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Which side the tooltip should appear on */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  /** Whether to show as a badge or just an icon */
  variant?: 'icon' | 'badge';
}

/**
 * Displays an indicator when system settings are incomplete.
 * Only shows settings configuration issues, not model type issues.
 * Shows nothing when settings are complete or loading.
 */
export function SettingsStatusIndicator({
  size = 'sm',
  tooltipSide = 'right',
  variant = 'icon',
}: SettingsStatusIndicatorProps): ReactElement | null {
  const { isLoading, missingSettings } = useSettingsValidation();

  if (isLoading) return null;

  // Don't show if no missing settings
  if (missingSettings.length === 0) return null;

  // Only show settings configuration issues
  const allRequirements = missingSettings.map((s) => `Configure ${s}`);

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
            Not Configured
          </Badge>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs py-2">
          <SettingsStatusTooltipContent missingRequirements={allRequirements} />
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
        <SettingsStatusTooltipContent missingRequirements={allRequirements} />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Reusable tooltip content for settings status indicators
 */
function SettingsStatusTooltipContent({
  missingRequirements,
}: {
  missingRequirements: string[];
}): ReactElement {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold m-0">Settings incomplete</p>
      <ul className="text-xs list-disc pl-4 space-y-0.5">
        {missingRequirements.map((req) => (
          <li key={req}>{req}</li>
        ))}
      </ul>
    </div>
  );
}
