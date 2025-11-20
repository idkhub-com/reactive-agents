'use client';

import { cn } from '@client/utils/ui/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface DateTimePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  date,
  onDateChange,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>(date);
  const [timeValue, setTimeValue] = React.useState<string>(
    format(date, 'HH:mm'),
  );

  // Update internal state when prop changes
  React.useEffect(() => {
    setSelectedDate(date);
    setTimeValue(format(date, 'HH:mm'));
  }, [date]);

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) return;

    // Preserve the time from the current selection
    const [hours, minutes] = timeValue.split(':').map(Number);
    const updatedDate = new Date(newDate);
    updatedDate.setHours(hours, minutes, 0, 0);

    setSelectedDate(updatedDate);
    onDateChange(updatedDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);

    // Update the date with new time
    const [hours, minutes] = newTime.split(':').map(Number);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const updatedDate = new Date(selectedDate);
      updatedDate.setHours(hours, minutes, 0, 0);
      setSelectedDate(updatedDate);
      onDateChange(updatedDate);
    }
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-[200px] justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? (
              format(selectedDate, 'PPP')
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-[130px]"
      />
    </div>
  );
}
