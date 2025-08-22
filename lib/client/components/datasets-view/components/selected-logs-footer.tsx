import { Badge } from '@client/components/ui/badge';

interface SelectedLogsFooterProps {
  selectedLogs: Set<string>;
}

export function SelectedLogsFooter({
  selectedLogs,
}: SelectedLogsFooterProps): React.ReactElement | null {
  if (selectedLogs.size === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-3 bg-accent rounded-lg shrink-0">
      <span className="text-sm font-medium">
        {selectedLogs.size} log{selectedLogs.size === 1 ? '' : 's'} selected
      </span>
      <Badge variant="secondary">
        Will create {selectedLogs.size} data point
        {selectedLogs.size === 1 ? '' : 's'}
      </Badge>
    </div>
  );
}
