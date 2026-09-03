'use client';

import type { LogResponseBodyError } from '@shared/types/data';
import { GenericViewer } from '@web/components/agents/skills/logs/components/generic-viewer';

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
        variant="response"
      >
        <div className="text-sm font-normal text-right">Error</div>
      </GenericViewer>
    </div>
  );
}
