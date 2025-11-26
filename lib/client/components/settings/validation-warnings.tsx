'use client';

import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';

export interface ErrorWarningProps {
  /** Error message to display */
  error: string;
  /** Callback to retry the operation */
  onRetry: () => void;
}

export function ErrorWarning({
  error,
  onRetry,
}: ErrorWarningProps): ReactElement {
  return (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-destructive" role="alert">
          <AlertCircleIcon className="h-5 w-5" aria-hidden="true" />
          <p>{error}</p>
        </div>
        <Button variant="outline" onClick={onRetry} className="mt-4">
          <RefreshCwIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

export interface NoModelsWarningProps {
  /** Optional custom message */
  message?: string;
  /** Link to create models page */
  createModelLink?: string;
}

export function NoModelsWarning({
  message = 'You need to add at least one model before you can configure system settings.',
  createModelLink = '/models/create',
}: NoModelsWarningProps): ReactElement {
  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3" role="alert">
          <AlertCircleIcon
            className="h-5 w-5 text-amber-500 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <p className="font-medium">No models configured</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button asChild variant="outline" className="mt-2">
              <Link href={createModelLink}>Add Your First Model</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export interface IncompleteSettingsWarningProps {
  /** List of missing field names */
  missingFields: string[];
  /** Optional custom title */
  title?: string;
}

export function IncompleteSettingsWarning({
  missingFields,
  title = 'Settings incomplete',
}: IncompleteSettingsWarningProps): ReactElement {
  return (
    <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3" role="alert">
          <AlertCircleIcon
            className="h-5 w-5 text-amber-500 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">
              Please configure all required models below for the system to
              function properly. Missing: {missingFields.join(', ')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
