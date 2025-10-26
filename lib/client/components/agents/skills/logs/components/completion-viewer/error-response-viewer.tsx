'use client';

import { GenericViewer } from '@client/components/agents/skills/logs/components/generic-viewer';
import type { ErrorResponseBody } from '@shared/types/api/response';

export function ErrorResponseViewer({
  logId,
  response,
}: {
  logId: string;
  response: ErrorResponseBody;
}): React.ReactElement {
  return (
    <div className="">
      <GenericViewer
        path={`${logId}-completion`}
        language={'text'}
        defaultValue={response.error.message}
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
