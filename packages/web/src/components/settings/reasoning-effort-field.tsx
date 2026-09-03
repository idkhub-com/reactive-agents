'use client';

import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import { Label } from '@web/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/components/ui/select';
import type { ReactElement } from 'react';
import { useId } from 'react';

/**
 * The value standing for "send nothing and let the model decide".
 *
 * A Radix select item cannot carry an empty value, so the absence of a
 * setting needs a name of its own on the way in and out of the control.
 */
export const MODEL_DEFAULT_EFFORT = 'model-default';

export interface ReasoningEffortFieldProps {
  /** The field's accessible name, e.g. `Judge Reasoning Effort`. */
  label: string;
  /** What thinking costs this role, and what it buys. */
  description: string;
  value: ReasoningEffort | null;
  onChange: (value: ReasoningEffort | null) => void;
  isLoading: boolean;
}

/**
 * One role's reasoning effort, on the line beneath the model it applies to.
 *
 * Every text model gets one because the roles ask for different work: naming
 * a skill or scoring a turn wants an answer, while writing a system prompt
 * may be worth the thinking. A model that takes no such parameter is
 * unaffected, so the control is safe to leave at the model default.
 */
export function ReasoningEffortField({
  label,
  description,
  value,
  onChange,
  isLoading,
}: ReasoningEffortFieldProps): ReactElement {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor={id}
        className="text-sm text-muted-foreground whitespace-nowrap"
      >
        Reasoning
      </Label>
      <Select
        value={value ?? MODEL_DEFAULT_EFFORT}
        onValueChange={(next) =>
          onChange(
            next === MODEL_DEFAULT_EFFORT ? null : (next as ReasoningEffort),
          )
        }
        disabled={isLoading}
      >
        <SelectTrigger
          id={id}
          className="h-8 w-36"
          aria-label={label}
          title={description}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={MODEL_DEFAULT_EFFORT}>Model default</SelectItem>
          {Object.values(ReasoningEffort).map((effort) => (
            <SelectItem key={effort} value={effort}>
              {effort}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
