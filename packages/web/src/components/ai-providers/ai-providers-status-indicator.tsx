'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@client/components/ui/tooltip';
import { useSettingsValidation } from '@client/hooks/use-settings-validation';
import { AlertCircle } from 'lucide-react';
import type { ReactElement } from 'react';

interface AIProvidersStatusIndicatorProps {
  /** The size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Which side the tooltip should appear on */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Displays an indicator when AI providers are missing required model types.
 * Shows nothing when both text and embed models exist or when loading.
 */
export function AIProvidersStatusIndicator({
  size = 'sm',
  tooltipSide = 'right',
}: AIProvidersStatusIndicatorProps): ReactElement | null {
  const { isLoading, hasTextModels, hasEmbedModels, hasRequiredModelTypes } =
    useSettingsValidation();

  if (isLoading) return null;

  // All required model types exist
  if (hasRequiredModelTypes) return null;

  // Build requirements list
  const missingTypes: string[] = [];
  if (!hasTextModels) {
    missingTypes.push('text model');
  }
  if (!hasEmbedModels) {
    missingTypes.push('embedding model');
  }

  const iconSizeClass = {
    sm: 'size-3',
    md: 'size-3.5',
    lg: 'size-4',
  }[size];

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
        <div className="space-y-1.5">
          <p className="font-semibold m-0">Models needed</p>
          <ul className="text-xs list-disc pl-4 space-y-0.5">
            {missingTypes.map((type) => (
              <li key={type}>Add at least one {type}</li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
