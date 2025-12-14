'use client';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@client/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { Skeleton } from '@client/components/ui/skeleton';
import { cn } from '@client/utils/ui/utils';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { useId, useMemo, useState } from 'react';

export interface ModelOption {
  id: string;
  modelName: string;
  providerName: string;
  modelType: 'text' | 'embed';
  searchLabel: string;
}

export interface ModelSelectorProps {
  /** Label for the setting field */
  label: string;
  /** Description of what this model setting is used for */
  description: string;
  /** Optional recommendation text */
  recommendation?: string;
  /** Currently selected model ID */
  value: string | null;
  /** Callback when model selection changes */
  onChange: (value: string) => void;
  /** Available model options to choose from */
  modelOptions: ModelOption[];
  /** Whether the component is in loading state */
  isLoading: boolean;
  /** Whether this field is required */
  required?: boolean;
}

export function ModelSelector({
  label,
  description,
  recommendation,
  value,
  onChange,
  modelOptions,
  isLoading,
  required = true,
}: ModelSelectorProps): ReactElement {
  const [open, setOpen] = useState(false);

  // Generate unique IDs for ARIA attributes
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const labelId = `${baseId}-label`;
  const descriptionId = `${baseId}-description`;

  const selectedModel = useMemo(
    () => modelOptions.find((m) => m.id === value),
    [modelOptions, value],
  );

  const showNotConfiguredWarning =
    required && !value && modelOptions.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-[1fr,300px] items-start py-4 border-b last:border-b-0">
      <div className="space-y-1">
        <h4 id={labelId} className="font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </h4>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
        {recommendation && (
          <p className="text-sm text-muted-foreground">
            Recommended: {recommendation}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <Skeleton
            className="h-10 w-full"
            aria-label="Loading model options"
          />
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={open ? listboxId : undefined}
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
                aria-required={required}
                aria-invalid={showNotConfiguredWarning}
                className={cn(
                  'w-[400px] justify-between',
                  showNotConfiguredWarning && 'border-destructive',
                )}
              >
                {selectedModel ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{selectedModel.modelName}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {selectedModel.providerName}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select a model</span>
                )}
                <ChevronsUpDownIcon
                  className="ml-2 h-4 w-4 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search models..."
                  aria-label={`Search ${label} models`}
                />
                <CommandList
                  id={listboxId}
                  role="listbox"
                  aria-label={`${label} options`}
                >
                  <CommandEmpty>No model found.</CommandEmpty>
                  <CommandGroup>
                    {modelOptions.map((model) => (
                      <CommandItem
                        key={model.id}
                        value={model.searchLabel}
                        onSelect={() => {
                          onChange(model.id);
                          setOpen(false);
                        }}
                        role="option"
                        aria-selected={value === model.id}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === model.id ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden="true"
                        />
                        <div className="flex items-center gap-2">
                          <span>{model.modelName}</span>
                          <Badge variant="outline" className="text-xs">
                            {model.providerName}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {showNotConfiguredWarning && (
          <p className="text-sm text-destructive" role="alert">
            This field is required
          </p>
        )}
      </div>
    </div>
  );
}
