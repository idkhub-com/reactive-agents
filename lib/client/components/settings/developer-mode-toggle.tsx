'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import { Switch } from '@client/components/ui/switch';
import { CodeIcon } from 'lucide-react';
import type { ReactElement } from 'react';

export interface DeveloperModeToggleProps {
  /** Whether developer mode is enabled */
  checked: boolean;
  /** Callback when developer mode is toggled */
  onCheckedChange: (checked: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
}

export function DeveloperModeToggle({
  checked,
  onCheckedChange,
  disabled = false,
}: DeveloperModeToggleProps): ReactElement {
  const switchId = 'developer-mode-switch';
  const labelId = 'developer-mode-label';
  const descriptionId = 'developer-mode-description';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CodeIcon className="h-5 w-5" aria-hidden="true" />
          Developer Mode
        </CardTitle>
        <CardDescription>
          Advanced settings for development and debugging purposes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-4">
          <div className="space-y-1">
            <h4 id={labelId} className="font-medium">
              Enable Developer Mode
            </h4>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              When enabled, shows the internal reactive-agents agent and all its
              skills and data. This is useful for debugging and development.
            </p>
          </div>
          <Switch
            id={switchId}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
          />
        </div>
      </CardContent>
    </Card>
  );
}
