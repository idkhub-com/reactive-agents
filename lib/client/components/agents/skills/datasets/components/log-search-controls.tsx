import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { RotateCcw, Search } from 'lucide-react';

interface LogSearchControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLogs: Set<string>;
  filteredLogs: IdkRequestLog[] | undefined;
  onSelectAll: () => void;
  onReset: () => void;
}

export function LogSearchControls({
  searchQuery,
  onSearchChange,
  selectedLogs,
  filteredLogs,
  onSelectAll,
  onReset,
}: LogSearchControlsProps): React.ReactElement {
  return (
    <div className="flex flex-col md:flex-row gap-2 shrink-0">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          disabled={!filteredLogs?.length}
        >
          {selectedLogs.size === filteredLogs?.length
            ? 'Deselect All'
            : 'Select All'}
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
