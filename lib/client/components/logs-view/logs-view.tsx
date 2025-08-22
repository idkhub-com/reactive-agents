'use client';

import { LogListView } from '@client/components/logs-view/components/log-list-view';
import { LogView } from './components/log-view';

export function LogsView(): React.ReactElement {
  return (
    <div className="flex flex-row w-full h-full overflow-hidden relative">
      <LogView />
      <LogListView />
    </div>
  );
}
