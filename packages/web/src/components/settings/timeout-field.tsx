'use client';

import {
  MAX_INTERNAL_TIMEOUT_MS,
  MIN_INTERNAL_TIMEOUT_MS,
} from '@shared/types/data/system-settings';
import {
  BoundedNumberField,
  boundedNumberProblem,
} from '@web/components/settings/bounded-number-field';
import type { ReactElement } from 'react';

const MIN_SECONDS = MIN_INTERNAL_TIMEOUT_MS / 1000;
const MAX_SECONDS = MAX_INTERNAL_TIMEOUT_MS / 1000;

/**
 * Why a timeout cannot be saved as entered, or null when it can.
 *
 * Every internal call shares these bounds, so one check serves them all.
 */
export function timeoutProblem(seconds: number): string | null {
  return boundedNumberProblem(seconds, MIN_SECONDS, MAX_SECONDS, 'seconds');
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
  /** See `BoundedNumberField`: a row of its own, or one line under a model. */
  layout?: 'row' | 'inline';
  /** The visible label when inline. */
  inlineLabel?: string;
}

/**
 * One internal call's timeout, edited in seconds, directly beneath the model
 * it applies to.
 */
export function TimeoutField({
  label,
  description,
  seconds,
  onChange,
  isLoading,
  layout,
  inlineLabel,
}: TimeoutFieldProps): ReactElement {
  return (
    <BoundedNumberField
      label={label}
      description={description}
      value={seconds}
      onChange={onChange}
      min={MIN_SECONDS}
      max={MAX_SECONDS}
      unit="seconds"
      isLoading={isLoading}
      layout={layout}
      inlineLabel={inlineLabel}
    />
  );
}
