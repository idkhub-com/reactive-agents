'use client';

import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import {
  ChatCompletionMessageRole,
  PrettyChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { GenericViewer } from '@web/components/agents/skills/logs/components/generic-viewer';

export function CompletionsAPIViewer({
  logId,
  saResponseBody,
}: {
  logId: string;
  saResponseBody: CompletionResponseBody;
}): React.ReactElement {
  return (
    <div className="">
      <GenericViewer
        path={`${logId}-completion`}
        language={'text'}
        defaultValue={saResponseBody.choices[0].text}
        readOnly={false}
        onSave={async (): Promise<void> => {
          //pass
        }}
        onSelect={(): void => {
          //pass
        }}
        className="border-green-500"
      >
        <div className="text-sm font-normal text-right">
          {PrettyChatCompletionMessageRole[ChatCompletionMessageRole.ASSISTANT]}
        </div>
      </GenericViewer>
    </div>
  );
}
