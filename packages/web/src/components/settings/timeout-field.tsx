'use client';

import {
  MAX_INTERNAL_TIMEOUT_MS,
  MIN_INTERNAL_TIMEOUT_MS,
} from '@shared/types/data/system-settings';
import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import type { ReactElement } from 'react';
import { useId } from 'react';

const MIN_SECONDS = MIN_INTERNAL_TIMEOUT_MS / 1000;
const MAX_SECONDS = MAX_INTERNAL_TIMEOUT_MS / 1000;

/**
 * Why a timeout cannot be saved as entered, or null when it can.
 *
 * Every internal call shares these bounds, so one check serves them all.
 */
export function timeoutProblem(seconds: number): string | null {
  if (
    Number.isInteger(seconds) &&
    seconds >= MIN_SECONDS &&
    seconds <= MAX_SECONDS
  ) {
    return null;
  }
  return `Enter a whole number of seconds between ${MIN_SECONDS} and ${MAX_SECONDS}.`;
}

export interface TimeoutFieldProps {
  /** Field label, also the accessible name the input answers to. */
  label: string;
  /** What this call is, and what a caller loses while it runs. */
  description: string;
  /** The current value, in seconds. */
  seconds: number;
  onChange: (seconds: number) => void;
  isLoading: boolean;
}

/**
 * One internal call's timeout, edited in seconds.
 *
 * Sits directly beneath the model it applies to: the two are one decision --
 * a model that answers in a second and a model that needs a minute want
 * different windows, and the pairing is what makes that obvious.
 */
export function TimeoutField({
  label,
  description,
  seconds,
  onChange,
  isLoading,
}: TimeoutFieldProps): ReactElement {
  const id = useId();
  const descriptionId = `${id}-description`;
  const problem = timeoutProblem(seconds);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr,300px] items-start py-4 border-b last:border-b-0">
      <div className="space-y-1">
        <Label htmlFor={id} className="font-medium text-base">
          {label}
        </Label>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            min={MIN_SECONDS}
            max={MAX_SECONDS}
            step={1}
            className="w-32"
            value={Number.isNaN(seconds) ? '' : seconds}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            disabled={isLoading}
            aria-describedby={descriptionId}
            aria-invalid={problem !== null}
          />
          <span className="text-sm text-muted-foreground">seconds</span>
        </div>
        {problem && (
          <p className="text-sm text-destructive" role="alert">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
