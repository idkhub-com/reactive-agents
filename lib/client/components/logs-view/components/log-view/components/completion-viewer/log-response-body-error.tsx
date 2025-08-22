'use client';

import { GenericViewer } from '@client/components/logs-view/components/log-view/components/generic-viewer';
import type { LogResponseBodyError } from '@shared/types/idkhub/observability';

export function LogResponseBodyErrorViewer({
  logId,
  response,
}: {
  logId: string;
  response: LogResponseBodyError;
}): React.ReactElement {
  return (
    <div className="">
      <GenericViewer
        path={`${logId}-completion`}
        language={'text'}
        defaultValue={`${response.message}\n${response.response}`}
        readOnly={true}
        onSave={async (): Promise<void> => {
          //pass
        }}
        onSelect={(): void => {
          //pass
        }}
        className="border-green-500"
      >
        <div className="text-sm font-normal text-right">Error</div>
      </GenericViewer>
    </div>
  );
}
