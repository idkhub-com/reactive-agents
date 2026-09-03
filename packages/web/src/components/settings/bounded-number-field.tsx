'use client';

import { Input } from '@web/components/ui/input';
import { Label } from '@web/components/ui/label';
import type { ReactElement } from 'react';
import { useId } from 'react';

/**
 * Why a whole number cannot be saved as entered, or null when it can.
 *
 * `unit` names what is being counted, so the message reads as the field does.
 */
export function boundedNumberProblem(
  value: number,
  min: number,
  max: number,
  unit: string,
): string | null {
  if (Number.isInteger(value) && value >= min && value <= max) {
    return null;
  }
  return `Enter a whole number of ${unit} between ${min} and ${max}.`;
}

export interface BoundedNumberFieldProps {
  /** The field's accessible name: what a screen reader and a test call it. */
  label: string;
  /** What the number governs, and what a caller loses when it is wrong. */
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Shown after the input: `seconds`, `tokens`. */
  unit: string;
  isLoading: boolean;
  /**
   * `row` is a settings row of its own, label and description on the left.
   * `inline` is one line -- a short label, the input, the unit -- for a
   * field that sits beneath the model it applies to, where the row already
   * says what the model is for; the description then reaches the reader as
   * the input's tooltip and its accessible description.
   */
  layout?: 'row' | 'inline';
  /** The visible label when inline, where `label` would repeat the row's. */
  inlineLabel?: string;
}

/**
 * One whole-number setting with bounds.
 *
 * Sits beneath the model it applies to: a model that answers in a second and
 * a model that needs a minute want different windows, and a reasoning model
 * wants a bigger budget than a plain one, so the setting and the model are
 * one decision.
 */
export function BoundedNumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  unit,
  isLoading,
  layout = 'row',
  inlineLabel,
}: BoundedNumberFieldProps): ReactElement {
  const id = useId();
  const descriptionId = `${id}-description`;
  const problem = boundedNumberProblem(value, min, max, unit);

  const input = (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={1}
      className={layout === 'inline' ? 'w-24 h-8' : 'w-32'}
      value={Number.isNaN(value) ? '' : value}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      disabled={isLoading}
      aria-label={layout === 'inline' ? label : undefined}
      aria-describedby={descriptionId}
      aria-invalid={problem !== null}
      title={layout === 'inline' ? description : undefined}
    />
  );

  const problemText = problem && (
    <p className="text-sm text-destructive" role="alert">
      {problem}
    </p>
  );

  if (layout === 'inline') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={id}
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            {inlineLabel ?? label}
          </Label>
          {input}
          <span className="text-sm text-muted-foreground">{unit}</span>
          <span id={descriptionId} className="sr-only">
            {description}
          </span>
        </div>
        {problemText}
      </div>
    );
  }

  return (
    <div className="grid gap-4 py-4 border-b last:border-b-0">
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
          {input}
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {problemText}
      </div>
    </div>
  );
}
