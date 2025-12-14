import { cn } from '@client/utils/ui/utils';
import { Check, Loader2, X } from 'lucide-react';
import type { ReactElement } from 'react';

export interface ValidationStatusProps {
  /**
   * Current validation state
   */
  status: 'idle' | 'validating' | 'available' | 'unavailable' | 'error';
  /**
   * Additional className for styling
   */
  className?: string;
  /**
   * Error message to display
   */
  errorMessage?: string;
  /**
   * Success message to display
   */
  successMessage?: string;
  /**
   * Size variant for the icon
   */
  size?: 'sm' | 'md';
}

/**
 * Component to show validation status with appropriate icons and colors
 */
export function ValidationStatus({
  status,
  className,
  errorMessage,
  successMessage,
  size = 'sm',
}: ValidationStatusProps): ReactElement | null {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (status === 'idle') {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {status === 'validating' && (
        <>
          <Loader2
            className={cn('animate-spin text-muted-foreground', iconSize)}
          />
          <span className="text-sm text-muted-foreground">
            Checking availability...
          </span>
        </>
      )}

      {status === 'available' && (
        <>
          <Check className={cn('text-green-600', iconSize)} />
          <span className="text-sm text-green-600">
            {successMessage || 'Name is available'}
          </span>
        </>
      )}

      {status === 'unavailable' && (
        <>
          <X className={cn('text-red-600', iconSize)} />
          <span className="text-sm text-red-600">
            {errorMessage || 'Name is already taken'}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <X className={cn('text-red-600', iconSize)} />
          <span className="text-sm text-red-600">
            {errorMessage || 'Validation failed'}
          </span>
        </>
      )}
    </div>
  );
}
