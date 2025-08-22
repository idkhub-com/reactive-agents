import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent } from '@client/components/ui/card';
import { Checkbox } from '@client/components/ui/checkbox';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/components/ui/popover';
import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface LogFilters {
  methods: string[];
  statusCodes: string[];
  endpoints: string;
  functionNames: string[];
  aiProviders: string[];
  models: string[];
  minDuration?: number;
  maxDuration?: number;
  dateFrom?: string;
  dateTo?: string;
  hasRequestBody?: boolean;
  hasResponseBody?: boolean;
}

interface UniqueValues {
  methods: string[];
  statusCodes: string[];
  functionNames: string[];
  aiProviders: string[];
  models: string[];
}

interface LogFiltersPanelProps {
  filters: LogFilters;
  uniqueValues: UniqueValues;
  filtersOpen: boolean;
  hasActiveFilters: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onFiltersChange: (filters: LogFilters) => void;
  onReset: () => void;
}

export function LogFiltersPanel({
  filters,
  uniqueValues,
  filtersOpen,
  hasActiveFilters,
  onFiltersOpenChange,
  onFiltersChange,
  onReset,
}: LogFiltersPanelProps): React.ReactElement {
  const updateFilters = (updates: Partial<LogFilters>): void => {
    onFiltersChange({ ...filters, ...updates });
  };

  const handleArrayFilterToggle = (
    key: keyof Pick<
      LogFilters,
      'methods' | 'statusCodes' | 'functionNames' | 'aiProviders' | 'models'
    >,
    value: string,
  ): void => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilters({ [key]: updated });
  };

  const handleDateChange =
    (field: 'dateFrom' | 'dateTo') =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      updateFilters({ [field]: e.target.value || undefined });
    };

  const handleDurationChange =
    (field: 'minDuration' | 'maxDuration') =>
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = e.target.value;
      updateFilters({ [field]: value ? Number(value) : undefined });
    };

  return (
    <Popover open={filtersOpen} onOpenChange={onFiltersOpenChange}>
      <div className="flex items-center justify-between">
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                Active
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </Button>
        )}
      </div>

      <PopoverContent className="popover-content overflow-auto w-[min(90vw,900px)] p-0">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* HTTP Methods */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">HTTP Methods</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueValues.methods.map((method) => (
                    // biome-ignore lint/a11y/useSemanticElements: Using Badge as interactive chip; role and keyboard handling added
                    <Badge
                      key={method}
                      variant={
                        filters.methods.includes(method)
                          ? 'default'
                          : 'secondary'
                      }
                      className="cursor-pointer text-xs"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleArrayFilterToggle('methods', method)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleArrayFilterToggle('methods', method);
                        }
                      }}
                    >
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status Codes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status Codes</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueValues.statusCodes.map((status) => (
                    <Badge
                      key={status}
                      variant={
                        filters.statusCodes.includes(status)
                          ? 'default'
                          : 'secondary'
                      }
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        handleArrayFilterToggle('statusCodes', status)
                      }
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Function Names */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Function Names</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueValues.functionNames.slice(0, 10).map((name) => (
                    <Badge
                      key={name}
                      variant={
                        filters.functionNames.includes(name)
                          ? 'default'
                          : 'secondary'
                      }
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        handleArrayFilterToggle('functionNames', name)
                      }
                    >
                      {name}
                    </Badge>
                  ))}
                  {uniqueValues.functionNames.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{uniqueValues.functionNames.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Providers */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">AI Providers</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueValues.aiProviders.map((provider) => (
                    <Badge
                      key={provider}
                      variant={
                        filters.aiProviders.includes(provider)
                          ? 'default'
                          : 'secondary'
                      }
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        handleArrayFilterToggle('aiProviders', provider)
                      }
                    >
                      {provider}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Models */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Models</Label>
                <div className="flex flex-wrap gap-1">
                  {uniqueValues.models.slice(0, 8).map((model) => (
                    <Badge
                      key={model}
                      variant={
                        filters.models.includes(model) ? 'default' : 'secondary'
                      }
                      className="cursor-pointer text-xs"
                      onClick={() => handleArrayFilterToggle('models', model)}
                    >
                      {model}
                    </Badge>
                  ))}
                  {uniqueValues.models.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{uniqueValues.models.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Endpoint Filter */}
            <div className="space-y-2">
              <Label htmlFor="endpoint-filter" className="text-sm font-medium">
                Endpoint Contains
              </Label>
              <Input
                id="endpoint-filter"
                placeholder="e.g., /api/users"
                value={filters.endpoints}
                onChange={(e) => updateFilters({ endpoints: e.target.value })}
              />
            </div>

            {/* Duration Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-duration" className="text-sm font-medium">
                  Min Duration (ms)
                </Label>
                <Input
                  id="min-duration"
                  type="number"
                  placeholder="Min duration..."
                  value={filters.minDuration ?? ''}
                  onChange={handleDurationChange('minDuration')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-duration" className="text-sm font-medium">
                  Max Duration (ms)
                </Label>
                <Input
                  id="max-duration"
                  type="number"
                  placeholder="Max duration..."
                  value={filters.maxDuration ?? ''}
                  onChange={handleDurationChange('maxDuration')}
                />
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-sm font-medium">
                  From Date
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={handleDateChange('dateFrom')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-sm font-medium">
                  To Date
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={handleDateChange('dateTo')}
                />
              </div>
            </div>

            {/* Request/Response Body Filters */}
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-request-body"
                  checked={filters.hasRequestBody === true}
                  onCheckedChange={(checked) =>
                    updateFilters({
                      hasRequestBody: checked === true ? true : undefined,
                    })
                  }
                />
                <Label
                  htmlFor="has-request-body"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has Request Body
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-response-body"
                  checked={filters.hasResponseBody === true}
                  onCheckedChange={(checked) =>
                    updateFilters({
                      hasResponseBody: checked === true ? true : undefined,
                    })
                  }
                />
                <Label
                  htmlFor="has-response-body"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Has Response Body
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
