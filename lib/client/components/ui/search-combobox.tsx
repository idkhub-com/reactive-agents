import { cn } from '@client/utils/ui/utils';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface SearchComboboxOptions {
  value: string;
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function SearchCombobox({
  id,
  defaultValue,
  onValueChange,
  searchPlaceholder,
  emptyMessage,
  options,
  readOnly = false,
  className,
  sort = true,
}: {
  id?: string;
  defaultValue?: string;
  onValueChange?: (updatedValue: string) => void;
  options: SearchComboboxOptions[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  readOnly?: boolean;
  className?: string;
  sort?: boolean;
}): React.ReactElement {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(
    defaultValue,
  );

  useEffect(() => {
    setSelectedValue(defaultValue);
  }, [defaultValue]);

  const sortedOptions = useMemo(
    () =>
      sort ? options.sort((a, b) => a.label.localeCompare(b.label)) : options,
    [options, sort],
  );

  return (
    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-expanded={comboboxOpen}
          className={cn(
            'justify-between col-span-2 p-3 h-7 overflow-hidden',
            className,
          )}
          disabled={readOnly}
        >
          <div className="flex flex-row items-center gap-2 truncate">
            <Icon>
              {selectedValue &&
                options.find((option) => option.value === selectedValue)
                  ?.leftIcon}
            </Icon>
            {selectedValue &&
              options.find((option) => option.value === selectedValue)
                ?.leftIcon}
            <span
              className={cn(
                'items-center gap-2 truncate',
                selectedValue ? 'opacity-100' : 'opacity-50',
              )}
            >
              {selectedValue &&
                options.find((option) => option.value === selectedValue)?.label}
            </span>
            <Icon>
              {selectedValue &&
                options.find((option) => option.value === selectedValue)
                  ?.rightIcon}
            </Icon>
          </div>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0">
        <Command className="popover-content h-fit">
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  className="flex justify-between"
                  onSelect={(currentValue): void => {
                    setSelectedValue(currentValue as string);
                    setComboboxOpen(false);
                    onValueChange?.(currentValue as string);
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    <Icon>{option.leftIcon}</Icon>
                    <span className="text-sm truncate">{option.label}</span>
                    <Icon>{option.rightIcon}</Icon>
                  </div>
                  <CheckIcon
                    size={14}
                    className={cn(
                      selectedValue === option.value
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Icon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}): React.ReactElement | null {
  if (!children) {
    return null;
  }

  return <span className={cn('shrink-0', className)}>{children}</span>;
}
